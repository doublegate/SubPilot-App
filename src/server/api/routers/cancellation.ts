import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import {
  CancellationService,
  CancellationRequestInput,
  ManualConfirmationInput,
} from '@/server/services/cancellation.service';

export const cancellationRouter = createTRPCRouter({
  /**
   * Initiate a subscription cancellation
   */
  initiate: protectedProcedure
    .input(CancellationRequestInput)
    .mutation(async ({ ctx, input }) => {
      const service = new CancellationService(ctx.db);
      return await service.initiateCancellation(ctx.session.user.id, input);
    }),

  /**
   * Get status of a cancellation request
   */
  getStatus: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new CancellationService(ctx.db);
      return await service.getCancellationStatus(
        ctx.session.user.id,
        input.requestId
      );
    }),

  /**
   * Confirm manual cancellation completion
   */
  confirmManual: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
        confirmation: ManualConfirmationInput,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = new CancellationService(ctx.db);
      return await service.confirmManualCancellation(
        ctx.session.user.id,
        input.requestId,
        input.confirmation
      );
    }),

  /**
   * Retry a failed cancellation
   */
  retry: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new CancellationService(ctx.db);
      return await service.retryCancellation(
        ctx.session.user.id,
        input.requestId
      );
    }),

  /**
   * Get cancellation history for the user
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = new CancellationService(ctx.db);
      return await service.getCancellationHistory(
        ctx.session.user.id,
        input.limit
      );
    }),

  /**
   * Get available cancellation providers
   */
  getProviders: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        isActive: true,
      };

      if (input.category) {
        where.category = input.category;
      }

      if (input.search) {
        where.OR = [
          {
            name: {
              contains: input.search,
              mode: 'insensitive',
            },
          },
          {
            normalizedName: {
              contains: input.search.toLowerCase().replace(/[^a-z0-9]/g, ''),
            },
          },
        ];
      }

      const providers = await ctx.db.cancellationProvider.findMany({
        where,
        orderBy: [{ successRate: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          normalizedName: true,
          type: true,
          category: true,
          difficulty: true,
          averageTime: true,
          successRate: true,
          logo: true,
          supportsRefunds: true,
          requires2FA: true,
          requiresRetention: true,
        },
      });

      return providers.map(provider => ({
        ...provider,
        successRate: parseFloat(provider.successRate.toString()),
      }));
    }),

  /**
   * Get cancellation provider details
   */
  getProvider: protectedProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const provider = await ctx.db.cancellationProvider.findUnique({
        where: { id: input.providerId },
      });

      if (!provider) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Provider not found',
        });
      }

      return {
        ...provider,
        successRate: parseFloat(provider.successRate.toString()),
      };
    }),

  /**
   * Get cancellation logs for a request
   */
  getLogs: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ ctx, input }) => {
      // First verify the request belongs to the user
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

      const logs = await ctx.db.cancellationLog.findMany({
        where: { requestId: input.requestId },
        orderBy: { createdAt: 'asc' },
      });

      return logs;
    }),

  /**
   * Get cancellation statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [totalRequests, completedRequests, failedRequests, pendingRequests] =
      await Promise.all([
        ctx.db.cancellationRequest.count({
          where: { userId: ctx.session.user.id },
        }),
        ctx.db.cancellationRequest.count({
          where: {
            userId: ctx.session.user.id,
            status: 'completed',
          },
        }),
        ctx.db.cancellationRequest.count({
          where: {
            userId: ctx.session.user.id,
            status: 'failed',
          },
        }),
        ctx.db.cancellationRequest.count({
          where: {
            userId: ctx.session.user.id,
            status: { in: ['pending', 'processing'] },
          },
        }),
      ]);

    const successRate =
      totalRequests > 0
        ? Math.round((completedRequests / totalRequests) * 100)
        : 0;

    return {
      totalRequests,
      completedRequests,
      failedRequests,
      pendingRequests,
      successRate,
    };
  }),

  /**
   * Check if a subscription can be cancelled
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
        };
      }

      // Check for existing pending cancellation
      const existingRequest = await ctx.db.cancellationRequest.findFirst({
        where: {
          subscriptionId: input.subscriptionId,
          userId: ctx.session.user.id,
          status: { in: ['pending', 'processing'] },
        },
      });

      if (existingRequest) {
        return {
          canCancel: false,
          reason: 'cancellation_in_progress',
          requestId: existingRequest.id,
        };
      }

      // Find provider info
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
        provider: provider
          ? {
              id: provider.id,
              name: provider.name,
              type: provider.type,
              difficulty: provider.difficulty,
              averageTime: provider.averageTime,
              successRate: parseFloat(provider.successRate.toString()),
              supportsRefunds: provider.supportsRefunds,
            }
          : null,
      };
    }),

  /**
   * Cancel a cancellation request (if still pending)
   */
  cancelRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.cancellationRequest.findFirst({
        where: {
          id: input.requestId,
          userId: ctx.session.user.id,
          status: { in: ['pending', 'processing'] },
        },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cancellable request not found',
        });
      }

      const updatedRequest = await ctx.db.cancellationRequest.update({
        where: { id: input.requestId },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
        },
      });

      // Log the cancellation of the request
      await ctx.db.cancellationLog.create({
        data: {
          requestId: input.requestId,
          action: 'request_cancelled',
          status: 'info',
          message: 'Cancellation request cancelled by user',
        },
      });

      return updatedRequest;
    }),
});
