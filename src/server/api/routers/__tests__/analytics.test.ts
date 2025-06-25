import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyticsRouter } from '../analytics';
import { createTRPCMsw } from 'msw-trpc';
import { type AppRouter } from '../../root';

// Mock Prisma client
const mockDb = {
  subscription: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
    count: vi.fn(),
  },
  transaction: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

const mockContext = {
  session: {
    user: { id: 'test-user-id' },
  },
  db: mockDb,
};

// Mock subscription data
const mockSubscriptions = [
  {
    id: 'sub-1',
    amount: { toNumber: () => 15.99 },
    frequency: 'monthly',
    category: 'Streaming',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    detectedAt: new Date('2024-01-02'),
    status: 'active',
  },
  {
    id: 'sub-2',
    amount: { toNumber: () => 99.99 },
    frequency: 'yearly',
    category: 'Software',
    isActive: true,
    createdAt: new Date('2024-02-01'),
    detectedAt: new Date('2024-02-01'),
    status: 'active',
  },
  {
    id: 'sub-3',
    amount: { toNumber: () => 9.99 },
    frequency: 'monthly',
    category: 'Music',
    isActive: false,
    createdAt: new Date('2024-01-15'),
    detectedAt: new Date('2024-01-15'),
    status: 'cancelled',
  },
];

// Mock transaction data
const mockTransactions = [
  {
    date: new Date('2024-06-01'),
    amount: { toNumber: () => 15.99 },
    isSubscription: true,
  },
  {
    date: new Date('2024-06-05'),
    amount: { toNumber: () => 50.0 },
    isSubscription: false,
  },
  {
    date: new Date('2024-06-15'),
    amount: { toNumber: () => 9.99 },
    isSubscription: true,
  },
];

describe('Analytics Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSpendingOverview', () => {
    it('should calculate spending overview correctly', async () => {
      mockDb.subscription.findMany.mockResolvedValue(
        mockSubscriptions.filter(s => s.isActive)
      );
      mockDb.transaction.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 275.98 } },
      });

      const caller = analyticsRouter.createCaller(mockContext as any);
      const result = await caller.getSpendingOverview({
        timeRange: 'month',
      });

      expect(result).toMatchObject({
        subscriptionSpending: {
          monthly: expect.any(Number),
          yearly: expect.any(Number),
        },
        totalSpending: {
          period: expect.any(Number),
          monthlyAverage: expect.any(Number),
        },
        subscriptionPercentage: expect.any(Number),
        categoryBreakdown: expect.arrayContaining([
          expect.objectContaining({
            category: expect.any(String),
            amount: expect.any(Number),
            percentage: expect.any(Number),
          }),
        ]),
      });

      // Verify subscription spending calculation
      // Monthly: 15.99 + (99.99/12) = 24.32
      expect(result.subscriptionSpending.monthly).toBeCloseTo(24.32, 1);
      expect(result.subscriptionSpending.yearly).toBeCloseTo(291.88, 1);
    });

    it('should handle different frequency calculations', async () => {
      const testSubs = [
        {
          amount: { toNumber: () => 12.0 },
          frequency: 'monthly',
          category: 'Test1',
        },
        {
          amount: { toNumber: () => 120.0 },
          frequency: 'yearly',
          category: 'Test2',
        },
        {
          amount: { toNumber: () => 30.0 },
          frequency: 'quarterly',
          category: 'Test3',
        },
        {
          amount: { toNumber: () => 3.0 },
          frequency: 'weekly',
          category: 'Test4',
        },
      ];

      mockDb.subscription.findMany.mockResolvedValue(testSubs);
      mockDb.transaction.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 100 } },
      });

      const caller = analyticsRouter.createCaller(mockContext as any);
      const result = await caller.getSpendingOverview({
        timeRange: 'month',
      });

      // Expected monthly: 12 + (120/12) + (30/3) + (3*4.33) = 12 + 10 + 10 + 12.99 = 44.99
      expect(result.subscriptionSpending.monthly).toBeCloseTo(44.99, 1);
    });

    it('should group categories correctly', async () => {
      mockDb.subscription.findMany.mockResolvedValue([
        {
          amount: { toNumber: () => 10 },
          frequency: 'monthly',
          category: 'Streaming',
        },
        {
          amount: { toNumber: () => 15 },
          frequency: 'monthly',
          category: 'Streaming',
        },
        {
          amount: { toNumber: () => 20 },
          frequency: 'monthly',
          category: 'Software',
        },
      ]);
      mockDb.transaction.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 100 } },
      });

      const caller = analyticsRouter.createCaller(mockContext as any);
      const result = await caller.getSpendingOverview({
        timeRange: 'month',
      });

      const streamingCategory = result.categoryBreakdown.find(
        c => c.category === 'Streaming'
      );
      const softwareCategory = result.categoryBreakdown.find(
        c => c.category === 'Software'
      );

      expect(streamingCategory?.amount).toBe(25); // 10 + 15
      expect(softwareCategory?.amount).toBe(20);
      expect(streamingCategory?.percentage).toBe(56); // 25/45 * 100
    });
  });

  describe('getSpendingTrends', () => {
    it('should calculate trends correctly', async () => {
      mockDb.transaction.findMany.mockResolvedValue(mockTransactions);

      const caller = analyticsRouter.createCaller(mockContext as any);
      const result = await caller.getSpendingTrends({
        timeRange: 'month',
        groupBy: 'day',
      });

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            period: expect.any(String),
            total: expect.any(Number),
            recurring: expect.any(Number),
            nonRecurring: expect.any(Number),
          }),
        ])
      );

      // Verify calculations
      const dayData = result.find(r => r.period === '2024-06-01');
      if (dayData) {
        expect(dayData.total).toBe(15.99);
        expect(dayData.recurring).toBe(15.99);
        expect(dayData.nonRecurring).toBe(0);
      }

      const anotherDay = result.find(r => r.period === '2024-06-05');
      if (anotherDay) {
        expect(anotherDay.total).toBe(50);
        expect(anotherDay.recurring).toBe(0);
        expect(anotherDay.nonRecurring).toBe(50);
      }
    });

    it('should handle monthly grouping', async () => {
      const monthlyTransactions = [
        {
          date: new Date('2024-01-15'),
          amount: { toNumber: () => 100 },
          isSubscription: true,
        },
        {
          date: new Date('2024-01-20'),
          amount: { toNumber: () => 50 },
          isSubscription: false,
        },
        {
          date: new Date('2024-02-10'),
          amount: { toNumber: () => 75 },
          isSubscription: true,
        },
      ];

      mockDb.transaction.findMany.mockResolvedValue(monthlyTransactions);

      const caller = analyticsRouter.createCaller(mockContext as any);
      const result = await caller.getSpendingTrends({
        timeRange: 'quarter',
        groupBy: 'month',
      });

      const jan2024 = result.find(r => r.period === '2024-01');
      const feb2024 = result.find(r => r.period === '2024-02');

      expect(jan2024?.total).toBe(150); // 100 + 50
      expect(jan2024?.recurring).toBe(100);
      expect(feb2024?.total).toBe(75);
      expect(feb2024?.recurring).toBe(75);
    });
  });

  describe('getSubscriptionInsights', () => {
    it('should identify unused subscriptions', async () => {
      const now = new Date();
      const twoMonthsAgo = new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000); // 65 days ago

      const subscriptionsWithTransactions = [
        {
          id: 'sub-1',
          isActive: true,
          amount: { toNumber: () => 15 },
          transactions: [
            { date: twoMonthsAgo, amount: { toNumber: () => 15 } },
          ],
          createdAt: new Date(),
        },
        {
          id: 'sub-2',
          isActive: true,
          amount: { toNumber: () => 20 },
          transactions: [{ date: new Date(), amount: { toNumber: () => 20 } }],
          createdAt: new Date(),
        },
      ];

      mockDb.subscription.findMany.mockResolvedValue(
        subscriptionsWithTransactions
      );

      const caller = analyticsRouter.createCaller(mockContext as any);
      const result = await caller.getSubscriptionInsights();

      expect(result.unusedCount).toBe(1);
      expect(result.insights).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'unused',
            title: 'Unused Subscriptions',
          }),
        ])
      );
    });

    it('should detect price increases', async () => {
      const subscriptionsWithPriceChanges = [
        {
          id: 'sub-1',
          isActive: true,
          amount: { toNumber: () => 20 },
          transactions: [
            { date: new Date(), amount: { toNumber: () => 20 } },
            {
              date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              amount: { toNumber: () => 15 },
            },
          ],
          createdAt: new Date(),
        },
      ];

      mockDb.subscription.findMany.mockResolvedValue(
        subscriptionsWithPriceChanges
      );

      const caller = analyticsRouter.createCaller(mockContext as any);
      const result = await caller.getSubscriptionInsights();

      expect(result.priceIncreaseCount).toBe(1);
      expect(result.insights).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'price_increase',
            title: 'Price Increases Detected',
          }),
        ])
      );
    });

    it('should calculate average subscription age', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      const subscriptionsWithAges = [
        {
          id: 'sub-1',
          name: 'Test Sub 1',
          isActive: true,
          amount: { toNumber: () => 15.99 },
          createdAt: thirtyDaysAgo,
          transactions: [],
        },
        {
          id: 'sub-2',
          name: 'Test Sub 2',
          isActive: true,
          amount: { toNumber: () => 9.99 },
          createdAt: tenDaysAgo,
          transactions: [],
        },
      ];

      mockDb.subscription.findMany.mockResolvedValue(subscriptionsWithAges);

      const caller = analyticsRouter.createCaller(mockContext as any);
      const result = await caller.getSubscriptionInsights();

      // Average of 30 and 10 days = 20 days
      expect(result.averageSubscriptionAge).toBe(20);
    });
  });

  describe('getUpcomingRenewals', () => {
    it('should return upcoming renewals grouped by date', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const upcomingSubscriptions = [
        {
          id: 'sub-1',
          name: 'Netflix',
          amount: { toNumber: () => 15.99 },
          currency: 'USD',
          nextBilling: tomorrow,
          provider: { name: 'Netflix' },
        },
        {
          id: 'sub-2',
          name: 'Spotify',
          amount: { toNumber: () => 9.99 },
          currency: 'USD',
          nextBilling: tomorrow,
          provider: { name: 'Spotify' },
        },
        {
          id: 'sub-3',
          name: 'Adobe',
          amount: { toNumber: () => 52.99 },
          currency: 'USD',
          nextBilling: nextWeek,
          provider: { name: 'Adobe' },
        },
      ];

      mockDb.subscription.findMany.mockResolvedValue(upcomingSubscriptions);

      const caller = analyticsRouter.createCaller(mockContext as any);
      const result = await caller.getUpcomingRenewals({ days: 30 });

      expect(result.totalCount).toBe(3);
      expect(result.totalAmount).toBeCloseTo(78.97, 2);
      expect(result.renewals).toHaveLength(2); // Two different dates

      const tomorrowRenewals = result.renewals.find(
        r => new Date(r.date).toDateString() === tomorrow.toDateString()
      );
      expect(tomorrowRenewals?.subscriptions).toHaveLength(2);
      expect(tomorrowRenewals?.dailyTotal).toBeCloseTo(25.98, 2);
    });

    it('should handle empty renewals', async () => {
      mockDb.subscription.findMany.mockResolvedValue([]);

      const caller = analyticsRouter.createCaller(mockContext as any);
      const result = await caller.getUpcomingRenewals({ days: 30 });

      expect(result.totalCount).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.renewals).toHaveLength(0);
    });
  });

  describe('exportData', () => {
    it('should return CSV format by default', async () => {
      mockDb.subscription.findMany.mockResolvedValue(mockSubscriptions);
      mockDb.transaction.findMany.mockResolvedValue([]);

      const caller = analyticsRouter.createCaller(mockContext as any);
      const result = await caller.exportData({});

      expect(result.subscriptions).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            'Name',
            'Amount',
            'Currency',
            'Frequency',
            'Status',
            'Category',
            'Next Billing',
            'Provider',
          ]),
        ])
      );

      expect(result.exportDate).toBeInstanceOf(Date);
    });

    it('should return JSON format when requested', async () => {
      mockDb.subscription.findMany.mockResolvedValue([mockSubscriptions[0]]);
      mockDb.transaction.findMany.mockResolvedValue([]);

      const caller = analyticsRouter.createCaller(mockContext as any);
      const result = await caller.exportData({ format: 'json' });

      expect(result.subscriptions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            amount: expect.any(Number),
          }),
        ])
      );
    });

    it('should include transactions when requested', async () => {
      mockDb.subscription.findMany.mockResolvedValue([]);
      mockDb.transaction.findMany.mockResolvedValue([
        {
          ...mockTransactions[0],
          bankAccount: {
            name: 'Checking',
            isoCurrencyCode: 'USD',
            plaidItem: { institutionName: 'Chase' },
          },
          description: 'Test transaction',
          category: ['Food'],
        },
      ]);

      const caller = analyticsRouter.createCaller(mockContext as any);
      const result = await caller.exportData({
        includeTransactions: true,
        format: 'csv',
      });

      expect(result.transactions).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            'Date',
            'Description',
            'Amount',
            'Currency',
            'Category',
            'Account',
            'Institution',
          ]),
        ])
      );
    });
  });

  describe('caching', () => {
    it('should cache spending overview results', async () => {
      mockDb.subscription.findMany.mockResolvedValue(mockSubscriptions);
      mockDb.transaction.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 100 } },
      });

      const caller = analyticsRouter.createCaller(mockContext as any);

      // First call
      await caller.getSpendingOverview({ timeRange: 'month' });
      expect(mockDb.subscription.findMany).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await caller.getSpendingOverview({ timeRange: 'month' });
      expect(mockDb.subscription.findMany).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should cache spending trends results', async () => {
      mockDb.transaction.findMany.mockResolvedValue(mockTransactions);

      const caller = analyticsRouter.createCaller(mockContext as any);

      // First call
      await caller.getSpendingTrends({ timeRange: 'month', groupBy: 'day' });
      expect(mockDb.transaction.findMany).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await caller.getSpendingTrends({ timeRange: 'month', groupBy: 'day' });
      expect(mockDb.transaction.findMany).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });
});
