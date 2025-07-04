import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import {
  type Prisma,
  type Subscription,
  type Transaction,
} from '@prisma/client';
import { AnalyticsService } from '@/server/services/analytics.service';

// Type-safe cache data structures
interface SpendingOverviewData {
  subscriptionSpending: {
    monthly: number;
    yearly: number;
  };
  totalSpending: {
    period: number;
    monthlyAverage: number;
  };
  subscriptionPercentage: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

interface SpendingTrendData {
  period: string;
  total: number;
  recurring: number;
  nonRecurring: number;
}

interface SubscriptionInsights {
  insights: Array<{
    title: string;
    message: string;
    type: string;
    subscriptions?: Array<{
      id: string;
      name: string;
      amount: number;
      oldAmount?: number;
      newAmount?: number;
    }>;
  }>;
  totalActive: number;
  totalCancelled: number;
  unusedCount: number;
  potentialSavings: number;
  averageSubscriptionAge: number;
  priceIncreaseCount: number;
  duplicateGroups: Array<{
    name: string;
    count: number;
    totalCost: number;
    subscriptions: Array<{
      id: string;
      name: string;
      amount: number;
    }>;
  }>;
}

type CacheData =
  | SpendingOverviewData
  | SpendingTrendData[]
  | SubscriptionInsights
  | Record<string, unknown>;

// Simple in-memory cache for expensive calculations
const analyticsCache = new Map<
  string,
  { data: CacheData; timestamp: number; ttl: number }
>();

const getCacheKey = (userId: string, endpoint: string, params: unknown) => {
  return `${userId}:${endpoint}:${JSON.stringify(params)}`;
};

const getFromCache = <T extends CacheData>(key: string): T | null => {
  const cached = analyticsCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > cached.ttl) {
    analyticsCache.delete(key);
    return null;
  }

  return cached.data as T;
};

const setCache = <T extends CacheData>(
  key: string,
  data: T,
  ttlMinutes = 15
) => {
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
      const cached = getFromCache<SpendingOverviewData>(cacheKey);
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

        const category = sub.category ?? 'Other';
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
      setCache<SpendingOverviewData>(cacheKey, result, 15);
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
      const cached = getFromCache<SpendingTrendData[]>(cacheKey);
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
          case 'week': {
            const week = new Date(t.date);
            week.setDate(week.getDate() - week.getDay());
            key = week.toISOString().split('T')[0] ?? '';
            break;
          }
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
      setCache<SpendingTrendData[]>(cacheKey, trendData, 10);
      return trendData;
    }),

  /**
   * Get subscription insights
   */
  getSubscriptionInsights: protectedProcedure.query(async ({ ctx }) => {
    // Check cache first
    const cacheKey = getCacheKey(
      ctx.session.user.id,
      'subscriptionInsights',
      {}
    );
    const cached = getFromCache<SubscriptionInsights>(cacheKey);
    if (cached) return cached;

    type SubscriptionWithTransactions = Subscription & {
      transactions: Transaction[];
    };

    const subscriptions = (await ctx.db.subscription.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 3,
          select: {
            id: true,
            date: true,
            amount: true,
          },
        },
      },
    })) as SubscriptionWithTransactions[];

    // Calculate insights
    const activeCount = subscriptions.filter(s => s.isActive).length;
    const cancelledCount = subscriptions.filter(s => !s.isActive).length;

    // Find unused subscriptions (no transactions in 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const unusedSubscriptions = subscriptions.filter(s => {
      if (!s.isActive) return false;
      const lastTransaction = s.transactions?.[0];
      return !lastTransaction || lastTransaction.date < sixtyDaysAgo;
    });

    // Find price increases
    const priceIncreases = subscriptions.filter(s => {
      if (!s.transactions || s.transactions.length < 2) return false;
      const recent = s.transactions[0];
      const previous = s.transactions[1];
      if (!recent || !previous) return false;
      return recent.amount.toNumber() > previous.amount.toNumber();
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

    const result = {
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
                subscriptions: priceIncreases.map(s => {
                  const recent = s.transactions[0];
                  const previous = s.transactions[1];
                  return {
                    id: s.id,
                    name: s.name,
                    oldAmount: previous ? previous.amount.toNumber() : 0,
                    newAmount: recent ? recent.amount.toNumber() : 0,
                  };
                }),
              },
            ]
          : []),
      ],
    };

    // Cache the result for 30 minutes
    setCache(cacheKey, result, 30);
    return result;
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

        const dateKey = sub.nextBilling.toISOString().split('T')[0] ?? '';
        if (!dateKey) return;

        renewalsByDate[dateKey] ??= [];
        renewalsByDate[dateKey].push(sub);
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
            provider:
              s.provider &&
              typeof s.provider === 'object' &&
              'name' in s.provider
                ? { name: s.provider.name as string | undefined }
                : null,
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
          s.provider && typeof s.provider === 'object' && 'name' in s.provider
            ? typeof (s.provider as Record<string, unknown>).name === 'string'
              ? ((s.provider as Record<string, unknown>).name as string)
              : ''
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
              Array.isArray(t.category) && t.category.length > 0
                ? typeof t.category[0] === 'string'
                  ? t.category[0]
                  : ''
                : '',
              t.bankAccount.name,
              t.bankAccount.plaidItem.institutionName,
            ]),
          ]
        : [];

      // Convert arrays to CSV string
      const csvToString = (data: string[][]) => {
        return data
          .map(row =>
            row
              .map(cell => {
                // Handle undefined/null values
                const cellStr = cell ?? '';
                // Escape quotes and wrap in quotes if cell contains comma, quote, or newline
                return cellStr.includes(',') ||
                  cellStr.includes('"') ||
                  cellStr.includes('\n')
                  ? `"${cellStr.replace(/"/g, '""')}"`
                  : cellStr;
              })
              .join(',')
          )
          .join('\n');
      };

      const subscriptionsCsvContent = csvToString(subscriptionsCsv);
      const transactionsCsvContent = input.includeTransactions
        ? csvToString(transactionsCsv)
        : '';

      return {
        format: input.format,
        data: {
          subscriptions:
            input.format === 'csv'
              ? subscriptionsCsvContent
              : subscriptions.map(s => ({ ...s, amount: s.amount.toNumber() })),
          transactions:
            input.format === 'csv'
              ? transactionsCsvContent
              : transactions.map(t => ({ ...t, amount: t.amount.toNumber() })),
        },
        filename: `subpilot-export-${new Date().toISOString().split('T')[0]}.${input.format}`,
        contentType: input.format === 'csv' ? 'text/csv' : 'application/json',
        exportDate: new Date(),
      };
    }),

  /**
   * Get detailed category breakdown with trends
   */
  getCategoryBreakdown: protectedProcedure
    .input(
      z.object({
        timeRange: timeRangeEnum.optional().default('month'),
      })
    )
    .query(async ({ ctx, input }) => {
      const analyticsService = new AnalyticsService(ctx.db);
      return analyticsService.analyzeCategorySpending(
        ctx.session.user.id,
        input.timeRange as 'month' | 'quarter' | 'year'
      );
    }),

  /**
   * Get spending comparisons (month-over-month, year-over-year)
   */
  getComparisons: protectedProcedure
    .input(
      z.object({
        comparisonType: z.enum([
          'month-over-month',
          'year-over-year',
          'quarter-over-quarter',
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      const analyticsService = new AnalyticsService(ctx.db);

      const endDate = new Date();
      const currentStart = new Date();
      const previousStart = new Date();
      const previousEnd = new Date();

      switch (input.comparisonType) {
        case 'month-over-month':
          currentStart.setMonth(endDate.getMonth() - 1);
          previousStart.setMonth(endDate.getMonth() - 2);
          previousEnd.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter-over-quarter':
          currentStart.setMonth(endDate.getMonth() - 3);
          previousStart.setMonth(endDate.getMonth() - 6);
          previousEnd.setMonth(endDate.getMonth() - 3);
          break;
        case 'year-over-year':
          currentStart.setFullYear(endDate.getFullYear() - 1);
          previousStart.setFullYear(endDate.getFullYear() - 2);
          previousEnd.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      return analyticsService.compareSpendingPeriods(
        ctx.session.user.id,
        currentStart,
        endDate,
        previousStart,
        previousEnd
      );
    }),

  /**
   * Get predictive analytics
   */
  getPredictions: protectedProcedure
    .input(
      z.object({
        horizonMonths: z.number().min(1).max(12).optional().default(3),
      })
    )
    .query(async ({ ctx, input }) => {
      const analyticsService = new AnalyticsService(ctx.db);
      return analyticsService.predictFutureSpending(
        ctx.session.user.id,
        input.horizonMonths
      );
    }),

  /**
   * Detect anomalies in spending
   */
  getAnomalies: protectedProcedure.query(async ({ ctx }) => {
    const analyticsService = new AnalyticsService(ctx.db);
    return analyticsService.detectAnomalies(ctx.session.user.id);
  }),

  /**
   * Get cost optimization suggestions
   */
  getOptimizations: protectedProcedure.query(async ({ ctx }) => {
    const analyticsService = new AnalyticsService(ctx.db);
    return analyticsService.generateOptimizationSuggestions(
      ctx.session.user.id
    );
  }),

  /**
   * Generate comprehensive analytics report
   */
  generateReport: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const analyticsService = new AnalyticsService(ctx.db);

      const endDate = input.endDate ?? new Date();
      const startDate =
        input.startDate ??
        (() => {
          const date = new Date();
          date.setMonth(date.getMonth() - 1);
          return date;
        })();

      return analyticsService.generateReport(
        ctx.session.user.id,
        startDate,
        endDate
      );
    }),

  /**
   * Get time series data for custom analysis
   */
  getTimeSeries: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        groupBy: z.enum(['day', 'week', 'month']).optional().default('month'),
      })
    )
    .query(async ({ ctx, input }) => {
      const analyticsService = new AnalyticsService(ctx.db);

      const endDate = input.endDate ?? new Date();
      const startDate =
        input.startDate ??
        (() => {
          const date = new Date();
          date.setFullYear(date.getFullYear() - 1);
          return date;
        })();

      return analyticsService.generateTimeSeriesData(
        ctx.session.user.id,
        startDate,
        endDate,
        input.groupBy
      );
    }),
});
