import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { Prisma } from '@prisma/client';
import { SubscriptionDetector } from '@/server/services/subscription-detector';
import { emailNotificationService } from '@/server/services/email.service';

const subscriptionStatusEnum = z.enum(['active', 'cancelled', 'pending']);
// Removed frequencyEnum as it's not currently used
const sortByEnum = z.enum(['name', 'amount', 'nextBilling', 'createdAt']);
const sortOrderEnum = z.enum(['asc', 'desc']);

export const subscriptionsRouter = createTRPCRouter({
  /**
   * Create a new manual subscription
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        amount: z.number().positive(),
        currency: z.string().min(1),
        frequency: z.enum(['monthly', 'yearly', 'weekly', 'quarterly']),
        category: z.string().optional(),
        notes: z.string().max(500).optional(),
        nextBilling: z.date().optional(),
        provider: z
          .object({
            name: z.string(),
            website: z.string().nullable().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const subscription = await ctx.db.subscription.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          description: input.description ?? null,
          amount: new Prisma.Decimal(input.amount),
          currency: input.currency,
          frequency: input.frequency,
          category: input.category ?? null,
          notes: input.notes ?? null,
          nextBilling: input.nextBilling ?? null,
          status: 'active',
          isActive: true,
          confidence: 1.0, // Manual subscriptions have 100% confidence
          provider: input.provider
            ? {
                name: input.provider.name,
                website: input.provider.website ?? null,
                logo: null,
              }
            : Prisma.JsonNull,
          detectedAt: new Date(),
        },
      });

      return subscription;
    }),

  /**
   * Get all subscriptions with filtering and pagination
   */
  getAll: protectedProcedure
    .input(
      z.object({
        status: subscriptionStatusEnum.optional(),
        category: z.string().optional(),
        sortBy: sortByEnum.optional().default('nextBilling'),
        sortOrder: sortOrderEnum.optional().default('asc'),
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.SubscriptionWhereInput = {
        userId: ctx.session.user.id,
      };

      if (input.status) {
        where.status = input.status;
      }

      if (input.category) {
        where.category = input.category;
      }

      const orderBy: Prisma.SubscriptionOrderByWithRelationInput = {};
      if (input.sortBy === 'name') {
        orderBy.name = input.sortOrder;
      } else if (input.sortBy === 'amount') {
        orderBy.amount = input.sortOrder;
      } else if (input.sortBy === 'nextBilling') {
        orderBy.nextBilling = input.sortOrder;
      } else {
        orderBy.createdAt = input.sortOrder;
      }

      const [subscriptions, total] = await Promise.all([
        ctx.db.subscription.findMany({
          where,
          orderBy,
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.subscription.count({ where }),
      ]);

      return {
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          name: sub.name,
          description: sub.description,
          category: sub.category,
          amount: sub.amount.toNumber(),
          currency: sub.currency,
          frequency: sub.frequency,
          nextBilling: sub.nextBilling,
          status: sub.status,
          isActive: sub.isActive,
          provider:
            sub.provider &&
            typeof sub.provider === 'object' &&
            sub.provider !== null
              ? {
                  name:
                    ((sub.provider as Record<string, unknown>)
                      .name as string) ?? 'Unknown',
                  website:
                    ((sub.provider as Record<string, unknown>).website as
                      | string
                      | null) ?? null,
                  logo:
                    ((sub.provider as Record<string, unknown>).logo as
                      | string
                      | null) ?? null,
                }
              : null,
          detectedAt: sub.detectedAt,
          lastTransaction: null, // Last transaction lookup implemented in getById for detailed view
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        })),
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get subscription by ID with full details
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const subscription = await ctx.db.subscription.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          transactions: {
            orderBy: { date: 'desc' },
            take: 12, // Last 12 transactions
          },
        },
      });

      if (!subscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Subscription not found',
        });
      }

      // Calculate price history from transactions
      const priceHistory =
        'transactions' in subscription &&
        Array.isArray(subscription.transactions)
          ? subscription.transactions
              .map((t: { amount: { toNumber: () => number }; date: Date }) => ({
                amount: t.amount.toNumber(),
                date: t.date,
              }))
              .reverse()
          : [];

      return {
        ...subscription,
        amount: subscription.amount.toNumber(),
        lastTransaction: subscription.transactions?.[0]
          ? {
              id: subscription.transactions[0].id,
              amount: subscription.transactions[0].amount.toNumber(),
              date: subscription.transactions[0].date,
              description: subscription.transactions[0].description,
            }
          : null,
        provider:
          subscription.provider && typeof subscription.provider === 'object'
            ? {
                name:
                  'name' in subscription.provider &&
                  typeof (subscription.provider as { name?: unknown }).name ===
                    'string'
                    ? (subscription.provider as { name: string }).name
                    : 'Unknown',
                website:
                  'website' in subscription.provider &&
                  typeof (subscription.provider as { website?: unknown })
                    .website === 'string'
                    ? (subscription.provider as { website: string }).website
                    : null,
                logo:
                  'logo' in subscription.provider &&
                  typeof (subscription.provider as { logo?: unknown }).logo ===
                    'string'
                    ? (subscription.provider as { logo: string }).logo
                    : null,
              }
            : null,
        transactions:
          'transactions' in subscription &&
          Array.isArray(subscription.transactions)
            ? subscription.transactions.map(
                (t: { amount: { toNumber: () => number } }) => ({
                  ...t,
                  amount: t.amount.toNumber(),
                })
              )
            : [],
        priceHistory,
        cancellationInfo: {
          canCancel:
            subscription.cancellationInfo &&
            typeof subscription.cancellationInfo === 'object' &&
            'cancelUrl' in subscription.cancellationInfo &&
            subscription.cancellationInfo.cancelUrl !== null,
          cancellationUrl:
            subscription.cancellationInfo &&
            typeof subscription.cancellationInfo === 'object' &&
            'cancelUrl' in subscription.cancellationInfo &&
            typeof (subscription.cancellationInfo as { cancelUrl?: unknown })
              .cancelUrl === 'string'
              ? (subscription.cancellationInfo as { cancelUrl: string })
                  .cancelUrl
              : null,
          supportInfo:
            subscription.cancellationInfo &&
            typeof subscription.cancellationInfo === 'object' &&
            'supportInfo' in subscription.cancellationInfo &&
            typeof (subscription.cancellationInfo as { supportInfo?: unknown })
              .supportInfo === 'string'
              ? (subscription.cancellationInfo as { supportInfo: string })
                  .supportInfo
              : null,
        },
      };
    }),

  /**
   * Update subscription details
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        category: z.string().optional(),
        notes: z.string().max(500).optional(),
        isActive: z.boolean().optional(),
        customAmount: z.number().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, customAmount, ...updateData } = input;

      // Verify ownership
      const subscription = await ctx.db.subscription.findFirst({
        where: {
          id,
          userId: ctx.session.user.id,
        },
      });

      if (!subscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Subscription not found',
        });
      }

      // Update subscription
      const updated = await ctx.db.subscription.update({
        where: { id },
        data: {
          ...updateData,
          amount: customAmount ? new Prisma.Decimal(customAmount) : undefined,
          updatedAt: new Date(),
        },
      });

      return updated;
    }),

  /**
   * Mark subscription as cancelled
   */
  markCancelled: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        cancellationDate: z.date(),
        reason: z.string().max(500).optional(),
        refundAmount: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const subscription = await ctx.db.subscription.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!subscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Subscription not found',
        });
      }

      // Update subscription status
      const updated = await ctx.db.subscription.update({
        where: { id: input.id },
        data: {
          status: 'cancelled',
          isActive: false,
          cancellationInfo: {
            cancelledAt: input.cancellationDate,
            reason: input.reason,
          },
        },
      });

      // Create in-app notification for cancellation
      await ctx.db.notification.create({
        data: {
          userId: ctx.session.user.id,
          type: 'subscription_cancelled',
          title: 'Subscription cancelled ✅',
          message: `Your ${updated.name} subscription has been cancelled successfully.${input.reason ? ` Reason: ${input.reason}` : ''}`,
          scheduledFor: new Date(),
        },
      });

      // Send cancellation confirmation email
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (user) {
        await emailNotificationService.sendCancellationEmail({
          user: { id: user.id, email: user.email, name: user.name },
          subscription: updated,
        });
      }

      return updated;
    }),

  /**
   * Get subscription categories with counts
   */
  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const subscriptions = await ctx.db.subscription.findMany({
      where: {
        userId: ctx.session.user.id,
        isActive: true,
      },
      select: {
        category: true,
        amount: true,
      },
    });

    // Group by category
    const categoryMap = subscriptions.reduce(
      (acc, sub) => {
        const category = sub.category ?? 'Other';
        acc[category] ??= {
          name: category,
          count: 0,
          totalAmount: 0,
        };
        acc[category].count++;
        acc[category].totalAmount += sub.amount.toNumber();
        return acc;
      },
      {} as Record<string, { name: string; count: number; totalAmount: number }>
    );

    // Add icons for known categories
    const categoryIcons: Record<string, string> = {
      Streaming: '🎬',
      Music: '🎵',
      Software: '💻',
      Gaming: '🎮',
      News: '📰',
      Fitness: '💪',
      Education: '📚',
      Storage: '☁️',
      Food: '🍔',
      Other: '📦',
    };

    return Object.values(categoryMap).map(cat => ({
      ...cat,
      icon: categoryIcons[cat.name] ?? '📦',
    }));
  }),

  /**
   * Get subscription statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const subscriptions = await ctx.db.subscription.findMany({
      where: {
        userId: ctx.session.user.id,
        isActive: true,
      },
      select: {
        amount: true,
        frequency: true,
      },
    });

    // Calculate monthly equivalent for all subscriptions
    const monthlyTotal = subscriptions.reduce((total, sub) => {
      let monthlyAmount = sub.amount.toNumber();

      switch (sub.frequency) {
        case 'yearly':
          monthlyAmount = monthlyAmount / 12;
          break;
        case 'quarterly':
          monthlyAmount = monthlyAmount / 3;
          break;
        case 'weekly':
          monthlyAmount = monthlyAmount * 4.33; // Average weeks per month
          break;
      }

      return total + monthlyAmount;
    }, 0);

    return {
      totalActive: subscriptions.length,
      monthlySpend: Math.round(monthlyTotal * 100) / 100,
      yearlySpend: Math.round(monthlyTotal * 12 * 100) / 100,
    };
  }),

  /**
   * Detect subscriptions from transactions
   */
  detectSubscriptions: protectedProcedure
    .input(
      z.object({
        accountId: z.string().optional(), // Optionally limit to specific account
        forceRedetect: z.boolean().optional().default(false), // Re-analyze existing subscriptions
      })
    )
    .mutation(async ({ ctx, input }) => {
      const detector = new SubscriptionDetector(ctx.db);

      // Get all transactions or filter by account
      const whereClause: Prisma.TransactionWhereInput = {
        userId: ctx.session.user.id,
      };

      if (input.accountId) {
        whereClause.accountId = input.accountId;
      }

      // If not forcing re-detection, only analyze unprocessed transactions
      if (!input.forceRedetect) {
        whereClause.isSubscription = false;
        whereClause.confidence = 0;
      }

      // Run detection
      const results = await detector.detectUserSubscriptions(
        ctx.session.user.id
      );

      // Create/update subscription records
      const createdSubscriptions =
        await detector.createSubscriptionsFromDetection(
          ctx.session.user.id,
          results
        );

      // Get user for email notifications
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      // Send email notifications for new subscriptions
      if (user && createdSubscriptions.length > 0) {
        for (const subscription of createdSubscriptions) {
          await emailNotificationService.sendNewSubscriptionEmail({
            user: { id: user.id, email: user.email, name: user.name },
            subscription,
          });
        }
      }

      // Create notification for new subscriptions found
      const newSubscriptionsCount = results.filter(
        r => r.isSubscription
      ).length;

      if (newSubscriptionsCount > 0) {
        await ctx.db.notification.create({
          data: {
            userId: ctx.session.user.id,
            type: 'new_subscription',
            title: 'New subscriptions detected! 🔍',
            message: `We found ${newSubscriptionsCount} recurring payment${newSubscriptionsCount > 1 ? 's' : ''} in your transactions.`,
            scheduledFor: new Date(),
          },
        });
      }

      return {
        detected: results.length,
        created: newSubscriptionsCount,
        results: results.map(r => ({
          merchantName: r.merchantName,
          isSubscription: r.isSubscription,
          confidence: r.confidence,
          frequency: r.frequency,
          averageAmount: r.averageAmount,
          nextBillingDate: r.nextBillingDate,
        })),
      };
    }),

  /**
   * Get last transaction for a subscription
   */
  getLastTransaction: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify subscription ownership
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

      // Get the most recent transaction for this subscription
      const lastTransaction = await ctx.db.transaction.findFirst({
        where: {
          subscriptionId: input.subscriptionId,
          bankAccount: {
            userId: ctx.session.user.id,
          },
        },
        orderBy: { date: 'desc' },
        include: {
          bankAccount: {
            select: {
              name: true,
              isoCurrencyCode: true,
            },
          },
        },
      });

      if (!lastTransaction) {
        return null;
      }

      return {
        id: lastTransaction.id,
        date: lastTransaction.date,
        amount: lastTransaction.amount.toNumber(),
        currency: lastTransaction.bankAccount.isoCurrencyCode ?? 'USD',
        description: lastTransaction.description,
        merchantName: lastTransaction.merchantName,
        account: {
          name: lastTransaction.bankAccount.name,
        },
      };
    }),
});
