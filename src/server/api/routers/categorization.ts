import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { getCategorizationService } from '@/server/services/categorization.service';
import { SUBSCRIPTION_CATEGORIES } from '@/server/lib/openai-client';
import { cacheService, cacheKeys, cacheTTL } from '@/server/services/cache.service';

export const categorizationRouter = createTRPCRouter({
  /**
   * Categorize a single transaction
   */
  categorizeTransaction: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        forceRecategorize: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = getCategorizationService(ctx.db);
      
      try {
        const result = await service.categorizeTransaction(
          input.transactionId,
          ctx.session.user.id,
          input.forceRecategorize
        );

        // Clear relevant caches
        cacheService.invalidate(`transactions:${ctx.session.user.id}:*`);
        cacheService.invalidate(`analytics:${ctx.session.user.id}:*`);

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to categorize transaction',
          cause: error,
        });
      }
    }),

  /**
   * Bulk categorize transactions
   */
  bulkCategorize: protectedProcedure
    .input(
      z.object({
        transactionIds: z.array(z.string()).optional(),
        forceRecategorize: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = getCategorizationService(ctx.db);
      
      try {
        const result = await service.bulkCategorizeTransactions(
          ctx.session.user.id,
          input.transactionIds,
          input.forceRecategorize
        );

        // Clear relevant caches
        cacheService.invalidate(`transactions:${ctx.session.user.id}:*`);
        cacheService.invalidate(`analytics:${ctx.session.user.id}:*`);
        cacheService.invalidate(`subscriptions:${ctx.session.user.id}:*`);

        return result;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to bulk categorize transactions',
          cause: error,
        });
      }
    }),

  /**
   * Categorize a subscription
   */
  categorizeSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        forceRecategorize: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = getCategorizationService(ctx.db);
      
      try {
        const result = await service.categorizeSubscription(
          input.subscriptionId,
          ctx.session.user.id,
          input.forceRecategorize
        );

        // Clear relevant caches
        cacheService.invalidate(`subscriptions:${ctx.session.user.id}:*`);
        cacheService.invalidate(`analytics:${ctx.session.user.id}:*`);

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to categorize subscription',
          cause: error,
        });
      }
    }),

  /**
   * Update subscription category (manual override)
   */
  updateCategory: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        category: z.enum(Object.keys(SUBSCRIPTION_CATEGORIES) as [keyof typeof SUBSCRIPTION_CATEGORIES, ...Array<keyof typeof SUBSCRIPTION_CATEGORIES>]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = getCategorizationService(ctx.db);
      
      try {
        await service.updateSubscriptionCategory(
          input.subscriptionId,
          ctx.session.user.id,
          input.category
        );

        // Clear relevant caches
        cacheService.invalidate(`subscriptions:${ctx.session.user.id}:*`);
        cacheService.invalidate(`analytics:${ctx.session.user.id}:*`);

        return {
          success: true,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update subscription category',
          cause: error,
        });
      }
    }),

  /**
   * Get available categories
   */
  getCategories: protectedProcedure
    .query(async ({ ctx }) => {
      // Check cache first
      const cacheKey = 'categories:all';
      const cached = cacheService.get<typeof SUBSCRIPTION_CATEGORIES>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get categories from database if they exist
      const dbCategories = await ctx.db.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      if (dbCategories.length > 0) {
        // Transform to match expected format
        const categories = dbCategories.reduce((acc, cat) => {
          acc[cat.id] = {
            name: cat.name,
            description: cat.description ?? '',
            icon: cat.icon ?? '📦',
            keywords: Array.isArray(cat.keywords) ? cat.keywords as string[] : [],
          };
          return acc;
        }, {} as typeof SUBSCRIPTION_CATEGORIES);

        cacheService.set(cacheKey, categories, cacheTTL.veryLong);
        return categories;
      }

      // Return default categories and initialize in database
      const service = getCategorizationService(ctx.db);
      await service.initializeCategories();
      
      cacheService.set(cacheKey, SUBSCRIPTION_CATEGORIES, cacheTTL.veryLong);
      return SUBSCRIPTION_CATEGORIES;
    }),

  /**
   * Get merchant aliases
   */
  getMerchantAliases: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        verified: z.boolean().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = getCategorizationService(ctx.db);
      
      const result = await service.getMerchantAliases(
        {
          category: input.category,
          verified: input.verified,
          search: input.search,
        },
        {
          limit: input.limit,
          offset: input.offset,
        }
      );

      return result;
    }),

  /**
   * Verify/update a merchant alias
   */
  updateMerchantAlias: protectedProcedure
    .input(
      z.object({
        aliasId: z.string(),
        normalizedName: z.string().optional(),
        category: z.enum(Object.keys(SUBSCRIPTION_CATEGORIES) as [keyof typeof SUBSCRIPTION_CATEGORIES, ...Array<keyof typeof SUBSCRIPTION_CATEGORIES>]).optional(),
        isVerified: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has admin privileges (you might want to add this to your user model)
      // For now, we'll allow any authenticated user to update aliases
      
      const updateData: any = {};
      
      if (input.normalizedName !== undefined) {
        updateData.normalizedName = input.normalizedName;
      }
      
      if (input.category !== undefined) {
        updateData.category = input.category;
      }
      
      if (input.isVerified !== undefined) {
        updateData.isVerified = input.isVerified;
      }

      const updated = await ctx.db.merchantAlias.update({
        where: { id: input.aliasId },
        data: updateData,
      });

      // Clear relevant caches
      cacheService.invalidate('ai-categorization:*');
      
      return {
        success: true,
        alias: {
          ...updated,
          confidence: updated.confidence.toNumber(),
        },
      };
    }),

  /**
   * Get categorization statistics
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const cacheKey = `categorization-stats:${ctx.session.user.id}`;
      const cached = cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get transaction categorization stats
      const [
        totalTransactions,
        categorizedTransactions,
        totalSubscriptions,
        categorizedSubscriptions,
        categoryBreakdown,
      ] = await Promise.all([
        ctx.db.transaction.count({
          where: { userId: ctx.session.user.id },
        }),
        ctx.db.transaction.count({
          where: {
            userId: ctx.session.user.id,
            aiCategory: { not: null },
          },
        }),
        ctx.db.subscription.count({
          where: { userId: ctx.session.user.id },
        }),
        ctx.db.subscription.count({
          where: {
            userId: ctx.session.user.id,
            OR: [
              { aiCategory: { not: null } },
              { categoryOverride: { not: null } },
            ],
          },
        }),
        ctx.db.subscription.groupBy({
          by: ['category'],
          where: {
            userId: ctx.session.user.id,
            isActive: true,
          },
          _count: {
            id: true,
          },
        }),
      ]);

      const stats = {
        transactions: {
          total: totalTransactions,
          categorized: categorizedTransactions,
          percentage: totalTransactions > 0 
            ? Math.round((categorizedTransactions / totalTransactions) * 100) 
            : 0,
        },
        subscriptions: {
          total: totalSubscriptions,
          categorized: categorizedSubscriptions,
          percentage: totalSubscriptions > 0 
            ? Math.round((categorizedSubscriptions / totalSubscriptions) * 100) 
            : 0,
        },
        categoryBreakdown: categoryBreakdown.map(item => ({
          category: item.category ?? 'other',
          count: item._count.id,
        })),
      };

      cacheService.set(cacheKey, stats, cacheTTL.medium);
      return stats;
    }),
});