import type { PrismaClient } from '@prisma/client';
import { emitCancellationEvent } from '@/server/lib/event-bus';
import type { Job, JobResult } from '@/server/lib/job-queue';
import { AuditLogger, type SecurityAction } from '@/server/lib/audit-logger';

// External service webhook interfaces
interface NetflixWebhookPayload {
  event_type: 'subscription.cancelled' | 'subscription.updated';
  subscription_id: string;
  user_id: string;
  effective_date?: string;
  cancellation_reason?: string;
  timestamp?: string;
}

interface SpotifyWebhookPayload {
  type: 'subscription.cancelled' | 'subscription.updated';
  data: {
    subscription_id: string;
    user_id: string;
    cancelled_at?: string;
    updated_at?: string;
  };
  timestamp?: string;
}

interface AdobeWebhookPayload {
  event: {
    type: string;
    data?: {
      subscription_id?: string;
      customer_id?: string;
    };
    created?: string;
  };
  timestamp?: string;
}

interface StripeWebhookPayload {
  type:
    | 'customer.subscription.deleted'
    | 'customer.subscription.updated'
    | 'invoice.payment_succeeded'
    | 'invoice.payment_failed';
  data: {
    object: {
      id?: string;
      customer?: string;
      status?: string;
      canceled_at?: number;
      current_period_start?: number;
      current_period_end?: number;
    };
  };
  timestamp?: string;
}

type WebhookPayload =
  | NetflixWebhookPayload
  | SpotifyWebhookPayload
  | AdobeWebhookPayload
  | StripeWebhookPayload
  | Record<string, unknown>;

interface WebhookHeaders {
  'x-timestamp'?: string | string[];
  'plaid-verification-key-id'?: string | string[];
  'stripe-signature'?: string | string[];
  'x-signature'?: string | string[];
  'x-webhook-signature'?: string | string[];
  [key: string]: string | string[] | undefined;
}

interface WebhookValidationResult {
  valid: boolean;
  error?: string;
  processedPayload?: WebhookPayload;
}

interface WebhookDataExtractionResult {
  success: boolean;
  data?: ExtractedWebhookData;
  error?: string;
}

interface ExtractedWebhookData {
  provider: string;
  eventType: string;
  subscriptionId?: string;
  userId?: string;
  customerId?: string;
  status: string;
  effectiveDate: Date;
  metadata: {
    cancellationReason?: string;
    originalPayload: WebhookPayload;
    [key: string]: unknown;
  };
}

// Helper function to map webhook actions to security actions
function mapWebhookActionToSecurityAction(action: string): SecurityAction {
  switch (action) {
    case 'signature_verification_failed':
      return 'webhook.signature_verification_failed';
    case 'cancellation_request_not_found':
      return 'webhook.cancellation_request_not_found';
    case 'cancellation_confirmed':
      return 'webhook.cancellation_confirmed';
    default:
      // Default to a generic webhook action
      return 'webhook.signature_verification_failed';
  }
}

/**
 * Job processor for webhook-related tasks
 */
export class WebhookJobProcessor {
  constructor(private db: PrismaClient) {}

  /**
   * Process webhook validation job
   */
  async processWebhookValidation(job: Job): Promise<JobResult> {
    const data = job.data as {
      webhookId: string;
      provider: string;
      payload: unknown;
      requestId: string;
      headers: unknown;
    };
    const { webhookId, provider, payload, requestId } = data;

    try {
      // Validate webhook payload structure
      const validation = this.validateWebhookPayload(provider, payload as any);

      if (!validation.valid) {
        await this.logWebhookActivity(
          webhookId,
          'validation_failed',
          validation.error ?? 'Invalid payload'
        );

        return {
          success: false,
          error: validation.error ?? 'Webhook validation failed',
          retry: false, // Don't retry invalid webhooks
        };
      }

      // Verify webhook authenticity (signature, timestamp, etc.)
      const authValidation = await this.verifyWebhookAuthenticity(
        provider,
        payload as any,
        data.headers as any
      );

      if (!authValidation.valid) {
        await this.logWebhookActivity(
          webhookId,
          'auth_failed',
          authValidation.error ?? 'Authentication failed'
        );

        return {
          success: false,
          error: authValidation.error ?? 'Webhook authentication failed',
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
          validatedPayload: validation.processedPayload ?? payload,
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
    const webhookIdStr = webhookId as string;

    try {
      // Extract relevant data based on provider type
      const extractedData = this.extractWebhookData(provider as string, payload as any);

      if (!extractedData.success) {
        await this.logWebhookActivity(
          webhookIdStr,
          'extraction_failed',
          extractedData.error ?? 'Data extraction failed'
        );

        return {
          success: false,
          error: extractedData.error ?? 'Failed to extract webhook data',
          retry: false,
        };
      }

      // Store webhook processing result
      await this.storeWebhookResult(
        webhookIdStr,
        provider as string,
        extractedData.data as any,
        requestId as string
      );

      await this.logWebhookActivity(
        webhookIdStr,
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
        webhookIdStr,
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
    payload: WebhookPayload
  ): WebhookValidationResult {
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
    payload: WebhookPayload,
    headers?: WebhookHeaders
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check timestamp to prevent replay attacks
      const timestamp = payload.timestamp ?? headers?.['x-timestamp'];
      if (timestamp) {
        const now = Date.now();
        const webhookTime = new Date(timestamp as string | number | Date).getTime();
        const timeDiff = Math.abs(now - webhookTime);

        // Reject webhooks older than 5 minutes
        if (timeDiff > 300000) {
          return { valid: false, error: 'Webhook timestamp too old' };
        }
      }

      // Provider-specific signature verification
      switch (provider.toLowerCase()) {
        case 'stripe':
          return this.verifyStripeSignature(payload, headers || {});
        default:
          // For demo providers, we'll simulate signature verification
          return this.simulateSignatureVerification(provider, payload, headers || {});
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
    payload: WebhookPayload
  ): WebhookDataExtractionResult {
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
    data: ExtractedWebhookData,
    requestId?: string
  ): Promise<void> {
    // In a real implementation, you might have a webhooks table
    // For now, we'll store in audit logs
    await AuditLogger.log({
      userId: data.userId ?? 'system',
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
  private validateNetflixWebhook(
    payload: WebhookPayload
  ): WebhookValidationResult {
    const netflixPayload = payload as NetflixWebhookPayload;
    const requiredFields: (keyof NetflixWebhookPayload)[] = [
      'event_type',
      'subscription_id',
      'user_id',
    ];

    for (const field of requiredFields) {
      if (!netflixPayload[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    if (
      !['subscription.cancelled', 'subscription.updated'].includes(
        netflixPayload.event_type
      )
    ) {
      return { valid: false, error: 'Invalid event type' };
    }

    return {
      valid: true,
      processedPayload: {
        eventType: netflixPayload.event_type,
        subscriptionId: netflixPayload.subscription_id,
        userId: netflixPayload.user_id,
        effectiveDate: netflixPayload.effective_date,
        cancellationReason: netflixPayload.cancellation_reason,
      },
    };
  }

  private validateSpotifyWebhook(
    payload: WebhookPayload
  ): WebhookValidationResult {
    const spotifyPayload = payload as SpotifyWebhookPayload;
    if (!spotifyPayload.type || !spotifyPayload.data) {
      return { valid: false, error: 'Missing type or data field' };
    }

    if (spotifyPayload.type !== 'subscription.cancelled') {
      return { valid: false, error: 'Invalid event type' };
    }

    return {
      valid: true,
      processedPayload: {
        eventType: spotifyPayload.type,
        subscriptionId: spotifyPayload.data.subscription_id,
        userId: spotifyPayload.data.user_id,
        cancelledAt: spotifyPayload.data.cancelled_at,
      },
    };
  }

  private validateAdobeWebhook(
    payload: WebhookPayload
  ): WebhookValidationResult {
    const adobePayload = payload as AdobeWebhookPayload;
    if (!adobePayload.event?.type) {
      return { valid: false, error: 'Missing event type' };
    }

    return {
      valid: true,
      processedPayload: {
        eventType: adobePayload.event.type,
        subscriptionId: adobePayload.event.data?.subscription_id,
        customerId: adobePayload.event.data?.customer_id,
        timestamp: adobePayload.event.created,
      },
    };
  }

  private validateStripeWebhook(
    payload: WebhookPayload
  ): WebhookValidationResult {
    const stripePayload = payload as StripeWebhookPayload;
    if (!stripePayload.type || !stripePayload.data) {
      return { valid: false, error: 'Missing type or data field' };
    }

    const validTypes: StripeWebhookPayload['type'][] = [
      'customer.subscription.deleted',
      'customer.subscription.updated',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
    ];

    if (!validTypes.includes(stripePayload.type)) {
      return { valid: false, error: 'Invalid event type' };
    }

    return {
      valid: true,
      processedPayload: stripePayload,
    };
  }

  private validateGenericWebhook(
    payload: WebhookPayload
  ): WebhookValidationResult {
    // Basic validation for unknown providers
    const genericPayload = payload as Record<string, unknown>;
    if (!genericPayload.event_type && !genericPayload.type) {
      return { valid: false, error: 'Missing event type' };
    }

    return { valid: true, processedPayload: payload };
  }

  /**
   * Provider-specific data extractors
   */
  private extractNetflixData(
    payload: WebhookPayload
  ): WebhookDataExtractionResult {
    const netflixPayload = payload as Record<string, unknown>;
    return {
      success: true,
      data: {
        provider: 'netflix',
        eventType: netflixPayload.eventType as string,
        subscriptionId: netflixPayload.subscriptionId as string,
        userId: netflixPayload.userId as string,
        status:
          netflixPayload.eventType === 'subscription.cancelled'
            ? 'cancelled'
            : 'updated',
        effectiveDate: netflixPayload.effectiveDate
          ? new Date(netflixPayload.effectiveDate as string)
          : new Date(),
        metadata: {
          cancellationReason: netflixPayload.cancellationReason as string,
          originalPayload: payload,
        },
      },
    };
  }

  private extractSpotifyData(
    payload: WebhookPayload
  ): WebhookDataExtractionResult {
    const spotifyPayload = payload as Record<string, unknown>;
    return {
      success: true,
      data: {
        provider: 'spotify',
        eventType: spotifyPayload.eventType as string,
        subscriptionId: spotifyPayload.subscriptionId as string,
        userId: spotifyPayload.userId as string,
        status: 'cancelled',
        effectiveDate: spotifyPayload.cancelledAt
          ? new Date(spotifyPayload.cancelledAt as string)
          : new Date(),
        metadata: {
          originalPayload: payload,
        },
      },
    };
  }

  private extractAdobeData(
    payload: WebhookPayload
  ): WebhookDataExtractionResult {
    const adobePayload = payload as Record<string, unknown>;
    return {
      success: true,
      data: {
        provider: 'adobe',
        eventType: adobePayload.eventType as string,
        subscriptionId: adobePayload.subscriptionId as string,
        customerId: adobePayload.customerId as string,
        status: (adobePayload.eventType as string).includes('cancel')
          ? 'cancelled'
          : 'updated',
        effectiveDate: adobePayload.timestamp
          ? new Date(adobePayload.timestamp as string)
          : new Date(),
        metadata: {
          originalPayload: payload,
        },
      },
    };
  }

  private extractStripeData(
    payload: WebhookPayload
  ): WebhookDataExtractionResult {
    const stripePayload = payload as StripeWebhookPayload;
    const subscription = stripePayload.data?.object;

    return {
      success: true,
      data: {
        provider: 'stripe',
        eventType: stripePayload.type,
        subscriptionId: subscription?.id,
        customerId: subscription?.customer,
        status: subscription?.status ?? 'unknown',
        effectiveDate: subscription?.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : new Date(),
        metadata: {
          stripeEvent: payload,
          originalPayload: payload,
        },
      },
    };
  }

  private extractGenericData(
    payload: WebhookPayload
  ): WebhookDataExtractionResult {
    const genericPayload = payload as Record<string, unknown>;
    return {
      success: true,
      data: {
        provider: 'generic',
        eventType: (genericPayload.event_type ??
          genericPayload.type ??
          'unknown') as string,
        status: 'unknown',
        effectiveDate: new Date(),
        metadata: {
          rawPayload: payload,
          originalPayload: payload,
        },
      },
    };
  }

  /**
   * Signature verification methods
   */
  private verifyStripeSignature(
    payload: WebhookPayload,
    headers: WebhookHeaders
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
    _provider: string,
    _payload: WebhookPayload,
    _headers: WebhookHeaders
  ): { valid: boolean; error?: string } {
    // Simulate signature verification for demo providers
    // In production, you'd verify the signature from headers
    // For demo purposes, we'll accept webhooks with any signature or no signature
    return { valid: true };
  }

  /**
   * Log webhook activity
   */
  private async logWebhookActivity(
    webhookId: string,
    action: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await AuditLogger.log({
        userId: 'system',
        action: mapWebhookActionToSecurityAction(action),
        resource: webhookId,
        result:
          (action.includes('error') ?? action.includes('failed'))
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
            errorMessage: timeoutReason ?? 'Webhook confirmation timeout',
            errorDetails: {
              expectedWebhookId: expectedWebhookId as string,
              timeoutAt: new Date(),
            } as any,
          },
        });

        await this.logWebhookActivity(
          expectedWebhookId as string,
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
