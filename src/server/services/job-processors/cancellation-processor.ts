import type { PrismaClient } from '@prisma/client';
import { CancellationService } from '../cancellation.service';
import { emitCancellationEvent } from '@/server/lib/event-bus';
import type { Job, JobResult } from '@/server/lib/job-queue';
import { AuditLogger } from '@/server/lib/audit-logger';
import { Prisma } from '@prisma/client';

/**
 * Job processor for cancellation-related tasks
 */
export class CancellationJobProcessor {
  constructor(private db: PrismaClient) {}

  /**
   * Process cancellation validation job
   */
  async processCancellationValidation(job: Job): Promise<JobResult> {
    const { requestId, userId } = job.data;

    try {
      // Validate that the cancellation request exists and is valid
      const request = await this.db.cancellationRequest.findFirst({
        where: {
          id: requestId,
          userId,
          status: { in: ['pending', 'processing'] },
        },
        include: {
          subscription: true,
          user: true,
        },
      });

      if (!request) {
        return {
          success: false,
          error: 'Cancellation request not found or invalid',
          retry: false,
        };
      }

      // Check if subscription is still active
      if (request.subscription.status === 'cancelled') {
        await this.db.cancellationRequest.update({
          where: { id: requestId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            errorMessage: 'Subscription already cancelled',
          },
        });

        return {
          success: false,
          error: 'Subscription already cancelled',
          retry: false,
        };
      }

      // Validation passed
      await this.db.cancellationLog.create({
        data: {
          requestId,
          action: 'validation_passed',
          status: 'success',
          message: 'Cancellation request validation completed successfully',
        },
      });

      return {
        success: true,
        data: {
          requestId,
          subscriptionId: request.subscriptionId,
          method: request.method,
          providerId: request.providerId,
        },
      };
    } catch (error) {
      await this.logError(requestId, 'validation_failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        retry: { delay: 5000 },
      };
    }
  }

  /**
   * Process API cancellation job
   */
  async processApiCancellation(job: Job): Promise<JobResult> {
    const { requestId, userId, method } = job.data;

    try {
      const request = await this.db.cancellationRequest.findFirst({
        where: { id: requestId, userId },
        include: {
          subscription: true,
          provider: true,
        },
      });

      if (!request) {
        return {
          success: false,
          error: 'Cancellation request not found',
          retry: false,
        };
      }

      await this.db.cancellationLog.create({
        data: {
          requestId,
          action: 'api_cancellation_started',
          status: 'info',
          message: `Starting API cancellation for provider: ${request.provider?.name || 'unknown'}`,
        },
      });

      // Simulate API cancellation process
      const apiResult = await this.callProviderApi(request);

      if (apiResult.success) {
        // Update request with success data
        await this.db.cancellationRequest.update({
          where: { id: requestId },
          data: {
            status: 'completed',
            confirmationCode: apiResult.confirmationCode,
            effectiveDate: apiResult.effectiveDate,
            refundAmount: apiResult.refundAmount 
              ? new Prisma.Decimal(apiResult.refundAmount) 
              : null,
            completedAt: new Date(),
          },
        });

        // Update subscription status
        await this.db.subscription.update({
          where: { id: request.subscriptionId },
          data: {
            status: 'cancelled',
            isActive: false,
            cancellationInfo: {
              requestId,
              method: 'api',
              confirmationCode: apiResult.confirmationCode,
              effectiveDate: apiResult.effectiveDate,
            },
          },
        });

        await this.db.cancellationLog.create({
          data: {
            requestId,
            action: 'api_cancellation_completed',
            status: 'success',
            message: `API cancellation completed. Confirmation: ${apiResult.confirmationCode}`,
            metadata: apiResult,
          },
        });

        // Emit success event
        emitCancellationEvent('cancellation.completed', {
          requestId,
          userId,
          confirmationCode: apiResult.confirmationCode,
          effectiveDate: apiResult.effectiveDate,
          refundAmount: apiResult.refundAmount,
          processingTime: Date.now() - request.createdAt.getTime(),
        });

        return {
          success: true,
          data: apiResult,
        };
      } else {
        // API failed, but might be retryable
        await this.logError(requestId, 'api_cancellation_failed', new Error(apiResult.error));

        return {
          success: false,
          error: apiResult.error,
          retry: apiResult.retryable ? { delay: 10000 } : false,
        };
      }
    } catch (error) {
      await this.logError(requestId, 'api_cancellation_error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API cancellation failed',
        retry: { delay: 15000 },
      };
    }
  }

  /**
   * Process webhook cancellation job
   */
  async processWebhookCancellation(job: Job): Promise<JobResult> {
    const { requestId, userId } = job.data;

    try {
      const request = await this.db.cancellationRequest.findFirst({
        where: { id: requestId, userId },
        include: {
          subscription: true,
          provider: true,
        },
      });

      if (!request) {
        return {
          success: false,
          error: 'Cancellation request not found',
          retry: false,
        };
      }

      await this.db.cancellationLog.create({
        data: {
          requestId,
          action: 'webhook_cancellation_initiated',
          status: 'info',
          message: 'Webhook cancellation initiated, waiting for confirmation',
        },
      });

      // Simulate webhook initiation
      const webhookResult = await this.initiateWebhookCancellation(request);

      if (webhookResult.success) {
        // Update status to processing - we'll wait for webhook confirmation
        await this.db.cancellationRequest.update({
          where: { id: requestId },
          data: {
            status: 'processing',
            // Store webhook info in error details temporarily
            errorDetails: {
              webhookId: webhookResult.webhookId,
              expectedConfirmation: webhookResult.expectedAt,
            },
          },
        });

        return {
          success: true,
          data: {
            webhookId: webhookResult.webhookId,
            status: 'processing',
          },
        };
      } else {
        return {
          success: false,
          error: webhookResult.error,
          retry: webhookResult.retryable ? { delay: 20000 } : false,
        };
      }
    } catch (error) {
      await this.logError(requestId, 'webhook_cancellation_error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook cancellation failed',
        retry: { delay: 20000 },
      };
    }
  }

  /**
   * Process manual instructions generation job
   */
  async processManualInstructions(job: Job): Promise<JobResult> {
    const { requestId, userId } = job.data;

    try {
      const request = await this.db.cancellationRequest.findFirst({
        where: { id: requestId, userId },
        include: {
          subscription: true,
          provider: true,
        },
      });

      if (!request) {
        return {
          success: false,
          error: 'Cancellation request not found',
          retry: false,
        };
      }

      // Generate manual cancellation instructions
      const instructions = this.generateManualInstructions(
        request.subscription,
        request.provider
      );

      // Update request with manual instructions
      await this.db.cancellationRequest.update({
        where: { id: requestId },
        data: {
          status: 'pending',
          method: 'manual',
          manualInstructions: instructions,
        },
      });

      await this.db.cancellationLog.create({
        data: {
          requestId,
          action: 'manual_instructions_generated',
          status: 'success',
          message: 'Manual cancellation instructions generated',
          metadata: { instructionType: instructions.type },
        },
      });

      // Emit manual required event
      emitCancellationEvent('cancellation.manual_required', {
        requestId,
        userId,
        instructions,
        estimatedTime: instructions.estimatedTime,
      });

      return {
        success: true,
        data: {
          instructions,
          status: 'manual_required',
        },
      };
    } catch (error) {
      await this.logError(requestId, 'manual_instructions_error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate instructions',
        retry: { delay: 5000 },
      };
    }
  }

  /**
   * Process cancellation confirmation job
   */
  async processCancellationConfirmation(job: Job): Promise<JobResult> {
    const { requestId, userId } = job.data;

    try {
      const request = await this.db.cancellationRequest.findFirst({
        where: { id: requestId, userId },
        include: {
          subscription: true,
        },
      });

      if (!request) {
        return {
          success: false,
          error: 'Cancellation request not found',
          retry: false,
        };
      }

      // Verify cancellation was actually completed
      if (request.status !== 'completed') {
        return {
          success: false,
          error: 'Cancellation not completed yet',
          retry: { delay: 30000 },
        };
      }

      // Final confirmation tasks
      await this.db.cancellationLog.create({
        data: {
          requestId,
          action: 'cancellation_confirmed',
          status: 'success',
          message: 'Cancellation confirmed and finalized',
        },
      });

      // Log audit trail
      await AuditLogger.log({
        userId,
        action: 'cancellation.confirmed',
        resource: requestId,
        result: 'success',
        metadata: {
          subscriptionId: request.subscriptionId,
          method: request.method,
          confirmationCode: request.confirmationCode,
        },
      });

      return {
        success: true,
        data: {
          confirmed: true,
          confirmationCode: request.confirmationCode,
          effectiveDate: request.effectiveDate,
        },
      };
    } catch (error) {
      await this.logError(requestId, 'confirmation_error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Confirmation failed',
        retry: { delay: 10000 },
      };
    }
  }

  /**
   * Process status update job
   */
  async processStatusUpdate(job: Job): Promise<JobResult> {
    const { requestId, userId, status, data: updateData = {} } = job.data;

    try {
      const updates: any = {
        status,
        updatedAt: new Date(),
      };

      // Add additional data based on status
      if (status === 'completed') {
        updates.completedAt = new Date();
        if (updateData.confirmationCode) {
          updates.confirmationCode = updateData.confirmationCode;
        }
        if (updateData.effectiveDate) {
          updates.effectiveDate = new Date(updateData.effectiveDate);
        }
        if (updateData.refundAmount) {
          updates.refundAmount = new Prisma.Decimal(updateData.refundAmount);
        }
      } else if (status === 'failed') {
        if (updateData.error) {
          updates.errorMessage = updateData.error;
          updates.errorCode = updateData.errorCode || 'PROCESSING_ERROR';
        }
      }

      // Update the cancellation request
      const updatedRequest = await this.db.cancellationRequest.update({
        where: {
          id: requestId,
          userId, // Ensure user owns the request
        },
        data: updates,
        include: {
          subscription: true,
        },
      });

      // Update subscription if cancellation completed
      if (status === 'completed') {
        await this.db.subscription.update({
          where: { id: updatedRequest.subscriptionId },
          data: {
            status: 'cancelled',
            isActive: false,
            cancellationInfo: {
              requestId,
              method: updatedRequest.method,
              confirmationCode: updatedRequest.confirmationCode,
              effectiveDate: updatedRequest.effectiveDate,
              completedAt: new Date(),
            },
          },
        });
      }

      await this.db.cancellationLog.create({
        data: {
          requestId,
          action: 'status_updated',
          status: 'success',
          message: `Status updated to: ${status}`,
          metadata: updateData,
        },
      });

      return {
        success: true,
        data: {
          status,
          requestId,
          updatedAt: updates.updatedAt,
        },
      };
    } catch (error) {
      await this.logError(requestId, 'status_update_error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status update failed',
        retry: { delay: 5000 },
      };
    }
  }

  // Helper methods

  /**
   * Simulate calling provider API for cancellation
   */
  private async callProviderApi(request: any): Promise<{
    success: boolean;
    confirmationCode?: string;
    effectiveDate?: Date;
    refundAmount?: number;
    error?: string;
    retryable?: boolean;
  }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    // Simulate success/failure based on provider type
    const successRate = request.provider?.type === 'api' ? 0.8 : 0.6;
    const success = Math.random() < successRate;

    if (success) {
      const confirmationCode = `API-${Date.now().toString().slice(-8)}`;
      const effectiveDate = new Date();
      effectiveDate.setDate(effectiveDate.getDate() + 1); // Effective tomorrow

      // Sometimes include refund
      const refundAmount = Math.random() < 0.3 
        ? parseFloat(request.subscription.amount.toString()) 
        : undefined;

      return {
        success: true,
        confirmationCode,
        effectiveDate,
        refundAmount,
      };
    } else {
      const errors = [
        'Invalid credentials',
        'Service temporarily unavailable',
        'Account not found',
        'Cancellation not allowed',
        'Rate limit exceeded',
      ];

      const error = errors[Math.floor(Math.random() * errors.length)]!;
      const retryable = !error.includes('not allowed') && !error.includes('not found');

      return {
        success: false,
        error,
        retryable,
      };
    }
  }

  /**
   * Simulate initiating webhook cancellation
   */
  private async initiateWebhookCancellation(request: any): Promise<{
    success: boolean;
    webhookId?: string;
    expectedAt?: Date;
    error?: string;
    retryable?: boolean;
  }> {
    // Simulate webhook initiation delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const success = Math.random() < 0.7; // 70% success rate

    if (success) {
      const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const expectedAt = new Date();
      expectedAt.setMinutes(expectedAt.getMinutes() + 5); // Expect confirmation in 5 minutes

      return {
        success: true,
        webhookId,
        expectedAt,
      };
    } else {
      const errors = [
        'Webhook endpoint not configured',
        'Provider service unavailable',
        'Authentication failed',
        'Invalid request format',
      ];

      const error = errors[Math.floor(Math.random() * errors.length)]!;
      const retryable = !error.includes('not configured') && !error.includes('Invalid');

      return {
        success: false,
        error,
        retryable,
      };
    }
  }

  /**
   * Generate manual cancellation instructions
   */
  private generateManualInstructions(subscription: any, provider: any) {
    const baseInstructions = {
      type: 'manual',
      service: subscription.name,
      amount: parseFloat(subscription.amount.toString()),
      frequency: subscription.frequency,
      steps: [
        'Visit the service website or app',
        'Sign into your account',
        'Navigate to account settings or billing',
        'Look for subscription management',
        'Follow the cancellation process',
        'Save any confirmation codes or emails',
      ],
      tips: [
        'Cancel before your next billing date',
        'Take screenshots of confirmation pages',
        'Check for retention offers if interested',
        'Review refund policies',
      ],
      estimatedTime: '5-15 minutes',
    };

    if (provider) {
      return {
        ...baseInstructions,
        providerId: provider.id,
        providerName: provider.name,
        website: provider.loginUrl || `https://${subscription.name.toLowerCase()}.com`,
        phone: provider.phoneNumber,
        email: provider.email,
        chatUrl: provider.chatUrl,
        difficulty: provider.difficulty,
        estimatedTime: provider.averageTime 
          ? `${provider.averageTime} minutes` 
          : baseInstructions.estimatedTime,
        specificSteps: provider.instructions || [],
        requiresPhone: provider.phoneNumber && provider.difficulty === 'hard',
        supports2FA: provider.requires2FA,
        hasRetentionOffers: provider.requiresRetention,
      };
    }

    return baseInstructions;
  }

  /**
   * Log error with context
   */
  private async logError(requestId: string, action: string, error: any): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await this.db.cancellationLog.create({
      data: {
        requestId,
        action,
        status: 'failure',
        message: errorMessage,
        metadata: {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
      },
    });
  }
}