import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { UnifiedCancellationOrchestratorService } from '@/server/services/unified-cancellation-orchestrator.service';

// Type definitions for return data
interface MethodHealth {
  available: boolean;
  successRate: number;
  recentRequests: number;
}

// Create input schema that matches UnifiedCancellationRequest
const UnifiedCancellationRequestInput = z.object({
  subscriptionId: z.string(),
  reason: z.string().optional(),
  method: z.enum(['auto', 'api', 'automation', 'manual']).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  userPreference: z
    .object({
      preferredMethod: z.enum(['api', 'automation', 'manual']).optional(),
      allowFallback: z.boolean().optional(),
      notificationPreferences: z
        .object({
          realTime: z.boolean().optional(),
          email: z.boolean().optional(),
          sms: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Unified Cancellation Router
 *
 * Single entry point for all cancellation operations that intelligently
 * routes requests through the most appropriate cancellation method.
 */
export const unifiedCancellationRouter = createTRPCRouter({
  /**
   * Initiate a unified cancellation request
   * Automatically selects the best method based on provider capabilities
   */
  initiate: protectedProcedure
    .input(UnifiedCancellationRequestInput)
    .mutation(async ({ ctx, input }) => {
      const orchestrator = new UnifiedCancellationOrchestratorService(ctx.db);
      return await orchestrator.initiateCancellation(
        ctx.session.user.id,
        input
      );
    }),

  /**
   * Get unified cancellation status with real-time updates
   */
  getStatus: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
        orchestrationId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orchestrator = new UnifiedCancellationOrchestratorService(ctx.db);
      const statusResult: unknown = await orchestrator.getCancellationStatus(
        ctx.session.user.id,
        input.requestId,
        input.orchestrationId
      );
      // Return the status data as a generic object
      return statusResult as Record<string, unknown>;
    }),

  /**
   * Retry a failed cancellation with intelligent method selection
   */
  retry: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
        forceMethod: z.enum(['api', 'event_driven', 'lightweight']).optional(),
        escalate: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orchestrator = new UnifiedCancellationOrchestratorService(ctx.db);
      return await orchestrator.retryCancellation(
        ctx.session.user.id,
        input.requestId,
        {
          forceMethod: input.forceMethod,
          escalate: input.escalate,
        }
      );
    }),

  /**
   * Cancel an active cancellation request
   */
  cancel: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orchestrator = new UnifiedCancellationOrchestratorService(ctx.db);
      return await orchestrator.cancelCancellationRequest(
        ctx.session.user.id,
        input.requestId,
        input.reason
      );
    }),

  /**
   * Get unified analytics across all cancellation methods
   */
  getAnalytics: protectedProcedure
    .input(
      z.object({
        timeframe: z.enum(['day', 'week', 'month']).optional().default('month'),
      })
    )
    .query(async ({ ctx, input }) => {
      const orchestrator = new UnifiedCancellationOrchestratorService(ctx.db);
      const analyticsResult: unknown = await orchestrator.getUnifiedAnalytics(
        ctx.session.user.id,
        input.timeframe
      );
      // Return the analytics data as a generic object
      return analyticsResult as Record<string, unknown>;
    }),

  /**
   * Get provider capabilities for informed method selection
   */
  getProviderCapabilities: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Analyze subscription and return provider capabilities
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

      // Look for configured provider
      const provider = await ctx.db.cancellationProvider.findFirst({
        where: {
          normalizedName: subscription.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ''),
          isActive: true,
        },
      });

      if (!provider) {
        return {
          subscription: {
            id: subscription.id,
            name: subscription.name,
          },
          provider: null,
          capabilities: {
            supportsApi: false,
            supportsAutomation: false,
            estimatedSuccessRate: 0.6,
            averageTimeMinutes: 15,
            difficulty: 'medium',
            requiresInteraction: true,
          },
          recommendedMethod: 'lightweight',
          availableMethods: ['lightweight'],
        };
      }

      const capabilities = {
        supportsApi: provider.type === 'api' && Boolean(provider.apiEndpoint),
        supportsAutomation: provider.type === 'web_automation',
        estimatedSuccessRate: parseFloat(provider.successRate.toString()),
        averageTimeMinutes: provider.averageTime ?? 15,
        difficulty: provider.difficulty,
        requiresInteraction: provider.requires2FA ?? provider.requiresRetention,
      };

      // Determine available methods
      const availableMethods: string[] = ['lightweight']; // Always available
      if (capabilities.supportsApi) availableMethods.push('api');
      if (capabilities.supportsAutomation)
        availableMethods.push('event_driven');

      // Recommend best method
      let recommendedMethod = 'lightweight';
      if (capabilities.supportsApi && capabilities.estimatedSuccessRate > 0.8) {
        recommendedMethod = 'api';
      } else if (
        capabilities.requiresInteraction ||
        capabilities.difficulty === 'hard'
      ) {
        recommendedMethod = 'event_driven';
      }

      return {
        subscription: {
          id: subscription.id,
          name: subscription.name,
        },
        provider: {
          id: provider.id,
          name: provider.name,
          type: provider.type,
          category: provider.category,
          logo: provider.logo,
        },
        capabilities,
        recommendedMethod,
        availableMethods,
      };
    }),

  /**
   * Validate if a subscription can be cancelled
   */
  canCancel: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .query(async ({ ctx, input }) => {
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

      // Check if already cancelled
      if (subscription.status === 'cancelled') {
        return {
          canCancel: false,
          reason: 'already_cancelled',
          message: 'This subscription is already cancelled',
        };
      }

      // Check for existing pending cancellation
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
          requestId: existingRequest.id,
        };
      }

      return {
        canCancel: true,
        message: 'Subscription can be cancelled',
      };
    }),

  /**
   * Get available cancellation methods for a subscription
   */
  getAvailableMethods: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .query(async ({ ctx, input }) => {
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

      // Find provider configuration
      const provider = await ctx.db.cancellationProvider.findFirst({
        where: {
          normalizedName: subscription.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ''),
          isActive: true,
        },
      });

      const methods = [
        {
          id: 'auto',
          name: 'Automatic (Recommended)',
          description: 'Let us choose the best method for you',
          estimatedTime: '5-15 minutes',
          successRate: provider
            ? Math.max(80, parseFloat(provider.successRate.toString()))
            : 80,
          requiresInteraction: false,
          isRecommended: true,
        },
        {
          id: 'lightweight',
          name: 'Manual Instructions',
          description: 'Step-by-step cancellation guide',
          estimatedTime: '10-30 minutes',
          successRate: 95,
          requiresInteraction: true,
          isRecommended: false,
        },
      ];

      if (provider) {
        if (provider.type === 'api' && provider.apiEndpoint) {
          methods.splice(1, 0, {
            id: 'api',
            name: 'Direct API',
            description: 'Instant automated cancellation',
            estimatedTime: '1-5 minutes',
            successRate: parseFloat(provider.successRate.toString()),
            requiresInteraction: false,
            isRecommended: parseFloat(provider.successRate.toString()) > 85,
          });
        }

        if (provider.type === 'web_automation' || (provider.requires2FA ?? false)) {
          methods.splice(-1, 0, {
            id: 'event_driven',
            name: 'Smart Automation',
            description: 'Advanced automation with real-time monitoring',
            estimatedTime: `${provider.averageTime ?? 15} minutes`,
            successRate: Math.min(
              90,
              parseFloat(provider.successRate.toString()) + 10
            ),
            requiresInteraction: provider.requires2FA,
            isRecommended: provider.difficulty === 'hard',
          });
        }
      }

      return {
        subscription: {
          id: subscription.id,
          name: subscription.name,
        },
        methods,
        provider: provider
          ? {
              name: provider.name,
              type: provider.type,
              difficulty: provider.difficulty,
            }
          : null,
      };
    }),

  /**
   * Get cancellation history across all methods
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(10),
        status: z
          .enum(['all', 'completed', 'failed', 'pending'])
          .optional()
          .default('all'),
      })
    )
    .query(async ({ ctx, input }) => {
      interface WhereClause {
        userId: string;
        status?: string | { in: string[] };
      }
      
      const where: WhereClause = {
        userId: ctx.session.user.id,
      };

      if (input.status !== 'all') {
        if (input.status === 'pending') {
          where.status = { in: ['pending', 'processing', 'scheduled'] };
        } else {
          where.status = input.status;
        }
      }

      const requests = await ctx.db.cancellationRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit,
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
        },
      });

      return requests.map(request => {
        const method =
          request.method === 'manual'
            ? 'lightweight'
            : request.method === 'web_automation'
              ? 'event_driven'
              : request.method;

        return {
          id: request.id,
          subscription: {
            id: request.subscription.id,
            name: request.subscription.name,
            amount: parseFloat(request.subscription.amount.toString()),
          },
          provider: request.provider,
          status: request.status,
          method,
          priority: request.priority,
          confirmationCode: request.confirmationCode,
          effectiveDate: request.effectiveDate,
          createdAt: request.createdAt,
          completedAt: request.completedAt,
          error: request.errorMessage,
        };
      });
    }),

  /**
   * Get real-time updates for a cancellation request
   * This would typically be used with SSE or WebSocket connections
   */
  getRealtimeUpdates: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
        since: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const request = await ctx.db.cancellationRequest.findFirst({
        where: {
          id: input.requestId,
          userId: ctx.session.user.id,
        },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cancellation request not found',
        });
      }

      // Get recent logs
      const since = input.since ?? new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
      const logs = await ctx.db.cancellationLog.findMany({
        where: {
          requestId: input.requestId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return {
        request: {
          id: request.id,
          status: request.status,
          updatedAt: request.updatedAt,
        },
        updates: logs.map(log => ({
          timestamp: log.createdAt,
          action: log.action,
          status: log.status,
          message: log.message,
          metadata: log.metadata,
        })),
        hasMore: logs.length === 50,
      };
    }),

  /**
   * Manual confirmation for lightweight cancellations
   */
  confirmManual: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
        confirmationCode: z.string().optional(),
        effectiveDate: z.date().optional(),
        notes: z.string().optional(),
        wasSuccessful: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First, verify this is a manual/lightweight cancellation
      const request = await ctx.db.cancellationRequest.findFirst({
        where: {
          id: input.requestId,
          userId: ctx.session.user.id,
          method: 'manual',
        },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Manual cancellation request not found',
        });
      }

      // Update the cancellation request with manual confirmation
      const updatedRequest = await ctx.db.cancellationRequest.update({
        where: {
          id: input.requestId,
          userId: ctx.session.user.id,
        },
        data: {
          status: input.wasSuccessful ? 'completed' : 'failed',
          confirmationCode: input.confirmationCode ?? null,
          effectiveDate: input.effectiveDate ?? null,
          userNotes: input.notes ?? null,
          userConfirmed: true,
          completedAt: input.wasSuccessful ? new Date() : null,
          updatedAt: new Date(),
        },
      });

      return {
        id: updatedRequest.id,
        status: updatedRequest.status,
        confirmationCode: updatedRequest.confirmationCode,
        effectiveDate: updatedRequest.effectiveDate,
        completedAt: updatedRequest.completedAt,
      };
    }),

  /**
   * Get system health and method availability
   */
  getSystemHealth: protectedProcedure.query(async ({ ctx }) => {
    // Check if services are operational
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent success rates
    const recentRequests = await ctx.db.cancellationRequest.findMany({
      where: {
        createdAt: { gte: oneHourAgo },
      },
      select: {
        method: true,
        status: true,
      },
    });

    const methodHealth: Record<string, MethodHealth> = {
      api: { available: true, successRate: 0, recentRequests: 0 },
      event_driven: { available: true, successRate: 0, recentRequests: 0 },
      lightweight: { available: true, successRate: 100, recentRequests: 0 }, // Always available
    };

    // Calculate health metrics
    for (const request of recentRequests) {
      const method =
        request.method === 'manual'
          ? 'lightweight'
          : request.method === 'web_automation'
            ? 'event_driven'
            : request.method;

      if (methodHealth[method]) {
        methodHealth[method].recentRequests++;
        if (request.status === 'completed') {
          methodHealth[method].successRate += 1;
        }
      }
    }

    // Convert counts to percentages
    for (const method in methodHealth) {
      const health = methodHealth[method];
      if (health && health.recentRequests > 0) {
        health.successRate = Math.round(
          (health.successRate / health.recentRequests) * 100
        );
      }
    }

    // Determine overall system health
    const avgSuccessRate =
      Object.values(methodHealth).reduce(
        (sum: number, health: MethodHealth) => sum + health.successRate,
        0
      ) / Object.keys(methodHealth).length;

    const systemStatus =
      avgSuccessRate > 80
        ? 'healthy'
        : avgSuccessRate > 60
          ? 'degraded'
          : 'unhealthy';

    return {
      status: systemStatus,
      lastChecked: now,
      methods: methodHealth,
      overall: {
        averageSuccessRate: Math.round(avgSuccessRate),
        totalRecentRequests: recentRequests.length,
      },
      recommendations:
        avgSuccessRate < 70
          ? [
              'Consider using manual method for higher reliability',
              'Check with support if issues persist',
            ]
          : [],
    };
  }),
});
