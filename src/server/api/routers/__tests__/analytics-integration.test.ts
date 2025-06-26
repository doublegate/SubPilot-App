/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import {
  createAuthenticatedCaller,
  createUnauthenticatedCaller,
  createTestUser,
  createTestSubscription,
  createTestTransaction,
  cleanupTestData,
} from '@/test/trpc-test-helpers';
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
    // Create test user
    await createTestUser({ id: testUserId });

    // Create authenticated caller
    caller = createAuthenticatedCaller({
      user: {
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User',
        image: null,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData(testUserId);
    vi.clearAllMocks();
  });

  describe('getSpendingOverview', () => {
    it('should return overview with correct calculations', async () => {
      // Create test subscriptions
      await createTestSubscription(testUserId, {
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        category: 'Entertainment',
        status: 'active',
      });

      await createTestSubscription(testUserId, {
        name: 'Spotify',
        amount: 9.99,
        frequency: 'monthly',
        category: 'Music',
        status: 'active',
      });

      await createTestSubscription(testUserId, {
        name: 'Adobe',
        amount: 99.99,
        frequency: 'yearly',
        category: 'Software',
        status: 'cancelled',
      });

      const result = await caller.analytics.getSpendingOverview({});

      expect(result).toBeDefined();
      const typedResult = result as {
        subscriptionSpending?: { monthly?: number; yearly?: number };
        categoryBreakdown?: unknown[];
      };
      expect(typedResult.subscriptionSpending).toBeDefined();
      expect(typedResult.subscriptionSpending?.monthly).toBeCloseTo(25.98, 2); // 15.99 + 9.99
      expect(typedResult.subscriptionSpending?.yearly).toBeCloseTo(311.76, 2); // (15.99 + 9.99) * 12
      expect(typedResult.categoryBreakdown).toBeDefined();
      expect(typedResult.categoryBreakdown?.length).toBeGreaterThan(0);
    });

    it('should handle user with no subscriptions', async () => {
      const result = await caller.analytics.getSpendingOverview({});

      expect(result).toBeDefined();
      const typedResult = result as {
        subscriptionSpending?: { monthly?: number };
        totalYearly?: number;
        averageSubscriptionCost?: number;
        mostExpensiveCategory?: string;
      };
      expect(typedResult.subscriptionSpending).toBeDefined();
      expect(typedResult.subscriptionSpending?.monthly).toBe(0);
      expect(typedResult.totalYearly).toBe(0);
      expect(typedResult.averageSubscriptionCost).toBe(0);
      expect(typedResult.mostExpensiveCategory).toBe('Unknown');
    });

    it('should throw error for unauthenticated user', async () => {
      const unauthenticatedCaller = createUnauthenticatedCaller();

      await expect(
        unauthenticatedCaller.analytics.getSpendingOverview({})
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getSpendingTrends', () => {
    it('should return spending trends by month', async () => {
      // Create test subscription
      const subscription = await createTestSubscription(testUserId, {
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
      });

      // Create test account first
      const plaidItem = await db.plaidItem.create({
        data: {
          userId: testUserId,
          plaidItemId: 'test-item-id',
          institutionId: 'test-bank',
          institutionName: 'Test Bank',
          accessToken: 'test-token',
          status: 'good',
        },
      });

      const account = await db.bankAccount.create({
        data: {
          userId: testUserId,
          plaidItemId: plaidItem.id,
          plaidAccountId: 'test-account',
          name: 'Test Checking',
          type: 'depository',
          subtype: 'checking',
          availableBalance: 1000,
          currentBalance: 1000,
          isoCurrencyCode: 'USD',
          isActive: true,
          mask: '1234',
        },
      });

      // Create test transactions for different months linked to the subscription
      const transaction1 = await createTestTransaction(testUserId, account.id, {
        merchantName: 'Netflix',
        amount: -15.99,
        date: new Date('2024-01-15'),
        isSubscription: true,
      });

      const transaction2 = await createTestTransaction(testUserId, account.id, {
        merchantName: 'Netflix',
        amount: -15.99,
        date: new Date('2024-02-15'),
        isSubscription: true,
      });

      // Link transactions to the subscription for better analytics
      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          transactions: {
            connect: [{ id: transaction1.id }, { id: transaction2.id }],
          },
        },
      });

      const result = await caller.analytics.getSpendingTrends({
        timeRange: 'month',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect((result as Array<unknown>).length).toBeGreaterThan(0);

      // Verify structure of trend data
      (
        result as Array<{ period?: string; total?: number; recurring?: number }>
      ).forEach(trend => {
        expect(trend).toHaveProperty('period');
        expect(trend).toHaveProperty('total');
        expect(trend).toHaveProperty('recurring');
        expect(typeof trend.total).toBe('number');
        expect(typeof trend.recurring).toBe('number');
      });
    });

    it('should return empty trends for user with no transactions', async () => {
      const result = await caller.analytics.getSpendingTrends({
        timeRange: 'month',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // Note: getCategoryBreakdown method doesn't exist in the analytics router
  // This test section has been removed as it tests a non-existent method

  describe('getSubscriptionInsights', () => {
    it('should return insights with growth metrics', async () => {
      // Create subscriptions at different times
      await createTestSubscription(testUserId, {
        name: 'Old Subscription',
        amount: 10.0,
        frequency: 'monthly',
      });

      // Mock subscription created date to be in the past
      await db.subscription.updateMany({
        where: { userId: testUserId },
        data: { createdAt: new Date('2024-01-01') },
      });

      await createTestSubscription(testUserId, {
        name: 'New Subscription',
        amount: 15.99,
        frequency: 'monthly',
      });

      const result = await caller.analytics.getSubscriptionInsights();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalActive');
      expect(result).toHaveProperty('totalCancelled');
      expect(result).toHaveProperty('unusedCount');
      expect(result).toHaveProperty('priceIncreaseCount');
      expect(result).toHaveProperty('averageSubscriptionAge');
      expect(result).toHaveProperty('insights');

      expect(result.totalActive).toBe(2);
      expect(result.totalCancelled).toBe(0);
      expect(typeof result.averageSubscriptionAge).toBe('number');
    });
  });

  describe('exportData', () => {
    it('should return export data with all subscription and transaction info', async () => {
      // Create test data
      await createTestSubscription(testUserId, {
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        category: 'Entertainment',
      });

      const result = await caller.analytics.exportData({
        format: 'csv',
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('exportDate');

      expect(result.format).toBe('csv');
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('Netflix');
    });

    it('should export data in JSON format', async () => {
      await createTestSubscription(testUserId, {
        name: 'Spotify',
        amount: 9.99,
        frequency: 'monthly',
      });

      const result = await caller.analytics.exportData({
        format: 'json',
      });

      expect(result).toBeDefined();
      expect(result.format).toBe('json');
      expect(result.data).toBeDefined();
      expect(result.data?.subscriptions).toBeDefined();
      expect(Array.isArray(result.data?.subscriptions)).toBe(true);
    });
  });
});
