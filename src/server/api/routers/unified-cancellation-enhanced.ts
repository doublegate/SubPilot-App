import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import {
  UnifiedCancellationOrchestratorEnhancedService,
  UnifiedCancellationRequestInput,
} from '@/server/services/unified-cancellation-orchestrator-enhanced.service';

// Type definitions for provider capabilities
interface ProviderCapabilities {
  supportsApi: boolean;
  supportsAutomation: boolean;
  apiEstimatedTime: number;
  automationEstimatedTime: number;
  manualEstimatedTime: number;
  apiSuccessRate: number;
  automationSuccessRate: number;
  manualSuccessRate: number;
  difficulty: string;
  requires2FA: boolean;
  hasRetentionOffers: boolean;
  requiresHumanIntervention: boolean;
  providerId?: string;
  providerName?: string;
  dataSource?: string;
  lastAssessed?: Date;
  generateRecommendationReasoning?: (
    capabilities: ProviderCapabilities
  ) => string[];
  generateConsiderations?: (capabilities: ProviderCapabilities) => string[];
}

// Health metrics type definitions
type ErrorBreakdown = Record<string, number>;

interface PerformanceMetrics {
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

interface UptimeMetrics {
  uptime: string;
  lastDowntime: null | string;
  plannedMaintenance: null | string;
}

interface DetailedMetrics {
  errorBreakdown: ErrorBreakdown;
  performanceMetrics: PerformanceMetrics;
  uptimeMetrics: UptimeMetrics;
}

// Future use - Currently unused interfaces
// interface HealthMetrics {
//   status: string;
//   lastChecked: Date;
//   overall: {
//     successRate: number;
//     totalRecentRequests: number;
//     avgResponseTimeMs: number;
//     recentFailures: number;
//   };
//   methods: Record<string, { available: boolean; successRate: number; avgResponseTime: number }>;
//   system: { load: string; memory: string; activeConnections: number };
//   recommendations: string[];
//   detailed?: DetailedMetrics;
// }

// Interface for metrics service methods
// interface MetricsService {
//   analyzeErrorBreakdown?: (failures: unknown[]) => ErrorBreakdown;
//   calculatePercentile?: (requests: unknown[], percentile: number) => number;
// }

// Interface for method health metrics
interface MethodHealthMetrics {
  available: boolean;
  successRate: number;
  recentRequests: number;
  avgResponseTime: number;
}

/**
 * Enhanced Unified Cancellation Router
 *
 * This is the single, unified entry point for all cancellation operations.
 * It intelligently routes requests through the most appropriate method,
 * provides real-time updates, and handles comprehensive fallback scenarios.
 *
 * Key Features:
 * - Single API for all cancellation methods
 * - Intelligent method selection with fallback
 * - Real-time progress updates via SSE
 * - Comprehensive analytics and monitoring
 * - Unified error handling and retry logic
 */
export const unifiedCancellationEnhancedRouter = createTRPCRouter({
  /**
   * MAIN ENTRY POINT: Initiate unified cancellation
   * Automatically selects optimal method and handles fallbacks
   */
  /**
   * Alias for backward compatibility
   */
  initiate: protectedProcedure
    .input(UnifiedCancellationRequestInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      if (!input?.subscriptionId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid input: subscriptionId is required',
        });
      }

      const orchestrator = new UnifiedCancellationOrchestratorEnhancedService(
        ctx.db
      );

      try {
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User session not available',
          });
        }

        const result = await orchestrator.initiateCancellation(
          ctx.session.user.id,
          input
        );

        // Log successful initiation
        console.log(
          `[UnifiedCancellation] Initiated for user ${ctx.session.user.id}, subscription ${input.subscriptionId}`
        );

        return result;
      } catch (error) {
        // Enhanced error handling with context
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown cancellation error';

        console.error(
          `[UnifiedCancellation] Failed to initiate for user ${ctx.session.user.id}:`,
          error
        );

        throw new TRPCError({
          code:
            error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: errorMessage,
          cause: error,
        });
      }
    }),

  /**
   * MAIN ENTRY POINT: Initiate unified cancellation
   * Automatically selects optimal method and handles fallbacks
   */
  initiateCancellation: protectedProcedure
    .input(UnifiedCancellationRequestInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      if (!input?.subscriptionId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid input: subscriptionId is required',
        });
      }

      const orchestrator = new UnifiedCancellationOrchestratorEnhancedService(
        ctx.db
      );

      try {
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User session not available',
          });
        }

        const result = await orchestrator.initiateCancellation(
          ctx.session.user.id,
          input
        );

        // Log successful initiation
        console.log(
          `[UnifiedCancellation] Initiated for user ${ctx.session.user.id}, subscription ${input.subscriptionId}`
        );

        return result;
      } catch (error) {
        // Enhanced error handling with context
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown cancellation error';

        console.error(
          `[UnifiedCancellation] Failed to initiate for user ${ctx.session.user.id}:`,
          error
        );

        throw new TRPCError({
          code:
            error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: errorMessage,
          cause: error,
        });
      }
    }),

  /**
   * Get comprehensive cancellation status with real-time updates
   */
  getStatus: protectedProcedure
    .input(
      z
        .object({
          orchestrationId: z.string().min(1).optional(),
          requestId: z.string().min(1).optional(),
          includeHistory: z.boolean().optional().default(false),
          includeLogs: z.boolean().optional().default(true),
        })
        .strict()
    )
    .query(async ({ ctx, input }) => {
      if (!input.orchestrationId && !input.requestId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Either orchestrationId or requestId must be provided',
        });
      }

      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      const orchestrator = new UnifiedCancellationOrchestratorEnhancedService(
        ctx.db
      );

      try {
        // If we have an orchestration ID, get orchestration-level status
        if (input.orchestrationId) {
          const orchestrationStatus = await orchestrator.getOrchestrationStatus(
            input.orchestrationId
          );

          if (!orchestrationStatus) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Orchestration not found',
            });
          }

          return {
            type: 'orchestration',
            orchestration: orchestrationStatus,
            realTimeEnabled: true,
            sseEndpoint: `/api/sse/cancellation/${input.orchestrationId}`,
          };
        }

        // Otherwise, get request-level status
        const request = await ctx.db.cancellationRequest.findFirst({
          where: {
            id: input.requestId,
            userId: ctx.session.user.id,
          },
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
                type: true,
              },
            },
            logs: input.includeLogs
              ? {
                  orderBy: { createdAt: 'asc' },
                  take: 50,
                }
              : false,
          },
        });

        if (!request) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Cancellation request not found',
          });
        }

        // Get orchestration ID from errorDetails if available
        const orchestrationId =
          request.errorDetails &&
          typeof request.errorDetails === 'object' &&
          request.errorDetails !== null &&
          'orchestrationId' in request.errorDetails
            ? (request.errorDetails as { orchestrationId?: string })
                .orchestrationId
            : undefined;

        return {
          type: 'request',
          request: {
            id: request.id,
            status: request.status,
            method: request.method,
            priority: request.priority,
            attempts: request.attempts,
            maxAttempts: request.maxAttempts,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            completedAt: request.completedAt,
            lastAttemptAt: request.lastAttemptAt,
            nextRetryAt: request.nextRetryAt,
            confirmationCode: request.confirmationCode,
            effectiveDate: request.effectiveDate,
            refundAmount: request.refundAmount
              ? parseFloat(request.refundAmount.toString())
              : null,
            errorCode: request.errorCode,
            errorMessage: request.errorMessage,
            userNotes: request.userNotes,
            subscription: request.subscription,
            provider: request.provider,
            errorDetails: request.errorDetails as Record<string, unknown>,
          },
          logs: input.includeLogs
            ? request.logs?.map(log => ({
                id: log.id,
                timestamp: log.createdAt,
                action: log.action,
                status: log.status,
                message: log.message,
                metadata: log.metadata,
                duration: log.duration,
              }))
            : undefined,
          orchestrationId,
          realTimeEnabled: Boolean(orchestrationId),
          sseEndpoint: orchestrationId
            ? `/api/sse/cancellation/${orchestrationId}`
            : undefined,
        };
      } catch (error) {
        console.error('[UnifiedCancellation] Error getting status:', error);
        throw error instanceof TRPCError
          ? error
          : new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to get cancellation status',
              cause: error,
            });
      }
    }),

  /**
   * Retry failed cancellation with intelligent method selection
   */
  retry: protectedProcedure
    .input(
      z
        .object({
          requestId: z.string().min(1, 'Request ID is required'),
          orchestrationId: z.string().min(1).optional(),
          forceMethod: z.enum(['api', 'automation', 'manual']).optional(),
          escalate: z.boolean().optional().default(false),
          userNotes: z.string().trim().max(500, 'Notes too long').optional(),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      const orchestrator = new UnifiedCancellationOrchestratorEnhancedService(
        ctx.db
      );

      try {
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User session not available',
          });
        }

        // Verify ownership of the request
        const request = await ctx.db.cancellationRequest.findFirst({
          where: {
            id: input.requestId,
            userId: ctx.session.user.id,
          },
          include: {
            subscription: true,
          },
        });

        if (!request) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Cancellation request not found',
          });
        }

        if (!['failed', 'cancelled'].includes(request.status)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Only failed or cancelled requests can be retried',
          });
        }

        // Create new unified cancellation request for retry
        const retryInput = {
          subscriptionId: request.subscriptionId,
          reason: input.userNotes ?? 'Retry of failed cancellation',
          priority: request.priority as 'low' | 'normal' | 'high',
          preferredMethod: input.forceMethod ?? 'auto',
          userPreferences: {
            allowFallback: !input.forceMethod, // Don't allow fallback if method is forced
            maxRetries: input.escalate ? 5 : 3,
          },
        };

        const result = await orchestrator.initiateCancellation(
          ctx.session.user.id,
          retryInput
        );

        // Update original request to reference the retry - no data update needed for this operation
        await ctx.db.cancellationRequest.update({
          where: { id: input.requestId },
          data: {
            // Add retry reference in errorDetails
            errorDetails: {
              ...((request.errorDetails as Record<string, unknown>) ?? {}),
              retryRequestId: result.requestId,
              retryOrchestrationId: result.orchestrationId,
              retryInitiatedAt: new Date(),
            },
          },
        });

        // Log the retry
        await ctx.db.cancellationLog.create({
          data: {
            requestId: input.requestId,
            action: 'retry_initiated',
            status: 'info',
            message: `Retry initiated with ${input.forceMethod ?? 'auto'} method`,
            metadata: {
              retryRequestId: result.requestId,
              retryOrchestrationId: result.orchestrationId,
              forceMethod: input.forceMethod,
              escalate: input.escalate,
            },
          },
        });

        return {
          ...result,
          isRetry: true,
          originalRequestId: input.requestId,
        };
      } catch (error) {
        console.error('[UnifiedCancellation] Error retrying:', error);
        throw error instanceof TRPCError
          ? error
          : new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to retry cancellation',
              cause: error,
            });
      }
    }),

  /**
   * Cancel an active cancellation request
   */
  cancel: protectedProcedure
    .input(
      z
        .object({
          requestId: z.string().min(1).optional(),
          orchestrationId: z.string().min(1).optional(),
          reason: z.string().trim().max(500, 'Reason too long').optional(),
        })
        .strict()
        .refine(
          data => !!(data.requestId ?? data.orchestrationId),
          'Either requestId or orchestrationId must be provided'
        )
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.requestId && !input.orchestrationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Either requestId or orchestrationId must be provided',
        });
      }

      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        // Find the request to cancel with proper typing
        interface WhereClause {
          userId: string;
          status: { in: string[] };
          id?: string;
          metadata?: {
            path: string[];
            equals: string;
          };
        }

        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User session not available',
          });
        }

        const whereClause: WhereClause = {
          userId: ctx.session.user.id,
          status: { in: ['pending', 'processing', 'scheduled'] },
        };

        if (input.requestId) {
          whereClause.id = input.requestId;
        } else if (input.orchestrationId) {
          whereClause.metadata = {
            path: ['orchestrationId'],
            equals: input.orchestrationId,
          };
        }

        const request = await ctx.db.cancellationRequest.findFirst({
          where: whereClause,
        });

        if (!request) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No cancellable request found',
          });
        }

        // Update request status
        await ctx.db.cancellationRequest.update({
          where: { id: request.id },
          data: {
            status: 'cancelled',
            completedAt: new Date(),
            userNotes: input.reason ?? 'Cancelled by user',
          },
        });

        // Log the cancellation
        await ctx.db.cancellationLog.create({
          data: {
            requestId: request.id,
            action: 'request_cancelled_by_user',
            status: 'info',
            message: input.reason ?? 'Cancellation request cancelled by user',
            metadata: {
              cancelledAt: new Date(),
              reason: input.reason,
            },
          },
        });

        return {
          success: true,
          requestId: request.id,
          orchestrationId: input.orchestrationId,
          message: 'Cancellation request has been cancelled',
          cancelledAt: new Date(),
        };
      } catch (error) {
        console.error('[UnifiedCancellation] Error cancelling request:', error);
        throw error instanceof TRPCError
          ? error
          : new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to cancel request',
              cause: error,
            });
      }
    }),

  /**
   * Manual confirmation for lightweight cancellations
   */
  confirmManual: protectedProcedure
    .input(
      z
        .object({
          requestId: z.string().min(1, 'Request ID is required'),
          confirmationCode: z
            .string()
            .trim()
            .max(100, 'Confirmation code too long')
            .optional(),
          effectiveDate: z
            .date()
            .refine(
              date => date <= new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Within 1 year
              'Effective date cannot be more than 1 year in the future'
            )
            .optional(),
          refundAmount: z
            .number()
            .min(0, 'Refund amount must be positive')
            .max(999999, 'Refund amount too large')
            .optional(),
          notes: z.string().trim().max(1000, 'Notes too long').optional(),
          wasSuccessful: z.boolean(),
          attachments: z
            .array(
              z.object({
                type: z.enum(['screenshot', 'email', 'confirmation']),
                url: z
                  .string()
                  .url('Invalid URL format')
                  .max(2048, 'URL too long'),
                description: z
                  .string()
                  .trim()
                  .max(200, 'Description too long')
                  .optional(),
              })
            )
            .max(10, 'Too many attachments')
            .optional(),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        // Verify this is a manual cancellation request
        const request = await ctx.db.cancellationRequest.findFirst({
          where: {
            id: input.requestId,
            userId: ctx.session.user.id,
            method: 'manual',
            status: { in: ['pending', 'processing', 'requires_manual'] },
          },
          include: {
            subscription: true,
          },
        });

        if (!request) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message:
              'Manual cancellation request not found or not eligible for confirmation',
          });
        }

        const status = input.wasSuccessful ? 'completed' : 'failed';
        const effectiveDate = input.effectiveDate ?? new Date();

        // Update the cancellation request
        await ctx.db.cancellationRequest.update({
          where: { id: input.requestId },
          data: {
            status,
            confirmationCode: input.confirmationCode,
            effectiveDate,
            refundAmount: input.refundAmount ?? null,
            userConfirmed: input.wasSuccessful,
            userNotes: input.notes,
            completedAt: new Date(),
          },
        });

        // Update subscription if successful
        if (input.wasSuccessful) {
          await ctx.db.subscription.update({
            where: { id: request.subscriptionId },
            data: {
              status: 'cancelled',
              isActive: false,
              cancellationInfo: {
                requestId: input.requestId,
                confirmationCode: input.confirmationCode,
                effectiveDate,
                method: 'manual',
                confirmedAt: new Date(),
                userConfirmed: true,
              },
            },
          });
        }

        // Log the confirmation
        await ctx.db.cancellationLog.create({
          data: {
            requestId: input.requestId,
            action: input.wasSuccessful
              ? 'manual_confirmation_success'
              : 'manual_confirmation_failed',
            status: input.wasSuccessful ? 'success' : 'failure',
            message: input.wasSuccessful
              ? `Manual cancellation confirmed successfully. Code: ${input.confirmationCode}`
              : `Manual cancellation failed: ${input.notes}`,
            metadata: {
              confirmedAt: new Date(),
              confirmationCode: input.confirmationCode,
              effectiveDate,
              refundAmount: input.refundAmount,
              attachments: input.attachments,
            },
          },
        });

        return {
          success: true,
          requestId: input.requestId,
          status,
          confirmationCode: input.confirmationCode,
          effectiveDate,
          refundAmount: input.refundAmount,
          subscription: {
            id: request.subscription.id,
            name: request.subscription.name,
            status: input.wasSuccessful
              ? 'cancelled'
              : request.subscription.status,
          },
          message: input.wasSuccessful
            ? 'Manual cancellation confirmed successfully'
            : 'Manual cancellation failure recorded',
        };
      } catch (error) {
        console.error(
          '[UnifiedCancellation] Error confirming manual cancellation:',
          error
        );
        throw error instanceof TRPCError
          ? error
          : new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to confirm manual cancellation',
              cause: error,
            });
      }
    }),

  /**
   * Get provider capabilities and method recommendations
   */
  getProviderCapabilities: protectedProcedure
    .input(
      z
        .object({
          subscriptionId: z
            .string()
            .min(1, 'Subscription ID is required')
            .max(50, 'Subscription ID too long'),
          includeRecommendations: z.boolean().optional().default(true),
        })
        .strict()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        // Get subscription details
        const subscription = await ctx.db.subscription.findFirst({
          where: {
            id: input.subscriptionId,
            userId: ctx.session.user.id,
          },
        });

        if (!subscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Subscription not found',
          });
        }

        // Get provider capabilities using database lookup (simpler approach)
        const provider = await ctx.db.cancellationProvider.findFirst({
          where: {
            normalizedName: subscription.name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, ''),
            isActive: true,
          },
        });

        // Build capabilities from provider data or defaults
        const capabilities: ProviderCapabilities = provider
          ? {
              providerId: provider.id,
              providerName: provider.name,
              supportsApi:
                provider.type === 'api' && Boolean(provider.apiEndpoint),
              supportsAutomation: provider.type === 'web_automation',
              dataSource: 'database',
              lastAssessed: provider.updatedAt,
              apiSuccessRate:
                provider.type === 'api'
                  ? parseFloat(provider.successRate.toString())
                  : 0,
              automationSuccessRate:
                provider.type === 'web_automation'
                  ? parseFloat(provider.successRate.toString())
                  : 0,
              manualSuccessRate: 0.95, // Manual generally has high success rate
              apiEstimatedTime:
                provider.type === 'api' ? (provider.averageTime ?? 5) : 999,
              automationEstimatedTime:
                provider.type === 'web_automation'
                  ? (provider.averageTime ?? 15)
                  : 999,
              manualEstimatedTime: 20, // Typical manual time
              difficulty: provider.difficulty as 'easy' | 'medium' | 'hard',
              requires2FA: provider.requires2FA ?? false,
              hasRetentionOffers: provider.requiresRetention ?? false,
              requiresHumanIntervention: provider.difficulty === 'hard',
            }
          : {
              providerName: subscription.name,
              supportsApi: false,
              supportsAutomation: false,
              dataSource: 'default',
              lastAssessed: new Date(),
              apiSuccessRate: 0,
              automationSuccessRate: 0,
              manualSuccessRate: 0.95,
              apiEstimatedTime: 999,
              automationEstimatedTime: 999,
              manualEstimatedTime: 20,
              difficulty: 'medium',
              requires2FA: false,
              hasRetentionOffers: false,
              requiresHumanIntervention: true,
            };

        // Build method availability and recommendations
        const methods = [
          {
            id: 'auto',
            name: 'Automatic (Recommended)',
            description: 'Intelligent method selection with fallback',
            available: true,
            estimatedTime: Math.min(
              capabilities.supportsApi ? capabilities.apiEstimatedTime : 999,
              capabilities.supportsAutomation
                ? capabilities.automationEstimatedTime
                : 999,
              capabilities.manualEstimatedTime
            ),
            successRate:
              Math.max(
                capabilities.apiSuccessRate,
                capabilities.automationSuccessRate,
                capabilities.manualSuccessRate
              ) * 100,
            isRecommended: true,
            requiresInteraction: false,
          },
          {
            id: 'api',
            name: 'Direct API',
            description: 'Instant automated cancellation',
            available: capabilities.supportsApi,
            estimatedTime: capabilities.apiEstimatedTime,
            successRate: capabilities.apiSuccessRate * 100,
            isRecommended:
              capabilities.supportsApi && capabilities.apiSuccessRate > 0.85,
            requiresInteraction: false,
          },
          {
            id: 'automation',
            name: 'Smart Automation',
            description: 'Advanced web automation with monitoring',
            available: capabilities.supportsAutomation,
            estimatedTime: capabilities.automationEstimatedTime,
            successRate: capabilities.automationSuccessRate * 100,
            isRecommended:
              capabilities.requires2FA ?? capabilities.difficulty === 'hard',
            requiresInteraction: capabilities.requires2FA,
          },
          {
            id: 'manual',
            name: 'Manual Instructions',
            description: 'Step-by-step cancellation guide',
            available: true,
            estimatedTime: capabilities.manualEstimatedTime,
            successRate: capabilities.manualSuccessRate * 100,
            isRecommended: false,
            requiresInteraction: true,
          },
        ].filter(method => method.available);

        const recommendations = input.includeRecommendations
          ? {
              primaryMethod: methods.find(m => m.isRecommended)?.id ?? 'auto',
              reasoning: capabilities.generateRecommendationReasoning
                ? capabilities.generateRecommendationReasoning(capabilities)
                : [],
              considerations: capabilities.generateConsiderations
                ? capabilities.generateConsiderations(capabilities)
                : [],
            }
          : undefined;

        return {
          subscription: {
            id: subscription.id,
            name: subscription.name,
          },
          provider: capabilities.providerId
            ? {
                id: capabilities.providerId,
                name: capabilities.providerName,
                dataSource: capabilities.dataSource,
                lastAssessed: capabilities.lastAssessed,
              }
            : null,
          capabilities: {
            difficulty: capabilities.difficulty,
            requires2FA: capabilities.requires2FA,
            hasRetentionOffers: capabilities.hasRetentionOffers,
            requiresHumanIntervention: capabilities.requiresHumanIntervention,
          },
          methods,
          recommendations,
        };
      } catch (error) {
        console.error(
          '[UnifiedCancellation] Error getting provider capabilities:',
          error
        );
        throw error instanceof TRPCError
          ? error
          : new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to get provider capabilities',
              cause: error,
            });
      }
    }),

  /**
   * Validate if a subscription can be cancelled
   */
  canCancel: protectedProcedure
    .input(
      z
        .object({
          subscriptionId: z
            .string()
            .min(1, 'Subscription ID is required')
            .max(50, 'Subscription ID too long'),
        })
        .strict()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const subscription = await ctx.db.subscription.findFirst({
          where: {
            id: input.subscriptionId,
            userId: ctx.session.user.id,
          },
        });

        if (!subscription) {
          return {
            canCancel: false,
            reason: 'not_found',
            message:
              'Subscription not found or you do not have permission to cancel it',
          };
        }

        // Check if already cancelled
        if (subscription.status === 'cancelled') {
          return {
            canCancel: false,
            reason: 'already_cancelled',
            message: 'This subscription is already cancelled',
            effectiveDate: (
              subscription.cancellationInfo as { effectiveDate?: Date } | null
            )?.effectiveDate,
          };
        }

        // Check for existing active cancellation requests
        const existingRequest = await ctx.db.cancellationRequest.findFirst({
          where: {
            subscriptionId: input.subscriptionId,
            userId: ctx.session.user.id,
            status: { in: ['pending', 'processing', 'scheduled'] },
          },
        });

        if (existingRequest) {
          return {
            canCancel: false,
            reason: 'cancellation_in_progress',
            message: 'A cancellation request is already in progress',
            existingRequestId: existingRequest.id,
            requestStatus: existingRequest.status,
            requestMethod: existingRequest.method,
            createdAt: existingRequest.createdAt,
          };
        }

        // Get provider information for enhanced response
        const provider = await ctx.db.cancellationProvider.findFirst({
          where: {
            normalizedName: subscription.name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, ''),
            isActive: true,
          },
        });

        return {
          canCancel: true,
          message: 'Subscription can be cancelled',
          provider: provider
            ? {
                id: provider.id,
                name: provider.name,
                type: provider.type,
                difficulty: provider.difficulty,
                estimatedTime: provider.averageTime,
                successRate: parseFloat(provider.successRate.toString()),
              }
            : null,
          subscription: {
            id: subscription.id,
            name: subscription.name,
            amount: parseFloat(subscription.amount.toString()),
            frequency: subscription.frequency,
            nextBilling: subscription.nextBilling,
          },
        };
      } catch (error) {
        console.error(
          '[UnifiedCancellation] Error checking cancellation eligibility:',
          error
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check cancellation eligibility',
          cause: error,
        });
      }
    }),

  /**
   * Get comprehensive cancellation history
   */
  getHistory: protectedProcedure
    .input(
      z
        .object({
          limit: z
            .number()
            .int()
            .min(1, 'Limit must be at least 1')
            .max(100, 'Limit too large')
            .optional()
            .default(20),
          offset: z
            .number()
            .int()
            .min(0, 'Offset must be non-negative')
            .max(10000, 'Offset too large')
            .optional()
            .default(0),
          status: z
            .enum(['all', 'completed', 'failed', 'pending', 'cancelled'])
            .optional()
            .default('all'),
          method: z
            .enum(['all', 'api', 'automation', 'manual'])
            .optional()
            .default('all'),
          subscriptionId: z.string().min(1).max(50).optional(),
          includeMetadata: z.boolean().optional().default(false),
        })
        .strict()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        interface HistoryWhereClause {
          userId: string;
          status?: string | { in: string[] };
          method?: string;
          subscriptionId?: string;
        }

        const where: HistoryWhereClause = {
          userId: ctx.session.user.id,
        };

        // Apply status filter
        if (input.status !== 'all') {
          if (input.status === 'pending') {
            where.status = { in: ['pending', 'processing', 'scheduled'] };
          } else {
            where.status = input.status;
          }
        }

        // Apply method filter
        if (input.method !== 'all') {
          const method =
            input.method === 'automation'
              ? 'web_automation'
              : input.method === 'manual'
                ? 'manual'
                : input.method;
          where.method = method;
        }

        // Apply subscription filter
        if (input.subscriptionId) {
          where.subscriptionId = input.subscriptionId;
        }

        const [requests, total] = await Promise.all([
          ctx.db.cancellationRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: input.limit,
            skip: input.offset,
            include: {
              subscription: {
                select: {
                  id: true,
                  name: true,
                  amount: true,
                  frequency: true,
                },
              },
              provider: {
                select: {
                  name: true,
                  logo: true,
                  type: true,
                },
              },
            },
          }),
          ctx.db.cancellationRequest.count({ where }),
        ]);

        const items = requests.map(request => {
          // Type guard for metadata access
          const metadata = request.metadata as Record<string, unknown> | null;
          const orchestrationId =
            metadata &&
            typeof metadata === 'object' &&
            'orchestrationId' in metadata
              ? (metadata.orchestrationId as string | undefined)
              : undefined;

          return {
            id: request.id,
            orchestrationId,
            subscription: {
              id: request.subscription.id,
              name: request.subscription.name,
              amount: parseFloat(request.subscription.amount.toString()),
              frequency: request.subscription.frequency,
            },
            provider: request.provider,
            status: request.status,
            method:
              request.method === 'web_automation'
                ? 'automation'
                : request.method === 'manual'
                  ? 'manual'
                  : request.method,
            priority: request.priority,
            attempts: request.attempts,
            maxAttempts: request.maxAttempts,
            confirmationCode: request.confirmationCode,
            effectiveDate: request.effectiveDate,
            refundAmount: request.refundAmount
              ? parseFloat(request.refundAmount.toString())
              : null,
            errorCode: request.errorCode,
            errorMessage: request.errorMessage,
            userNotes: request.userNotes,
            userConfirmed: request.userConfirmed,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            completedAt: request.completedAt,
            lastAttemptAt: request.lastAttemptAt,
            nextRetryAt: request.nextRetryAt,
            metadata: input.includeMetadata ? metadata : undefined,
          };
        });

        return {
          items,
          pagination: {
            total,
            limit: input.limit,
            offset: input.offset,
            hasMore: input.offset + input.limit < total,
          },
          summary: {
            totalRequests: total,
            byStatus: await getStatusBreakdown(ctx.db, ctx.session.user.id),
            byMethod: await getMethodBreakdown(ctx.db, ctx.session.user.id),
          },
        };
      } catch (error) {
        console.error('[UnifiedCancellation] Error getting history:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get cancellation history',
          cause: error,
        });
      }
    }),

  /**
   * Get unified analytics across all methods
   */
  getAnalytics: protectedProcedure
    .input(
      z
        .object({
          timeframe: z
            .enum(['day', 'week', 'month', 'quarter', 'year'])
            .optional()
            .default('month'),
          includeProviderBreakdown: z.boolean().optional().default(true),
          includeTrends: z.boolean().optional().default(true),
        })
        .strict()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const orchestrator = new UnifiedCancellationOrchestratorEnhancedService(
          ctx.db
        );
        const analytics = await orchestrator.getUnifiedAnalytics(
          ctx.session.user.id,
          input.timeframe
        );

        // Add additional insights using the exported function
        const insights = generateAnalyticsInsights(analytics);

        return {
          ...analytics,
          insights,
          timeframe: input.timeframe,
          generatedAt: new Date(),
        };
      } catch (error) {
        console.error('[UnifiedCancellation] Error getting analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get analytics',
          cause: error,
        });
      }
    }),

  /**
   * Get system health and performance metrics
   */
  getSystemHealth: protectedProcedure
    .input(
      z
        .object({
          includeDetailedMetrics: z.boolean().optional().default(false),
        })
        .strict()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Get recent system performance
        const [recentRequests, recentFailures, systemLoad] = await Promise.all([
          ctx.db.cancellationRequest.findMany({
            where: { createdAt: { gte: oneHourAgo } },
            select: {
              method: true,
              status: true,
              createdAt: true,
              completedAt: true,
            },
          }),
          ctx.db.cancellationRequest.findMany({
            where: {
              createdAt: { gte: oneDayAgo },
              status: 'failed',
            },
            select: { method: true, errorCode: true, createdAt: true },
          }),
          // Mock system load - in real implementation, this would come from monitoring
          Promise.resolve({ cpu: 45, memory: 68, activeConnections: 23 }),
        ]);

        // Calculate method health
        const methodHealth: Record<string, MethodHealthMetrics> = {
          api: {
            available: true,
            successRate: 0,
            recentRequests: 0,
            avgResponseTime: 0,
          },
          automation: {
            available: true,
            successRate: 0,
            recentRequests: 0,
            avgResponseTime: 0,
          },
          manual: {
            available: true,
            successRate: 100,
            recentRequests: 0,
            avgResponseTime: 0,
          },
        };

        let totalResponseTime = 0;
        let completedRequests = 0;

        for (const request of recentRequests) {
          const method =
            request.method === 'web_automation'
              ? 'automation'
              : request.method === 'manual'
                ? 'manual'
                : 'api';

          if (methodHealth[method]) {
            methodHealth[method].recentRequests++;

            if (request.status === 'completed') {
              methodHealth[method].successRate++;

              if (request.completedAt) {
                const responseTime =
                  request.completedAt.getTime() - request.createdAt.getTime();
                totalResponseTime += responseTime;
                completedRequests++;
              }
            }
          }
        }

        // Convert to percentages and calculate averages
        for (const method in methodHealth) {
          if (methodHealth[method].recentRequests > 0) {
            methodHealth[method].successRate = Math.round(
              (methodHealth[method].successRate /
                methodHealth[method].recentRequests) *
                100
            );
          }
        }

        const avgResponseTime =
          completedRequests > 0 ? totalResponseTime / completedRequests : 0;

        // Calculate overall system status
        const overallSuccessRate =
          recentRequests.length > 0
            ? (recentRequests.filter(r => r.status === 'completed').length /
                recentRequests.length) *
              100
            : 100;

        const systemStatus =
          overallSuccessRate > 90
            ? 'healthy'
            : overallSuccessRate > 70
              ? 'degraded'
              : 'unhealthy';

        // Generate recommendations based on health
        const recommendations = [];
        if (overallSuccessRate < 80) {
          recommendations.push(
            'Consider using manual method for higher reliability'
          );
        }
        if (recentFailures.length > 10) {
          recommendations.push('High error rate detected - check system logs');
        }
        if (avgResponseTime > 30000) {
          recommendations.push('Response times are slower than usual');
        }

        const health = {
          status: systemStatus,
          lastChecked: now,
          overall: {
            successRate: Math.round(overallSuccessRate),
            totalRecentRequests: recentRequests.length,
            avgResponseTimeMs: Math.round(avgResponseTime),
            recentFailures: recentFailures.length,
          },
          methods: methodHealth,
          system: systemLoad,
          recommendations,
        };

        if (input.includeDetailedMetrics) {
          // Add detailed metrics for monitoring dashboards using exported functions
          const detailed: DetailedMetrics = {
            errorBreakdown: analyzeErrorBreakdown(recentFailures),
            performanceMetrics: {
              p50ResponseTime: calculatePercentile(recentRequests, 50),
              p95ResponseTime: calculatePercentile(recentRequests, 95),
              p99ResponseTime: calculatePercentile(recentRequests, 99),
            },
            uptimeMetrics: {
              // Mock uptime data
              uptime: '99.9%',
              lastDowntime: null,
              plannedMaintenance: null,
            },
          };

          return {
            ...health,
            detailed,
          };
        }

        return health;
      } catch (error) {
        console.error(
          '[UnifiedCancellation] Error getting system health:',
          error
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get system health',
          cause: error,
        });
      }
    }),
});

// Helper methods for analytics and health checks with proper typing
export function generateRecommendationReasoning(
  capabilities: ProviderCapabilities
): string {
  if (capabilities.supportsApi && capabilities.apiSuccessRate > 0.85) {
    return 'High API success rate makes automatic cancellation the best option';
  }
  if (capabilities.requires2FA ?? capabilities.difficulty === 'hard') {
    return 'Complex cancellation process requires smart automation';
  }
  return 'Manual instructions provide the most reliable cancellation method';
}

export function generateConsiderations(
  capabilities: ProviderCapabilities
): string[] {
  const considerations = [];
  if (capabilities.hasRetentionOffers) {
    considerations.push(
      'This provider may offer retention discounts during cancellation'
    );
  }
  if (capabilities.requires2FA) {
    considerations.push('Two-factor authentication will be required');
  }
  if (capabilities.difficulty === 'hard') {
    considerations.push('This cancellation may be complex and time-consuming');
  }
  return considerations;
}

interface AnalyticsData {
  summary: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    successRate: number;
  };
  methodBreakdown: Record<string, number>;
  successRates: Record<string, number>;
  providerAnalytics: Array<{
    provider: string;
    totalAttempts: number;
    successRate: number;
    averageCompletionTime: number;
  }>;
  trends: Array<{
    date: string;
    total: number;
    completed: number;
    failed: number;
  }>;
}

interface AnalyticsInsight {
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
}

export function generateAnalyticsInsights(
  analytics: AnalyticsData
): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];

  if (analytics?.summary?.successRate < 70) {
    insights.push({
      type: 'warning',
      title: 'Low Success Rate',
      message:
        'Your cancellation success rate is below average. Consider using manual method for better results.',
    });
  }

  const methodBreakdown = analytics?.methodBreakdown ?? {};
  const manualCount = methodBreakdown.manual ?? 0;
  const apiCount = methodBreakdown.api ?? 0;
  const automationCount = methodBreakdown.automation ?? 0;

  if (manualCount > apiCount + automationCount) {
    insights.push({
      type: 'info',
      title: 'Manual Method Usage',
      message:
        "You're primarily using manual cancellations. Automated methods might save time.",
    });
  }

  if (analytics?.summary?.total === 0) {
    insights.push({
      type: 'info',
      title: 'No Cancellation History',
      message: 'Start cancelling subscriptions to see analytics insights.',
    });
  }

  return insights;
}

interface DatabaseClient {
  cancellationRequest: {
    groupBy: (params: {
      by: string[];
      where: { userId: string };
      _count: Record<string, boolean>;
    }) => Promise<
      Array<{
        status?: string;
        method?: string;
        _count: Record<string, number>;
      }>
    >;
  };
}

export async function getStatusBreakdown(
  db: DatabaseClient,
  userId: string
): Promise<Record<string, number>> {
  try {
    const results = await db.cancellationRequest.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    });

    if (!results || !Array.isArray(results)) {
      return {};
    }

    return results.reduce((acc: Record<string, number>, result) => {
      if (result?.status && result._count?.status) {
        acc[result.status] = result._count.status;
      }
      return acc;
    }, {});
  } catch (error) {
    console.error('Error getting status breakdown:', error);
    return {};
  }
}

export async function getMethodBreakdown(
  db: DatabaseClient,
  userId: string
): Promise<Record<string, number>> {
  try {
    const results = await db.cancellationRequest.groupBy({
      by: ['method'],
      where: { userId },
      _count: { method: true },
    });

    if (!results || !Array.isArray(results)) {
      return {};
    }

    return results.reduce((acc: Record<string, number>, result) => {
      if (result?.method && result._count?.method) {
        const method =
          result.method === 'web_automation'
            ? 'automation'
            : result.method === 'manual'
              ? 'manual'
              : 'api';
        acc[method] = (acc[method] ?? 0) + result._count.method;
      }
      return acc;
    }, {});
  } catch (error) {
    console.error('Error getting method breakdown:', error);
    return {};
  }
}

interface FailureRecord {
  errorCode?: string | null;
}

export function analyzeErrorBreakdown(
  failures: FailureRecord[]
): Record<string, number> {
  const breakdown: Record<string, number> = {};
  failures.forEach(failure => {
    const code = failure.errorCode ?? 'unknown';
    breakdown[code] = (breakdown[code] ?? 0) + 1;
  });
  return breakdown;
}

interface RequestRecord {
  completedAt?: Date | null;
  createdAt: Date;
}

export function calculatePercentile(
  requests: RequestRecord[],
  percentile: number
): number {
  const completedRequests = requests
    .filter(r => r.completedAt)
    .map(r => (r.completedAt?.getTime() ?? 0) - r.createdAt.getTime())
    .sort((a, b) => a - b);

  if (completedRequests.length === 0) return 0;

  const index = Math.ceil((percentile / 100) * completedRequests.length) - 1;
  return completedRequests[index] ?? 0;
}
