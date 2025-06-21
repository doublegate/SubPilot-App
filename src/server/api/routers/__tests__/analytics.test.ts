import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { analyticsRouter } from '@/server/api/routers/analytics';
import type { Session } from 'next-auth';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/db';

// Mock Prisma client
vi.mock('@/server/db', () => ({
  db: {
    subscription: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

describe('analyticsRouter', () => {
  let ctx: Awaited<ReturnType<typeof createInnerTRPCContext>>;
  let caller: ReturnType<typeof analyticsRouter.createCaller>;

  const mockSession: Session = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockSubscription = {
    id: 'sub-1',
    userId: 'test-user-id',
    name: 'Netflix',
    amount: 15.99,
    currency: 'USD',
    frequency: 'monthly',
    category: 'Entertainment',
    nextBilling: new Date('2024-08-15'),
    lastBilling: new Date('2024-07-15'),
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
  };

  const mockTransaction = {
    id: 'txn-1',
    userId: 'test-user-id',
    amount: -15.99,
    date: new Date('2024-07-15'),
    category: ['Entertainment'],
    merchantName: 'Netflix',
    isSubscription: true,
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    ctx = createInnerTRPCContext({
      session: mockSession,
    });

    caller = analyticsRouter.createCaller(ctx);
  });

  describe('getSpendingTrends', () => {
    it('returns spending trends over time periods', async () => {
      const mockTransactions = [
        {
          ...mockTransaction,
          date: new Date('2024-07-15'),
          amount: -15.99,
        },
        {
          ...mockTransaction,
          id: 'txn-2',
          date: new Date('2024-06-15'),
          amount: -15.99,
        },
        {
          ...mockTransaction,
          id: 'txn-3',
          date: new Date('2024-05-15'),
          amount: -15.99,
        },
      ];

      (db.transaction.findMany as Mock).mockResolvedValueOnce(mockTransactions);

      const result = await caller.getSpendingTrends({
        period: 'monthly',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-07-31'),
      });

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          date: {
            gte: new Date('2024-05-01'),
            lte: new Date('2024-07-31'),
          },
          amount: { lt: 0 },
        },
        select: {
          amount: true,
          date: true,
          category: true,
          isSubscription: true,
        },
        orderBy: { date: 'asc' },
      });

      expect(result.trends).toHaveLength(3);
      expect(result.trends[0]).toEqual({
        period: '2024-05',
        totalSpend: 15.99,
        subscriptionSpend: 15.99,
        transactionCount: 1,
      });
    });

    it('handles different time periods correctly', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce([mockTransaction]);

      await caller.getSpendingTrends({ period: 'weekly' });

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          date: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
          amount: { lt: 0 },
        },
        select: {
          amount: true,
          date: true,
          category: true,
          isSubscription: true,
        },
        orderBy: { date: 'asc' },
      });
    });

    it('filters by category when provided', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce([mockTransaction]);

      await caller.getSpendingTrends({
        period: 'monthly',
        category: 'Entertainment',
      });

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          date: expect.any(Object),
          amount: { lt: 0 },
          category: { has: 'Entertainment' },
        },
        select: {
          amount: true,
          date: true,
          category: true,
          isSubscription: true,
        },
        orderBy: { date: 'asc' },
      });
    });
  });

  describe('getCategoryBreakdown', () => {
    it('returns spending breakdown by category', async () => {
      const mockCategoryData = [
        { category: ['Entertainment'], amount: -45.97 },
        { category: ['Food and Drink'], amount: -89.50 },
        { category: ['Transportation'], amount: -125.25 },
      ];

      (db.transaction.findMany as Mock).mockResolvedValueOnce(mockCategoryData);

      const result = await caller.getCategoryBreakdown({});

      expect(result.categories).toEqual([
        {
          category: 'Transportation',
          amount: 125.25,
          percentage: expect.any(Number),
          transactionCount: 1,
        },
        {
          category: 'Food and Drink',
          amount: 89.50,
          percentage: expect.any(Number),
          transactionCount: 1,
        },
        {
          category: 'Entertainment',
          amount: 45.97,
          percentage: expect.any(Number),
          transactionCount: 1,
        },
      ]);

      expect(result.totalSpend).toBe(260.72);
    });

    it('handles empty category arrays gracefully', async () => {
      const mockCategoryData = [
        { category: ['Entertainment'], amount: -15.99 },
        { category: null, amount: -25.00 },
        { category: [], amount: -10.00 },
      ];

      (db.transaction.findMany as Mock).mockResolvedValueOnce(mockCategoryData);

      const result = await caller.getCategoryBreakdown({});

      expect(result.categories).toEqual([
        {
          category: 'Uncategorized',
          amount: 35.00,
          percentage: expect.any(Number),
          transactionCount: 2,
        },
        {
          category: 'Entertainment',
          amount: 15.99,
          percentage: expect.any(Number),
          transactionCount: 1,
        },
      ]);
    });

    it('filters by date range when provided', async () => {
      const startDate = new Date('2024-07-01');
      const endDate = new Date('2024-07-31');

      (db.transaction.findMany as Mock).mockResolvedValueOnce([]);

      await caller.getCategoryBreakdown({ startDate, endDate });

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          amount: { lt: 0 },
          date: { gte: startDate, lte: endDate },
        },
        select: {
          category: true,
          amount: true,
        },
      });
    });
  });

  describe('getSubscriptionInsights', () => {
    it('returns comprehensive subscription insights', async () => {
      (db.subscription.count as Mock).mockResolvedValueOnce(8);
      (db.subscription.findMany as Mock)
        .mockResolvedValueOnce([mockSubscription]) // active
        .mockResolvedValueOnce([mockSubscription]); // upcoming

      (db.subscription.aggregate as Mock)
        .mockResolvedValueOnce({ _sum: { amount: 125.50 } }) // monthly total
        .mockResolvedValueOnce({ _sum: { amount: 1506.00 } }); // yearly total

      const result = await caller.getSubscriptionInsights({});

      expect(result).toEqual({
        totalSubscriptions: 8,
        activeSubscriptions: 1,
        upcomingRenewals: 1,
        totalMonthlySpend: 125.50,
        totalYearlySpend: 1506.00,
        averageSubscriptionCost: expect.any(Number),
        oldestSubscription: expect.any(Date),
        newestSubscription: expect.any(Date),
      });
    });

    it('handles zero subscriptions gracefully', async () => {
      (db.subscription.count as Mock).mockResolvedValueOnce(0);
      (db.subscription.findMany as Mock).mockResolvedValue([]);
      (db.subscription.aggregate as Mock).mockResolvedValue({ _sum: { amount: null } });

      const result = await caller.getSubscriptionInsights({});

      expect(result).toEqual({
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        upcomingRenewals: 0,
        totalMonthlySpend: 0,
        totalYearlySpend: 0,
        averageSubscriptionCost: 0,
        oldestSubscription: null,
        newestSubscription: null,
      });
    });

    it('calculates upcoming renewals correctly', async () => {
      const upcomingSubscriptions = [
        {
          ...mockSubscription,
          nextBilling: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
        },
        {
          ...mockSubscription,
          id: 'sub-2',
          nextBilling: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        },
      ];

      (db.subscription.count as Mock).mockResolvedValueOnce(2);
      (db.subscription.findMany as Mock)
        .mockResolvedValueOnce(upcomingSubscriptions) // active
        .mockResolvedValueOnce(upcomingSubscriptions); // upcoming

      (db.subscription.aggregate as Mock).mockResolvedValue({ _sum: { amount: 31.98 } });

      const result = await caller.getSubscriptionInsights({});

      expect(result.upcomingRenewals).toBe(2);
    });
  });

  describe('getPaymentMethodBreakdown', () => {
    it('returns payment method distribution', async () => {
      const mockAccounts = [
        {
          type: 'depository',
          subtype: 'checking',
          _count: { transactions: 25 },
          _sum: { transactions: { amount: -150.75 } },
        },
        {
          type: 'credit',
          subtype: 'credit_card',
          _count: { transactions: 15 },
          _sum: { transactions: { amount: -89.25 } },
        },
      ];

      (db.transaction as any).groupBy = vi.fn().mockResolvedValueOnce(mockAccounts);

      const result = await caller.getPaymentMethodBreakdown({});

      expect(result.paymentMethods).toEqual([
        {
          type: 'Checking Account',
          transactionCount: 25,
          totalAmount: 150.75,
          percentage: expect.any(Number),
        },
        {
          type: 'Credit Card',
          transactionCount: 15,
          totalAmount: 89.25,
          percentage: expect.any(Number),
        },
      ]);
    });

    it('handles unknown account types', async () => {
      const mockAccounts = [
        {
          type: 'unknown',
          subtype: null,
          _count: { transactions: 5 },
          _sum: { transactions: { amount: -25.00 } },
        },
      ];

      (db.transaction as any).groupBy = vi.fn().mockResolvedValueOnce(mockAccounts);

      const result = await caller.getPaymentMethodBreakdown({});

      expect(result.paymentMethods[0].type).toBe('Other');
    });
  });

  describe('exportData', () => {
    it('exports user data in specified format', async () => {
      (db.subscription.findMany as Mock).mockResolvedValueOnce([mockSubscription]);
      (db.transaction.findMany as Mock).mockResolvedValueOnce([mockTransaction]);

      const result = await caller.exportData({ format: 'json' });

      expect(result).toEqual({
        subscriptions: [mockSubscription],
        transactions: [mockTransaction],
        exportedAt: expect.any(Date),
        format: 'json',
      });
    });

    it('handles CSV format export', async () => {
      (db.subscription.findMany as Mock).mockResolvedValueOnce([mockSubscription]);
      (db.transaction.findMany as Mock).mockResolvedValueOnce([mockTransaction]);

      const result = await caller.exportData({ format: 'csv' });

      expect(result.format).toBe('csv');
      expect(result.subscriptions).toBeDefined();
      expect(result.transactions).toBeDefined();
    });

    it('filters data by date range when provided', async () => {
      const startDate = new Date('2024-07-01');
      const endDate = new Date('2024-07-31');

      (db.subscription.findMany as Mock).mockResolvedValueOnce([]);
      (db.transaction.findMany as Mock).mockResolvedValueOnce([]);

      await caller.exportData({
        format: 'json',
        startDate,
        endDate,
      });

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          date: { gte: startDate, lte: endDate },
        },
        include: {
          account: {
            include: {
              plaidItem: {
                select: { institution: true },
              },
            },
          },
          subscription: true,
        },
        orderBy: { date: 'desc' },
      });
    });

    it('validates export format', async () => {
      await expect(
        caller.exportData({ format: 'invalid' as any })
      ).rejects.toThrow();
    });
  });

  describe('unauthorized access', () => {
    it('throws UNAUTHORIZED for all endpoints without session', async () => {
      const unauthenticatedCaller = analyticsRouter.createCaller(
        createInnerTRPCContext({ session: null })
      );

      await expect(
        unauthenticatedCaller.getSpendingTrends({ period: 'monthly' })
      ).rejects.toThrow(TRPCError);

      await expect(
        unauthenticatedCaller.getCategoryBreakdown({})
      ).rejects.toThrow(TRPCError);

      await expect(
        unauthenticatedCaller.getSubscriptionInsights({})
      ).rejects.toThrow(TRPCError);

      await expect(
        unauthenticatedCaller.exportData({ format: 'json' })
      ).rejects.toThrow(TRPCError);
    });
  });
});