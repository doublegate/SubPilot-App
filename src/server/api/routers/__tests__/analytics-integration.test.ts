// Test file
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import {
  createAuthenticatedCaller,
  createUnauthenticatedCaller,
} from '@/test/trpc-test-helpers';
import { Decimal } from '@prisma/client/runtime/library';
import { createMockSubscription, createMockTransaction, createDecimal } from '@/test/test-utils';
import type { MockSubscription } from '@/test/test-utils';

// Mock database
vi.mock('@/server/db', () => {
  const mockDb = {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    subscription: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    transaction: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: createDecimal(0) } }),
    },
    plaidItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    bankAccount: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      markAsRead: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
  };

  return { db: mockDb };
});

// Import db after mocking
import { db } from '@/server/db';

// Mock Plaid client
vi.mock('@/server/plaid-client', () => ({
  plaid: vi.fn(() => null),
  plaidWithRetry: vi
    .fn()
    .mockImplementation(async (operation: () => Promise<unknown>) =>
      operation()
    ),
  isPlaidConfigured: vi.fn(() => false),
  verifyPlaidWebhook: vi.fn().mockResolvedValue(true),
  handlePlaidError: vi.fn((error: unknown) =>
    console.error('Plaid error:', error)
  ),
}));

describe('Analytics Router Integration Tests', () => {
  const testUserId = 'test-analytics-user';
  let caller: ReturnType<typeof createAuthenticatedCaller>;

  beforeEach(async () => {
    // Create authenticated caller
    caller = createAuthenticatedCaller({
      user: {
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User',
        image: null,
      },
    });

    // Clear all mocks before each test and reset mock implementations
    vi.clearAllMocks();

    // Reset default mock implementations
    const mockedSubscriptionFindMany = vi.mocked(db.subscription.findMany);
    const mockedTransactionFindMany = vi.mocked(db.transaction.findMany);
    const mockedTransactionAggregate = vi.mocked(db.transaction.aggregate);

    mockedSubscriptionFindMany.mockResolvedValue([]);
    mockedTransactionFindMany.mockResolvedValue([]);
    mockedTransactionAggregate.mockResolvedValue({
      _sum: { amount: null },
      _count: {},
      _avg: {},
      _min: {},
      _max: {},
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe('getSpendingOverview', () => {
    it('should return overview with correct calculations', async () => {
      // Mock subscriptions
      const mockSubscriptions = [
        {
          id: '1',
          userId: testUserId,
          name: 'Netflix',
          amount: createDecimal(15.99),
          currency: 'USD',
          frequency: 'monthly',
          category: 'Entertainment',
          status: 'active',
          isActive: true,
          description: null,
          notes: null,
          nextBilling: null,
          lastBilling: null,
          provider: {},
          cancellationInfo: {},
          detectionConfidence: createDecimal(0.9),
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          userId: testUserId,
          name: 'Spotify',
          amount: createDecimal(9.99),
          currency: 'USD',
          frequency: 'monthly',
          category: 'Music',
          status: 'active',
          isActive: true,
          description: null,
          notes: null,
          nextBilling: null,
          lastBilling: null,
          provider: {},
          cancellationInfo: {},
          detectionConfidence: createDecimal(0.9),
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockedSubscriptionFindMany = vi.mocked(db.subscription.findMany);
      const mockedTransactionAggregate = vi.mocked(db.transaction.aggregate);

      mockedSubscriptionFindMany.mockResolvedValueOnce(mockSubscriptions);

      const aggregateResult = {
        _sum: { amount: createDecimal(500) },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      };
      mockedTransactionAggregate.mockResolvedValueOnce(aggregateResult);

      const result = await caller.analytics.getSpendingOverview({});

      expect(result).toBeDefined();
      expect(result.subscriptionSpending.monthly).toBe(25.98);
      expect(result.subscriptionSpending.yearly).toBe(311.76);
      expect(result.totalSpending.period).toBe(500);
      expect(result.totalSpending.monthlyAverage).toBeCloseTo(483.87, 1);
    });

    it.skip('should handle no subscriptions gracefully', async () => {
      const mockedSubscriptionFindMany = vi.mocked(db.subscription.findMany);
      const mockedTransactionAggregate = vi.mocked(db.transaction.aggregate);

      mockedSubscriptionFindMany.mockResolvedValueOnce([]);
      mockedTransactionAggregate.mockResolvedValueOnce({
        _sum: { amount: null },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      });

      const result = await caller.analytics.getSpendingOverview({});

      expect(result.subscriptionSpending.monthly).toBe(0);
      expect(result.subscriptionSpending.yearly).toBe(0);
      expect(result.totalSpending.period).toBe(0);
      expect(result.totalSpending.monthlyAverage).toBe(0);
    });

    it.skip('should handle yearly subscriptions correctly', async () => {
      const mockSubscriptions = [
        createMockSubscription({
          id: '1',
          userId: testUserId,
          name: 'Annual Service',
          amount: createDecimal(120),
          frequency: 'yearly',
          category: 'Services',
          isActive: true,
        }),
        createMockSubscription({
          id: '2',
          userId: testUserId,
          name: 'Monthly Service',
          amount: createDecimal(10),
          frequency: 'monthly',
          category: 'Services',
          isActive: true,
        }),
      ];

      const mockedSubscriptionFindMany = vi.mocked(db.subscription.findMany);
      const mockedTransactionAggregate = vi.mocked(db.transaction.aggregate);

      mockedSubscriptionFindMany.mockResolvedValueOnce(mockSubscriptions);
      mockedTransactionAggregate.mockResolvedValueOnce({
        _sum: { amount: createDecimal(20) },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      });

      const result = await caller.analytics.getSpendingOverview({});

      // Yearly: 120/12 = 10 per month, Monthly: 10 per month, Total: 20 per month
      expect(result.subscriptionSpending.monthly).toBe(20);
      // Monthly to yearly: 20 * 12 = 240
      expect(result.subscriptionSpending.yearly).toBe(240);
    });

    it.skip('should handle quarterly subscriptions', async () => {
      const mockSubscriptions = [
        createMockSubscription({
          id: '1',
          userId: testUserId,
          name: 'Quarterly Service',
          amount: createDecimal(30),
          frequency: 'quarterly',
          category: 'Services',
          isActive: true,
        }),
      ];

      const mockedSubscriptionFindMany = vi.mocked(db.subscription.findMany);
      const mockedTransactionAggregate = vi.mocked(db.transaction.aggregate);

      mockedSubscriptionFindMany.mockResolvedValueOnce(mockSubscriptions);
      mockedTransactionAggregate.mockResolvedValueOnce({
        _sum: { amount: null },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      });

      const result = await caller.analytics.getSpendingOverview({});

      // Quarterly: 30/3 = 10 per month
      expect(result.subscriptionSpending.monthly).toBe(10);
      // Quarterly to yearly: 10 * 12 = 120
      expect(result.subscriptionSpending.yearly).toBe(120);
    });

    it.skip('should handle weekly subscriptions', async () => {
      const mockSubscriptions = [
        createMockSubscription({
          id: '1',
          userId: testUserId,
          name: 'Weekly Service',
          amount: createDecimal(5),
          frequency: 'weekly',
          category: 'Services',
          isActive: true,
        }),
      ];

      const mockedSubscriptionFindMany = vi.mocked(db.subscription.findMany);
      const mockedTransactionAggregate = vi.mocked(db.transaction.aggregate);

      mockedSubscriptionFindMany.mockResolvedValueOnce(mockSubscriptions);
      mockedTransactionAggregate.mockResolvedValueOnce({
        _sum: { amount: null },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      });

      const result = await caller.analytics.getSpendingOverview({});

      // Weekly: 5 * 4.33 = 21.65 per month (using router's calculation)
      expect(result.subscriptionSpending.monthly).toBeCloseTo(21.65, 1);
      // Weekly to yearly: 21.65 * 12 = 259.8
      expect(result.subscriptionSpending.yearly).toBeCloseTo(259.8, 1);
    });

    it('should require authentication', async () => {
      const unauthenticatedCaller = createUnauthenticatedCaller();

      await expect(
        unauthenticatedCaller.analytics.getSpendingOverview({})
      ).rejects.toThrow(TRPCError);
    });

    it.skip('should handle errors gracefully', async () => {
      const mockedSubscriptionFindMany = vi.mocked(db.subscription.findMany);
      mockedSubscriptionFindMany.mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(caller.analytics.getSpendingOverview({})).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getSpendingTrends', () => {
    it('should return spending trends for the last 6 months', async () => {
      const mockTransactions = [
        createMockTransaction({
          id: '1',
          userId: testUserId,
          amount: createDecimal(-50),
          date: new Date('2024-01-15'),
          merchantName: 'Netflix',
          isSubscription: true,
        }),
        createMockTransaction({
          id: '2',
          userId: testUserId,
          amount: createDecimal(-30),
          date: new Date('2024-01-20'),
          merchantName: 'Spotify',
          isSubscription: true,
        }),
        createMockTransaction({
          id: '3',
          userId: testUserId,
          amount: createDecimal(-100),
          date: new Date('2024-02-10'),
          merchantName: 'Random Purchase',
          isSubscription: false,
        }),
      ];

      const mockedTransactionFindMany = vi.mocked(db.transaction.findMany);
      mockedTransactionFindMany.mockResolvedValueOnce(mockTransactions);

      const result = await caller.analytics.getSpendingTrends({
        timeRange: 'month',
        groupBy: 'month',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle weekly period', async () => {
      const mockTransactions = Array.from({ length: 28 }, (_, i) => ({
        id: `trans-${i}`,
        userId: testUserId,
        amount: createDecimal(-10 - i),
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        merchantName: `Merchant ${i}`,
        isSubscription: i % 2 === 0,
      }));

      const mockedTransactionFindMany = vi.mocked(db.transaction.findMany);
      mockedTransactionFindMany.mockResolvedValueOnce(mockTransactions);

      const result = await caller.analytics.getSpendingTrends({
        timeRange: 'week',
        groupBy: 'week',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle yearly period', async () => {
      const mockTransactions = Array.from({ length: 365 }, (_, i) => ({
        id: `trans-${i}`,
        userId: testUserId,
        amount: createDecimal(-Math.random() * 100),
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        merchantName: `Merchant ${i}`,
        isSubscription: Math.random() > 0.5,
      }));

      const mockedTransactionFindMany = vi.mocked(db.transaction.findMany);
      mockedTransactionFindMany.mockResolvedValueOnce(mockTransactions);

      const result = await caller.analytics.getSpendingTrends({
        timeRange: 'year',
        groupBy: 'month',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle no transactions', async () => {
      const mockedTransactionFindMany = vi.mocked(db.transaction.findMany);
      mockedTransactionFindMany.mockResolvedValueOnce([]);

      const result = await caller.analytics.getSpendingTrends({
        timeRange: 'month',
        groupBy: 'month',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCategoryBreakdown (via getSpendingOverview)', () => {
    it.skip('should return category breakdown from spending overview', async () => {
      const mockSubscriptions = [
        {
          id: '1',
          userId: testUserId,
          name: 'Netflix',
          amount: createDecimal(15.99),
          frequency: 'monthly',
          category: 'Entertainment',
          isActive: true,
        },
        {
          id: '2',
          userId: testUserId,
          name: 'Spotify',
          amount: createDecimal(9.99),
          frequency: 'monthly',
          category: 'Entertainment',
          isActive: true,
        },
        {
          id: '3',
          userId: testUserId,
          name: 'Dropbox',
          amount: createDecimal(12.99),
          frequency: 'monthly',
          category: 'Software',
          isActive: true,
        },
      ];

      const mockedSubscriptionFindMany = vi.mocked(db.subscription.findMany);
      const mockedTransactionAggregate = vi.mocked(db.transaction.aggregate);

      mockedSubscriptionFindMany.mockResolvedValueOnce(mockSubscriptions);
      mockedTransactionAggregate.mockResolvedValueOnce({
        _sum: { amount: createDecimal(100) },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      });

      const result = await caller.analytics.getSpendingOverview({});

      expect(result.categoryBreakdown).toBeDefined();
      expect(Array.isArray(result.categoryBreakdown)).toBe(true);
      expect(result.categoryBreakdown.length).toBe(2);

      const entertainment = result.categoryBreakdown.find(
        c => c.category === 'Entertainment'
      );
      const software = result.categoryBreakdown.find(
        c => c.category === 'Software'
      );

      expect(entertainment).toBeDefined();
      expect(entertainment?.amount).toBe(25.98);
      expect(entertainment?.percentage).toBe(67); // 25.98/38.97 * 100

      expect(software).toBeDefined();
      expect(software?.amount).toBe(12.99);
      expect(software?.percentage).toBe(33); // 12.99/38.97 * 100
    });

    it.skip('should handle empty categories', async () => {
      const mockedSubscriptionFindMany = vi.mocked(db.subscription.findMany);
      const mockedTransactionAggregate = vi.mocked(db.transaction.aggregate);

      mockedSubscriptionFindMany.mockResolvedValueOnce([]);
      mockedTransactionAggregate.mockResolvedValueOnce({
        _sum: { amount: null },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      });

      const result = await caller.analytics.getSpendingOverview({});

      expect(result.categoryBreakdown).toBeDefined();
      expect(Array.isArray(result.categoryBreakdown)).toBe(true);
      expect(result.categoryBreakdown.length).toBe(0);
    });

    it.skip('should sort categories by spending', async () => {
      const mockSubscriptions = [
        {
          id: '1',
          userId: testUserId,
          name: 'Small Service',
          amount: createDecimal(5),
          frequency: 'monthly',
          category: 'Small',
          isActive: true,
        },
        {
          id: '2',
          userId: testUserId,
          name: 'Large Service',
          amount: createDecimal(50),
          frequency: 'monthly',
          category: 'Large',
          isActive: true,
        },
        {
          id: '3',
          userId: testUserId,
          name: 'Medium Service',
          amount: createDecimal(25),
          frequency: 'monthly',
          category: 'Medium',
          isActive: true,
        },
      ];

      const mockedSubscriptionFindMany = vi.mocked(db.subscription.findMany);
      const mockedTransactionAggregate = vi.mocked(db.transaction.aggregate);

      mockedSubscriptionFindMany.mockResolvedValueOnce(mockSubscriptions);
      mockedTransactionAggregate.mockResolvedValueOnce({
        _sum: { amount: createDecimal(100) },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      });

      const result = await caller.analytics.getSpendingOverview({});

      expect(result.categoryBreakdown[0]?.category).toBe('Large');
      expect(result.categoryBreakdown[1]?.category).toBe('Medium');
      expect(result.categoryBreakdown[2]?.category).toBe('Small');
    });
  });

  describe('getUpcomingRenewals', () => {
    it.skip('should return upcoming renewals within 30 days', async () => {
      const today = new Date();
      const in5Days = new Date(today);
      in5Days.setDate(today.getDate() + 5);
      const in15Days = new Date(today);
      in15Days.setDate(today.getDate() + 15);
      const in45Days = new Date(today);
      in45Days.setDate(today.getDate() + 45);

      const mockSubscriptions = [
        {
          id: '1',
          userId: testUserId,
          name: 'Netflix',
          amount: createDecimal(15.99),
          currency: 'USD',
          frequency: 'monthly',
          isActive: true,
          nextBilling: in5Days,
          provider: { name: 'Netflix' },
        },
        {
          id: '2',
          userId: testUserId,
          name: 'Spotify',
          amount: createDecimal(9.99),
          currency: 'USD',
          frequency: 'monthly',
          isActive: true,
          nextBilling: in15Days,
          provider: { name: 'Spotify' },
        },
        {
          id: '3',
          userId: testUserId,
          name: 'Future Service',
          amount: createDecimal(20),
          currency: 'USD',
          frequency: 'monthly',
          isActive: true,
          nextBilling: in45Days,
          provider: { name: 'Future' },
        },
      ];

      const mockedSubscriptionFindMany = vi.mocked(db.subscription.findMany);
      mockedSubscriptionFindMany.mockResolvedValueOnce(
        mockSubscriptions.slice(0, 2) as MockSubscription[] // Only first 2 within 30 days
      );

      const result = await caller.analytics.getUpcomingRenewals({});

      expect(result).toBeDefined();
      expect(result.totalCount).toBe(2);
      expect(result.totalAmount).toBeCloseTo(25.98, 2);
      expect(result.renewals).toBeDefined();
      expect(Array.isArray(result.renewals)).toBe(true);
    });

    it.skip('should handle custom days parameter', async () => {
      const today = new Date();
      const in3Days = new Date(today);
      in3Days.setDate(today.getDate() + 3);
      const in7Days = new Date(today);
      in7Days.setDate(today.getDate() + 7);

      const mockSubscriptions = [
        {
          id: '1',
          userId: testUserId,
          name: 'Service 1',
          amount: createDecimal(10),
          currency: 'USD',
          frequency: 'monthly',
          isActive: true,
          nextBilling: in3Days,
          provider: { name: 'Service1' },
        },
      ];

      const mockedSubscriptionFindMany = vi.mocked(db.subscription.findMany);
      mockedSubscriptionFindMany.mockResolvedValueOnce(mockSubscriptions);

      const result = await caller.analytics.getUpcomingRenewals({ days: 5 });

      expect(result.totalCount).toBe(1);
      expect(result.totalAmount).toBe(10);
      expect(result.renewals).toBeDefined();
    });

    it.skip('should handle no upcoming renewals', async () => {
      const mockedSubscriptionFindMany = vi.mocked(db.subscription.findMany);
      mockedSubscriptionFindMany.mockResolvedValueOnce([]);

      const result = await caller.analytics.getUpcomingRenewals({});

      expect(result).toBeDefined();
      expect(result.totalCount).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(Array.isArray(result.renewals)).toBe(true);
      expect(result.renewals.length).toBe(0);
    });
  });
});
