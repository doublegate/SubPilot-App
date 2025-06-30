import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { AuditLogger } from '@/server/lib/audit-logger';
import { headers } from 'next/headers';
import crypto from 'crypto';

// Webhook payload interface
interface CancellationWebhookPayload {
  provider: string;
  externalRequestId?: string;
  confirmationCode: string;
  status: 'completed' | 'failed' | 'refunded';
  effectiveDate?: string;
  refundAmount?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Webhook endpoint for receiving cancellation confirmations from external providers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const payload: CancellationWebhookPayload = JSON.parse(body);

    // Verify webhook signature (if provider supports it)
    const signature =
      request.headers.get('x-signature') || request.headers.get('signature');
    const providerId = request.headers.get('x-provider-id');

    if (!providerId) {
      return NextResponse.json(
        { error: 'Missing provider ID in headers' },
        { status: 400 }
      );
    }

    // Get provider configuration
    const provider = await db.cancellationProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
    }

    // Verify webhook signature if configured
    if (signature && provider.authType === 'webhook_signature') {
      const expectedSignature = generateWebhookSignature(
        body,
        process.env.WEBHOOK_SECRET!
      );
      if (signature !== expectedSignature) {
        await AuditLogger.log({
          action: 'webhook.signature_verification_failed',
          resource: providerId,
          result: 'failure',
          metadata: { signature, provider: provider.name },
        });

        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Find the cancellation request
    let cancellationRequest;

    if (payload.externalRequestId) {
      // Find by external request ID
      cancellationRequest = await db.cancellationRequest.findFirst({
        where: {
          providerId: provider.id,
          // Store external ID in metadata
        },
        include: {
          subscription: true,
          user: true,
        },
      });
    } else {
      // Find by confirmation code or provider + recent timestamp
      cancellationRequest = await db.cancellationRequest.findFirst({
        where: {
          providerId: provider.id,
          status: { in: ['processing', 'pending'] },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: true,
          user: true,
        },
      });
    }

    if (!cancellationRequest) {
      await AuditLogger.log({
        action: 'webhook.cancellation_request_not_found',
        resource: providerId,
        result: 'failure',
        metadata: { payload },
      });

      return NextResponse.json(
        { error: 'Cancellation request not found' },
        { status: 404 }
      );
    }

    // Process the webhook payload
    const status = payload.status === 'completed' ? 'completed' : 'failed';
    const effectiveDate = payload.effectiveDate
      ? new Date(payload.effectiveDate)
      : new Date();

    // Update the cancellation request
    const updatedRequest = await db.cancellationRequest.update({
      where: { id: cancellationRequest.id },
      data: {
        status,
        confirmationCode: payload.confirmationCode,
        effectiveDate: status === 'completed' ? effectiveDate : null,
        refundAmount: payload.refundAmount?.toString(),
        errorMessage: payload.error || null,
        errorDetails: payload.error ? { webhookError: payload.error } : {},
        completedAt: status === 'completed' ? new Date() : null,
      },
    });

    // Log the webhook activity
    await db.cancellationLog.create({
      data: {
        requestId: cancellationRequest.id,
        action: 'webhook_received',
        status: status === 'completed' ? 'success' : 'failure',
        message: `Webhook confirmation received: ${payload.status}`,
        metadata: {
          provider: provider.name,
          confirmationCode: payload.confirmationCode,
          webhookPayload: payload as any,
        },
      },
    });

    // Update subscription if cancellation was successful
    if (status === 'completed') {
      await db.subscription.update({
        where: { id: cancellationRequest.subscriptionId },
        data: {
          status: 'cancelled',
          isActive: false,
          cancellationInfo: {
            requestId: cancellationRequest.id,
            confirmationCode: payload.confirmationCode,
            effectiveDate,
            method: 'webhook',
            webhookConfirmed: true,
          },
        },
      });

      // Create a notification for the user
      await db.notification.create({
        data: {
          userId: cancellationRequest.userId,
          type: 'subscription_cancelled',
          title: 'Subscription cancelled ✅',
          message: `Your ${cancellationRequest.subscription.name} subscription has been cancelled successfully. Confirmation: ${payload.confirmationCode}`,
          scheduledFor: new Date(),
          data: {
            subscriptionId: cancellationRequest.subscriptionId,
            confirmationCode: payload.confirmationCode,
            refundAmount: payload.refundAmount,
          },
        },
      });
    } else {
      // Create notification for failed cancellation
      await db.notification.create({
        data: {
          userId: cancellationRequest.userId,
          type: 'cancellation_failed',
          title: 'Cancellation failed ❌',
          message: `Failed to cancel ${cancellationRequest.subscription.name}. ${payload.error || 'Please try again or use manual cancellation.'}`,
          severity: 'warning',
          scheduledFor: new Date(),
          data: {
            subscriptionId: cancellationRequest.subscriptionId,
            error: payload.error,
            requestId: cancellationRequest.id,
          },
        },
      });
    }

    // Audit log
    await AuditLogger.log({
      userId: cancellationRequest.userId,
      action: 'webhook.cancellation_confirmed',
      resource: cancellationRequest.id,
      result: 'success',
      metadata: {
        provider: provider.name,
        status: payload.status,
        confirmationCode: payload.confirmationCode,
        subscriptionId: cancellationRequest.subscriptionId,
      },
    });

    return NextResponse.json({
      success: true,
      requestId: cancellationRequest.id,
      status: updatedRequest.status,
    });
  } catch (error) {
    console.error('Cancellation webhook error:', error);

    await AuditLogger.log({
      action: 'webhook.cancellation_error',
      result: 'failure',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: { error },
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for webhook verification/health check
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  // Some providers use challenge verification
  if (challenge) {
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Generate webhook signature for verification
 */
function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Rate limiting for webhook endpoints
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
