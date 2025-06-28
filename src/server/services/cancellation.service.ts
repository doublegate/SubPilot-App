import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@prisma/client';
import { AuditLogger } from '@/server/lib/audit-logger';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Input schemas for validation
export const CancellationRequestInput = z.object({
  subscriptionId: z.string(),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  notes: z.string().optional(),
});

export const ManualConfirmationInput = z.object({
  confirmationCode: z.string().optional(),
  effectiveDate: z.date().optional(),
  notes: z.string().optional(),
  refundAmount: z.number().optional(),
});

// Return types
export interface CancellationResult {
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  confirmationCode: string | null;
  effectiveDate: Date | null;
  refundAmount: number | null;
  manualInstructions: any | null;
  error: string | null;
}

export interface CancellationHistoryItem {
  id: string;
  subscription: {
    id: string;
    name: string;
    amount: number;
  };
  provider: {
    name: string;
    logo: string | null;
  } | null;
  status: string;
  method: string;
  confirmationCode: string | null;
  effectiveDate: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

export class CancellationService {
  constructor(private db: PrismaClient) {}

  /**
   * Initiate a subscription cancellation request
   */
  async initiateCancellation(
    userId: string,
    input: z.infer<typeof CancellationRequestInput>
  ): Promise<CancellationResult> {
    const validatedInput = CancellationRequestInput.parse(input);

    // Verify subscription exists and belongs to user
    const subscription = await this.db.subscription.findFirst({
      where: {
        id: validatedInput.subscriptionId,
        userId,
      },
      include: {
        user: true,
      },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found',
      });
    }

    if (subscription.status === 'cancelled') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Subscription is already cancelled',
      });
    }

    // Check for existing pending cancellation request
    const existingRequest = await this.db.cancellationRequest.findFirst({
      where: {
        subscriptionId: validatedInput.subscriptionId,
        userId,
        status: {
          in: ['pending', 'processing'],
        },
      },
    });

    if (existingRequest) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cancellation request already in progress',
      });
    }

    // Find the best cancellation provider for this subscription
    const provider = await this.findCancellationProvider(subscription.name);

    // Determine cancellation method based on provider
    const method = provider 
      ? this.determineCancellationMethod(provider)
      : 'manual';

    // Create cancellation request
    const request = await this.db.cancellationRequest.create({
      data: {
        userId,
        subscriptionId: validatedInput.subscriptionId,
        providerId: provider?.id,
        method,
        priority: validatedInput.priority,
        status: 'pending',
        attempts: 0,
        userNotes: validatedInput.notes,
      },
    });

    // Log the cancellation request
    await this.logCancellationActivity(request.id, 'initiated', 'info', 
      `Cancellation request created with method: ${method}`);

    // Audit log
    await AuditLogger.log({
      userId,
      action: 'cancellation.initiated',
      resource: request.id,
      result: 'success',
      metadata: {
        subscriptionId: validatedInput.subscriptionId,
        method,
        providerId: provider?.id,
      },
    });

    // Process the cancellation asynchronously
    const result = await this.processCancellation(request.id);

    return result;
  }

  /**
   * Process a cancellation request using the appropriate method
   */
  async processCancellation(requestId: string): Promise<CancellationResult> {
    const request = await this.db.cancellationRequest.findUnique({
      where: { id: requestId },
      include: {
        subscription: true,
        provider: true,
      },
    });

    if (!request) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Cancellation request not found',
      });
    }

    try {
      // Update status to processing
      await this.db.cancellationRequest.update({
        where: { id: requestId },
        data: {
          status: 'processing',
          lastAttemptAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      await this.logCancellationActivity(requestId, 'processing_started', 'info',
        `Starting cancellation process using method: ${request.method}`);

      let result: CancellationResult;

      switch (request.method) {
        case 'api':
          result = await this.processApiCancellation(request);
          break;
        case 'webhook':
          result = await this.processWebhookCancellation(request);
          break;
        case 'manual':
        default:
          result = await this.processManualCancellation(request);
          break;
      }

      // Update the request with results
      await this.db.cancellationRequest.update({
        where: { id: requestId },
        data: {
          status: result.status,
          confirmationCode: result.confirmationCode,
          effectiveDate: result.effectiveDate,
          refundAmount: result.refundAmount ? new Prisma.Decimal(result.refundAmount) : null,
          manualInstructions: result.manualInstructions || {},
          completedAt: result.status === 'completed' ? new Date() : null,
          errorCode: result.error ? 'PROCESSING_ERROR' : null,
          errorMessage: result.error,
        },
      });

      // Update subscription if cancellation was successful
      if (result.status === 'completed') {
        await this.db.subscription.update({
          where: { id: request.subscriptionId },
          data: {
            status: 'cancelled',
            isActive: false,
            cancellationInfo: {
              requestId,
              confirmationCode: result.confirmationCode,
              effectiveDate: result.effectiveDate,
              method: request.method,
            },
          },
        });

        await this.logCancellationActivity(requestId, 'completed', 'success',
          `Cancellation completed successfully. Confirmation: ${result.confirmationCode}`);
      } else if (result.error) {
        await this.logCancellationActivity(requestId, 'error', 'failure', result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      await this.db.cancellationRequest.update({
        where: { id: requestId },
        data: {
          status: 'failed',
          errorCode: 'PROCESSING_ERROR',
          errorMessage,
          errorDetails: { error: errorMessage, timestamp: new Date() },
        },
      });

      await this.logCancellationActivity(requestId, 'error', 'failure', errorMessage);

      return {
        requestId,
        status: 'failed',
        confirmationCode: null,
        effectiveDate: null,
        refundAmount: null,
        manualInstructions: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Process API-based cancellation
   */
  private async processApiCancellation(request: any): Promise<CancellationResult> {
    // For now, this will simulate API cancellation
    // In a real implementation, this would call the provider's cancellation API
    
    await this.logCancellationActivity(request.id, 'api_call_started', 'info',
      `Attempting API cancellation for provider: ${request.provider?.name}`);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate success for demo purposes
    const isSuccess = Math.random() > 0.3; // 70% success rate for demo

    if (isSuccess) {
      const confirmationCode = `API-${Date.now().toString().slice(-6)}`;
      const effectiveDate = new Date();
      effectiveDate.setDate(effectiveDate.getDate() + 1); // Effective tomorrow

      await this.logCancellationActivity(request.id, 'api_success', 'success',
        `API cancellation successful. Confirmation: ${confirmationCode}`);

      return {
        requestId: request.id,
        status: 'completed',
        confirmationCode,
        effectiveDate,
        refundAmount: null,
        manualInstructions: null,
        error: null,
      };
    } else {
      // API failed, fall back to manual
      await this.logCancellationActivity(request.id, 'api_failed', 'failure',
        'API cancellation failed, falling back to manual instructions');

      return this.processManualCancellation(request);
    }
  }

  /**
   * Process webhook-based cancellation
   */
  private async processWebhookCancellation(request: any): Promise<CancellationResult> {
    // For webhook-based cancellations, we would typically:
    // 1. Send a cancellation request to the provider
    // 2. Set status to processing
    // 3. Wait for webhook confirmation
    
    await this.logCancellationActivity(request.id, 'webhook_initiated', 'info',
      'Webhook cancellation initiated, waiting for confirmation');

    return {
      requestId: request.id,
      status: 'processing',
      confirmationCode: null,
      effectiveDate: null,
      refundAmount: null,
      manualInstructions: null,
      error: null,
    };
  }

  /**
   * Process manual cancellation (generates instructions for user)
   */
  private async processManualCancellation(request: any): Promise<CancellationResult> {
    const provider = request.provider;
    const subscription = request.subscription;

    const instructions = this.generateManualInstructions(subscription, provider);

    await this.logCancellationActivity(request.id, 'manual_instructions_generated', 'info',
      'Manual cancellation instructions generated for user');

    return {
      requestId: request.id,
      status: 'pending',
      confirmationCode: null,
      effectiveDate: null,
      refundAmount: null,
      manualInstructions: instructions,
      error: null,
    };
  }

  /**
   * Generate manual cancellation instructions
   */
  private generateManualInstructions(subscription: any, provider: any) {
    const baseInstructions = {
      service: subscription.name,
      steps: [
        'Log into your account',
        'Navigate to account settings or billing',
        'Look for subscription management or cancellation options',
        'Follow the cancellation process',
        'Save any confirmation codes or emails',
      ],
      tips: [
        'Cancel before your next billing date to avoid charges',
        'Take screenshots of confirmation pages',
        'Check for retention offers if you want to keep the service',
      ],
    };

    if (provider) {
      return {
        ...baseInstructions,
        website: provider.loginUrl || `https://${subscription.name.toLowerCase()}.com/account`,
        phone: provider.phoneNumber,
        email: provider.email,
        chatUrl: provider.chatUrl,
        difficulty: provider.difficulty,
        estimatedTime: provider.averageTime ? `${provider.averageTime} minutes` : '5-15 minutes',
        specificSteps: provider.instructions || [],
      };
    }

    return baseInstructions;
  }

  /**
   * Confirm manual cancellation by user
   */
  async confirmManualCancellation(
    userId: string,
    requestId: string,
    confirmationData: z.infer<typeof ManualConfirmationInput>
  ): Promise<CancellationResult> {
    const validatedData = ManualConfirmationInput.parse(confirmationData);

    const request = await this.db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId,
        method: 'manual',
      },
      include: {
        subscription: true,
      },
    });

    if (!request) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Manual cancellation request not found',
      });
    }

    // Update the cancellation request
    const updatedRequest = await this.db.cancellationRequest.update({
      where: { id: requestId },
      data: {
        status: 'completed',
        confirmationCode: validatedData.confirmationCode,
        effectiveDate: validatedData.effectiveDate || new Date(),
        refundAmount: validatedData.refundAmount ? new Prisma.Decimal(validatedData.refundAmount) : null,
        userConfirmed: true,
        userNotes: validatedData.notes,
        completedAt: new Date(),
      },
    });

    // Update the subscription
    await this.db.subscription.update({
      where: { id: request.subscriptionId },
      data: {
        status: 'cancelled',
        isActive: false,
        cancellationInfo: {
          requestId,
          confirmationCode: validatedData.confirmationCode,
          effectiveDate: validatedData.effectiveDate,
          manualConfirmation: true,
        },
      },
    });

    await this.logCancellationActivity(requestId, 'manual_confirmed', 'success',
      `User confirmed manual cancellation. Code: ${validatedData.confirmationCode}`);

    // Audit log
    await AuditLogger.log({
      userId,
      action: 'cancellation.manual_confirmed',
      resource: requestId,
      result: 'success',
      metadata: {
        subscriptionId: request.subscriptionId,
        confirmationCode: validatedData.confirmationCode,
      },
    });

    return {
      requestId,
      status: 'completed',
      confirmationCode: validatedData.confirmationCode || null,
      effectiveDate: validatedData.effectiveDate || new Date(),
      refundAmount: validatedData.refundAmount || null,
      manualInstructions: null,
      error: null,
    };
  }

  /**
   * Get cancellation status
   */
  async getCancellationStatus(userId: string, requestId: string): Promise<CancellationResult> {
    const request = await this.db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
    });

    if (!request) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Cancellation request not found',
      });
    }

    return {
      requestId: request.id,
      status: request.status as any,
      confirmationCode: request.confirmationCode,
      effectiveDate: request.effectiveDate,
      refundAmount: request.refundAmount ? parseFloat(request.refundAmount.toString()) : null,
      manualInstructions: request.manualInstructions,
      error: request.errorMessage,
    };
  }

  /**
   * Retry a failed cancellation
   */
  async retryCancellation(userId: string, requestId: string): Promise<CancellationResult> {
    const request = await this.db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId,
        status: 'failed',
      },
    });

    if (!request) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Failed cancellation request not found',
      });
    }

    // Reset the request for retry
    await this.db.cancellationRequest.update({
      where: { id: requestId },
      data: {
        status: 'pending',
        errorCode: null,
        errorMessage: null,
        errorDetails: {},
        nextRetryAt: null,
      },
    });

    await this.logCancellationActivity(requestId, 'retry_initiated', 'info',
      'Cancellation retry initiated by user');

    // Process the cancellation again
    return this.processCancellation(requestId);
  }

  /**
   * Get cancellation history for a user
   */
  async getCancellationHistory(userId: string, limit = 10): Promise<CancellationHistoryItem[]> {
    const requests = await this.db.cancellationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        subscription: {
          select: {
            id: true,
            name: true,
            amount: true,
          },
        },
        provider: {
          select: {
            name: true,
            logo: true,
          },
        },
      },
    });

    return requests.map(request => ({
      id: request.id,
      subscription: {
        id: request.subscription.id,
        name: request.subscription.name,
        amount: parseFloat(request.subscription.amount.toString()),
      },
      provider: request.provider,
      status: request.status,
      method: request.method,
      confirmationCode: request.confirmationCode,
      effectiveDate: request.effectiveDate,
      createdAt: request.createdAt,
      completedAt: request.completedAt,
    }));
  }

  // Helper methods

  /**
   * Find the best cancellation provider for a subscription
   */
  private async findCancellationProvider(subscriptionName: string) {
    const normalizedName = subscriptionName.toLowerCase().replace(/[^a-z0-9]/g, '');

    return await this.db.cancellationProvider.findFirst({
      where: {
        normalizedName: {
          equals: normalizedName,
        },
        isActive: true,
      },
    });
  }

  /**
   * Determine the best cancellation method for a provider
   */
  private determineCancellationMethod(provider: any): string {
    if (provider.type === 'api' && provider.apiEndpoint) {
      return 'api';
    }
    if (provider.type === 'webhook') {
      return 'webhook';
    }
    return 'manual';
  }

  /**
   * Log cancellation activity
   */
  private async logCancellationActivity(
    requestId: string,
    action: string,
    status: string,
    message: string,
    metadata?: any
  ) {
    await this.db.cancellationLog.create({
      data: {
        requestId,
        action,
        status,
        message,
        metadata: metadata || {},
      },
    });
  }
}