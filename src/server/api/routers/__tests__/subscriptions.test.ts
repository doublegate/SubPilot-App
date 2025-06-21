import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { subscriptionsRouter } from '@/server/api/routers/subscriptions';
import type { Session } from 'next-auth';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/db';

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
    },
    transaction: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

describe('subscriptionsRouter', () => {
  let ctx: Awaited<ReturnType<typeof createInnerTRPCContext>>;
  let caller: ReturnType<typeof subscriptionsRouter.createCaller>;

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
    description: 'Monthly streaming service',
    amount: 15.99,
    currency: 'USD',
    frequency: 'monthly',
    nextBilling: new Date('2024-08-01'),
    lastBilling: new Date('2024-07-01'),
    isActive: true,
    category: 'Entertainment',
    provider: { name: 'Netflix Inc.', logo: 'https://example.com/netflix.png' },
    cancelationInfo: { url: 'https://netflix.com/cancel' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    ctx = createInnerTRPCContext({
      session: mockSession,
    });

    caller = subscriptionsRouter.createCaller(ctx);
  });

  describe('getAll', () => {
    it('returns user subscriptions with default filters', async () => {
      (db.subscription.findMany as Mock).mockResolvedValueOnce([mockSubscription]);

      const result = await caller.getAll({});

      expect(db.subscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { createdAt: 'desc' },
        include: {
          transactions: {
            take: 5,
            orderBy: { date: 'desc' },
          },
        },
      });
      expect(result).toEqual([mockSubscription]);
    });

    it('filters by category', async () => {
      (db.subscription.findMany as Mock).mockResolvedValueOnce([mockSubscription]);

      await caller.getAll({ category: 'Entertainment' });

      expect(db.subscription.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          category: 'Entertainment',
        },
        orderBy: { createdAt: 'desc' },
        include: {
          transactions: {
            take: 5,
            orderBy: { date: 'desc' },
          },
        },
      });
    });

    it('filters by status', async () => {
      (db.subscription.findMany as Mock).mockResolvedValueOnce([mockSubscription]);

      await caller.getAll({ status: 'active' });

      expect(db.subscription.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          transactions: {
            take: 5,
            orderBy: { date: 'desc' },
          },
        },
      });
    });

    it('sorts by amount', async () => {
      (db.subscription.findMany as Mock).mockResolvedValueOnce([mockSubscription]);

      await caller.getAll({ sortBy: 'amount', sortOrder: 'asc' });

      expect(db.subscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { amount: 'asc' },
        include: {
          transactions: {
            take: 5,
            orderBy: { date: 'desc' },
          },
        },
      });
    });

    it('searches by name', async () => {
      (db.subscription.findMany as Mock).mockResolvedValueOnce([mockSubscription]);

      await caller.getAll({ search: 'Netflix' });

      expect(db.subscription.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          name: { contains: 'Netflix', mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          transactions: {
            take: 5,
            orderBy: { date: 'desc' },
          },
        },
      });
    });

    it('throws UNAUTHORIZED for unauthenticated user', async () => {
      const unauthenticatedCaller = subscriptionsRouter.createCaller(
        createInnerTRPCContext({ session: null })
      );

      await expect(unauthenticatedCaller.getAll({})).rejects.toThrow(TRPCError);
    });
  });

  describe('getById', () => {
    it('returns subscription by id', async () => {
      (db.subscription.findUnique as Mock).mockResolvedValueOnce(mockSubscription);

      const result = await caller.getById({ id: 'sub-1' });

      expect(db.subscription.findUnique).toHaveBeenCalledWith({
        where: { id: 'sub-1', userId: 'test-user-id' },
        include: {
          transactions: {
            orderBy: { date: 'desc' },
            take: 10,
          },
        },
      });
      expect(result).toEqual(mockSubscription);
    });

    it('throws NOT_FOUND for non-existent subscription', async () => {
      (db.subscription.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(caller.getById({ id: 'non-existent' })).rejects.toThrow(TRPCError);
    });
  });

  describe('create', () => {
    const createInput = {
      name: 'Spotify',
      amount: 9.99,
      currency: 'USD',
      frequency: 'monthly' as const,
      category: 'Music',
      nextBilling: new Date('2024-08-01'),
    };

    it('creates a new subscription', async () => {
      const createdSubscription = { id: 'sub-2', ...createInput, userId: 'test-user-id' };
      (db.subscription.create as Mock).mockResolvedValueOnce(createdSubscription);

      const result = await caller.create(createInput);

      expect(db.subscription.create).toHaveBeenCalledWith({
        data: {
          ...createInput,
          userId: 'test-user-id',
          isActive: true,
        },
      });
      expect(result).toEqual(createdSubscription);
    });

    it('validates required fields', async () => {
      await expect(
        caller.create({
          name: '',
          amount: 0,
          currency: 'USD',
          frequency: 'monthly',
          category: 'Test',
          nextBilling: new Date(),
        })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    const updateInput = {
      id: 'sub-1',
      name: 'Netflix Premium',
      amount: 19.99,
    };

    it('updates existing subscription', async () => {
      (db.subscription.findUnique as Mock).mockResolvedValueOnce(mockSubscription);
      const updatedSubscription = { ...mockSubscription, ...updateInput };
      (db.subscription.update as Mock).mockResolvedValueOnce(updatedSubscription);

      const result = await caller.update(updateInput);

      expect(db.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1', userId: 'test-user-id' },
        data: { name: 'Netflix Premium', amount: 19.99 },
      });
      expect(result).toEqual(updatedSubscription);
    });

    it('throws NOT_FOUND for non-existent subscription', async () => {
      (db.subscription.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(caller.update(updateInput)).rejects.toThrow(TRPCError);
    });
  });

  describe('cancel', () => {
    it('cancels active subscription', async () => {
      (db.subscription.findUnique as Mock).mockResolvedValueOnce(mockSubscription);
      const cancelledSubscription = { ...mockSubscription, isActive: false };
      (db.subscription.update as Mock).mockResolvedValueOnce(cancelledSubscription);

      const result = await caller.cancel({ id: 'sub-1' });

      expect(db.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1', userId: 'test-user-id' },
        data: { isActive: false },
      });
      expect(result).toEqual(cancelledSubscription);
    });
  });

  describe('getStats', () => {
    it('returns subscription statistics', async () => {
      const mockStats = {
        totalSubscriptions: 5,
        activeSubscriptions: 4,
        totalMonthlySpend: 75.95,
        totalYearlySpend: 911.40,
        averageSubscriptionCost: 18.99,
        categoryBreakdown: [
          { category: 'Entertainment', count: 2, totalAmount: 35.98 },
          { category: 'Software', count: 2, totalAmount: 39.97 },
        ],
      };

      (db.subscription.count as Mock)
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(4); // active

      (db.subscription.findMany as Mock).mockResolvedValueOnce([
        { ...mockSubscription, category: 'Entertainment', amount: 15.99 },
        { ...mockSubscription, category: 'Entertainment', amount: 19.99 },
        { ...mockSubscription, category: 'Software', amount: 19.99 },
        { ...mockSubscription, category: 'Software', amount: 19.98 },
      ]);

      const result = await caller.getStats();

      expect(result.totalSubscriptions).toBe(5);
      expect(result.activeSubscriptions).toBe(4);
      expect(result.categoryBreakdown).toHaveLength(2);
    });
  });

  describe('getUpcoming', () => {
    it('returns upcoming subscription renewals', async () => {
      const upcomingSubscription = {
        ...mockSubscription,
        nextBilling: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      };

      (db.subscription.findMany as Mock).mockResolvedValueOnce([upcomingSubscription]);

      const result = await caller.getUpcoming({ days: 7 });

      expect(db.subscription.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          isActive: true,
          nextBilling: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        orderBy: { nextBilling: 'asc' },
      });
      expect(result).toEqual([upcomingSubscription]);
    });
  });
});