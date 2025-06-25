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
  plaidWithRetry: vi.fn().mockImplementation(async (operation) => operation()),
  isPlaidConfigured: vi.fn(() => false),
  verifyPlaidWebhook: vi.fn().mockResolvedValue(true),
  handlePlaidError: vi.fn((error) => console.error('Plaid error:', error)),
}));

describe('Analytics Router Integration Tests', () => {
  const testUserId = 'test-analytics-user';
  let caller: ReturnType<typeof createAuthenticatedCaller>;

  beforeEach(async () => {
    // Create test user
    await createTestUser({ id: testUserId });
    
    // Create authenticated caller
    caller = createAuthenticatedCaller({
      user: { id: testUserId, email: 'test@example.com', name: 'Test User', image: null },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData(testUserId);
    vi.clearAllMocks();
  });

  describe('getOverview', () => {
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

      const result = await caller.analytics.getOverview();

      expect(result).toBeDefined();
      expect(result.totalSubscriptions).toBe(3);
      expect(result.activeSubscriptions).toBe(2);
      expect(result.monthlySpend).toBeCloseTo(25.98, 2); // 15.99 + 9.99
      expect(result.yearlySpend).toBeCloseTo(311.76, 2); // (15.99 + 9.99) * 12
      expect(result.categoriesCount).toBe(3); // Entertainment, Music, Software
    });

    it('should handle user with no subscriptions', async () => {
      const result = await caller.analytics.getOverview();

      expect(result).toBeDefined();
      expect(result.totalSubscriptions).toBe(0);
      expect(result.activeSubscriptions).toBe(0);
      expect(result.monthlySpend).toBe(0);
      expect(result.yearlySpend).toBe(0);
      expect(result.categoriesCount).toBe(0);
    });

    it('should throw error for unauthenticated user', async () => {
      const unauthenticatedCaller = createUnauthenticatedCaller();
      
      await expect(
        unauthenticatedCaller.analytics.getOverview()
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
          institutionId: 'test-bank',
          institutionName: 'Test Bank',
          accessToken: 'test-token',
        },
      });

      const account = await db.account.create({
        data: {
          userId: testUserId,
          plaidItemId: plaidItem.id,
          plaidAccountId: 'test-account',
          name: 'Test Checking',
          type: 'depository',
          subtype: 'checking',
          availableBalance: 1000,
          currentBalance: 1000,
        },
      });

      // Create test transactions for different months
      await createTestTransaction(testUserId, account.id, {
        merchantName: 'Netflix',
        amount: -15.99,
        date: new Date('2024-01-15'),
        isSubscription: true,
      });

      await createTestTransaction(testUserId, account.id, {
        merchantName: 'Netflix',
        amount: -15.99,
        date: new Date('2024-02-15'),
        isSubscription: true,
      });

      const result = await caller.analytics.getSpendingTrends({
        period: 'month',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Verify structure of trend data
      result.forEach(trend => {
        expect(trend).toHaveProperty('period');
        expect(trend).toHaveProperty('totalSpend');
        expect(trend).toHaveProperty('subscriptionSpend');
        expect(typeof trend.totalSpend).toBe('number');
        expect(typeof trend.subscriptionSpend).toBe('number');
      });
    });

    it('should return empty trends for user with no transactions', async () => {
      const result = await caller.analytics.getSpendingTrends({
        period: 'month',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCategoryBreakdown', () => {
    it('should return category breakdown with correct totals', async () => {
      // Create subscriptions in different categories
      await createTestSubscription(testUserId, {
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        category: 'Entertainment',
      });

      await createTestSubscription(testUserId, {
        name: 'Spotify',
        amount: 9.99,
        frequency: 'monthly',
        category: 'Music',
      });

      await createTestSubscription(testUserId, {
        name: 'Hulu',
        amount: 12.99,
        frequency: 'monthly',
        category: 'Entertainment',
      });

      const result = await caller.analytics.getCategoryBreakdown();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Find Entertainment category
      const entertainmentCategory = result.find(cat => cat.category === 'Entertainment');
      expect(entertainmentCategory).toBeDefined();
      expect(entertainmentCategory?.count).toBe(2);
      expect(entertainmentCategory?.totalSpend).toBeCloseTo(28.98, 2); // 15.99 + 12.99

      // Find Music category
      const musicCategory = result.find(cat => cat.category === 'Music');
      expect(musicCategory).toBeDefined();
      expect(musicCategory?.count).toBe(1);
      expect(musicCategory?.totalSpend).toBeCloseTo(9.99, 2);
    });
  });

  describe('getSubscriptionInsights', () => {
    it('should return insights with growth metrics', async () => {
      // Create subscriptions at different times
      await createTestSubscription(testUserId, {
        name: 'Old Subscription',
        amount: 10.00,
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
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('averageAmount');
      expect(result).toHaveProperty('mostExpensive');
      expect(result).toHaveProperty('cheapest');
      expect(result).toHaveProperty('monthlyGrowthRate');
      expect(result).toHaveProperty('categoryDistribution');

      expect(result.totalCount).toBe(2);
      expect(typeof result.averageAmount).toBe('number');
      expect(typeof result.monthlyGrowthRate).toBe('number');
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
        format: 'json',
        includeTransactions: true,
        includeSubscriptions: true,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('subscriptions');
      expect(result).toHaveProperty('transactions');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('exportedAt');

      expect(Array.isArray(result.subscriptions)).toBe(true);
      expect(Array.isArray(result.transactions)).toBe(true);
      expect(result.subscriptions.length).toBe(1);
    });

    it('should export only subscriptions when transactions excluded', async () => {
      await createTestSubscription(testUserId, {
        name: 'Spotify',
        amount: 9.99,
        frequency: 'monthly',
      });

      const result = await caller.analytics.exportData({
        format: 'json',
        includeTransactions: false,
        includeSubscriptions: true,
      });

      expect(result.subscriptions.length).toBe(1);
      expect(result.transactions.length).toBe(0);
    });
  });
});