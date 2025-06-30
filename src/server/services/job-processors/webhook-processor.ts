import type { PrismaClient } from '@prisma/client';
import { emitCancellationEvent } from '@/server/lib/event-bus';
import type { Job, JobResult } from '@/server/lib/job-queue';
import { AuditLogger } from '@/server/lib/audit-logger';
import { Prisma } from '@prisma/client';

/**
 * Job processor for webhook-related tasks
 */
export class WebhookJobProcessor {
  constructor(private db: PrismaClient) {}

  /**
   * Process webhook validation job
   */
  async processWebhookValidation(job: Job): Promise<JobResult> {
    const { webhookId, provider, payload, requestId } = job.data;

    try {
      // Validate webhook payload structure
      const validation = this.validateWebhookPayload(provider, payload);

      if (!validation.valid) {
        await this.logWebhookActivity(
          webhookId,
          'validation_failed',
          validation.error || 'Invalid payload'
        );

        return {
          success: false,
          error: validation.error || 'Webhook validation failed',
          retry: false, // Don't retry invalid webhooks
        };
      }

      // Verify webhook authenticity (signature, timestamp, etc.)
      const authValidation = await this.verifyWebhookAuthenticity(
        provider,
        payload,
        job.data.headers
      );

      if (!authValidation.valid) {
        await this.logWebhookActivity(
          webhookId,
          'auth_failed',
          authValidation.error || 'Authentication failed'
        );

        return {
          success: false,
          error: authValidation.error || 'Webhook authentication failed',
          retry: false,
        };
      }

      await this.logWebhookActivity(
        webhookId,
        'validation_passed',
        'Webhook validation completed successfully'
      );

      return {
        success: true,
        data: {
          webhookId,
          provider,
          requestId,
          validatedPayload: validation.processedPayload || payload,
        },
      };
    } catch (error) {
      await this.logWebhookActivity(
        webhookId,
        'validation_error',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Webhook validation error',
        retry: { delay: 5000 },
      };
    }
  }

  /**
   * Process webhook data and extract relevant information
   */
  async processWebhookData(job: Job): Promise<JobResult> {
    const { webhookId, provider, payload, requestId } = job.data;

    try {
      // Extract relevant data based on provider type
      const extractedData = this.extractWebhookData(provider, payload);

      if (!extractedData.success) {
        await this.logWebhookActivity(
          webhookId,
          'extraction_failed',
          extractedData.error || 'Data extraction failed'
        );

        return {
          success: false,
          error: extractedData.error || 'Failed to extract webhook data',
          retry: false,
        };
      }

      // Store webhook processing result
      await this.storeWebhookResult(
        webhookId,
        provider,
        extractedData.data,
        requestId
      );

      await this.logWebhookActivity(
        webhookId,
        'data_processed',
        'Webhook data processed successfully'
      );

      // Emit webhook received event for workflow engine
      emitCancellationEvent('webhook.received', {
        provider,
        requestId,
        webhookId,
        data: extractedData.data,
      });

      return {
        success: true,
        data: {
          webhookId,
          extractedData: extractedData.data,
          requestId,
        },
      };
    } catch (error) {
      await this.logWebhookActivity(
        webhookId,
        'processing_error',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Webhook processing error',
        retry: { delay: 10000 },
      };
    }
  }

  /**
   * Validate webhook payload structure based on provider
   */
  private validateWebhookPayload(
    provider: string,
    payload: any
  ): {
    valid: boolean;
    error?: string;
    processedPayload?: any;
  } {
    try {
      // Basic structure validation
      if (!payload || typeof payload !== 'object') {
        return { valid: false, error: 'Payload must be a valid object' };
      }

      // Provider-specific validation
      switch (provider.toLowerCase()) {
        case 'netflix':
          return this.validateNetflixWebhook(payload);
        case 'spotify':
          return this.validateSpotifyWebhook(payload);
        case 'adobe':
          return this.validateAdobeWebhook(payload);
        case 'stripe':
          return this.validateStripeWebhook(payload);
        default:
          return this.validateGenericWebhook(payload);
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation error',
      };
    }
  }

  /**
   * Verify webhook authenticity
   */
  private async verifyWebhookAuthenticity(
    provider: string,
    payload: any,
    headers?: any
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check timestamp to prevent replay attacks
      const timestamp = payload.timestamp || headers?.['x-timestamp'];
      if (timestamp) {
        const now = Date.now();
        const webhookTime = new Date(timestamp).getTime();
        const timeDiff = Math.abs(now - webhookTime);

        // Reject webhooks older than 5 minutes
        if (timeDiff > 300000) {
          return { valid: false, error: 'Webhook timestamp too old' };
        }
      }

      // Provider-specific signature verification
      switch (provider.toLowerCase()) {
        case 'stripe':
          return this.verifyStripeSignature(payload, headers);
        default:
          // For demo providers, we'll simulate signature verification
          return this.simulateSignatureVerification(provider, payload, headers);
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Authentication error',
      };
    }
  }

  /**
   * Extract relevant data from webhook payload
   */
  private extractWebhookData(
    provider: string,
    payload: any
  ): {
    success: boolean;
    data?: any;
    error?: string;
  } {
    try {
      switch (provider.toLowerCase()) {
        case 'netflix':
          return this.extractNetflixData(payload);
        case 'spotify':
          return this.extractSpotifyData(payload);
        case 'adobe':
          return this.extractAdobeData(payload);
        case 'stripe':
          return this.extractStripeData(payload);
        default:
          return this.extractGenericData(payload);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Data extraction error',
      };
    }
  }

  /**
   * Store webhook processing result
   */
  private async storeWebhookResult(
    webhookId: string,
    provider: string,
    data: any,
    requestId?: string
  ): Promise<void> {
    // In a real implementation, you might have a webhooks table
    // For now, we'll store in audit logs
    await AuditLogger.log({
      userId: data.userId || 'system',
      action: 'webhook.processed',
      resource: webhookId,
      result: 'success',
      metadata: {
        provider,
        requestId,
        webhookData: data,
      },
    });
  }

  /**
   * Provider-specific webhook validators
   */
  private validateNetflixWebhook(payload: any): {
    valid: boolean;
    error?: string;
    processedPayload?: any;
  } {
    const requiredFields = ['event_type', 'subscription_id', 'user_id'];

    for (const field of requiredFields) {
      if (!payload[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    if (
      !['subscription.cancelled', 'subscription.updated'].includes(
        payload.event_type
      )
    ) {
      return { valid: false, error: 'Invalid event type' };
    }

    return {
      valid: true,
      processedPayload: {
        eventType: payload.event_type,
        subscriptionId: payload.subscription_id,
        userId: payload.user_id,
        effectiveDate: payload.effective_date,
        cancellationReason: payload.cancellation_reason,
      },
    };
  }

  private validateSpotifyWebhook(payload: any): {
    valid: boolean;
    error?: string;
    processedPayload?: any;
  } {
    if (!payload.type || !payload.data) {
      return { valid: false, error: 'Missing type or data field' };
    }

    if (payload.type !== 'subscription.cancelled') {
      return { valid: false, error: 'Invalid event type' };
    }

    return {
      valid: true,
      processedPayload: {
        eventType: payload.type,
        subscriptionId: payload.data.subscription_id,
        userId: payload.data.user_id,
        cancelledAt: payload.data.cancelled_at,
      },
    };
  }

  private validateAdobeWebhook(payload: any): {
    valid: boolean;
    error?: string;
    processedPayload?: any;
  } {
    if (!payload.event?.type) {
      return { valid: false, error: 'Missing event type' };
    }

    return {
      valid: true,
      processedPayload: {
        eventType: payload.event.type,
        subscriptionId: payload.event.data?.subscription_id,
        customerId: payload.event.data?.customer_id,
        timestamp: payload.event.created,
      },
    };
  }

  private validateStripeWebhook(payload: any): {
    valid: boolean;
    error?: string;
    processedPayload?: any;
  } {
    if (!payload.type || !payload.data) {
      return { valid: false, error: 'Missing type or data field' };
    }

    const validTypes = [
      'customer.subscription.deleted',
      'customer.subscription.updated',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
    ];

    if (!validTypes.includes(payload.type)) {
      return { valid: false, error: 'Invalid event type' };
    }

    return {
      valid: true,
      processedPayload: payload,
    };
  }

  private validateGenericWebhook(payload: any): {
    valid: boolean;
    error?: string;
    processedPayload?: any;
  } {
    // Basic validation for unknown providers
    if (!payload.event_type && !payload.type) {
      return { valid: false, error: 'Missing event type' };
    }

    return { valid: true, processedPayload: payload };
  }

  /**
   * Provider-specific data extractors
   */
  private extractNetflixData(payload: any): {
    success: boolean;
    data?: any;
    error?: string;
  } {
    return {
      success: true,
      data: {
        provider: 'netflix',
        eventType: payload.eventType,
        subscriptionId: payload.subscriptionId,
        userId: payload.userId,
        status:
          payload.eventType === 'subscription.cancelled'
            ? 'cancelled'
            : 'updated',
        effectiveDate: payload.effectiveDate
          ? new Date(payload.effectiveDate)
          : new Date(),
        metadata: {
          cancellationReason: payload.cancellationReason,
          originalPayload: payload,
        },
      },
    };
  }

  private extractSpotifyData(payload: any): {
    success: boolean;
    data?: any;
    error?: string;
  } {
    return {
      success: true,
      data: {
        provider: 'spotify',
        eventType: payload.eventType,
        subscriptionId: payload.subscriptionId,
        userId: payload.userId,
        status: 'cancelled',
        effectiveDate: payload.cancelledAt
          ? new Date(payload.cancelledAt)
          : new Date(),
        metadata: {
          originalPayload: payload,
        },
      },
    };
  }

  private extractAdobeData(payload: any): {
    success: boolean;
    data?: any;
    error?: string;
  } {
    return {
      success: true,
      data: {
        provider: 'adobe',
        eventType: payload.eventType,
        subscriptionId: payload.subscriptionId,
        customerId: payload.customerId,
        status: payload.eventType.includes('cancel') ? 'cancelled' : 'updated',
        effectiveDate: payload.timestamp
          ? new Date(payload.timestamp)
          : new Date(),
        metadata: {
          originalPayload: payload,
        },
      },
    };
  }

  private extractStripeData(payload: any): {
    success: boolean;
    data?: any;
    error?: string;
  } {
    const subscription = payload.data?.object;

    return {
      success: true,
      data: {
        provider: 'stripe',
        eventType: payload.type,
        subscriptionId: subscription?.id,
        customerId: subscription?.customer,
        status: subscription?.status,
        effectiveDate: subscription?.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : new Date(),
        metadata: {
          stripeEvent: payload,
        },
      },
    };
  }

  private extractGenericData(payload: any): {
    success: boolean;
    data?: any;
    error?: string;
  } {
    return {
      success: true,
      data: {
        provider: 'generic',
        eventType: payload.event_type || payload.type || 'unknown',
        rawPayload: payload,
        effectiveDate: new Date(),
        metadata: {
          originalPayload: payload,
        },
      },
    };
  }

  /**
   * Signature verification methods
   */
  private verifyStripeSignature(
    payload: any,
    headers: any
  ): { valid: boolean; error?: string } {
    // In a real implementation, you'd verify the Stripe signature
    // using the webhook secret and the stripe library
    const signature = headers?.['stripe-signature'];

    if (!signature) {
      return { valid: false, error: 'Missing Stripe signature' };
    }

    // Simulate signature verification
    return { valid: true };
  }

  private simulateSignatureVerification(
    provider: string,
    payload: any,
    headers: any
  ): { valid: boolean; error?: string } {
    // Simulate signature verification for demo providers
    const signature =
      headers?.['x-signature'] || headers?.['x-webhook-signature'];

    // For demo purposes, we'll accept webhooks with any signature or no signature
    // In production, you'd implement proper signature verification
    return { valid: true };
  }

  /**
   * Log webhook activity
   */
  private async logWebhookActivity(
    webhookId: string,
    action: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    try {
      await AuditLogger.log({
        userId: 'system',
        action: `webhook.${action}` as any,
        resource: webhookId,
        result:
          action.includes('error') || action.includes('failed')
            ? 'failure'
            : 'success',
        metadata: {
          webhookId,
          message,
          ...metadata,
        },
      });
    } catch (error) {
      console.error('[WebhookProcessor] Failed to log activity:', error);
    }
  }

  /**
   * Process webhook timeout (for webhooks that don't arrive)
   */
  async processWebhookTimeout(job: Job): Promise<JobResult> {
    const { requestId, expectedWebhookId, timeoutReason } = job.data;

    try {
      // Find the cancellation request
      const request = await this.db.cancellationRequest.findUnique({
        where: { id: requestId },
        include: { subscription: true },
      });

      if (!request) {
        return {
          success: false,
          error: 'Cancellation request not found',
          retry: false,
        };
      }

      // If still waiting for webhook, mark as timeout and fallback to manual
      if (request.status === 'processing') {
        await this.db.cancellationRequest.update({
          where: { id: requestId },
          data: {
            status: 'failed',
            errorCode: 'WEBHOOK_TIMEOUT',
            errorMessage: timeoutReason || 'Webhook confirmation timeout',
            errorDetails: {
              expectedWebhookId,
              timeoutAt: new Date(),
            },
          },
        });

        await this.logWebhookActivity(
          expectedWebhookId,
          'timeout',
          `Webhook timeout for request ${requestId}: ${timeoutReason}`
        );

        // Emit timeout event to trigger fallback
        emitCancellationEvent('cancellation.failed', {
          requestId,
          userId: request.userId,
          error: 'Webhook confirmation timeout - trying manual fallback',
          attempt: request.attempts,
          willRetry: false,
        });

        return {
          success: true,
          data: {
            requestId,
            action: 'timeout_handled',
            fallbackRequired: true,
          },
        };
      }

      return {
        success: true,
        data: {
          requestId,
          action: 'no_action_needed',
          currentStatus: request.status,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Timeout processing error',
        retry: { delay: 30000 },
      };
    }
  }
}
