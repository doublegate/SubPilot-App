import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { transactionsRouter } from '@/server/api/routers/transactions';
import type { Session } from 'next-auth';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/db';

// Mock Prisma client
vi.mock('@/server/db', () => ({
  db: {
    transaction: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
    },
  },
}));

// Mock subscription detector
vi.mock('@/server/services/subscription-detector', () => ({
  SubscriptionDetector: vi.fn().mockImplementation(() => ({
    detectFromTransaction: vi.fn(),
  })),
}));

describe('transactionsRouter', () => {
  let ctx: Awaited<ReturnType<typeof createInnerTRPCContext>>;
  let caller: ReturnType<typeof transactionsRouter.createCaller>;

  const mockSession: Session = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockTransaction = {
    id: 'txn-1',
    userId: 'test-user-id',
    accountId: 'acc-1',
    plaidTransactionId: 'plaid_txn_1',
    name: 'Netflix Monthly Subscription',
    merchantName: 'Netflix',
    amount: -15.99,
    isoCurrencyCode: 'USD',
    date: new Date('2024-07-15'),
    category: ['Entertainment'],
    pending: false,
    isSubscription: false,
    account: {
      id: 'acc-1',
      name: 'Checking Account',
      type: 'depository',
      subtype: 'checking',
      mask: '0000',
      plaidItem: {
        institution: {
          name: 'Chase Bank',
        },
      },
    },
    subscription: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAccount = {
    id: 'acc-1',
    userId: 'test-user-id',
    plaidItemId: 'plaid-item-1',
    name: 'Checking Account',
    type: 'depository',
    subtype: 'checking',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    ctx = createInnerTRPCContext({
      session: mockSession,
    });

    caller = transactionsRouter.createCaller(ctx);
  });

  describe('getAll', () => {
    it('returns user transactions with default pagination', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce([mockTransaction]);
      (db.transaction.count as Mock).mockResolvedValueOnce(1);

      const result = await caller.getAll({});

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
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
        take: 50,
        skip: 0,
      });

      expect(result).toEqual({
        transactions: [mockTransaction],
        total: 1,
        hasMore: false,
      });
    });

    it('filters by date range', async () => {
      const startDate = new Date('2024-07-01');
      const endDate = new Date('2024-07-31');

      (db.transaction.findMany as Mock).mockResolvedValueOnce([mockTransaction]);
      (db.transaction.count as Mock).mockResolvedValueOnce(1);

      await caller.getAll({ startDate, endDate });

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          date: {
            gte: startDate,
            lte: endDate,
          },
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
        take: 50,
        skip: 0,
      });
    });

    it('filters by account ID', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce([mockTransaction]);
      (db.transaction.count as Mock).mockResolvedValueOnce(1);

      await caller.getAll({ accountId: 'acc-1' });

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          accountId: 'acc-1',
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
        take: 50,
        skip: 0,
      });
    });

    it('filters by category', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce([mockTransaction]);
      (db.transaction.count as Mock).mockResolvedValueOnce(1);

      await caller.getAll({ category: 'Entertainment' });

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          category: { has: 'Entertainment' },
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
        take: 50,
        skip: 0,
      });
    });

    it('searches by merchant name', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce([mockTransaction]);
      (db.transaction.count as Mock).mockResolvedValueOnce(1);

      await caller.getAll({ search: 'Netflix' });

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          OR: [
            { name: { contains: 'Netflix', mode: 'insensitive' } },
            { merchantName: { contains: 'Netflix', mode: 'insensitive' } },
          ],
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
        take: 50,
        skip: 0,
      });
    });

    it('filters subscription transactions only', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce([mockTransaction]);
      (db.transaction.count as Mock).mockResolvedValueOnce(1);

      await caller.getAll({ subscriptionOnly: true });

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          isSubscription: true,
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
        take: 50,
        skip: 0,
      });
    });

    it('handles pagination correctly', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce([mockTransaction]);
      (db.transaction.count as Mock).mockResolvedValueOnce(100);

      const result = await caller.getAll({ page: 2, limit: 25 });

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
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
        take: 25,
        skip: 25,
      });

      expect(result.hasMore).toBe(true);
    });

    it('sorts by amount ascending', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce([mockTransaction]);
      (db.transaction.count as Mock).mockResolvedValueOnce(1);

      await caller.getAll({ sortBy: 'amount', sortOrder: 'asc' });

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
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
        orderBy: { amount: 'asc' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('getById', () => {
    it('returns transaction by id', async () => {
      (db.transaction.findUnique as Mock).mockResolvedValueOnce(mockTransaction);

      const result = await caller.getById({ id: 'txn-1' });

      expect(db.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'txn-1', userId: 'test-user-id' },
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
      });

      expect(result).toEqual(mockTransaction);
    });

    it('throws NOT_FOUND for non-existent transaction', async () => {
      (db.transaction.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(caller.getById({ id: 'non-existent' })).rejects.toThrow(TRPCError);
    });
  });

  describe('markAsSubscription', () => {
    it('marks transaction as subscription and detects pattern', async () => {
      const { SubscriptionDetector } = await import('@/server/services/subscription-detector');
      const mockDetector = new SubscriptionDetector(db);
      const mockDetection = {
        isSubscription: true,
        confidence: 0.9,
        frequency: 'monthly' as const,
        averageAmount: 15.99,
        predictedNextDate: new Date(),
        merchantName: 'Netflix',
        category: 'Entertainment',
        transactions: [mockTransaction],
      };

      (db.transaction.findUnique as Mock).mockResolvedValueOnce(mockTransaction);
      (mockDetector.detectFromTransaction as Mock).mockResolvedValueOnce(mockDetection);
      (db.transaction.update as Mock).mockResolvedValueOnce({
        ...mockTransaction,
        isSubscription: true,
      });

      const result = await caller.markAsSubscription({ id: 'txn-1' });

      expect(db.transaction.update).toHaveBeenCalledWith({
        where: { id: 'txn-1', userId: 'test-user-id' },
        data: { isSubscription: true },
      });

      expect(result).toEqual({
        success: true,
        detection: mockDetection,
      });
    });

    it('throws error for non-existent transaction', async () => {
      (db.transaction.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(
        caller.markAsSubscription({ id: 'non-existent' })
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('getStats', () => {
    it('returns transaction statistics', async () => {
      (db.transaction.count as Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25); // subscriptions

      (db.transaction.aggregate as Mock)
        .mockResolvedValueOnce({ _sum: { amount: -500.00 } }) // total spent
        .mockResolvedValueOnce({ _sum: { amount: -125.00 } }); // subscription spent

      (db.transaction.findMany as Mock).mockResolvedValueOnce([
        { category: ['Entertainment'], amount: -50.00 },
        { category: ['Food'], amount: -30.00 },
        { category: ['Entertainment'], amount: -25.00 },
      ]);

      const result = await caller.getStats({});

      expect(result).toEqual({
        totalTransactions: 100,
        subscriptionTransactions: 25,
        totalSpent: 500.00,
        subscriptionSpent: 125.00,
        categoryBreakdown: expect.any(Array),
        averageTransactionAmount: expect.any(Number),
      });
    });

    it('filters stats by date range', async () => {
      const startDate = new Date('2024-07-01');
      const endDate = new Date('2024-07-31');

      (db.transaction.count as Mock).mockResolvedValue(50);
      (db.transaction.aggregate as Mock).mockResolvedValue({ _sum: { amount: -250.00 } });
      (db.transaction.findMany as Mock).mockResolvedValue([]);

      await caller.getStats({ startDate, endDate });

      expect(db.transaction.count).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          date: { gte: startDate, lte: endDate },
        },
      });
    });
  });

  describe('getAccounts', () => {
    it('returns user accounts for transaction filtering', async () => {
      (db.account.findMany as Mock).mockResolvedValueOnce([mockAccount]);

      const result = await caller.getAccounts();

      expect(db.account.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        select: {
          id: true,
          name: true,
          type: true,
          subtype: true,
          mask: true,
          plaidItem: {
            select: {
              institution: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      expect(result).toEqual([mockAccount]);
    });
  });

  describe('getCategories', () => {
    it('returns unique transaction categories', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce([
        { category: ['Entertainment'] },
        { category: ['Food and Drink'] },
        { category: ['Entertainment'] }, // Duplicate
        { category: ['Transportation'] },
      ]);

      const result = await caller.getCategories();

      expect(result).toEqual(['Entertainment', 'Food and Drink', 'Transportation']);
    });

    it('handles null and empty categories', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce([
        { category: ['Entertainment'] },
        { category: null },
        { category: [] },
        { category: ['Food'] },
      ]);

      const result = await caller.getCategories();

      expect(result).toEqual(['Entertainment', 'Food']);
    });
  });

  describe('unauthorized access', () => {
    it('throws UNAUTHORIZED for all endpoints without session', async () => {
      const unauthenticatedCaller = transactionsRouter.createCaller(
        createInnerTRPCContext({ session: null })
      );

      await expect(unauthenticatedCaller.getAll({})).rejects.toThrow(TRPCError);
      await expect(unauthenticatedCaller.getById({ id: 'txn-1' })).rejects.toThrow(TRPCError);
      await expect(unauthenticatedCaller.getStats({})).rejects.toThrow(TRPCError);
    });
  });
});