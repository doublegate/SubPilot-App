import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { LightweightCancellationService } from '@/server/services/lightweight-cancellation.service';

export const lightweightCancellationRouter = createTRPCRouter({
  /**
   * Get cancellation instructions for a subscription
   */
  getInstructions: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = new LightweightCancellationService(ctx.db);
      return await service.provideCancellationInstructions(
        ctx.session.user.id,
        input
      );
    }),

  /**
   * Confirm cancellation completion
   */
  confirmCancellation: protectedProcedure
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
      const service = new LightweightCancellationService(ctx.db);
      const { requestId, ...confirmation } = input;
      return await service.confirmCancellation(
        ctx.session.user.id,
        requestId,
        confirmation
      );
    }),

  /**
   * Get cancellation status and instructions
   */
  getStatus: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new LightweightCancellationService(ctx.db);
      return await service.getCancellationStatus(
        ctx.session.user.id,
        input.requestId
      );
    }),

  /**
   * Get cancellation history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = new LightweightCancellationService(ctx.db);
      return await service.getCancellationHistory(
        ctx.session.user.id,
        input.limit
      );
    }),

  /**
   * Get available providers
   */
  getProviders: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = new LightweightCancellationService(ctx.db);
      return service.getAvailableProviders(input.search);
    }),

  /**
   * Check if subscription can be cancelled
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
        return {
          canCancel: false,
          reason: 'not_found',
        };
      }

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

      // Check if we have provider info
      const service = new LightweightCancellationService(ctx.db);
      const providers = service.getAvailableProviders();
      const hasProviderInfo = providers.some(
        p =>
          subscription.name.toLowerCase().includes(p.name.toLowerCase()) ||
          p.name.toLowerCase().includes(subscription.name.toLowerCase())
      );

      return {
        canCancel: true,
        hasProviderInfo,
        method: 'manual_instructions',
      };
    }),

  /**
   * Preview cancellation instructions without creating a request
   */
  previewInstructions: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const subscription = await ctx.db.subscription.findFirst({
        where: {
          id: input.subscriptionId,
          userId: ctx.session.user.id,
        },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const service = new LightweightCancellationService(ctx.db);

      // Create a temporary service instance to find provider and generate instructions
      const providerTemplate = (service as any).findProviderTemplate(
        subscription.name
      );
      const instructions = (service as any).generateInstructions(
        providerTemplate,
        subscription.name
      );

      return {
        subscription: {
          id: subscription.id,
          name: subscription.name,
          amount: parseFloat(subscription.amount.toString()),
        },
        instructions,
      };
    }),

  /**
   * Get simple statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [totalRequests, completedRequests, pendingRequests] =
      await Promise.all([
        ctx.db.cancellationRequest.count({
          where: {
            userId: ctx.session.user.id,
            method: 'manual',
          },
        }),
        ctx.db.cancellationRequest.count({
          where: {
            userId: ctx.session.user.id,
            method: 'manual',
            status: 'completed',
          },
        }),
        ctx.db.cancellationRequest.count({
          where: {
            userId: ctx.session.user.id,
            method: 'manual',
            status: 'pending',
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
      pendingRequests,
      successRate,
      method: 'lightweight_manual',
    };
  }),
});
