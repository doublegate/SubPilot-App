import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { TRPCError } from '@trpc/server';
import {
  cancellationService,
  CancellationRequestInput,
  type CancellationMethod,
  CancellationPriority,
} from '~/server/services/cancellation.service';

export const cancellationRouter = createTRPCRouter({
  /**
   * Initiate a cancellation request
   */
  initiate: protectedProcedure
    .input(CancellationRequestInput)
    .mutation(async ({ ctx, input }) => {
      const sessionData = {
        ipAddress: undefined,
        userAgent: undefined,
        sessionId: ctx.session.user.id,
      };

      return cancellationService.initiateCancellation(
        ctx.session.user.id,
        input,
        sessionData
      );
    }),

  /**
   * Get cancellation status
   */
  status: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ ctx, input }) => {
      return cancellationService.getCancellationStatus(
        ctx.session.user.id,
        input.requestId
      );
    }),

  /**
   * Retry a failed cancellation
   */
  retry: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return cancellationService.retryCancellation(
        ctx.session.user.id,
        input.requestId
      );
    }),

  /**
   * Confirm manual cancellation
   */
  confirmManual: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
        confirmationCode: z.string().optional(),
        effectiveDate: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return cancellationService.confirmManualCancellation(
        ctx.session.user.id,
        input.requestId,
        {
          confirmationCode: input.confirmationCode,
          effectiveDate: input.effectiveDate,
          notes: input.notes,
        }
      );
    }),

  /**
   * Get cancellation history
   */
  history: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      return cancellationService.getCancellationHistory(
        ctx.session.user.id,
        input.limit
      );
    }),

  /**
   * Get available cancellation methods for a subscription
   */
  availableMethods: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if subscription exists and belongs to user
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
      const providerName = subscription.name.toLowerCase().replace(/\s+/g, '');
      const provider = await ctx.db.cancellationProvider.findFirst({
        where: {
          OR: [
            { normalizedName: providerName },
            { name: { contains: subscription.name, mode: 'insensitive' } },
          ],
          isActive: true,
        },
      });

      if (!provider) {
        return {
          methods: ['manual'] as CancellationMethod[],
          recommended: 'manual' as CancellationMethod,
          provider: null,
        };
      }

      const methods: CancellationMethod[] = [];

      if (provider.type === 'api' && provider.apiEndpoint) {
        methods.push('api');
      }
      if (provider.type === 'web_automation' && provider.loginUrl) {
        methods.push('web_automation');
      }
      methods.push('manual'); // Always available as fallback

      return {
        methods,
        recommended: methods[0] ?? 'manual',
        provider: {
          name: provider.name,
          logo: provider.logo,
          difficulty: provider.difficulty,
          averageTime: provider.averageTime,
          supportsRefunds: provider.supportsRefunds,
          requires2FA: provider.requires2FA,
          requiresRetention: provider.requiresRetention,
        },
      };
    }),

  /**
   * Get provider information
   */
  providerInfo: protectedProcedure
    .input(z.object({ providerName: z.string() }))
    .query(async ({ ctx, input }) => {
      const provider = await ctx.db.cancellationProvider.findFirst({
        where: {
          OR: [
            { name: { equals: input.providerName, mode: 'insensitive' } },
            {
              normalizedName: input.providerName
                .toLowerCase()
                .replace(/\s+/g, ''),
            },
          ],
          isActive: true,
        },
      });

      if (!provider) {
        return null;
      }

      return {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        logo: provider.logo,
        category: provider.category,
        difficulty: provider.difficulty,
        averageTime: provider.averageTime,
        successRate: Number(provider.successRate),
        supportsRefunds: provider.supportsRefunds,
        requires2FA: provider.requires2FA,
        requiresRetention: provider.requiresRetention,
        contactInfo: {
          phone: provider.phoneNumber,
          email: provider.email,
          chat: provider.chatUrl,
        },
      };
    }),

  /**
   * Get cancellation analytics
   */
  analytics: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get cancellation stats
    const [total, completed, failed, inProgress] = await Promise.all([
      ctx.db.cancellationRequest.count({ where: { userId } }),
      ctx.db.cancellationRequest.count({
        where: { userId, status: 'completed' },
      }),
      ctx.db.cancellationRequest.count({ where: { userId, status: 'failed' } }),
      ctx.db.cancellationRequest.count({
        where: { userId, status: { in: ['pending', 'processing'] } },
      }),
    ]);

    // Get method breakdown
    const methodBreakdown = await ctx.db.cancellationRequest.groupBy({
      by: ['method'],
      where: { userId },
      _count: { method: true },
    });

    // Get recent cancellations
    const recentCancellations = await ctx.db.cancellationRequest.findMany({
      where: { userId },
      include: {
        subscription: {
          select: {
            name: true,
            amount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Calculate total savings from cancelled subscriptions
    const cancelledSubscriptions = await ctx.db.subscription.findMany({
      where: {
        userId,
        status: 'cancelled',
        cancellationInfo: { not: {} },
      },
      select: { amount: true },
    });

    const totalSavings = cancelledSubscriptions.reduce(
      (sum, sub) => sum + Number(sub.amount),
      0
    );

    return {
      stats: {
        total,
        completed,
        failed,
        inProgress,
        successRate: total > 0 ? (completed / total) * 100 : 0,
      },
      methodBreakdown: methodBreakdown.map(item => ({
        method: item.method,
        count: item._count.method,
      })),
      recentCancellations: recentCancellations.map(req => ({
        id: req.id,
        subscriptionName: req.subscription.name,
        amount: Number(req.subscription.amount),
        status: req.status,
        method: req.method,
        createdAt: req.createdAt,
        completedAt: req.completedAt,
      })),
      totalSavings,
    };
  }),
});
