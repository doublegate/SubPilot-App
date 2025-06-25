import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { subscriptionsRouter } from '../subscriptions';
import { db } from '@/server/db';
import type { Session } from 'next-auth';
import { TRPCError } from '@trpc/server';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma client
vi.mock('@/server/db', () => ({
  db: {
    subscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}));

describe('Subscriptions Router - Full tRPC Integration', () => {
  const mockSession: Session = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockSubscriptions = [
    {
      id: 'sub-1',
      userId: 'user-1',
      name: 'Netflix',
      amount: new Decimal(15.99),
      frequency: 'monthly',
      isActive: true,
      category: 'Entertainment',
      merchantName: 'Netflix',
      description: 'Netflix Subscription',
      startDate: new Date('2024-01-15'),
      cancelledAt: null,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-07-20'),
      lastBillingDate: new Date('2024-07-15'),
      nextBillingDate: new Date('2024-08-15'),
      provider: { name: 'Netflix', logo: null },
      metadata: {},
      confidence: new Decimal(0.95),
      isManual: false,
      transactions: [
        {
          id: 'txn-1',
          date: new Date('2024-07-15'),
          amount: new Decimal(-15.99),
        },
      ],
    },
    {
      id: 'sub-2',
      userId: 'user-1',
      name: 'Spotify',
      amount: new Decimal(9.99),
      frequency: 'monthly',
      isActive: true,
      category: 'Entertainment',
      merchantName: 'Spotify',
      description: 'Spotify Premium',
      startDate: new Date('2024-02-01'),
      cancelledAt: null,
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-07-01'),
      lastBillingDate: new Date('2024-07-01'),
      nextBillingDate: new Date('2024-08-01'),
      provider: { name: 'Spotify', logo: null },
      metadata: {},
      confidence: new Decimal(0.9),
      isManual: false,
      transactions: [],
    },
    {
      id: 'sub-3',
      userId: 'user-1',
      name: 'Adobe CC',
      amount: new Decimal(599.88),
      frequency: 'yearly',
      isActive: false,
      category: 'Software',
      merchantName: 'Adobe',
      description: 'Adobe Creative Cloud',
      startDate: new Date('2023-03-01'),
      cancelledAt: new Date('2024-06-15'),
      createdAt: new Date('2023-03-01'),
      updatedAt: new Date('2024-06-15'),
      lastBillingDate: new Date('2024-03-01'),
      nextBillingDate: null,
      provider: { name: 'Adobe', logo: null },
      metadata: {},
      confidence: new Decimal(0.85),
      isManual: false,
      transactions: [],
    },
  ];

  let ctx: ReturnType<typeof createInnerTRPCContext>;
  let caller: ReturnType<typeof subscriptionsRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createInnerTRPCContext({ session: mockSession });
    caller = subscriptionsRouter.createCaller(ctx);
  });

  describe('getAll', () => {
    it('should retrieve all subscriptions with default filters', async () => {
      (db.subscription.findMany as Mock).mockResolvedValueOnce(
        mockSubscriptions
      );
      (db.subscription.count as Mock).mockResolvedValueOnce(3);

      const result = await caller.getAll({});

      expect(result.subscriptions).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.subscriptions[0]).toEqual({
        id: 'sub-1',
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        isActive: true,
        category: 'Entertainment',
        merchantName: 'Netflix',
        description: 'Netflix Subscription',
        startDate: expect.any(Date),
        cancelledAt: null,
        lastBillingDate: expect.any(Date),
        nextBillingDate: expect.any(Date),
        provider: { name: 'Netflix', logo: null },
        confidence: 0.95,
        isManual: false,
      });

      expect(db.subscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { transactions: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by active status', async () => {
      const activeSubscriptions = mockSubscriptions.filter(s => s.isActive);
      (db.subscription.findMany as Mock).mockResolvedValueOnce(
        activeSubscriptions
      );
      (db.subscription.count as Mock).mockResolvedValueOnce(3);

      const result = await caller.getAll({ status: 'active' });

      expect(result.subscriptions).toHaveLength(2);
      expect(result.subscriptions.every(s => s.isActive)).toBe(true);

      expect(db.subscription.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          isActive: true,
        },
        include: { transactions: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by category', async () => {
      const entertainmentSubs = mockSubscriptions.filter(
        s => s.category === 'Entertainment'
      );
      (db.subscription.findMany as Mock).mockResolvedValueOnce(
        entertainmentSubs
      );

      const result = await caller.getAll({ category: 'Entertainment' });

      expect(result.subscriptions).toHaveLength(2);
      expect(
        result.subscriptions.every(s => s.category === 'Entertainment')
      ).toBe(true);

      expect(db.subscription.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          category: 'Entertainment',
        },
        include: { transactions: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it.skip('should filter by frequency', async () => {
      // Frequency filtering is not currently implemented in the API
      // The current router input schema doesn't include frequency parameter
    });

    it.skip('should search by name or merchant', async () => {
      // Search parameter is not currently implemented in the subscription router
      // The current router input schema doesn't include search parameter
    });

    it('should require authentication', async () => {
      const unauthenticatedCtx = createInnerTRPCContext({ session: null });
      const unauthenticatedCaller =
        subscriptionsRouter.createCaller(unauthenticatedCtx);

      await expect(unauthenticatedCaller.getAll({})).rejects.toThrow(TRPCError);
    });
  });

  describe('getById', () => {
    it('should retrieve subscription by ID', async () => {
      (db.subscription.findUnique as Mock).mockResolvedValueOnce(
        mockSubscriptions[0]
      );

      const result = await caller.getById({ id: 'sub-1' });

      expect(result).toEqual({
        id: 'sub-1',
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        isActive: true,
        category: 'Entertainment',
        merchantName: 'Netflix',
        description: 'Netflix Subscription',
        startDate: expect.any(Date),
        cancelledAt: null,
        lastBillingDate: expect.any(Date),
        nextBillingDate: expect.any(Date),
        provider: { name: 'Netflix', logo: null },
        confidence: 0.95,
        isManual: false,
      });

      expect(db.subscription.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'sub-1',
          userId: 'user-1',
        },
        include: { transactions: true },
      });
    });

    it('should throw error for non-existent subscription', async () => {
      (db.subscription.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(caller.getById({ id: 'invalid-id' })).rejects.toThrow(
        'Subscription not found'
      );
    });

    it('should prevent accessing other users subscriptions', async () => {
      const otherUserCtx = createInnerTRPCContext({
        session: {
          ...mockSession,
          user: { ...mockSession.user, id: 'user-2' },
        },
      });
      const otherUserCaller = subscriptionsRouter.createCaller(otherUserCtx);

      (db.subscription.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(otherUserCaller.getById({ id: 'sub-1' })).rejects.toThrow(
        'Subscription not found'
      );

      expect(db.subscription.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'sub-1',
          userId: 'user-2', // Different user ID
        },
        include: { transactions: true },
      });
    });
  });

  describe('create', () => {
    it('should create new manual subscription', async () => {
      const newSubscription = {
        ...mockSubscriptions[0],
        id: 'sub-new',
        isManual: true,
        confidence: new Decimal(1.0),
      };

      (db.subscription.create as Mock).mockResolvedValueOnce(newSubscription);

      const result = await caller.create({
        name: 'Netflix',
        amount: 15.99,
        currency: 'USD',
        frequency: 'monthly',
        category: 'Entertainment',
        description: 'Netflix Subscription',
        nextBilling: new Date('2024-08-15'),
      });

      expect(result).toEqual({
        id: 'sub-new',
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        isActive: true,
        category: 'Entertainment',
        description: 'Netflix Subscription',
        isManual: true,
        confidence: 1.0,
        lastBillingDate: expect.any(Date),
        merchantName: 'Netflix',
        nextBillingDate: expect.any(Date),
        provider: { name: 'Netflix', logo: null },
        startDate: expect.any(Date),
        cancelledAt: null,
      });

      expect(db.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Netflix',
          amount: 15.99,
          frequency: 'monthly',
          category: 'Entertainment',
          description: 'Netflix Subscription',
          startDate: new Date('2024-01-15'),
          nextBillingDate: new Date('2024-08-15'),
          isActive: true,
          isManual: true,
          confidence: 1.0,
          provider: {},
          metadata: {},
        },
        include: { transactions: true },
      });
    });

    it('should validate required fields', async () => {
      await expect(
        caller.create({
          name: '',
          amount: 15.99,
          currency: 'USD',
          frequency: 'monthly',
          category: 'Entertainment',
        })
      ).rejects.toThrow();
    });

    it('should validate amount is positive', async () => {
      await expect(
        caller.create({
          name: 'Netflix',
          amount: -15.99,
          currency: 'USD',
          frequency: 'monthly',
          category: 'Entertainment',
        })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update subscription details', async () => {
      const existingSubscription = mockSubscriptions[0];
      const updatedSubscription = {
        ...existingSubscription,
        name: 'Netflix Premium',
        amount: new Decimal(17.99),
      };

      (db.subscription.findUnique as Mock).mockResolvedValueOnce(
        existingSubscription
      );
      (db.subscription.update as Mock).mockResolvedValueOnce(
        updatedSubscription
      );

      const result = await caller.update({
        id: 'sub-1',
        name: 'Netflix Premium',
        customAmount: 17.99,
      });

      expect(result).toEqual({ success: true });

      expect(db.subscription.update).toHaveBeenCalledWith({
        where: {
          id: 'sub-1',
          userId: 'user-1',
        },
        data: {
          name: 'Netflix Premium',
          amount: 17.99,
        },
      });
    });

    it('should handle subscription not found', async () => {
      (db.subscription.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(
        caller.update({ id: 'invalid-id', name: 'New Name' })
      ).rejects.toThrow('Subscription not found');
    });
  });

  describe('cancel', () => {
    it('should cancel active subscription', async () => {
      const activeSubscription = mockSubscriptions[0];
      const cancelledSubscription = {
        ...activeSubscription,
        isActive: false,
        cancelledAt: new Date(),
      };

      (db.subscription.findUnique as Mock).mockResolvedValueOnce(
        activeSubscription
      );
      (db.subscription.update as Mock).mockResolvedValueOnce(
        cancelledSubscription
      );
      (db.notification.create as Mock).mockResolvedValueOnce({});

      const result = await caller.markCancelled({
        id: 'sub-1',
        reason: 'Too expensive',
      });

      expect(result).toEqual({ success: true });

      expect(db.subscription.update).toHaveBeenCalledWith({
        where: {
          id: 'sub-1',
          userId: 'user-1',
        },
        data: {
          isActive: false,
          cancelledAt: expect.any(Date),
          metadata: {
            cancellation: {
              reason: 'Too expensive',
              cancelledAt: expect.any(String),
            },
          },
        },
      });
    });

    it('should create cancellation notification', async () => {
      const activeSubscription = mockSubscriptions[0];
      (db.subscription.findUnique as Mock).mockResolvedValueOnce(
        activeSubscription
      );
      (db.subscription.update as Mock).mockResolvedValueOnce({});
      (db.notification.create as Mock).mockResolvedValueOnce({});

      await caller.cancel({ id: 'sub-1' });

      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'subscription_cancelled',
          title: 'Subscription Cancelled',
          message: 'Netflix subscription has been marked as cancelled',
          read: false,
          data: { subscriptionId: 'sub-1' },
        },
      });
    });

    it('should handle already cancelled subscription', async () => {
      const cancelledSubscription = {
        ...mockSubscriptions[2],
        isActive: false,
      };
      (db.subscription.findUnique as Mock).mockResolvedValueOnce(
        cancelledSubscription
      );

      await expect(caller.markCancelled({ id: 'sub-3' })).rejects.toThrow(
        'Subscription is already cancelled'
      );
    });
  });

  describe('delete', () => {
    it('should delete subscription and related transactions', async () => {
      const subscription = mockSubscriptions[0];
      (db.subscription.findUnique as Mock).mockResolvedValueOnce(subscription);
      (db.transaction.updateMany as Mock).mockResolvedValueOnce({ count: 2 });
      (db.subscription.delete as Mock).mockResolvedValueOnce(subscription);

      const result = await caller.delete({ id: 'sub-1' });

      expect(result).toEqual({ success: true });

      expect(db.transaction.updateMany).toHaveBeenCalledWith({
        where: { subscriptionId: 'sub-1' },
        data: { subscriptionId: null, isSubscription: false },
      });

      expect(db.subscription.delete).toHaveBeenCalledWith({
        where: {
          id: 'sub-1',
          userId: 'user-1',
        },
      });
    });
  });

  describe('getStats', () => {
    it('should return comprehensive subscription statistics', async () => {
      (db.subscription.count as Mock)
        .mockResolvedValueOnce(2) // active
        .mockResolvedValueOnce(1); // cancelled

      (db.subscription.aggregate as Mock)
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(625.87) } }) // total monthly
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(25.98) } }); // active monthly

      (db.subscription.findMany as Mock).mockResolvedValueOnce(
        mockSubscriptions
      );

      const result = await caller.getStats();

      expect(result).toEqual({
        totalActive: 2,
        totalCancelled: 1,
        totalMonthlySpend: 625.87,
        activeMonthlySpend: 25.98,
        averagePerSubscription: 208.62,
        byCategory: {
          Entertainment: { count: 2, amount: 25.98 },
          Software: { count: 1, amount: 49.99 },
        },
        byFrequency: {
          monthly: { count: 2, amount: 25.98 },
          yearly: { count: 1, amount: 49.99 },
        },
      });
    });

    it('should handle empty subscriptions', async () => {
      (db.subscription.count as Mock).mockResolvedValue(0);
      (db.subscription.aggregate as Mock).mockResolvedValue({
        _sum: { amount: null },
      });
      (db.subscription.findMany as Mock).mockResolvedValueOnce([]);

      const result = await caller.getStats();

      expect(result.totalActive).toBe(0);
      expect(result.monthlySpend).toBe(0);
      expect(result.yearlySpend).toBe(0);
    });
  });

  describe('performance', () => {
    it('should handle large numbers of subscriptions efficiently', async () => {
      const largeSubscriptionSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockSubscriptions[0],
        id: `sub-${i}`,
        name: `Service ${i}`,
      }));

      (db.subscription.findMany as Mock).mockResolvedValueOnce(
        largeSubscriptionSet
      );

      const start = performance.now();
      const result = await caller.getAll({});
      const duration = performance.now() - start;

      expect(result.subscriptions).toHaveLength(1000);
      expect(duration).toBeLessThan(200); // Should handle large datasets within 200ms
    });
  });

  describe('data consistency', () => {
    it('should handle null/undefined values gracefully', async () => {
      const subscriptionWithNulls = {
        ...mockSubscriptions[0],
        description: null,
        lastBillingDate: null,
        nextBillingDate: null,
        transactions: [],
      };

      (db.subscription.findMany as Mock).mockResolvedValueOnce([
        subscriptionWithNulls,
      ]);

      const result = await caller.getAll({});

      expect(result.subscriptions[0]?.description).toBeNull();
      expect(result.subscriptions[0]?.nextBilling).toBeNull();
      expect(result.subscriptions[0]?.lastTransaction).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle subscriptions with very large amounts', async () => {
      const expensiveSubscription = {
        ...mockSubscriptions[0],
        amount: new Decimal(9999.99),
      };

      (db.subscription.findMany as Mock).mockResolvedValueOnce([
        expensiveSubscription,
      ]);

      const result = await caller.getAll({});

      expect(result.subscriptions[0].amount).toBe(9999.99);
    });

    it('should handle subscriptions with future dates', async () => {
      const futureSubscription = {
        ...mockSubscriptions[0],
        startDate: new Date('2025-01-01'),
        nextBillingDate: new Date('2025-02-01'),
      };

      (db.subscription.findMany as Mock).mockResolvedValueOnce([
        futureSubscription,
      ]);

      const result = await caller.getAll({});

      expect(result.subscriptions[0]?.createdAt).toBeDefined();
      expect(result.subscriptions[0]?.nextBilling).toEqual(
        new Date('2025-02-01')
      );
    });
  });
});
