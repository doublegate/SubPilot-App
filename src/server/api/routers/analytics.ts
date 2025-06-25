import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { type Prisma } from '@prisma/client';

// Simple in-memory cache for expensive calculations
const analyticsCache = new Map<
  string,
  { data: any; timestamp: number; ttl: number }
>();

const getCacheKey = (userId: string, endpoint: string, params: any) => {
  return `${userId}:${endpoint}:${JSON.stringify(params)}`;
};

const getFromCache = (key: string) => {
  const cached = analyticsCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > cached.ttl) {
    analyticsCache.delete(key);
    return null;
  }

  return cached.data;
};

const setCache = (key: string, data: any, ttlMinutes = 15) => {
  analyticsCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes * 60 * 1000,
  });
};

const timeRangeEnum = z.enum(['week', 'month', 'quarter', 'year', 'all']);

export const analyticsRouter = createTRPCRouter({
  /**
   * Get spending overview
   */
  getSpendingOverview: protectedProcedure
    .input(
      z.object({
        timeRange: timeRangeEnum.optional().default('month'),
        accountId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check cache first
      const cacheKey = getCacheKey(
        ctx.session.user.id,
        'spendingOverview',
        input
      );
      const cached = getFromCache(cacheKey);
      if (cached) return cached;
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (input.timeRange) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case 'all':
          startDate.setFullYear(2000); // Effectively all time
          break;
      }

      // Get active subscriptions
      const subscriptionWhere: Prisma.SubscriptionWhereInput = {
        userId: ctx.session.user.id,
        isActive: true,
      };

      const subscriptions = await ctx.db.subscription.findMany({
        where: subscriptionWhere,
        select: {
          amount: true,
          frequency: true,
          category: true,
        },
      });

      // Calculate monthly spending
      let monthlyTotal = 0;
      const categorySpending: Record<string, number> = {};

      subscriptions.forEach(sub => {
        let monthlyAmount = sub.amount.toNumber();

        switch (sub.frequency) {
          case 'yearly':
            monthlyAmount = monthlyAmount / 12;
            break;
          case 'quarterly':
            monthlyAmount = monthlyAmount / 3;
            break;
          case 'weekly':
            monthlyAmount = monthlyAmount * 4.33;
            break;
        }

        monthlyTotal += monthlyAmount;

        const category = sub.category || 'Other';
        categorySpending[category] =
          (categorySpending[category] ?? 0) + monthlyAmount;
      });

      // Get transaction spending for comparison
      const transactionWhere: Prisma.TransactionWhereInput = {
        bankAccount: {
          user: {
            id: ctx.session.user.id,
          },
        },
        date: {
          gte: startDate,
          lte: endDate,
        },
        amount: { gt: 0 }, // Only expenses
      };

      if (input.accountId) {
        transactionWhere.accountId = input.accountId;
      }

      const transactionTotal = await ctx.db.transaction.aggregate({
        where: transactionWhere,
        _sum: {
          amount: true,
        },
      });

      const totalSpent = transactionTotal._sum.amount?.toNumber() ?? 0;
      const monthsBetween = Math.max(
        1,
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const monthlyAverage = totalSpent / monthsBetween;

      const result = {
        subscriptionSpending: {
          monthly: Math.round(monthlyTotal * 100) / 100,
          yearly: Math.round(monthlyTotal * 12 * 100) / 100,
        },
        totalSpending: {
          period: Math.round(totalSpent * 100) / 100,
          monthlyAverage: Math.round(monthlyAverage * 100) / 100,
        },
        subscriptionPercentage:
          totalSpent > 0
            ? Math.round((monthlyTotal / monthlyAverage) * 100)
            : 0,
        categoryBreakdown: Object.entries(categorySpending)
          .map(([category, amount]) => ({
            category,
            amount: Math.round(amount * 100) / 100,
            percentage: Math.round((amount / monthlyTotal) * 100),
          }))
          .sort((a, b) => b.amount - a.amount),
      };

      // Cache the result for 15 minutes
      setCache(cacheKey, result, 15);
      return result;
    }),

  /**
   * Get spending trends over time
   */
  getSpendingTrends: protectedProcedure
    .input(
      z.object({
        timeRange: timeRangeEnum.optional().default('year'),
        groupBy: z.enum(['day', 'week', 'month']).optional().default('month'),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check cache first
      const cacheKey = getCacheKey(
        ctx.session.user.id,
        'spendingTrends',
        input
      );
      const cached = getFromCache(cacheKey);
      if (cached) return cached;
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (input.timeRange) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case 'all':
          startDate.setFullYear(2000);
          break;
      }

      // Get all transactions in range
      const transactions = await ctx.db.transaction.findMany({
        where: {
          bankAccount: {
            userId: ctx.session.user.id,
          },
          date: {
            gte: startDate,
            lte: endDate,
          },
          amount: { gt: 0 },
        },
        select: {
          date: true,
          amount: true,
          isSubscription: true,
        },
        orderBy: { date: 'asc' },
      });

      // Group by period
      const trends: Record<string, { total: number; recurring: number }> = {};

      transactions.forEach(t => {
        let key: string;

        switch (input.groupBy) {
          case 'day':
            key = t.date.toISOString().split('T')[0] ?? '';
            break;
          case 'week':
            const week = new Date(t.date);
            week.setDate(week.getDate() - week.getDay());
            key = week.toISOString().split('T')[0] ?? '';
            break;
          case 'month':
            key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
            break;
        }

        trends[key] ??= { total: 0, recurring: 0 };

        const trend = trends[key];
        if (trend) {
          trend.total += t.amount.toNumber();
          if (t.isSubscription) {
            trend.recurring += t.amount.toNumber();
          }
        }
      });

      // Convert to array and sort
      const trendData = Object.entries(trends)
        .map(([period, data]) => ({
          period,
          total: Math.round(data.total * 100) / 100,
          recurring: Math.round(data.recurring * 100) / 100,
          nonRecurring: Math.round((data.total - data.recurring) * 100) / 100,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      // Cache the result for 10 minutes (trends change less frequently)
      setCache(cacheKey, trendData, 10);
      return trendData;
    }),

  /**
   * Get subscription insights
   */
  getSubscriptionInsights: protectedProcedure.query(async ({ ctx }) => {
    const subscriptions = await ctx.db.subscription.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 3,
        },
      },
    });

    // Calculate insights
    const activeCount = subscriptions.filter(s => s.isActive).length;
    const cancelledCount = subscriptions.filter(s => !s.isActive).length;

    // Find unused subscriptions (no transactions in 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const unusedSubscriptions = subscriptions.filter(s => {
      if (!s.isActive) return false;
      const lastTransaction = s.transactions[0];
      return !lastTransaction || lastTransaction.date < sixtyDaysAgo;
    });

    // Find price increases
    const priceIncreases = subscriptions.filter(s => {
      if (s.transactions.length < 2) return false;
      const recent = s.transactions[0]?.amount.toNumber() ?? 0;
      const previous = s.transactions[1]?.amount.toNumber() ?? 0;
      return recent > previous;
    });

    // Calculate average subscription age
    const activeAges = subscriptions
      .filter(s => s.isActive)
      .map(s => {
        const age = Date.now() - s.createdAt.getTime();
        return age / (1000 * 60 * 60 * 24); // Days
      });

    const averageAge =
      activeAges.length > 0
        ? Math.round(activeAges.reduce((a, b) => a + b, 0) / activeAges.length)
        : 0;

    return {
      totalActive: activeCount,
      totalCancelled: cancelledCount,
      unusedCount: unusedSubscriptions.length,
      priceIncreaseCount: priceIncreases.length,
      averageSubscriptionAge: averageAge,
      insights: [
        ...(unusedSubscriptions.length > 0
          ? [
              {
                type: 'unused' as const,
                title: 'Unused Subscriptions',
                message: `You have ${unusedSubscriptions.length} subscription${unusedSubscriptions.length > 1 ? 's' : ''} that haven't been used in over 60 days`,
                subscriptions: unusedSubscriptions.map(s => ({
                  id: s.id,
                  name: s.name,
                  amount: s.amount.toNumber(),
                })),
              },
            ]
          : []),
        ...(priceIncreases.length > 0
          ? [
              {
                type: 'price_increase' as const,
                title: 'Price Increases Detected',
                message: `${priceIncreases.length} subscription${priceIncreases.length > 1 ? 's have' : ' has'} increased in price recently`,
                subscriptions: priceIncreases.map(s => ({
                  id: s.id,
                  name: s.name,
                  oldAmount: s.transactions[1]?.amount.toNumber() ?? 0,
                  newAmount: s.transactions[0]?.amount.toNumber() ?? 0,
                })),
              },
            ]
          : []),
      ],
    };
  }),

  /**
   * Get upcoming renewals
   */
  getUpcomingRenewals: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).optional().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + input.days);

      const subscriptions = await ctx.db.subscription.findMany({
        where: {
          userId: ctx.session.user.id,
          isActive: true,
          nextBilling: {
            gte: new Date(),
            lte: futureDate,
          },
        },
        orderBy: { nextBilling: 'asc' },
        select: {
          id: true,
          name: true,
          amount: true,
          currency: true,
          nextBilling: true,
          provider: true,
        },
      });

      // Group by date
      const renewalsByDate: Record<string, typeof subscriptions> = {};

      subscriptions.forEach(sub => {
        if (!sub.nextBilling) return;

        const dateKey = sub.nextBilling.toISOString().split('T')[0];
        if (dateKey) {
          renewalsByDate[dateKey] ??= [];
          const dateRenewals = renewalsByDate[dateKey];
          if (dateRenewals) {
            dateRenewals.push(sub);
          }
        }
      });

      // Calculate totals
      const totalAmount = subscriptions.reduce(
        (sum, sub) => sum + sub.amount.toNumber(),
        0
      );

      return {
        renewals: Object.entries(renewalsByDate).map(([date, subs]) => ({
          date,
          subscriptions: subs.map(s => ({
            id: s.id,
            name: s.name,
            amount: s.amount.toNumber(),
            currency: s.currency,
            provider: s.provider,
          })),
          dailyTotal: subs.reduce((sum, s) => sum + s.amount.toNumber(), 0),
        })),
        totalCount: subscriptions.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
      };
    }),

  /**
   * Export analytics data
   */
  exportData: protectedProcedure
    .input(
      z.object({
        format: z.enum(['csv', 'json']).optional().default('csv'),
        includeTransactions: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get all user data
      const [subscriptions, transactions] = await Promise.all([
        ctx.db.subscription.findMany({
          where: { userId: ctx.session.user.id },
        }),
        input.includeTransactions
          ? ctx.db.transaction.findMany({
              where: {
                bankAccount: {
                  userId: ctx.session.user.id,
                },
              },
              include: {
                bankAccount: {
                  select: {
                    name: true,
                    isoCurrencyCode: true,
                    plaidItem: {
                      select: { institutionName: true },
                    },
                  },
                },
              },
              orderBy: { date: 'desc' },
            })
          : Promise.resolve([]),
      ]);

      if (input.format === 'json') {
        return {
          subscriptions: subscriptions.map(s => ({
            ...s,
            amount: s.amount.toNumber(),
          })),
          transactions: transactions.map(t => ({
            ...t,
            amount: t.amount.toNumber(),
          })),
          exportDate: new Date(),
        };
      }

      // Generate CSV
      const subscriptionsCsv = [
        [
          'Name',
          'Amount',
          'Currency',
          'Frequency',
          'Status',
          'Category',
          'Next Billing',
          'Provider',
        ],
        ...subscriptions.map(s => [
          s.name,
          s.amount.toString(),
          s.currency,
          s.frequency,
          s.status,
          s.category ?? '',
          s.nextBilling?.toISOString() ?? '',
          typeof s.provider === 'object' &&
          s.provider !== null &&
          'name' in s.provider &&
          typeof (s.provider as { name?: unknown }).name === 'string'
            ? (s.provider as { name: string }).name
            : '',
        ]),
      ];

      const transactionsCsv = input.includeTransactions
        ? [
            [
              'Date',
              'Description',
              'Amount',
              'Currency',
              'Category',
              'Account',
              'Institution',
            ],
            ...transactions.map(t => [
              t.date.toISOString(),
              t.description,
              t.amount.toString(),
              t.bankAccount.isoCurrencyCode ?? 'USD',
              Array.isArray(t.category) &&
              t.category.length > 0 &&
              typeof t.category[0] === 'string'
                ? t.category[0]
                : '',
              t.bankAccount.name,
              t.bankAccount.plaidItem.institutionName,
            ]),
          ]
        : [];

      return {
        subscriptions: subscriptionsCsv,
        transactions: transactionsCsv,
        exportDate: new Date(),
      };
    }),
});
