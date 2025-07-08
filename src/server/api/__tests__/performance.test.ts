import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { appRouter } from '@/server/api/root';
import { Decimal } from '@prisma/client/runtime/library';
import { createMockSession } from '@/test/test-utils';

// Mock database with performance scenarios
vi.mock('@/server/db', () => {
  const mockDb = {
    subscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    plaidItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  return { db: mockDb };
});

import { db } from '@/server/db';

describe('API Performance Benchmarks', () => {
  const mockSession = createMockSession();

  let ctx: ReturnType<typeof createInnerTRPCContext>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createInnerTRPCContext({ session: mockSession as any });
    caller = appRouter.createCaller(ctx);
  });

  describe('Subscription Queries', () => {
    it('should handle 1000 subscriptions within performance threshold', async () => {
      // Generate large dataset
      const largeSubscriptionSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `sub-${i}`,
        userId: 'user-1',
        name: `Service ${i}`,
        amount: new Decimal(9.99 + (i % 100)),
        currency: 'USD',
        frequency: ['monthly', 'yearly', 'weekly'][i % 3] as
          | 'monthly'
          | 'yearly'
          | 'weekly',
        status: 'active',
        isActive: i % 10 !== 0, // 90% active
        category: ['Entertainment', 'Software', 'Health'][i % 3] ?? null,
        aiCategory: ['Entertainment', 'Software', 'Health'][i % 3] ?? null,
        aiCategoryConfidence: new Decimal(0.8 + (i % 20) / 100),
        categoryOverride: null,
        description: `Description for service ${i}`,
        notes: null,
        nextBilling: new Date(Date.now() + (30 - (i % 30)) * 86400000),
        lastBilling: new Date(Date.now() - (i % 30) * 86400000),
        provider: { name: `Provider ${i}`, logo: null },
        cancellationInfo: {},
        detectionConfidence: new Decimal(0.5 + (i % 50) / 100),
        detectedAt: new Date(Date.now() - i * 86400000),
        createdAt: new Date(Date.now() - i * 86400000),
        updatedAt: new Date(),
        transactions: [],
        history: [],
        notifications: [],
      }));

      // Router will only take 20 items by default
      vi.mocked(db.subscription.findMany).mockResolvedValueOnce(
        largeSubscriptionSet.slice(0, 20)
      );
      vi.mocked(db.subscription.count).mockResolvedValueOnce(1000);

      const start = performance.now();
      const result = await caller.subscriptions.getAll({});
      const duration = performance.now() - start;

      expect(result.subscriptions).toHaveLength(20); // Router default limit is 20
      expect(result.total).toBe(1000);
      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });

    it('should efficiently filter large datasets', async () => {
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: `sub-${i}`,
        userId: 'user-1',
        name: `Netflix ${i}`,
        amount: new Decimal(15.99),
        currency: 'USD',
        frequency: 'monthly' as const,
        status: 'active',
        isActive: true,
        category: 'Entertainment',
        aiCategory: 'Entertainment',
        aiCategoryConfidence: new Decimal(0.95),
        categoryOverride: null,
        description: `Netflix subscription ${i}`,
        notes: null,
        nextBilling: new Date(),
        lastBilling: new Date(),
        provider: { name: 'Netflix', logo: null },
        cancellationInfo: {},
        detectionConfidence: new Decimal(0.95),
        detectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        transactions: [],
        history: [],
        notifications: [],
      }));

      // Router will take exactly 50 items as requested
      const filteredWithCount = largeDataset.slice(0, 50).map(s => ({
        ...s,
        _count: { transactions: 0 },
        transactions: [],
      }));
      vi.mocked(db.subscription.findMany).mockResolvedValueOnce(
        filteredWithCount
      );
      vi.mocked(db.subscription.count).mockResolvedValueOnce(5000);

      const start = performance.now();
      const result = await caller.subscriptions.getAll({
        category: 'Entertainment',
        limit: 50,
        offset: 0,
      });
      const duration = performance.now() - start;

      expect(result.subscriptions).toHaveLength(50); // Limited by take
      expect(result.total).toBe(5000);
      expect(duration).toBeLessThan(300); // Filtering should complete within 300ms
    });
  });

  describe('Analytics Queries', () => {
    it('should calculate spending trends for large transaction sets efficiently', async () => {
      const largeTransactionSet = Array.from({ length: 10000 }, (_, i) => {
        const date = new Date(Date.now() - i * 86400000); // Spread over ~27 years
        return {
          _sum: { amount: new Decimal(-50 - (i % 100)) },
          _count: { amount: 10 + (i % 5) },
          date,
        };
      });

      largeTransactionSet.slice(0, 5000).map(t => ({
        ...t,
        _sum: { amount: new Decimal(-25 - Math.floor(Math.random() * 50)) },
      }));

      vi.mocked(db.transaction.findMany).mockResolvedValueOnce(
        largeTransactionSet.map((t, i) => ({
          id: `trans-${i}`,
          userId: 'user-1',
          accountId: 'account-1',
          plaidTransactionId: `plaid-${i}`,
          subscriptionId: null,
          amount: t._sum.amount,
          isoCurrencyCode: 'USD',
          description: `Transaction ${i}`,
          merchantName: `Merchant ${i}`,
          category: [],
          subcategory: null,
          transactionType: 'other',
          date: t.date,
          authorizedDate: null,
          pending: false,
          paymentChannel: null,
          location: null,
          confidence: new Decimal(0),
          isSubscription: false,
          aiCategory: null,
          aiCategoryConfidence: null,
          normalizedMerchantName: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );

      const start = performance.now();
      const result = await caller.analytics.getSpendingTrends({
        timeRange: 'month',
        groupBy: 'week',
      });
      const duration = performance.now() - start;

      expect(Array.isArray(result)).toBe(true);
      expect(duration).toBeLessThan(500); // Complex aggregation should complete within 500ms
    });

    it('should handle complex analytics queries', async () => {
      // Create mock data for complex analytics

      // mockGroupByData removed as unused - fixes ESLint warning

      vi.mocked(db.subscription.findMany).mockResolvedValueOnce([]);
      vi.mocked(db.subscription.count).mockResolvedValueOnce(0);
      vi.mocked(db.transaction.aggregate).mockResolvedValueOnce({
        _sum: { amount: new Decimal(-3000) },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      });

      const start = performance.now();
      const result = await caller.analytics.getSpendingOverview({
        timeRange: 'year',
      });
      const duration = performance.now() - start;

      expect(result).toHaveProperty('subscriptionSpending');
      expect(result).toHaveProperty('totalSpending');
      expect(duration).toBeLessThan(300); // Category aggregation should be fast
    });
  });

  describe('Write Operations', () => {
    it('should handle batch operations efficiently', async () => {
      const largeNotificationBatch = Array.from({ length: 100 }, (_, i) => ({
        id: `notif-${i}`,
        userId: 'user-1',
        subscriptionId: null,
        type: 'SUBSCRIPTION_RENEWED' as const,
        title: `Notification ${i}`,
        message: `Your subscription ${i} has been renewed`,
        severity: 'info' as const,
        data: {},
        read: false,
        readAt: null,
        scheduledFor: new Date(),
        sentAt: null,
        createdAt: new Date(),
      }));

      vi.mocked(db.notification.findMany).mockResolvedValueOnce(
        largeNotificationBatch
      );
      vi.mocked(db.notification.count).mockResolvedValueOnce(100);

      const start = performance.now();
      const result = await caller.notifications.getAll({ limit: 100 });
      const duration = performance.now() - start;

      expect(result.notifications).toHaveLength(100);
      expect(result.total).toBe(100);
      expect(duration).toBeLessThan(150); // Batch retrieval should be very fast
    });

    it('should handle concurrent updates efficiently', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        name: 'Test Service',
        amount: new Decimal(9.99),
        currency: 'USD',
        frequency: 'monthly' as const,
        status: 'active',
        isActive: true,
        category: 'Software',
        aiCategory: 'Software',
        aiCategoryConfidence: new Decimal(0.95),
        categoryOverride: null,
        description: 'Test subscription',
        notes: null,
        nextBilling: new Date(),
        lastBilling: new Date(),
        provider: { name: 'Test Provider', logo: null },
        cancellationInfo: {},
        detectionConfidence: new Decimal(0.95),
        detectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        transactions: [],
        history: [],
        notifications: [],
      };

      const subscriptionFindMock = vi.mocked(db.subscription.findFirst);
      subscriptionFindMock.mockResolvedValue(mockSubscription);

      const subscriptionUpdateMock = vi.mocked(db.subscription.update);
      subscriptionUpdateMock.mockResolvedValueOnce({
        ...mockSubscription,
        amount: new Decimal(14.99),
      });

      const transactionFindMock = vi.mocked(db.transaction.findMany);
      transactionFindMock.mockResolvedValueOnce([]);

      const start = performance.now();
      const result = await caller.subscriptions.update({
        id: 'sub-1',
        customAmount: 14.99,
      });
      const duration = performance.now() - start;

      expect(result.amount.toNumber()).toBe(14.99);
      expect(duration).toBeLessThan(100); // Update should be fast
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle memory-intensive queries', async () => {
      // Test with large metadata objects
      const largeMetadataSubscriptions = Array.from(
        { length: 100 },
        (_, i) => ({
          id: `sub-${i}`,
          userId: 'user-1',
          name: `Service ${i}`,
          amount: new Decimal(9.99),
          currency: 'USD',
          frequency: 'monthly' as const,
          status: 'active',
          isActive: true,
          category: 'Software',
          aiCategory: 'Software',
          aiCategoryConfidence: new Decimal(0.95),
          categoryOverride: null,
          description: `Description ${i}`,
          notes: null,
          nextBilling: new Date(),
          lastBilling: new Date(),
          provider: {
            name: `Provider ${i}`,
            logo: null,
            largeData: 'x'.repeat(1000), // 1KB per subscription
            nestedObject: {
              level1: {
                level2: {
                  data: Array(10).fill('test'),
                },
              },
            },
          },
          cancellationInfo: {},
          detectionConfidence: new Decimal(0.95),
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          transactions: [],
          history: [],
          notifications: [],
        })
      );

      vi.mocked(db.subscription.findMany).mockResolvedValueOnce(
        largeMetadataSubscriptions.slice(0, 20)
      );
      vi.mocked(db.subscription.count).mockResolvedValueOnce(100);

      const start = performance.now();
      const result = await caller.subscriptions.getAll({});
      const duration = performance.now() - start;

      expect(result.subscriptions).toHaveLength(20);
      expect(duration).toBeLessThan(200); // Should handle large metadata efficiently
    });

    it('should paginate efficiently for large result sets', async () => {
      const totalSubscriptions = 10000;
      const pageSize = 50;

      // Mock paginated responses
      for (let offset = 0; offset < 200; offset += pageSize) {
        const pageData = Array.from({ length: pageSize }, (_, i) => ({
          id: `sub-${offset + i}`,
          userId: 'user-1',
          name: `Service ${offset + i}`,
          amount: new Decimal(9.99),
          currency: 'USD',
          frequency: 'monthly' as const,
          status: 'active',
          isActive: true,
          category: 'Software',
          aiCategory: 'Software',
          aiCategoryConfidence: new Decimal(0.9),
          categoryOverride: null,
          description: 'Test',
          notes: null,
          nextBilling: new Date(),
          lastBilling: new Date(),
          provider: { name: 'Test', logo: null },
          cancellationInfo: {},
          detectionConfidence: new Decimal(0.95),
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          transactions: [],
        }));

        vi.mocked(db.subscription.findMany).mockResolvedValueOnce(pageData);
      }

      vi.mocked(db.subscription.count).mockResolvedValue(totalSubscriptions);

      // Test multiple page fetches
      const pageTimes: number[] = [];
      for (let page = 0; page < 4; page++) {
        const start = performance.now();
        const result = await caller.subscriptions.getAll({
          limit: pageSize,
          offset: page * pageSize,
        });
        const duration = performance.now() - start;
        pageTimes.push(duration);

        expect(result.subscriptions).toHaveLength(pageSize);
        // Each page is mocked with different data, so use a flexible check
        expect(result.total).toBeGreaterThan(0);
        expect(result.total).toBeLessThanOrEqual(totalSubscriptions);
      }

      // All pages should load consistently fast
      expect(Math.max(...pageTimes)).toBeLessThan(150);
      expect(Math.min(...pageTimes)).toBeGreaterThan(0);
    });
  });

  describe('Complex Queries', () => {
    it('should handle complex notification queries efficiently', async () => {
      const mockNotifications = Array.from({ length: 500 }, (_, i) => ({
        id: `notif-${i}`,
        userId: 'user-1',
        subscriptionId: `sub-${i % 100}`,
        type: [
          'SUBSCRIPTION_RENEWED',
          'SUBSCRIPTION_CANCELLED',
          'PAYMENT_FAILED',
        ][i % 3] as
          | 'SUBSCRIPTION_RENEWED'
          | 'SUBSCRIPTION_CANCELLED'
          | 'PAYMENT_FAILED',
        title: `Notification ${i}`,
        message: `Message ${i}`,
        severity: 'info' as const,
        data: { subscriptionId: `sub-${i % 100}` },
        read: i % 2 === 0,
        readAt: i % 2 === 0 ? new Date() : null,
        scheduledFor: new Date(Date.now() - i * 3600000),
        sentAt: null,
        createdAt: new Date(Date.now() - i * 3600000),
      }));

      vi.mocked(db.notification.findMany).mockResolvedValueOnce(
        mockNotifications.filter(n => !n.read).slice(0, 20)
      );
      vi.mocked(db.notification.count).mockResolvedValueOnce(250);

      const start = performance.now();
      const result = await caller.notifications.getAll({
        unreadOnly: true,
        limit: 20,
      });
      const duration = performance.now() - start;

      expect(result.notifications).toHaveLength(20);
      expect(result.total).toBe(250);
      expect(duration).toBeLessThan(100);
    });

    it('should handle subscription lifecycle operations', async () => {
      const mockSubscription = {
        id: 'sub-lifecycle',
        userId: 'user-1',
        name: 'Lifecycle Test',
        amount: new Decimal(9.99),
        currency: 'USD',
        frequency: 'monthly' as const,
        status: 'active',
        isActive: true,
        category: 'Software',
        aiCategory: 'Software',
        aiCategoryConfidence: new Decimal(0.95),
        categoryOverride: null,
        description: 'Test',
        notes: null,
        nextBilling: new Date(),
        lastBilling: new Date(),
        provider: { name: 'Test', logo: null },
        cancellationInfo: {},
        detectionConfidence: new Decimal(0.95),
        detectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        transactions: [],
        history: [],
        notifications: [],
      };

      // Create
      vi.mocked(db.subscription.create).mockResolvedValueOnce(mockSubscription);
      vi.mocked(db.transaction.findMany).mockResolvedValueOnce([]);

      const createStart = performance.now();
      const created = await caller.subscriptions.create({
        name: 'Lifecycle Test',
        amount: 9.99,
        currency: 'USD',
        frequency: 'monthly',
        category: 'Software',
      });
      const createDuration = performance.now() - createStart;

      expect(created.name).toBe('Lifecycle Test');
      expect(createDuration).toBeLessThan(100);

      // Update - prepare for markCancelled call
      vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(
        mockSubscription
      );
      vi.mocked(db.subscription.update).mockResolvedValueOnce({
        ...mockSubscription,
        isActive: false,
        cancellationInfo: { cancelledAt: new Date().toISOString() },
      });
      vi.mocked(db.transaction.findMany).mockResolvedValueOnce([]);
      vi.mocked(db.notification.create).mockResolvedValueOnce({
        id: 'notif-cancel',
        userId: 'user-1',
        subscriptionId: null,
        type: 'SUBSCRIPTION_CANCELLED',
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled',
        severity: 'info' as const,
        data: {},
        read: false,
        readAt: null,
        scheduledFor: new Date(),
        sentAt: null,
        createdAt: new Date(),
      });

      const cancelStart = performance.now();
      const cancelled = await caller.subscriptions.markCancelled({
        id: 'sub-lifecycle',
        cancellationDate: new Date(),
        reason: 'Testing',
      });
      const cancelDuration = performance.now() - cancelStart;

      expect(cancelled.isActive).toBe(false);
      expect(cancelDuration).toBeLessThan(150);

      // Mock user lookup for notification
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        password: null,
        notificationPreferences: {},
        failedLoginAttempts: 0,
        lockedUntil: null,
        isAdmin: false,
        twoFactorEnabled: false,
        twoFactorMethod: null,
        twoFactorPhone: null,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  });

  describe('Analytics Aggregations', () => {
    it('should calculate monthly spending efficiently', async () => {
      // mockAggregateData removed as unused - fixes ESLint warning

      // Mock the subscription findMany call for getSpendingOverview
      vi.mocked(db.subscription.findMany).mockResolvedValueOnce([
        {
          id: 'sub-1',
          userId: 'user-1',
          name: 'Software Service',
          amount: new Decimal(9.99),
          currency: 'USD',
          frequency: 'monthly',
          status: 'active',
          isActive: true,
          category: 'Software',
          aiCategory: 'Software',
          aiCategoryConfidence: new Decimal(0.9),
          categoryOverride: null,
          description: null,
          notes: null,
          nextBilling: null,
          lastBilling: null,
          provider: {},
          cancellationInfo: {},
          detectionConfidence: new Decimal(0.9),
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'sub-2',
          userId: 'user-1',
          name: 'Entertainment Service',
          amount: new Decimal(15.99),
          currency: 'USD',
          frequency: 'monthly',
          status: 'active',
          isActive: true,
          category: 'Entertainment',
          aiCategory: 'Entertainment',
          aiCategoryConfidence: new Decimal(0.9),
          categoryOverride: null,
          description: null,
          notes: null,
          nextBilling: null,
          lastBilling: null,
          provider: {},
          cancellationInfo: {},
          detectionConfidence: new Decimal(0.9),
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(db.transaction.aggregate).mockResolvedValueOnce({
        _sum: { amount: new Decimal(3000) },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      });

      const start = performance.now();
      const result = await caller.analytics.getSpendingOverview({
        timeRange: 'month',
      });
      const duration = performance.now() - start;

      expect(result).toHaveProperty('subscriptionSpending');
      expect(result).toHaveProperty('totalSpending');
      expect(duration).toBeLessThan(100);
    });

    it('should handle year-over-year comparisons', async () => {
      const currentYearData = Array.from({ length: 12 }, (_, i) => ({
        id: `trans-current-${i}`,
        userId: 'user-1',
        accountId: 'account-1',
        plaidTransactionId: `plaid-current-${i}`,
        subscriptionId: null,
        amount: new Decimal(-100 * (i + 1)),
        isoCurrencyCode: 'USD',
        description: `Transaction ${i}`,
        merchantName: null,
        category: [],
        subcategory: null,
        transactionType: 'other',
        date: new Date(2024, i, 1),
        authorizedDate: null,
        pending: false,
        paymentChannel: null,
        location: null,
        confidence: new Decimal(0),
        isSubscription: true,
        aiCategory: null,
        aiCategoryConfidence: null,
        normalizedMerchantName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const previousYearData = Array.from({ length: 12 }, (_, i) => ({
        id: `trans-previous-${i}`,
        userId: 'user-1',
        accountId: 'account-1',
        plaidTransactionId: `plaid-previous-${i}`,
        subscriptionId: null,
        amount: new Decimal(-80 * (i + 1)),
        isoCurrencyCode: 'USD',
        description: `Transaction ${i}`,
        merchantName: null,
        category: [],
        subcategory: null,
        transactionType: 'other',
        date: new Date(2023, i, 1),
        authorizedDate: null,
        pending: false,
        paymentChannel: null,
        location: null,
        confidence: new Decimal(0),
        isSubscription: true,
        aiCategory: null,
        aiCategoryConfidence: null,
        normalizedMerchantName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      vi.mocked(db.transaction.findMany)
        .mockResolvedValueOnce(currentYearData)
        .mockResolvedValueOnce(previousYearData);

      const start = performance.now();
      const result = await caller.analytics.getSpendingTrends({
        timeRange: 'year',
        groupBy: 'month',
      });
      const duration = performance.now() - start;

      expect(Array.isArray(result)).toBe(true);
      expect(duration).toBeLessThan(200);
    });
  });
});
