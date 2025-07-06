import { type PrismaClient, type Prisma } from '@prisma/client';
type InputJsonValue = Prisma.InputJsonValue;
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { generateId } from '@/lib/utils';
import {
  type UnifiedCancellationResult,
  type CancellationProgressUpdate,
  type SubscriptionForCancellation,
  type UserCancellationPreferences,
  type ServiceEventData,
  type CancellationStatus,
} from '@/types/cancellation';

// Remove duplicate interface - using enhanced version above

// Import existing services
import { CancellationService } from './cancellation.service';
import { EventDrivenCancellationService } from './event-driven-cancellation.service';
import { LightweightCancellationService } from './lightweight-cancellation.service';

// Enhanced status response interfaces
interface CancellationStatusResponse {
  success: boolean;
  message?: string;
  status?: {
    requestId: string;
    status: string;
    method?: string;
    attempts?: number;
    createdAt?: Date;
    updatedAt?: Date;
    completedAt?: Date | null;
    confirmationCode?: string | null;
    effectiveDate?: Date | null;
    subscription: {
      id: string;
      name: string;
      amount: number | string; // Prisma Decimal can be number or string
    };
    provider?: {
      name: string;
      type: string;
    } | null;
  };
  timeline?: Array<{
    action: string;
    status: string;
    message: string;
    createdAt: Date;
  }>;
  nextSteps?: string[];
  error?: {
    code: string;
    message: string;
  };
}

// Orchestration status interface for better type safety (currently unused)
// interface OrchestrationStatusResponse {
//   orchestrationId: string;
//   status: string;
//   method: string;
//   startTime: Date;
//   lastUpdate: Date;
//   progress?: number;
//   logs: Array<{
//     id: string;
//     requestId: string;
//     action: string;
//     status: string;
//     message: string;
//     metadata: Record<string, unknown>;
//     createdAt: Date;
//   }>;
// }

// Manual confirmation interface (currently unused)
// interface ManualConfirmationData {
//   confirmationCode?: string;
//   effectiveDate?: Date;
//   refundAmount?: number;
//   notes?: string;
//   wasSuccessful: boolean;
// }

// Retry options interface (currently unused)
// interface RetryOptions {
//   forceMethod?: 'api' | 'automation' | 'lightweight';
//   escalate?: boolean;
// }

// Analytics interfaces
interface AnalyticsSummary {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  successRate: number;
}

interface MethodBreakdown {
  api: number;
  webhook: number;
  manual: number;
}

interface SuccessRates {
  overall: number;
  byMethod: Record<string, number>;
  byProvider: Record<string, number>;
}

interface ProviderAnalytic {
  provider: string;
  total: number;
  successful: number;
  avgTime: number;
  successRate: number;
}

interface TrendData {
  date: string;
  requests: number;
  successful: number;
  successRate: number;
}

interface UnifiedAnalyticsResponse {
  summary: AnalyticsSummary;
  methodBreakdown: MethodBreakdown;
  successRates: SuccessRates;
  providerAnalytics: ProviderAnalytic[];
  trends: TrendData[];
}

// Import utilities
import { AuditLogger } from '@/server/lib/audit-logger';
import {
  emitCancellationEvent,
  onCancellationEvent,
} from '@/server/lib/event-bus';

// Enhanced input validation schema with improved validation
export const UnifiedCancellationRequestInput = z
  .object({
    subscriptionId: z
      .string()
      .min(1, 'Subscription ID is required')
      .max(50, 'Subscription ID too long'),
    reason: z.string().trim().max(500, 'Reason too long').optional(),
    priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
    preferredMethod: z
      .enum(['auto', 'api', 'automation', 'lightweight'])
      .optional()
      .default('auto'),
    userPreferences: z
      .object({
        allowFallback: z.boolean().optional().default(true),
        maxRetries: z
          .number()
          .int()
          .min(1, 'Must have at least 1 retry')
          .max(5, 'Too many retries')
          .optional()
          .default(3),
        timeoutMinutes: z
          .number()
          .int()
          .min(5, 'Timeout too short')
          .max(60, 'Timeout too long')
          .optional()
          .default(30),
        notificationPreferences: z
          .object({
            realTime: z.boolean().optional().default(true),
            email: z.boolean().optional().default(true),
            sms: z.boolean().optional().default(false),
          })
          .optional(),
      })
      .optional(),
    scheduling: z
      .object({
        scheduleFor: z
          .date()
          .refine(
            date => date > new Date(),
            'Scheduled time must be in the future'
          )
          .optional(),
        timezone: z
          .string()
          .regex(/^[A-Za-z_]+\/[A-Za-z_]+$/, 'Invalid timezone format')
          .optional(),
      })
      .optional(),
  })
  .strict()
  .refine(
    data => {
      // Custom validation: if scheduling is provided, scheduleFor is required
      if (data.scheduling && !data.scheduling.scheduleFor) {
        return false;
      }
      return true;
    },
    {
      message: 'scheduleFor is required when scheduling is provided',
      path: ['scheduling', 'scheduleFor'],
    }
  );

export type UnifiedCancellationRequest = z.infer<
  typeof UnifiedCancellationRequestInput
>;

// Provider capability assessment
interface ProviderCapability {
  providerId?: string;
  providerName: string;

  // Method support
  supportsApi: boolean;
  supportsAutomation: boolean;
  supportsManual: boolean;

  // Success metrics
  apiSuccessRate: number;
  automationSuccessRate: number;
  manualSuccessRate: number;

  // Timing estimates
  apiEstimatedTime: number; // minutes
  automationEstimatedTime: number;
  manualEstimatedTime: number;

  // Complexity factors
  difficulty: 'easy' | 'medium' | 'hard';
  requires2FA: boolean;
  hasRetentionOffers: boolean;
  requiresHumanIntervention: boolean;

  // Last updated
  lastAssessed: Date;
  dataSource: 'database' | 'heuristic' | 'default';
}

// Provider capability validation schema
export const ProviderCapabilitySchema = z.object({
  providerId: z.string().optional(),
  providerName: z.string().min(1, 'Provider name is required'),
  supportsApi: z.boolean(),
  supportsAutomation: z.boolean(),
  supportsManual: z.boolean(),
  apiSuccessRate: z.number().min(0).max(1),
  automationSuccessRate: z.number().min(0).max(1),
  manualSuccessRate: z.number().min(0).max(1),
  apiEstimatedTime: z.number().int().min(0),
  automationEstimatedTime: z.number().int().min(0),
  manualEstimatedTime: z.number().int().min(0),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  requires2FA: z.boolean(),
  hasRetentionOffers: z.boolean(),
  requiresHumanIntervention: z.boolean(),
  lastAssessed: z.date(),
  dataSource: z.enum(['database', 'heuristic', 'default']),
});

/**
 * Enhanced Unified Cancellation Orchestrator Service
 *
 * This is the final implementation that combines all three sub-agent approaches
 * into a truly unified, intelligent cancellation platform with real-time updates,
 * comprehensive fallback handling, and advanced analytics.
 */
export class UnifiedCancellationOrchestratorEnhancedService {
  private cancellationService: CancellationService;
  private eventDrivenService: EventDrivenCancellationService;
  private lightweightService: LightweightCancellationService;

  // Provider capabilities cache with TTL
  private providerCapabilities = new Map<
    string,
    { capability: ProviderCapability; expires: Date }
  >();
  private readonly CAPABILITY_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  // Active orchestrations tracking
  private activeOrchestrations = new Map<
    string,
    {
      userId: string;
      status: string;
      method: string;
      startTime: Date;
      lastUpdate: Date;
      callbacks: Set<(update: CancellationProgressUpdate) => void>;
    }
  >();

  constructor(private db: PrismaClient) {
    this.cancellationService = new CancellationService(db);
    this.eventDrivenService = new EventDrivenCancellationService(db);
    this.lightweightService = new LightweightCancellationService(db);

    this.setupEventListeners();
    void this.initializeCapabilityCache();
  }

  /**
   * Main unified cancellation entry point
   */
  async initiateCancellation(
    userId: string,
    input: UnifiedCancellationRequest
  ): Promise<UnifiedCancellationResult> {
    const orchestrationId = this.generateOrchestrationId();
    const startTime = new Date();

    try {
      // Validate input with enhanced schema
      const validationResult = UnifiedCancellationRequestInput.safeParse(input);
      if (!validationResult.success) {
        return {
          success: false,
          orchestrationId,
          requestId: this.generateRequestId(),
          status: 'failed',
          method: 'lightweight' as const,
          message: `Invalid input: ${validationResult.error.issues.map(i => i.message).join(', ')}`,
          metadata: {
            attemptsUsed: 0,
            realTimeUpdatesEnabled: true,
          },
          tracking: {
            sseEndpoint: `/api/sse/cancellation/${orchestrationId}`,
            statusCheckUrl: `/api/trpc/unifiedCancellation.getStatus?input=${encodeURIComponent(JSON.stringify({ orchestrationId }))}`,
          },
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: validationResult.error.issues as unknown as Record<
              string,
              unknown
            >,
          },
        };
      }

      const validatedInput = validationResult.data;

      // Log orchestration start
      await this.logOrchestrationActivity(
        orchestrationId,
        'orchestration_initiated',
        'info',
        'Enhanced unified cancellation orchestration started',
        {
          userId,
          subscriptionId: validatedInput.subscriptionId,
          input: validatedInput,
        }
      );

      // Validate subscription ownership
      const subscription = await this.validateSubscriptionOwnership(
        userId,
        validatedInput.subscriptionId
      );

      // Check if cancellation is allowed
      await this.validateCancellationEligibility(
        userId,
        validatedInput.subscriptionId,
        {
          ...subscription,
          amount:
            typeof subscription.amount === 'object' &&
            subscription.amount !== null &&
            'toNumber' in subscription.amount
              ? (subscription.amount as { toNumber(): number }).toNumber()
              : Number(subscription.amount),
          detectionConfidence:
            typeof subscription.detectionConfidence === 'object' &&
            subscription.detectionConfidence !== null &&
            'toNumber' in subscription.detectionConfidence
              ? (
                  subscription.detectionConfidence as { toNumber(): number }
                ).toNumber()
              : Number(subscription.detectionConfidence ?? 0),
        } as SubscriptionForCancellation
      );

      // Assess provider capabilities
      const capabilities = await this.assessProviderCapabilities(
        subscription.name
      );

      // Determine optimal method using consensus logic
      const optimalMethod = this.determineOptimalMethod(
        capabilities,
        validatedInput.preferredMethod,
        validatedInput.userPreferences as
          | UserCancellationPreferences
          | undefined
      );

      // Convert Decimal to number for type compatibility
      const subscriptionForCancellation: SubscriptionForCancellation = {
        id: subscription.id,
        userId: subscription.userId,
        name: subscription.name,
        description: subscription.description,
        category: subscription.category,
        amount: Number(subscription.amount),
        currency: subscription.currency,
        frequency: subscription.frequency,
        nextBilling: subscription.nextBilling,
        lastBilling: subscription.lastBilling,
        status: subscription.status,
        isActive: subscription.isActive,
        provider: subscription.provider as Record<string, unknown>,
        cancellationInfo: subscription.cancellationInfo as Record<
          string,
          unknown
        >,
        detectionConfidence: Number(subscription.detectionConfidence),
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      };

      // Handle scheduling if requested
      if (validatedInput.scheduling?.scheduleFor) {
        return await this.handleScheduledCancellation(
          userId,
          subscriptionForCancellation,
          validatedInput,
          orchestrationId,
          optimalMethod,
          capabilities
        );
      }

      // Register active orchestration for real-time tracking
      this.registerActiveOrchestration(orchestrationId, {
        userId,
        status: 'routing',
        method: optimalMethod,
        startTime,
        lastUpdate: startTime,
        callbacks: new Set(),
      });

      // Route to appropriate service with unified error handling
      const result = await this.executeWithFallback(
        userId,
        subscriptionForCancellation,
        validatedInput,
        orchestrationId,
        optimalMethod,
        capabilities
      );

      // Update orchestration status
      this.updateOrchestrationStatus(orchestrationId, 'completed');

      return result;
    } catch (error) {
      // Handle orchestration failure
      await this.handleOrchestrationFailure(
        orchestrationId,
        userId,
        input.subscriptionId || 'unknown',
        error
      );

      // Clean up active orchestration
      this.activeOrchestrations.delete(orchestrationId);

      // Return status object instead of throwing
      return {
        success: false,
        orchestrationId,
        requestId: this.generateRequestId(),
        status: 'failed',
        method: 'lightweight' as const, // Default fallback method
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          attemptsUsed: 1,
          realTimeUpdatesEnabled:
            input.userPreferences?.notificationPreferences?.realTime ?? true,
        },
        tracking: {
          sseEndpoint: `/api/sse/cancellation/${orchestrationId}`,
          statusCheckUrl: `/api/trpc/unifiedCancellation.getStatus?input=${encodeURIComponent(JSON.stringify({ orchestrationId }))}`,
        },
        error: {
          code: 'ORCHESTRATION_FAILED',
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
          details:
            error instanceof Error
              ? { message: error.message, stack: error.stack }
              : (error as Record<string, unknown>),
        },
      };
    }
  }

  /**
   * Execute cancellation with intelligent fallback handling
   */
  private async executeWithFallback(
    userId: string,
    subscription: SubscriptionForCancellation,
    input: UnifiedCancellationRequest,
    orchestrationId: string,
    primaryMethod: 'api' | 'automation' | 'lightweight',
    capabilities: ProviderCapability
  ): Promise<UnifiedCancellationResult> {
    const fallbackChain = this.buildFallbackChain(primaryMethod, capabilities);
    let lastError: Error | null = null;

    for (let i = 0; i < fallbackChain.length; i++) {
      const method = fallbackChain[i];

      try {
        // Update status to show current method attempt
        this.updateOrchestrationStatus(orchestrationId, 'processing', {
          currentMethod: method,
          attempt: i + 1,
          totalMethods: fallbackChain.length,
        });

        // Emit real-time update
        this.emitOrchestrationUpdate(orchestrationId, {
          orchestrationId,
          status: 'processing',
          progress: 0,
          message: `Attempting ${method} cancellation...`,
        } as CancellationProgressUpdate);

        // Execute the method
        const result = await this.executeMethod(
          method!,
          userId,
          subscription,
          input,
          orchestrationId,
          capabilities
        );

        // Success! Return the result
        await this.logOrchestrationActivity(
          orchestrationId,
          'method_succeeded',
          'success',
          `${method} cancellation succeeded`,
          { method, result }
        );

        return result;
      } catch (error) {
        lastError = error as Error;

        // Log method failure
        await this.logOrchestrationActivity(
          orchestrationId,
          'method_failed',
          'warning',
          `${method} cancellation failed: ${lastError.message}`,
          { method, error: lastError.message, attempt: i + 1 }
        );

        // Emit failure update
        this.emitOrchestrationUpdate(orchestrationId, {
          orchestrationId,
          status: 'failed',
          progress: 0,
          message: `${method} cancellation failed: ${lastError.message}`,
        } as CancellationProgressUpdate);

        // If this was the last method in the chain, return failure status
        if (i === fallbackChain.length - 1) {
          return {
            success: false,
            orchestrationId,
            requestId: this.generateRequestId(),
            status: 'failed',
            method: (method === 'automation' ? 'event_driven' : method)!,
            message: `All cancellation methods failed. Last error: ${lastError.message}`,
            metadata: {
              attemptsUsed: fallbackChain.length,
              fallbackReason: 'All methods exhausted',
              realTimeUpdatesEnabled:
                input.userPreferences?.notificationPreferences?.realTime ??
                true,
            },
            tracking: {
              sseEndpoint: `/api/sse/cancellation/${orchestrationId}`,
              statusCheckUrl: `/api/trpc/unifiedCancellation.getStatus?input=${encodeURIComponent(JSON.stringify({ orchestrationId }))}`,
            },
            error: {
              code: 'ALL_METHODS_FAILED',
              message: `All cancellation methods failed. Last error: ${lastError.message}`,
              details: { message: lastError.message, stack: lastError.stack },
            },
          };
        }

        // Check if user preferences allow fallback
        if (!input.userPreferences?.allowFallback) {
          return {
            success: false,
            orchestrationId,
            requestId: this.generateRequestId(),
            status: 'failed',
            method: (method === 'automation' ? 'event_driven' : method)!,
            message: `${method} cancellation failed and fallback is disabled`,
            metadata: {
              attemptsUsed: i + 1,
              fallbackReason: 'Fallback disabled by user',
              realTimeUpdatesEnabled:
                input.userPreferences?.notificationPreferences?.realTime ??
                true,
            },
            tracking: {
              sseEndpoint: `/api/sse/cancellation/${orchestrationId}`,
              statusCheckUrl: `/api/trpc/unifiedCancellation.getStatus?input=${encodeURIComponent(JSON.stringify({ orchestrationId }))}`,
            },
            error: {
              code: 'FALLBACK_DISABLED',
              message: `${method} cancellation failed and fallback is disabled`,
              details: { message: lastError.message, stack: lastError.stack },
            },
          };
        }

        // Small delay before trying next method
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // This should never be reached, but just in case
    return {
      success: false,
      orchestrationId,
      requestId: this.generateRequestId(),
      status: 'failed',
      method: 'lightweight' as const,
      message: 'Unexpected error in fallback chain execution',
      metadata: {
        attemptsUsed: fallbackChain.length,
        fallbackReason: 'Unexpected error',
        realTimeUpdatesEnabled:
          input.userPreferences?.notificationPreferences?.realTime ?? true,
      },
      tracking: {
        sseEndpoint: `/api/sse/cancellation/${orchestrationId}`,
        statusCheckUrl: `/api/trpc/unifiedCancellation.getStatus?input=${encodeURIComponent(JSON.stringify({ orchestrationId }))}`,
      },
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Unexpected error in fallback chain execution',
        details: {},
      },
    };
  }

  /**
   * Execute a specific cancellation method
   */
  private async executeMethod(
    method: 'api' | 'automation' | 'lightweight',
    userId: string,
    subscription: SubscriptionForCancellation,
    input: UnifiedCancellationRequest,
    orchestrationId: string,
    capabilities: ProviderCapability
  ): Promise<UnifiedCancellationResult> {
    const baseResult: Partial<UnifiedCancellationResult> = {
      orchestrationId,
      method:
        method === 'automation'
          ? 'event_driven'
          : (method as 'api' | 'event_driven' | 'lightweight'),
      metadata: {
        attemptsUsed: 1,
        providerInfo: capabilities as unknown as Record<string, unknown>,
        realTimeUpdatesEnabled:
          input.userPreferences?.notificationPreferences?.realTime ?? true,
      },
      tracking: {
        sseEndpoint: `/api/sse/cancellation/${orchestrationId}`,
        statusCheckUrl: `/api/trpc/unifiedCancellation.getStatus?input=${encodeURIComponent(JSON.stringify({ orchestrationId }))}`,
      },
    };

    switch (method) {
      case 'api':
        return await this.executeApiMethod(
          userId,
          subscription,
          input,
          baseResult,
          capabilities
        );

      case 'automation':
        return await this.executeAutomationMethod(
          userId,
          subscription,
          input,
          baseResult,
          capabilities
        );

      case 'lightweight':
        return await this.executeLightweightMethod(
          userId,
          subscription,
          input,
          baseResult,
          capabilities
        );

      default:
        // Return failure status instead of throwing
        return {
          success: false,
          orchestrationId,
          requestId: this.generateRequestId(),
          status: 'failed',
          method: 'lightweight' as const, // Default fallback
          message: `Unsupported cancellation method: ${String(method)}`,
          metadata: {
            attemptsUsed: 1,
            realTimeUpdatesEnabled: true,
          },
          tracking: {
            sseEndpoint: `/api/sse/cancellation/${orchestrationId}`,
            statusCheckUrl: `/api/trpc/unifiedCancellation.getStatus?input=${encodeURIComponent(JSON.stringify({ orchestrationId }))}`,
          },
          error: {
            code: 'UNSUPPORTED_METHOD',
            message: `Unsupported cancellation method: ${String(method)}`,
            details: { attemptedMethod: method },
          },
        };
    }
  }

  /**
   * Execute API-based cancellation (Sub-agent 1)
   */
  private async executeApiMethod(
    userId: string,
    subscription: SubscriptionForCancellation,
    input: UnifiedCancellationRequest,
    baseResult: Partial<UnifiedCancellationResult>,
    capabilities: ProviderCapability
  ): Promise<UnifiedCancellationResult> {
    try {
      const apiResult = await this.cancellationService.initiateCancellation(
        userId,
        {
          subscriptionId: input.subscriptionId,
          priority: input.priority,
          notes: input.reason,
        }
      );

      const estimatedCompletion = new Date(
        Date.now() + capabilities.apiEstimatedTime * 60 * 1000
      );

      // Log successful API execution
      await AuditLogger.log({
        userId,
        action: 'cancellation.api_method_success',
        resource: input.subscriptionId,
        result: 'success',
        metadata: {
          requestId: apiResult.requestId,
          status: apiResult.status,
          estimatedCompletion: estimatedCompletion.toISOString(),
        },
      });

      return {
        success: true,
        orchestrationId: baseResult.orchestrationId!,
        requestId: apiResult.requestId,
        status: apiResult.status === 'completed' ? 'completed' : 'processing',
        method: baseResult.method!,
        message: 'API cancellation initiated successfully',
        estimatedCompletion: estimatedCompletion,
        processingStarted: new Date(),
        confirmationCode: apiResult.confirmationCode ?? undefined,
        effectiveDate: apiResult.effectiveDate ?? undefined,
        refundAmount: apiResult.refundAmount ?? undefined,
        metadata: baseResult.metadata!,
        tracking: baseResult.tracking!,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown API error';

      // Log API method failure
      await AuditLogger.log({
        userId,
        action: 'cancellation.api_method_failed',
        resource: input.subscriptionId,
        result: 'failure',
        error: errorMessage,
        metadata: { capabilities, input },
      });

      // Throw to trigger fallback in the parent method
      throw new Error(`API cancellation failed: ${errorMessage}`);
    }
  }

  /**
   * Execute automation-based cancellation (Sub-agent 2)
   */
  private async executeAutomationMethod(
    userId: string,
    subscription: SubscriptionForCancellation,
    input: UnifiedCancellationRequest,
    baseResult: Partial<UnifiedCancellationResult>,
    capabilities: ProviderCapability
  ): Promise<UnifiedCancellationResult> {
    try {
      const automationResult =
        await this.eventDrivenService.initiateCancellation(userId, {
          subscriptionId: input.subscriptionId,
          priority: input.priority,
          notes: input.reason,
          preferredMethod: 'webhook' as const,
          notificationPreferences: {
            email:
              input.userPreferences?.notificationPreferences?.email ?? true,
            sms: input.userPreferences?.notificationPreferences?.sms ?? false,
            realtime:
              input.userPreferences?.notificationPreferences?.realTime ?? true,
          },
        });

      // Log successful automation execution
      await AuditLogger.log({
        userId,
        action: 'cancellation.automation_method_success',
        resource: input.subscriptionId,
        result: 'success',
        metadata: {
          requestId: automationResult.requestId ?? 'unknown',
          workflowId: automationResult.workflowId ?? 'unknown',
          estimatedCompletion:
            automationResult.estimatedCompletion ?? 'unknown',
        },
      });

      return {
        success: true,
        orchestrationId: baseResult.orchestrationId!,
        requestId: automationResult.requestId,
        status: 'processing',
        method: baseResult.method!,
        message: 'Automation cancellation workflow started',
        estimatedCompletion: automationResult.estimatedCompletion ?? undefined,
        processingStarted: new Date(),
        metadata: {
          ...(baseResult.metadata ?? {}),
          attemptsUsed: 1,
          realTimeUpdatesEnabled:
            input.userPreferences?.notificationPreferences?.realTime ?? true,
          workflowId: automationResult.workflowId ?? undefined,
        },
        tracking: baseResult.tracking!,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown automation error';

      // Log automation method failure
      await AuditLogger.log({
        userId,
        action: 'cancellation.automation_method_failed',
        resource: input.subscriptionId,
        result: 'failure',
        error: errorMessage,
        metadata: { capabilities, input },
      });

      // Throw to trigger fallback in the parent method
      throw new Error(`Automation cancellation failed: ${errorMessage}`);
    }
  }

  /**
   * Execute lightweight cancellation method (Sub-agent 3)
   */
  private async executeLightweightMethod(
    userId: string,
    subscription: SubscriptionForCancellation,
    input: UnifiedCancellationRequest,
    baseResult: Partial<UnifiedCancellationResult>,
    capabilities: ProviderCapability
  ): Promise<UnifiedCancellationResult> {
    try {
      const manualResult =
        await this.lightweightService.provideCancellationInstructions(userId, {
          subscriptionId: input.subscriptionId,
          notes: input.reason,
        });

      // Log successful manual execution
      await AuditLogger.log({
        userId,
        action: 'cancellation.manual_method_success',
        resource: input.subscriptionId,
        result: 'success',
        metadata: {
          requestId: manualResult.requestId,
          hasInstructions: Boolean(manualResult.instructions),
          estimatedTime: capabilities.manualEstimatedTime,
        },
      });

      return {
        success: true,
        orchestrationId: baseResult.orchestrationId!,
        requestId: manualResult.requestId,
        status: 'requires_manual' as const,
        method: baseResult.method!,
        message: 'Manual cancellation instructions generated',
        estimatedCompletion: new Date(
          Date.now() + capabilities.manualEstimatedTime * 60 * 1000
        ),
        manualInstructions: manualResult.instructions
          ? {
              provider: {
                name: manualResult.instructions.provider.name,
                logo: manualResult.instructions.provider.logo,
                difficulty: manualResult.instructions.provider.difficulty,
                estimatedTime: manualResult.instructions.provider.estimatedTime,
              },
              steps: manualResult.instructions.instructions.steps,
              tips: manualResult.instructions.instructions.tips,
              warnings: manualResult.instructions.instructions.warnings,
              contactInfo: manualResult.instructions.instructions.contactInfo,
            }
          : undefined,
        metadata: baseResult.metadata ?? {
          attemptsUsed: 1,
          realTimeUpdatesEnabled: true,
        },
        tracking: baseResult.tracking ?? {
          sseEndpoint: `/api/sse/cancellation/${baseResult.orchestrationId}`,
          statusCheckUrl: `/api/trpc/unifiedCancellation.getStatus?input=${encodeURIComponent(JSON.stringify({ orchestrationId: baseResult.orchestrationId }))}`,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown manual error';

      // Log manual method failure
      await AuditLogger.log({
        userId,
        action: 'cancellation.manual_method_failed',
        resource: input.subscriptionId,
        result: 'failure',
        error: errorMessage,
        metadata: { capabilities, input },
      });

      // Throw to trigger fallback in the parent method
      throw new Error(`Manual cancellation failed: ${errorMessage}`);
    }
  }

  /**
   * Determine optimal cancellation method using consensus logic
   */
  private determineOptimalMethod(
    capabilities: ProviderCapability,
    preferredMethod = 'auto',
    _userPreferences?: UserCancellationPreferences
  ): 'api' | 'automation' | 'lightweight' {
    // If user specified a method other than auto, try to honor it
    if (preferredMethod !== 'auto') {
      const method = preferredMethod as 'api' | 'automation' | 'lightweight';
      if (this.isMethodSupported(method, capabilities)) {
        return method;
      }
    }

    // Consensus-based intelligent selection:
    // 1. API-first if high success rate and supported
    if (capabilities.supportsApi && capabilities.apiSuccessRate > 0.85) {
      return 'api';
    }

    // 2. Automation for complex cases or moderate success rates
    if (
      capabilities.supportsAutomation &&
      (capabilities.requires2FA ||
        capabilities.hasRetentionOffers ||
        capabilities.difficulty === 'hard' ||
        capabilities.automationSuccessRate > 0.7)
    ) {
      return 'automation';
    }

    // 3. Lightweight as universal fallback
    return 'lightweight';
  }

  /**
   * Build intelligent fallback chain based on provider capabilities
   */
  private buildFallbackChain(
    primaryMethod: 'api' | 'automation' | 'lightweight',
    capabilities: ProviderCapability
  ): Array<'api' | 'automation' | 'lightweight'> {
    const chain: Array<'api' | 'automation' | 'lightweight'> = [primaryMethod];
    const methods: Array<'api' | 'automation' | 'lightweight'> = [
      'api',
      'automation',
      'lightweight',
    ];

    // Add other supported methods in order of preference
    for (const method of methods) {
      if (
        method !== primaryMethod &&
        this.isMethodSupported(method, capabilities)
      ) {
        chain.push(method);
      }
    }

    // Always ensure lightweight is available as final fallback
    if (!chain.includes('lightweight')) {
      chain.push('lightweight');
    }

    return chain;
  }

  /**
   * Check if a method is supported by the provider
   */
  private isMethodSupported(
    method: 'api' | 'automation' | 'lightweight',
    capabilities: ProviderCapability
  ): boolean {
    switch (method) {
      case 'api':
        return capabilities.supportsApi;
      case 'automation':
        return capabilities.supportsAutomation;
      case 'lightweight':
        return capabilities.supportsManual; // Always true in practice
      default:
        return false;
    }
  }

  /**
   * Assess provider capabilities for a subscription (PUBLIC METHOD for router access)
   */
  async assessProviderCapabilities(
    subscriptionName: string
  ): Promise<ProviderCapability> {
    // Validate input
    if (!subscriptionName || typeof subscriptionName !== 'string') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid subscription name for capability assessment',
      });
    }

    const normalizedName = subscriptionName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    // Check cache first
    const cached = this.providerCapabilities.get(normalizedName);
    if (cached && cached.expires > new Date()) {
      // Validate cached capability against schema
      const validationResult = ProviderCapabilitySchema.safeParse(
        cached.capability
      );
      if (validationResult.success) {
        return cached.capability;
      } else {
        // Remove invalid cached data
        this.providerCapabilities.delete(normalizedName);
      }
    }

    // Look up provider in database
    let provider = null;
    try {
      provider = await this.db.cancellationProvider.findFirst({
        where: {
          normalizedName,
          isActive: true,
        },
      });
    } catch (error) {
      console.error(
        '[UnifiedCancellationOrchestratorEnhanced] Database query failed:',
        error
      );
      // Continue with heuristic approach if database fails
    }

    let capability: ProviderCapability;

    if (provider) {
      // Build capability from database provider
      capability = {
        providerId: provider.id,
        providerName: provider.name,
        supportsApi: provider.type === 'api' && Boolean(provider.apiEndpoint),
        supportsAutomation: provider.type === 'web_automation',
        supportsManual: true,
        apiSuccessRate:
          provider.type === 'api'
            ? parseFloat(provider.successRate.toString())
            : 0,
        automationSuccessRate:
          provider.type === 'web_automation'
            ? parseFloat(provider.successRate.toString())
            : 0,
        manualSuccessRate: 0.95, // Manual instructions are generally reliable
        apiEstimatedTime:
          provider.type === 'api' ? (provider.averageTime ?? 5) : 0,
        automationEstimatedTime:
          provider.type === 'web_automation' ? (provider.averageTime ?? 15) : 0,
        manualEstimatedTime: provider.averageTime ?? 20,
        difficulty: provider.difficulty as 'easy' | 'medium' | 'hard',
        requires2FA: provider.requires2FA,
        hasRetentionOffers: provider.requiresRetention,
        requiresHumanIntervention:
          provider.requires2FA ?? provider.requiresRetention,
        lastAssessed: new Date(),
        dataSource: 'database',
      };
    } else {
      // Generate heuristic-based capability for unknown providers
      capability = this.generateHeuristicCapability(subscriptionName);
    }

    // Validate capability before caching
    const validationResult = ProviderCapabilitySchema.safeParse(capability);
    if (!validationResult.success) {
      console.error(
        `[Enhanced Orchestrator] Invalid capability generated for ${subscriptionName}:`,
        validationResult.error
      );
      // Return a default manual-only capability if validation fails
      capability = this.generateHeuristicCapability(subscriptionName);
    }

    // Cache the result
    this.providerCapabilities.set(normalizedName, {
      capability,
      expires: new Date(Date.now() + this.CAPABILITY_CACHE_TTL),
    });

    return capability;
  }

  /**
   * Generate heuristic capabilities for unknown providers
   */
  private generateHeuristicCapability(
    subscriptionName: string
  ): ProviderCapability {
    const name = subscriptionName.toLowerCase();

    // Heuristics based on common patterns
    const isStreamingService =
      /netflix|hulu|disney|prime|spotify|apple|youtube/.test(name);
    const isSoftwareService = /adobe|microsoft|zoom|slack|dropbox/.test(name);
    const isUtilityService = /phone|electric|gas|water|internet/.test(name);

    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    let estimatedTime = 15;
    let hasRetention = false;

    if (isStreamingService) {
      difficulty = 'easy';
      estimatedTime = 10;
      hasRetention = true;
    } else if (isSoftwareService) {
      difficulty = 'medium';
      estimatedTime = 20;
      hasRetention = true;
    } else if (isUtilityService) {
      difficulty = 'hard';
      estimatedTime = 30;
      hasRetention = false;
    }

    return {
      providerName: subscriptionName,
      supportsApi: false, // Conservative assumption
      supportsAutomation: false, // Conservative assumption
      supportsManual: true, // Always available
      apiSuccessRate: 0,
      automationSuccessRate: 0,
      manualSuccessRate: 0.9,
      apiEstimatedTime: 0,
      automationEstimatedTime: 0,
      manualEstimatedTime: estimatedTime,
      difficulty,
      requires2FA: false,
      hasRetentionOffers: hasRetention,
      requiresHumanIntervention: hasRetention,
      lastAssessed: new Date(),
      dataSource: 'heuristic',
    };
  }

  /**
   * Validate subscription ownership
   */
  private async validateSubscriptionOwnership(
    userId: string,
    subscriptionId: string
  ) {
    const subscription = await this.db.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
    });

    if (!subscription) {
      await AuditLogger.log({
        userId,
        action: 'subscription.access_denied',
        resource: subscriptionId,
        result: 'failure',
        error: 'Subscription not found or access denied',
      });
      throw new Error(
        'Subscription not found or you do not have permission to access it'
      );
    }

    return subscription;
  }

  /**
   * Validate cancellation eligibility
   */
  private async validateCancellationEligibility(
    userId: string,
    subscriptionId: string,
    subscription: SubscriptionForCancellation
  ) {
    // Check if already cancelled
    if (subscription.status === 'cancelled') {
      await AuditLogger.log({
        userId,
        action: 'cancellation.already_cancelled',
        resource: subscriptionId,
        result: 'failure',
        error: 'Subscription is already cancelled',
      });
      throw new Error('This subscription is already cancelled');
    }

    // Check for existing active cancellation requests
    const existingRequest = await this.db.cancellationRequest.findFirst({
      where: {
        subscriptionId,
        userId,
        status: { in: ['pending', 'processing', 'scheduled'] },
      },
    });

    if (existingRequest) {
      await AuditLogger.log({
        userId,
        action: 'cancellation.already_in_progress',
        resource: subscriptionId,
        result: 'failure',
        error: 'Cancellation already in progress',
        metadata: { existingRequestId: existingRequest.id },
      });
      throw new Error(
        'A cancellation request is already in progress for this subscription'
      );
    }
  }

  /**
   * Handle scheduled cancellation
   */
  private async handleScheduledCancellation(
    userId: string,
    subscription: SubscriptionForCancellation,
    input: UnifiedCancellationRequest,
    orchestrationId: string,
    method: 'api' | 'automation' | 'lightweight',
    capabilities: ProviderCapability
  ): Promise<UnifiedCancellationResult> {
    const scheduleFor = input.scheduling?.scheduleFor;

    if (!scheduleFor) {
      const errorMessage =
        'Schedule time is required for scheduled cancellation';
      await AuditLogger.log({
        userId,
        action: 'cancellation.scheduling_validation_failed',
        resource: input.subscriptionId,
        result: 'failure',
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }

    if (scheduleFor <= new Date()) {
      const errorMessage = 'Scheduled time must be in the future';
      await AuditLogger.log({
        userId,
        action: 'cancellation.scheduling_validation_failed',
        resource: input.subscriptionId,
        result: 'failure',
        error: errorMessage,
        metadata: {
          scheduleFor: scheduleFor.toISOString(),
          currentTime: new Date().toISOString(),
        },
      });
      throw new Error(errorMessage);
    }

    // Create scheduled cancellation request with transaction
    let request;
    try {
      request = await this.db.$transaction(async tx => {
        const newRequest = await tx.cancellationRequest.create({
          data: {
            userId,
            subscriptionId: input.subscriptionId,
            method,
            priority: input.priority ?? 'normal',
            status: 'scheduled',
            attempts: 0,
            userNotes: input.reason,
            errorDetails: {
              orchestrationId,
              scheduleFor: scheduleFor.toISOString(),
              preferredMethod: method,
              timezone: input.scheduling?.timezone,
              capabilities: capabilities as unknown as Record<string, unknown>,
            } as InputJsonValue,
          },
        });

        // Log the scheduling within the transaction
        await tx.cancellationLog.create({
          data: {
            requestId: newRequest.id,
            action: 'cancellation_scheduled',
            status: 'info',
            message: `Cancellation scheduled for ${scheduleFor.toISOString()}`,
            metadata: {
              orchestrationId,
              scheduleFor: scheduleFor.toISOString(),
              method,
            },
          },
        });

        return newRequest;
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to schedule cancellation';
      await AuditLogger.log({
        userId,
        action: 'cancellation.scheduling_failed',
        resource: input.subscriptionId,
        result: 'failure',
        error: errorMessage,
        metadata: {
          orchestrationId,
          scheduleFor: scheduleFor.toISOString(),
          method,
        },
      });
      throw new Error(`Failed to schedule cancellation: ${errorMessage}`);
    }

    return {
      success: true,
      orchestrationId,
      requestId: request.id,
      status: 'scheduled',
      method: method === 'automation' ? 'event_driven' : method,
      message: `Cancellation scheduled for ${scheduleFor.toLocaleString()}`,
      estimatedCompletion: scheduleFor,
      metadata: {
        attemptsUsed: 0,
        providerInfo: capabilities as unknown as Record<string, unknown>,
        realTimeUpdatesEnabled:
          input.userPreferences?.notificationPreferences?.realTime ?? true,
      },
      tracking: {
        sseEndpoint: `/api/sse/cancellation/${orchestrationId}`,
        statusCheckUrl: `/api/trpc/unifiedCancellation.getStatus?input=${encodeURIComponent(JSON.stringify({ orchestrationId }))}`,
      },
    };
  }

  /**
   * Setup event listeners for cross-service coordination
   */
  private setupEventListeners(): void {
    // Listen for service completion events
    onCancellationEvent('service.completed', data => {
      void this.handleServiceCompletion(data);
    });

    // Listen for service progress events
    onCancellationEvent('service.progress', data => {
      void this.handleServiceProgress(data);
    });

    // Listen for service failure events
    onCancellationEvent('service.failed', data => {
      void this.handleServiceFailure(data);
    });

    console.log(
      '[UnifiedCancellationOrchestratorEnhanced] Event listeners initialized'
    );
  }

  /**
   * Initialize provider capability cache
   */
  private async initializeCapabilityCache(): Promise<void> {
    try {
      const providers = await this.db.cancellationProvider.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          normalizedName: true,
          type: true,
          apiEndpoint: true,
          successRate: true,
          averageTime: true,
          difficulty: true,
          requires2FA: true,
          requiresRetention: true,
        },
      });

      for (const provider of providers) {
        const capability: ProviderCapability = {
          providerId: provider.id,
          providerName: provider.name,
          supportsApi: provider.type === 'api' && Boolean(provider.apiEndpoint),
          supportsAutomation: provider.type === 'web_automation',
          supportsManual: true,
          apiSuccessRate:
            provider.type === 'api'
              ? parseFloat(provider.successRate.toString())
              : 0,
          automationSuccessRate:
            provider.type === 'web_automation'
              ? parseFloat(provider.successRate.toString())
              : 0,
          manualSuccessRate: 0.95,
          apiEstimatedTime:
            provider.type === 'api' ? (provider.averageTime ?? 5) : 0,
          automationEstimatedTime:
            provider.type === 'web_automation'
              ? (provider.averageTime ?? 15)
              : 0,
          manualEstimatedTime: provider.averageTime ?? 20,
          difficulty: provider.difficulty as 'easy' | 'medium' | 'hard',
          requires2FA: provider.requires2FA,
          hasRetentionOffers: provider.requiresRetention,
          requiresHumanIntervention:
            provider.requires2FA ?? provider.requiresRetention,
          lastAssessed: new Date(),
          dataSource: 'database',
        };

        this.providerCapabilities.set(provider.normalizedName, {
          capability,
          expires: new Date(Date.now() + this.CAPABILITY_CACHE_TTL),
        });
      }

      console.log(
        `[UnifiedCancellationOrchestratorEnhanced] Initialized capabilities for ${providers.length} providers`
      );
    } catch (error) {
      console.error(
        '[UnifiedCancellationOrchestratorEnhanced] Failed to initialize capability cache:',
        error
      );
    }
  }

  /**
   * Generate unique orchestration ID
   */
  private generateOrchestrationId(): string {
    return generateId('orch', 16);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return generateId('req', 16);
  }

  /**
   * Register active orchestration for real-time tracking
   */
  private registerActiveOrchestration(
    orchestrationId: string,
    data: {
      userId: string;
      status: string;
      method: string;
      startTime: Date;
      lastUpdate: Date;
      callbacks: Set<(update: CancellationProgressUpdate) => void>;
    }
  ): void {
    this.activeOrchestrations.set(orchestrationId, data);
  }

  /**
   * Update orchestration status and emit real-time updates
   */
  private updateOrchestrationStatus(
    orchestrationId: string,
    status: CancellationStatus,
    _metadata?: Record<string, unknown>
  ): void {
    const orchestration = this.activeOrchestrations.get(orchestrationId);
    if (orchestration) {
      orchestration.status = status;
      orchestration.lastUpdate = new Date();

      this.emitOrchestrationUpdate(orchestrationId, {
        orchestrationId,
        status,
        progress: 0,
        message: `Status updated to: ${status}`,
      } as CancellationProgressUpdate);
    }
  }

  /**
   * Emit real-time orchestration updates
   */
  private emitOrchestrationUpdate(
    orchestrationId: string,
    update: CancellationProgressUpdate
  ): void {
    const orchestration = this.activeOrchestrations.get(orchestrationId);
    if (orchestration) {
      // Emit to all registered callbacks
      orchestration.callbacks.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error(
            '[UnifiedCancellationOrchestratorEnhanced] Error in update callback:',
            error
          );
        }
      });

      // Emit global event
      emitCancellationEvent('orchestration.update', {
        orchestrationId,
        userId: orchestration.userId,
        update,
      });
    }
  }

  /**
   * Handle orchestration failure
   */
  private async handleOrchestrationFailure(
    orchestrationId: string,
    userId: string,
    subscriptionId: string,
    error: unknown
  ): Promise<void> {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown orchestration error';

    await this.logOrchestrationActivity(
      orchestrationId,
      'orchestration_failed',
      'error',
      errorMessage,
      { userId, subscriptionId, error: errorMessage }
    );

    // Emit failure event
    this.emitOrchestrationUpdate(orchestrationId, {
      orchestrationId,
      status: 'failed',
      progress: 0,
      message: `Orchestration failed: ${errorMessage}`,
    } as CancellationProgressUpdate);

    // Audit log
    await AuditLogger.log({
      userId,
      action: 'cancellation.orchestration_failed',
      resource: orchestrationId,
      result: 'failure',
      error: errorMessage,
      metadata: { subscriptionId },
    });
  }

  /**
   * Handle service completion events
   */
  private async handleServiceCompletion(
    data: ServiceEventData | Record<string, unknown>
  ): Promise<void> {
    // Implementation for handling service completion
    console.log(
      '[UnifiedCancellationOrchestratorEnhanced] Service completion:',
      data
    );
  }

  /**
   * Handle service progress events
   */
  private async handleServiceProgress(
    data: ServiceEventData | Record<string, unknown>
  ): Promise<void> {
    // Implementation for handling service progress
    console.log(
      '[UnifiedCancellationOrchestratorEnhanced] Service progress:',
      data
    );
  }

  /**
   * Handle service failure events
   */
  private async handleServiceFailure(
    data: ServiceEventData | Record<string, unknown>
  ): Promise<void> {
    // Implementation for handling service failure
    console.log(
      '[UnifiedCancellationOrchestratorEnhanced] Service failure:',
      data
    );
  }

  /**
   * Log orchestration activity
   */
  private async logOrchestrationActivity(
    orchestrationId: string,
    action: string,
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      // Use orchestrationId as requestId for orchestration logs
      // Create a synthetic request ID if none exists
      const logRequestId =
        (metadata?.requestId as string) ?? `${orchestrationId}_log`;

      await this.db.cancellationLog.create({
        data: {
          requestId: logRequestId,
          action,
          status: level,
          message,
          metadata: {
            orchestrationId,
            timestamp: new Date(),
            ...metadata,
          },
        },
      });
    } catch (error) {
      console.error(
        '[UnifiedCancellationOrchestratorEnhanced] Failed to log activity:',
        error
      );
    }
  }

  /**
   * Get cancellation request status (legacy interface compatibility)
   */
  async getCancellationStatus(
    userId: string,
    requestId: string,
    _orchestrationId?: string
  ): Promise<CancellationStatusResponse> {
    try {
      const request = await this.db.cancellationRequest.findUnique({
        where: { id: requestId },
        include: {
          subscription: true,
          provider: true,
          logs: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!request) {
        return {
          success: false,
          message: 'Cancellation request not found',
          error: {
            code: 'REQUEST_NOT_FOUND',
            message: 'Cancellation request not found',
          },
        };
      }

      return {
        success: true,
        status: {
          requestId: request.id,
          status: request.status,
          method: request.method,
          attempts: request.attempts,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          completedAt: request.completedAt,
          confirmationCode: request.confirmationCode,
          effectiveDate: request.effectiveDate,
          subscription: {
            id: request.subscription.id,
            name: request.subscription.name,
            amount: Number(request.subscription.amount), // Convert Decimal to number
          },
          provider: request.provider
            ? {
                name: request.provider.name,
                type: request.provider.type,
              }
            : null,
        },
        timeline: request.logs.map(log => ({
          action: log.action,
          status: log.status,
          message: log.message,
          createdAt: log.createdAt,
        })),
        nextSteps:
          request.status === 'completed'
            ? ['Cancellation completed successfully']
            : request.status === 'failed'
              ? ['Review failure reason and retry if needed']
              : ['Cancellation in progress'],
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error retrieving cancellation status',
        error: {
          code: 'STATUS_RETRIEVAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get orchestration status and progress
   */
  async getOrchestrationStatus(orchestrationId: string): Promise<{
    orchestrationId: string;
    status: string;
    method: string;
    startTime: Date;
    lastUpdate: Date;
    progress?: number;
    logs: Array<{
      id: string;
      requestId: string;
      action: string;
      status: string;
      message: string;
      metadata: Record<string, unknown>;
      createdAt: Date;
    }>;
  } | null> {
    const orchestration = this.activeOrchestrations.get(orchestrationId);
    if (!orchestration) {
      return null;
    }

    // Get logs for this orchestration
    let logs: Array<{
      id: string;
      requestId: string;
      action: string;
      status: string;
      message: string;
      metadata: Record<string, unknown>;
      createdAt: Date;
    }> = [];
    try {
      const dbLogs = await this.db.cancellationLog.findMany({
        where: {
          metadata: {
            path: ['orchestrationId'],
            equals: orchestrationId,
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      logs = dbLogs.map(log => ({
        id: log.id,
        requestId: log.requestId,
        action: log.action,
        status: log.status,
        message: log.message,
        metadata: (log.metadata as Record<string, unknown>) ?? {},
        createdAt: log.createdAt,
      }));
    } catch (error) {
      console.error(
        '[UnifiedCancellationOrchestratorEnhanced] Failed to get logs:',
        error
      );
      // Continue with empty logs array
    }

    return {
      orchestrationId,
      status: orchestration.status,
      method: orchestration.method,
      startTime: orchestration.startTime,
      lastUpdate: orchestration.lastUpdate,
      logs,
    };
  }

  /**
   * Retry a failed cancellation request
   */
  async retryCancellation(
    userId: string,
    requestId: string,
    options?: {
      forceMethod?: 'api' | 'automation' | 'lightweight';
      escalate?: boolean;
    }
  ): Promise<UnifiedCancellationResult> {
    try {
      // Get the existing request
      const request = await this.db.cancellationRequest.findFirst({
        where: {
          id: requestId,
          userId,
          status: { in: ['failed', 'cancelled'] },
        },
        include: {
          subscription: true,
        },
      });

      if (!request) {
        return {
          success: false,
          requestId,
          orchestrationId: `retry_${requestId}`,
          method: 'lightweight' as const,
          status: 'failed',
          message: 'Failed cancellation request not found',
          metadata: {
            attemptsUsed: 0,
            realTimeUpdatesEnabled: true,
          },
          tracking: {
            sseEndpoint: `/api/sse/cancellation/retry_${requestId}`,
            statusCheckUrl: `/api/trpc/unifiedCancellation.getStatus?input=${encodeURIComponent(JSON.stringify({ requestId }))}`,
          },
          error: {
            code: 'REQUEST_NOT_FOUND',
            message: 'Failed cancellation request not found',
          },
        };
      }

      // Reset the request for retry
      await this.db.cancellationRequest.update({
        where: { id: requestId },
        data: {
          status: 'pending',
          attempts: request.attempts,
          errorCode: null,
          errorMessage: null,
          lastAttemptAt: new Date(),
        },
      });

      // Re-orchestrate the cancellation with the preferred method from options or escalated method
      const retryMethod =
        options?.forceMethod ??
        (options?.escalate
          ? 'automation'
          : (request.method as 'api' | 'automation' | 'lightweight'));

      // Re-orchestrate the cancellation
      return this.initiateCancellation(userId, {
        subscriptionId: request.subscription.id,
        reason: 'Retry of failed cancellation',
        preferredMethod: (
          ['auto', 'api', 'automation', 'lightweight'] as const
        ).includes(retryMethod as 'auto' | 'api' | 'automation' | 'lightweight')
          ? (retryMethod as 'auto' | 'api' | 'automation' | 'lightweight')
          : 'auto',
        priority: options?.escalate ? 'high' : 'normal',
        userPreferences: {
          allowFallback: !options?.forceMethod, // Don't allow fallback if method is forced
          maxRetries: options?.escalate ? 5 : 3,
          timeoutMinutes: 30,
        },
      });
    } catch (error) {
      return {
        success: false,
        requestId,
        orchestrationId: `retry_${requestId}`,
        method: 'lightweight' as const,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown retry error',
        metadata: {
          attemptsUsed: 0,
          realTimeUpdatesEnabled: true,
        },
        tracking: {
          sseEndpoint: `/api/sse/cancellation/retry_${requestId}`,
          statusCheckUrl: `/api/trpc/unifiedCancellation.getStatus?input=${encodeURIComponent(JSON.stringify({ requestId }))}`,
        },
        error: {
          code: 'RETRY_FAILED',
          message:
            error instanceof Error ? error.message : 'Unknown retry error',
        },
      };
    }
  }

  /**
   * Cancel a cancellation request
   */
  async cancelCancellationRequest(
    userId: string,
    requestId: string,
    _reason?: string
  ): Promise<{
    success: boolean;
    message: string;
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      const request = await this.db.cancellationRequest.findFirst({
        where: {
          id: requestId,
          userId,
          status: { in: ['pending', 'processing'] },
        },
      });

      if (!request) {
        return {
          success: false,
          message: 'Cancellation request not found or not cancellable',
          error: {
            code: 'REQUEST_NOT_FOUND',
            message: 'Cancellation request not found or not cancellable',
          },
        };
      }

      await this.db.cancellationRequest.update({
        where: { id: requestId },
        data: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      });

      await this.db.cancellationLog.create({
        data: {
          requestId,
          action: 'user_cancelled',
          status: 'info',
          message: 'Cancellation request cancelled by user',
        },
      });

      return {
        success: true,
        message: 'Cancellation request cancelled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error cancelling request',
        error: {
          code: 'CANCELLATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Manual confirmation for lightweight cancellations
   */
  async confirmManual(
    userId: string,
    requestId: string,
    confirmationData: {
      confirmationCode?: string;
      effectiveDate?: Date;
      refundAmount?: number;
      notes?: string;
      wasSuccessful: boolean;
    }
  ): Promise<{
    success: boolean;
    message: string;
    requestId?: string;
    status?: string;
    confirmationCode?: string;
    effectiveDate?: Date;
    refundAmount?: number;
    subscription?: {
      id: string;
      name: string;
      status: string;
    };
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      // Verify this is a manual cancellation request
      const request = await this.db.cancellationRequest.findFirst({
        where: {
          id: requestId,
          userId,
          method: 'lightweight',
          status: { in: ['pending', 'processing', 'requires_manual'] },
        },
        include: {
          subscription: true,
        },
      });

      if (!request) {
        return {
          success: false,
          message:
            'Manual cancellation request not found or not eligible for confirmation',
          error: {
            code: 'REQUEST_NOT_FOUND',
            message:
              'Manual cancellation request not found or not eligible for confirmation',
          },
        };
      }

      const status = confirmationData.wasSuccessful ? 'completed' : 'failed';
      const effectiveDate = confirmationData.effectiveDate ?? new Date();

      // Update the cancellation request
      await this.db.cancellationRequest.update({
        where: { id: requestId },
        data: {
          status,
          confirmationCode: confirmationData.confirmationCode,
          effectiveDate,
          refundAmount: confirmationData.refundAmount ?? null,
          userConfirmed: confirmationData.wasSuccessful,
          userNotes: confirmationData.notes,
          completedAt: new Date(),
        },
      });

      // Update subscription if successful
      if (confirmationData.wasSuccessful) {
        await this.db.subscription.update({
          where: { id: request.subscriptionId },
          data: {
            status: 'cancelled',
            isActive: false,
            cancellationInfo: {
              requestId,
              confirmationCode: confirmationData.confirmationCode,
              effectiveDate,
              method: 'lightweight',
              confirmedAt: new Date(),
              userConfirmed: true,
            },
          },
        });
      }

      // Log the confirmation
      await this.db.cancellationLog.create({
        data: {
          requestId,
          action: confirmationData.wasSuccessful
            ? 'manual_confirmation_success'
            : 'manual_confirmation_failed',
          status: confirmationData.wasSuccessful ? 'success' : 'failure',
          message: confirmationData.wasSuccessful
            ? `Manual cancellation confirmed successfully. Code: ${confirmationData.confirmationCode}`
            : `Manual cancellation failed: ${confirmationData.notes}`,
          metadata: {
            confirmedAt: new Date(),
            confirmationCode: confirmationData.confirmationCode,
            effectiveDate,
            refundAmount: confirmationData.refundAmount,
          },
        },
      });

      return {
        success: true,
        requestId,
        status,
        confirmationCode: confirmationData.confirmationCode,
        effectiveDate,
        refundAmount: confirmationData.refundAmount,
        subscription: {
          id: request.subscription.id,
          name: request.subscription.name,
          status: confirmationData.wasSuccessful
            ? 'cancelled'
            : request.subscription.status,
        },
        message: confirmationData.wasSuccessful
          ? 'Manual cancellation confirmed successfully'
          : 'Manual cancellation failure recorded',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error confirming manual cancellation',
        error: {
          code: 'CONFIRMATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get provider capabilities (public method for router access)
   */
  getProviderCapabilities(
    provider?: string
  ): Map<string, ProviderCapability> | ProviderCapability | null {
    if (provider) {
      return this.providerCapabilities.get(provider)?.capability ?? null;
    }
    // Return a map of all capabilities
    const capabilities = new Map<string, ProviderCapability>();
    for (const [key, value] of this.providerCapabilities) {
      capabilities.set(key, value.capability);
    }
    return capabilities;
  }

  /**
   * Subscribe to real-time updates for an orchestration
   */
  subscribeToUpdates(
    orchestrationId: string,
    callback: (update: CancellationProgressUpdate) => void
  ): () => void {
    const orchestration = this.activeOrchestrations.get(orchestrationId);
    if (orchestration) {
      orchestration.callbacks.add(callback);

      // Return unsubscribe function
      return () => {
        orchestration.callbacks.delete(callback);
      };
    }

    // Return no-op unsubscribe if orchestration not found
    return () => {
      // No-op: orchestration not found, nothing to unsubscribe
    };
  }

  /**
   * Get comprehensive analytics across all methods
   */
  async getUnifiedAnalytics(
    userId: string,
    timeframe: 'day' | 'week' | 'month' = 'month'
  ): Promise<{
    summary: {
      total: number;
      successful: number;
      failed: number;
      pending: number;
      successRate: number;
    };
    methodBreakdown: {
      api: number;
      webhook: number;
      manual: number;
    };
    successRates: {
      overall: number;
      byMethod: Record<string, number>;
      byProvider: Record<string, number>;
    };
    providerAnalytics: Array<{
      provider: string;
      total: number;
      successful: number;
      avgTime: number;
      successRate: number;
    }>;
    trends: Array<{
      date: string;
      requests: number;
      successful: number;
      successRate: number;
    }>;
  }> {
    // Validate input parameters
    if (!userId || typeof userId !== 'string') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid user ID for analytics',
      });
    }

    if (!['day', 'week', 'month'].includes(timeframe)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid timeframe. Must be day, week, or month',
      });
    }

    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    // Get all cancellation requests for the user in the timeframe
    let requests;
    try {
      requests = await this.db.cancellationRequest.findMany({
        where: {
          userId,
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          subscription: {
            select: { name: true, amount: true },
          },
          provider: {
            select: { name: true, type: true },
          },
        },
      });
    } catch {
      // Return empty analytics on database error
      return {
        summary: {
          total: 0,
          successful: 0,
          failed: 0,
          pending: 0,
          successRate: 0,
        },
        methodBreakdown: {
          api: 0,
          webhook: 0,
          manual: 0,
        },
        successRates: {
          overall: 0,
          byMethod: {},
          byProvider: {},
        },
        providerAnalytics: [],
        trends: [],
      } as UnifiedAnalyticsResponse;
    }

    // Calculate summary statistics
    const total = requests.length;
    const completed = requests.filter(r => r.status === 'completed').length;
    const failed = requests.filter(r => r.status === 'failed').length;
    const pending = requests.filter(r =>
      ['pending', 'processing', 'scheduled'].includes(r.status)
    ).length;

    // Method breakdown
    const methodCounts = requests.reduce(
      (acc, r) => {
        const method =
          r.method === 'lightweight'
            ? 'lightweight'
            : r.method === 'web_automation'
              ? 'automation'
              : r.method;
        acc[method] = (acc[method] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Success rates by method
    const successRates = Object.keys(methodCounts).reduce(
      (acc, method) => {
        const methodRequests = requests.filter(r => {
          const requestMethod =
            r.method === 'lightweight'
              ? 'lightweight'
              : r.method === 'web_automation'
                ? 'automation'
                : r.method;
          return requestMethod === method;
        });
        const successful = methodRequests.filter(
          r => r.status === 'completed'
        ).length;
        acc[method] =
          methodRequests.length > 0
            ? Math.round((successful / methodRequests.length) * 100)
            : 0;
        return acc;
      },
      {} as Record<string, number>
    );

    // Provider analytics
    const providerStats = new Map<
      string,
      { total: number; successful: number; totalTime: number }
    >();

    for (const request of requests) {
      const providerName = request.provider?.name ?? request.subscription.name;
      const stats = providerStats.get(providerName) ?? {
        total: 0,
        successful: 0,
        totalTime: 0,
      };

      stats.total++;
      if (request.status === 'completed') {
        stats.successful++;
      }

      if (request.completedAt && request.createdAt) {
        stats.totalTime +=
          request.completedAt.getTime() - request.createdAt.getTime();
      }

      providerStats.set(providerName, stats);
    }

    const providerAnalytics = Array.from(providerStats.entries()).map(
      ([provider, stats]) => ({
        provider,
        total: stats.total,
        successful: stats.successful,
        avgTime:
          stats.successful > 0
            ? Math.round(stats.totalTime / stats.successful / 1000 / 60)
            : 0, // minutes
        successRate:
          stats.total > 0
            ? Math.round((stats.successful / stats.total) * 100)
            : 0,
      })
    );

    // Simple trends (daily counts)
    const trends = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayRequests = requests.filter(
        r => r.createdAt.toDateString() === date.toDateString()
      );
      return {
        date: date.toISOString().split('T')[0]!,
        total: dayRequests.length,
        completed: dayRequests.filter(r => r.status === 'completed').length,
        failed: dayRequests.filter(r => r.status === 'failed').length,
      };
    }).reverse();

    return {
      summary: {
        total,
        successful: completed,
        failed,
        pending,
        successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      methodBreakdown: {
        api: methodCounts.api ?? 0,
        webhook: methodCounts.webhook ?? methodCounts.automation ?? 0,
        manual: methodCounts.lightweight ?? 0,
      },
      successRates: {
        overall: total > 0 ? Math.round((completed / total) * 100) : 0,
        byMethod: successRates,
        byProvider: Object.fromEntries(
          providerAnalytics.map(p => [p.provider, p.successRate])
        ),
      },
      providerAnalytics,
      trends: trends.map(trend => ({
        date: trend.date,
        requests: trend.total,
        successful: trend.completed,
        successRate:
          trend.total > 0
            ? Math.round((trend.completed / trend.total) * 100)
            : 0,
      })),
    };
  }
}
