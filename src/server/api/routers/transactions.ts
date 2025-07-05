import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { type Prisma } from '@prisma/client';

// Types for transaction processing (unused but kept for future reference)
// interface _TransactionWithDetails {
//   id: string;
//   merchantName: string | null;
//   amount: number;
//   date: Date;
// }

export const transactionsRouter = createTRPCRouter({
  /**
   * Get all transactions with filtering
   */
  getAll: protectedProcedure
    .input(
      z.object({
        accountId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        isRecurring: z.boolean().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
        cursor: z.string().optional(), // For cursor-based pagination
      })
    )
    .query(async ({ ctx, input }) => {
      // Build where clause
      const where: Prisma.TransactionWhereInput = {
        bankAccount: {
          userId: ctx.session.user.id,
        },
      };

      if (input.accountId) {
        where.accountId = input.accountId;
      }

      if (input.startDate || input.endDate) {
        where.date = {};
        if (input.startDate) {
          where.date.gte = input.startDate;
        }
        if (input.endDate) {
          where.date.lte = input.endDate;
        }
      }

      if (input.category) {
        // Filter by category using JSON array contains
        where.category = {
          array_contains: input.category,
        } as Prisma.JsonFilter;
      }

      if (input.search) {
        where.OR = [
          { description: { contains: input.search, mode: 'insensitive' } },
          { merchantName: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      if (input.isRecurring !== undefined) {
        where.isSubscription = input.isRecurring;
      }

      // Use cursor-based pagination if cursor provided
      const paginationArgs: {
        take: number;
        skip: number;
        cursor?: { id: string };
      } = input.cursor
        ? {
            take: input.limit + 1, // Take one extra to check if there's more
            cursor: { id: input.cursor },
            skip: 1, // Skip the cursor item itself
          }
        : {
            take: input.limit + 1,
            skip: input.offset,
          };

      // Get transactions with pagination
      const [rawTransactions, total] = await Promise.all([
        ctx.db.transaction.findMany({
          where,
          orderBy: [{ date: 'desc' }, { id: 'desc' }], // Secondary sort by ID for stable cursor
          ...paginationArgs,
          include: {
            bankAccount: {
              select: {
                name: true,
                isoCurrencyCode: true,
                plaidItem: {
                  select: {
                    institutionName: true,
                  },
                },
              },
            },
            subscription: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        ctx.db.transaction.count({ where }),
      ]);

      // Check if there are more results
      const hasMore = rawTransactions.length > input.limit;
      const transactions = hasMore
        ? rawTransactions.slice(0, -1)
        : rawTransactions;
      const nextCursor = hasMore
        ? transactions[transactions.length - 1]?.id
        : null;

      return {
        transactions: transactions.map(t => ({
          id: t.id,
          date: t.date,
          name: t.description,
          merchantName: t.merchantName,
          amount: t.amount.toNumber(),
          currency: t.bankAccount.isoCurrencyCode ?? 'USD',
          category: t.category,
          pending: t.pending,
          isRecurring: t.isSubscription,
          account: {
            name: t.bankAccount.name,
            institution: t.bankAccount.plaidItem.institutionName,
          },
          subscription: t.subscription
            ? {
                id: t.subscription.id,
                name: t.subscription.name,
              }
            : null,
        })),
        total,
        hasMore,
        nextCursor,
      };
    }),

  /**
   * Get transaction by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.db.transaction.findFirst({
        where: {
          id: input.id,
          bankAccount: {
            userId: ctx.session.user.id,
          },
        },
        include: {
          bankAccount: true,
          subscription: true,
        },
      });

      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        });
      }

      return {
        ...transaction,
        amount: transaction.amount.toNumber(),
      };
    }),

  /**
   * Link transaction to subscription
   */
  linkToSubscription: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        subscriptionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership of both transaction and subscription
      const [transaction, subscription] = await Promise.all([
        ctx.db.transaction.findFirst({
          where: {
            id: input.transactionId,
            bankAccount: {
              userId: ctx.session.user.id,
            },
          },
        }),
        ctx.db.subscription.findFirst({
          where: {
            id: input.subscriptionId,
            userId: ctx.session.user.id,
          },
        }),
      ]);

      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        });
      }

      if (!subscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Subscription not found',
        });
      }

      // Link transaction to subscription
      const updated = await ctx.db.transaction.update({
        where: { id: input.transactionId },
        data: {
          subscriptionId: input.subscriptionId,
          isSubscription: true,
        },
      });

      // Update subscription's last billing date based on transaction
      await ctx.db.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          updatedAt: new Date(),
          // The lastBilling field is tracked through the most recent transaction
        },
      });

      return updated;
    }),

  /**
   * Unlink transaction from subscription
   */
  unlinkFromSubscription: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const transaction = await ctx.db.transaction.findFirst({
        where: {
          id: input.transactionId,
          bankAccount: {
            userId: ctx.session.user.id,
          },
        },
      });

      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        });
      }

      // Unlink from subscription
      const updated = await ctx.db.transaction.update({
        where: { id: input.transactionId },
        data: {
          subscriptionId: null,
          isSubscription: false,
        },
      });

      return updated;
    }),

  /**
   * Get spending summary by category
   */
  getSpendingByCategory: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        accountId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TransactionWhereInput = {
        bankAccount: {
          userId: ctx.session.user.id,
        },
        date: {
          gte: input.startDate,
          lte: input.endDate,
        },
      };

      if (input.accountId) {
        where.accountId = input.accountId;
      }

      const transactions = await ctx.db.transaction.findMany({
        where,
        select: {
          category: true,
          amount: true,
        },
      });

      // Group by category
      const categorySpending = transactions.reduce(
        (acc, t) => {
          const category =
            Array.isArray(t.category) &&
            t.category.length > 0 &&
            typeof t.category[0] === 'string'
              ? t.category[0]
              : 'Other';
          acc[category] ??= 0;
          acc[category] += t.amount.toNumber();
          return acc;
        },
        {} as Record<string, number>
      );

      // Convert to array and sort by amount
      const categories = Object.entries(categorySpending)
        .map(([category, amount]) => ({
          category,
          amount: Math.round(amount * 100) / 100,
        }))
        .sort((a, b) => b.amount - a.amount);

      return categories;
    }),

  /**
   * Get recurring transactions pattern
   */
  getRecurringPatterns: protectedProcedure
    .input(
      z.object({
        accountId: z.string().optional(),
        minOccurrences: z.number().min(2).optional().default(3),
      })
    )
    .query(async ({ ctx, input }) => {
      // This is a simplified version - in production, this would use
      // more sophisticated pattern matching algorithms

      const where: Prisma.TransactionWhereInput = {
        bankAccount: {
          userId: ctx.session.user.id,
        },
        isSubscription: false, // Only look at unlinked transactions
        subscriptionId: null,
      };

      if (input.accountId) {
        where.accountId = input.accountId;
      }

      // Get transactions from last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      where.date = { gte: sixMonthsAgo };

      const transactions = await ctx.db.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          merchantName: true,
          amount: true,
          date: true,
        },
      });

      // Group by merchant and similar amounts
      const patterns = new Map<string, typeof transactions>();

      transactions.forEach(t => {
        if (!t.merchantName) return;

        const key = `${t.merchantName}-${Math.round(t.amount.toNumber())}`;
        if (!patterns.has(key)) {
          patterns.set(key, []);
        }
        patterns.get(key)!.push(t);
      });

      // Filter patterns with minimum occurrences
      const recurringPatterns = Array.from(patterns.entries())
        .filter(([_, txns]) => txns.length >= input.minOccurrences)
        .map(([_key, txns]) => {
          const amounts = txns.map(t => t.amount.toNumber());
          const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

          return {
            merchantName: txns[0]?.merchantName ?? 'Unknown',
            occurrences: txns.length,
            averageAmount: Math.round(avgAmount * 100) / 100,
            transactions: txns.map(t => ({
              id: t.id,
              date: t.date,
              amount: t.amount.toNumber(),
            })),
          };
        })
        .sort((a, b) => b.occurrences - a.occurrences);

      return recurringPatterns;
    }),

  /**
   * Manually mark transaction as subscription
   */
  markAsSubscription: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        subscriptionData: z.object({
          name: z.string(),
          category: z.string().optional(),
          frequency: z.enum([
            'monthly',
            'yearly',
            'weekly',
            'quarterly',
            'biannual',
          ]),
          description: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify transaction ownership
      const transaction = await ctx.db.transaction.findFirst({
        where: {
          id: input.transactionId,
          bankAccount: {
            userId: ctx.session.user.id,
          },
        },
        include: {
          bankAccount: true,
        },
      });

      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        });
      }

      // Create or find existing subscription
      let subscription = await ctx.db.subscription.findFirst({
        where: {
          userId: ctx.session.user.id,
          name: input.subscriptionData.name,
          amount: transaction.amount,
        },
      });

      // Use nullish coalescing assignment
      subscription ??= await ctx.db.subscription.create({
        data: {
          userId: ctx.session.user.id,
          name: input.subscriptionData.name,
          description: input.subscriptionData.description,
          category: input.subscriptionData.category,
          amount: transaction.amount,
          currency: transaction.bankAccount.isoCurrencyCode,
          frequency: input.subscriptionData.frequency,
          lastBilling: transaction.date,
          detectionConfidence: 1.0, // Manual marking = 100% confidence
          provider: {
            name: transaction.merchantName ?? input.subscriptionData.name,
            type: 'manual',
          },
        },
      });

      // Link transaction to subscription
      await ctx.db.transaction.update({
        where: { id: input.transactionId },
        data: {
          subscriptionId: subscription.id,
          isSubscription: true,
        },
      });

      return {
        subscription,
        success: true,
        message: 'Transaction marked as subscription successfully',
      };
    }),

  /**
   * AI-powered subscription detection for single transaction
   */
  detectSubscription: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        forceDetection: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify transaction ownership
      const transaction = await ctx.db.transaction.findFirst({
        where: {
          id: input.transactionId,
          bankAccount: {
            userId: ctx.session.user.id,
          },
        },
        include: {
          bankAccount: true,
        },
      });

      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        });
      }

      if (transaction.isSubscription && !input.forceDetection) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Transaction is already marked as subscription',
        });
      }

      // Get similar transactions for pattern analysis
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const similarTransactions = await ctx.db.transaction.findMany({
        where: {
          bankAccount: {
            userId: ctx.session.user.id,
          },
          merchantName: transaction.merchantName,
          amount: {
            gte: transaction.amount.mul(0.95), // ±5% tolerance
            lte: transaction.amount.mul(1.05),
          },
          date: { gte: sixMonthsAgo },
          id: { not: transaction.id },
        },
        orderBy: { date: 'desc' },
        take: 10,
      });

      // Simple pattern analysis
      const isRecurring = similarTransactions.length >= 2;
      let frequency: string | null = null;
      let confidence = 0;

      if (isRecurring) {
        // Calculate frequency based on transaction dates
        const dates = [
          transaction.date,
          ...similarTransactions.map(t => t.date),
        ].sort();
        const daysBetween = [];

        for (let i = 1; i < dates.length; i++) {
          const diff = Math.abs(dates[i]!.getTime() - dates[i - 1]!.getTime());
          daysBetween.push(Math.round(diff / (1000 * 60 * 60 * 24)));
        }

        const avgDays =
          daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length;

        // Determine frequency
        if (avgDays >= 25 && avgDays <= 35) {
          frequency = 'monthly';
          confidence = 0.8;
        } else if (avgDays >= 350 && avgDays <= 375) {
          frequency = 'yearly';
          confidence = 0.8;
        } else if (avgDays >= 85 && avgDays <= 95) {
          frequency = 'quarterly';
          confidence = 0.7;
        } else if (avgDays >= 6 && avgDays <= 8) {
          frequency = 'weekly';
          confidence = 0.7;
        } else {
          frequency = 'monthly'; // Default fallback
          confidence = 0.5;
        }
      }

      return {
        isRecurring,
        confidence,
        frequency,
        merchantName: transaction.merchantName,
        amount: transaction.amount.toNumber(),
        similarTransactions: similarTransactions.length,
        suggestedName: transaction.merchantName ?? transaction.description,
        recommendation: isRecurring
          ? `This appears to be a ${frequency} subscription with ${confidence * 100}% confidence`
          : 'No recurring pattern detected',
      };
    }),

  /**
   * Get comprehensive transaction statistics
   */
  getStats: protectedProcedure
    .input(
      z.object({
        accountId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TransactionWhereInput = {
        bankAccount: {
          userId: ctx.session.user.id,
        },
      };

      if (input.accountId) {
        where.accountId = input.accountId;
      }

      if (input.startDate || input.endDate) {
        where.date = {};
        if (input.startDate) {
          where.date.gte = input.startDate;
        }
        if (input.endDate) {
          where.date.lte = input.endDate;
        }
      }

      // Get various transaction counts
      const [
        totalTransactions,
        subscriptionTransactions,
        pendingTransactions,
        totalSpentResult,
        subscriptionSpentResult,
      ] = await Promise.all([
        ctx.db.transaction.count({ where }),
        ctx.db.transaction.count({
          where: { ...where, isSubscription: true },
        }),
        ctx.db.transaction.count({
          where: { ...where, pending: true },
        }),
        ctx.db.transaction.aggregate({
          where,
          _sum: { amount: true },
        }),
        ctx.db.transaction.aggregate({
          where: { ...where, isSubscription: true },
          _sum: { amount: true },
        }),
      ]);

      const totalSpent = Math.abs(
        totalSpentResult._sum.amount?.toNumber() ?? 0
      );
      const subscriptionSpent = Math.abs(
        subscriptionSpentResult._sum.amount?.toNumber() ?? 0
      );
      const averageTransactionAmount =
        totalTransactions > 0 ? totalSpent / totalTransactions : 0;
      const subscriptionPercentage =
        totalTransactions > 0
          ? (subscriptionTransactions / totalTransactions) * 100
          : 0;

      return {
        totalTransactions,
        subscriptionTransactions,
        pendingTransactions,
        totalSpent: Math.round(totalSpent * 100) / 100,
        subscriptionSpent: Math.round(subscriptionSpent * 100) / 100,
        averageTransactionAmount:
          Math.round(averageTransactionAmount * 100) / 100,
        subscriptionPercentage: Math.round(subscriptionPercentage * 100) / 100,
      };
    }),
});
