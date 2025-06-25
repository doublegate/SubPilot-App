import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { transactionsRouter } from '../transactions';
import { db } from '@/server/db';
import type { Session } from 'next-auth';
import { TRPCError } from '@trpc/server';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma client
vi.mock('@/server/db', () => ({
  db: {
    transaction: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock subscription detector
vi.mock('@/server/services/subscription-detector', () => ({
  SubscriptionDetector: vi.fn().mockImplementation(() => ({
    detectSingleTransaction: vi.fn(),
    createSubscriptionsFromDetection: vi.fn(),
  })),
}));

describe('Transactions Router - Full tRPC Integration', () => {
  const mockSession: Session = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockTransactions = [
    {
      id: 'txn-1',
      userId: 'user-1',
      merchantName: 'Netflix',
      amount: new Decimal(-15.99),
      date: new Date('2024-07-15'),
      description: 'Netflix Monthly Subscription',
      category: ['Entertainment'],
      subcategory: null,
      pending: false,
      isSubscription: true,
      plaidTransactionId: 'plaid_txn_1',
      accountId: 'acc-1',
      subscriptionId: 'sub-1',
      isoCurrencyCode: 'USD',
      transactionType: 'special',
      paymentChannel: 'online',
      authorizedDate: null,
      location: null,
      confidence: new Decimal(0.95),
      createdAt: new Date('2024-07-15'),
      updatedAt: new Date('2024-07-15'),
    },
    {
      id: 'txn-2',
      userId: 'user-1',
      merchantName: 'Starbucks',
      amount: new Decimal(-5.25),
      date: new Date('2024-07-20'),
      description: 'Coffee Purchase',
      category: ['Food and Drink'],
      subcategory: 'Coffee Shop',
      pending: false,
      isSubscription: false,
      plaidTransactionId: 'plaid_txn_2',
      accountId: 'acc-1',
      subscriptionId: null,
      isoCurrencyCode: 'USD',
      transactionType: 'place',
      paymentChannel: 'in_store',
      authorizedDate: new Date('2024-07-20'),
      location: {
        address: '123 Main St',
        city: 'San Francisco',
        region: 'CA',
        postal_code: '94102',
        country: 'US',
        lat: 37.7749,
        lon: -122.4194,
      },
      confidence: new Decimal(0),
      createdAt: new Date('2024-07-20'),
      updatedAt: new Date('2024-07-20'),
    },
    {
      id: 'txn-3',
      userId: 'user-1',
      merchantName: 'Apple',
      amount: new Decimal(-2.99),
      date: new Date('2024-07-18'),
      description: 'App Store Purchase',
      category: ['Software'],
      subcategory: 'Mobile Apps',
      pending: true,
      isSubscription: false,
      plaidTransactionId: 'plaid_txn_3',
      accountId: 'acc-2',
      subscriptionId: null,
      isoCurrencyCode: 'USD',
      transactionType: 'digital',
      paymentChannel: 'online',
      authorizedDate: new Date('2024-07-18'),
      location: null,
      confidence: new Decimal(0),
      createdAt: new Date('2024-07-18'),
      updatedAt: new Date('2024-07-18'),
    },
  ];

  let ctx: ReturnType<typeof createInnerTRPCContext>;
  let caller: ReturnType<typeof transactionsRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createInnerTRPCContext({ session: mockSession });
    caller = transactionsRouter.createCaller(ctx);
  });

  describe('getAll', () => {
    it('should retrieve all transactions with default filters', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce(mockTransactions);

      const result = await caller.getAll({});

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: 'txn-1',
        merchantName: 'Netflix',
        amount: -15.99,
        date: expect.any(Date),
        description: 'Netflix Monthly Subscription',
        category: ['Entertainment'],
        subcategory: null,
        pending: false,
        isSubscription: true,
        accountId: 'acc-1',
        subscriptionId: 'sub-1',
        isoCurrencyCode: 'USD',
        transactionType: 'special',
        paymentChannel: 'online',
        authorizedDate: null,
        location: null,
        confidence: 0.95,
      });

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { date: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter by subscription status', async () => {
      const subscriptionTransactions = mockTransactions.filter(
        t => t.isSubscription
      );
      (db.transaction.findMany as Mock).mockResolvedValueOnce(
        subscriptionTransactions
      );

      const result = await caller.getAll({ isRecurring: true });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].isRecurring).toBe(true);

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          isSubscription: true,
        },
        orderBy: { date: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter by account', async () => {
      const accountTransactions = mockTransactions.filter(
        t => t.accountId === 'acc-1'
      );
      (db.transaction.findMany as Mock).mockResolvedValueOnce(
        accountTransactions
      );

      const result = await caller.getAll({ accountId: 'acc-1' });

      expect(result).toHaveLength(2);
      expect(result.every(t => t.accountId === 'acc-1')).toBe(true);

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          accountId: 'acc-1',
        },
        orderBy: { date: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter by date range', async () => {
      const startDate = '2024-07-01';
      const endDate = '2024-07-31';
      (db.transaction.findMany as Mock).mockResolvedValueOnce(mockTransactions);

      const result = await caller.getAll({ startDate, endDate });

      expect(result).toHaveLength(3);

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        orderBy: { date: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should search by merchant name or description', async () => {
      const netflixTransactions = mockTransactions.filter(
        t =>
          t.merchantName?.toLowerCase().includes('netflix') ||
          t.description.toLowerCase().includes('netflix')
      );
      (db.transaction.findMany as Mock).mockResolvedValueOnce(
        netflixTransactions
      );

      const result = await caller.getAll({ search: 'netflix' });

      expect(result).toHaveLength(1);
      expect(result[0].merchantName).toBe('Netflix');

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          OR: [
            { merchantName: { contains: 'netflix', mode: 'insensitive' } },
            { description: { contains: 'netflix', mode: 'insensitive' } },
          ],
        },
        orderBy: { date: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter by amount range', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce([
        mockTransactions[1],
      ]);

      const result = await caller.getAll({
        minAmount: -10,
        maxAmount: -1,
      });

      expect(result).toHaveLength(1);

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          amount: {
            gte: -10,
            lte: -1,
          },
        },
        orderBy: { date: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should exclude pending transactions when specified', async () => {
      const settledTransactions = mockTransactions.filter(t => !t.pending);
      (db.transaction.findMany as Mock).mockResolvedValueOnce(
        settledTransactions
      );

      const result = await caller.getAll({ excludePending: true });

      expect(result).toHaveLength(2);
      expect(result.every(t => !t.pending)).toBe(true);

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          pending: false,
        },
        orderBy: { date: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should support pagination', async () => {
      (db.transaction.findMany as Mock).mockResolvedValueOnce([
        mockTransactions[1],
      ]);

      const result = await caller.getAll({
        limit: 10,
        offset: 1,
      });

      expect(result).toHaveLength(1);

      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { date: 'desc' },
        take: 10,
        skip: 1,
      });
    });

    it('should require authentication', async () => {
      const unauthenticatedCtx = createInnerTRPCContext({ session: null });
      const unauthenticatedCaller =
        transactionsRouter.createCaller(unauthenticatedCtx);

      await expect(unauthenticatedCaller.getAll({})).rejects.toThrow(TRPCError);
    });
  });

  describe('getById', () => {
    it('should retrieve transaction by ID', async () => {
      (db.transaction.findUnique as Mock).mockResolvedValueOnce(
        mockTransactions[0]
      );

      const result = await caller.getById({ id: 'txn-1' });

      expect(result).toEqual({
        id: 'txn-1',
        merchantName: 'Netflix',
        amount: -15.99,
        date: expect.any(Date),
        description: 'Netflix Monthly Subscription',
        category: ['Entertainment'],
        isSubscription: true,
        confidence: 0.95,
      });

      expect(db.transaction.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'txn-1',
          userId: 'user-1',
        },
      });
    });

    it('should throw error for non-existent transaction', async () => {
      (db.transaction.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(caller.getById({ id: 'invalid-id' })).rejects.toThrow(
        'Transaction not found'
      );
    });

    it('should prevent accessing other users transactions', async () => {
      const otherUserCtx = createInnerTRPCContext({
        session: {
          ...mockSession,
          user: { ...mockSession.user, id: 'user-2' },
        },
      });
      const otherUserCaller = transactionsRouter.createCaller(otherUserCtx);

      (db.transaction.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(otherUserCaller.getById({ id: 'txn-1' })).rejects.toThrow(
        'Transaction not found'
      );

      expect(db.transaction.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'txn-1',
          userId: 'user-2', // Different user ID
        },
      });
    });
  });

  describe('updateCategory', () => {
    it('should update transaction category', async () => {
      const existingTransaction = mockTransactions[0];
      const updatedTransaction = {
        ...existingTransaction,
        category: ['Streaming Services'],
        subcategory: 'Video',
      };

      (db.transaction.findUnique as Mock).mockResolvedValueOnce(
        existingTransaction
      );
      (db.transaction.update as Mock).mockResolvedValueOnce(updatedTransaction);

      const result = await caller.updateCategory({
        id: 'txn-1',
        category: ['Streaming Services'],
        subcategory: 'Video',
      });

      expect(result).toEqual({ success: true });

      expect(db.transaction.update).toHaveBeenCalledWith({
        where: {
          id: 'txn-1',
          userId: 'user-1',
        },
        data: {
          category: ['Streaming Services'],
          subcategory: 'Video',
        },
      });
    });

    it('should handle transaction not found', async () => {
      (db.transaction.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(
        caller.updateCategory({
          id: 'invalid-id',
          category: ['Entertainment'],
        })
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('markAsSubscription', () => {
    it('should mark transaction as subscription manually', async () => {
      const nonSubTransaction = {
        ...mockTransactions[1],
        isSubscription: false,
      };
      const updatedTransaction = { ...nonSubTransaction, isSubscription: true };

      (db.transaction.findUnique as Mock).mockResolvedValueOnce(
        nonSubTransaction
      );
      (db.transaction.update as Mock).mockResolvedValueOnce(updatedTransaction);

      const result = await caller.markAsSubscription({
        id: 'txn-2',
        isSubscription: true,
      });

      expect(result).toEqual({ success: true });

      expect(db.transaction.update).toHaveBeenCalledWith({
        where: {
          id: 'txn-2',
          userId: 'user-1',
        },
        data: {
          isSubscription: true,
          confidence: 1.0, // Manual marking gets full confidence
        },
      });
    });

    it('should unmark transaction as subscription', async () => {
      const subTransaction = mockTransactions[0];
      const updatedTransaction = { ...subTransaction, isSubscription: false };

      (db.transaction.findUnique as Mock).mockResolvedValueOnce(subTransaction);
      (db.transaction.update as Mock).mockResolvedValueOnce(updatedTransaction);

      const result = await caller.markAsSubscription({
        id: 'txn-1',
        isSubscription: false,
      });

      expect(result).toEqual({ success: true });

      expect(db.transaction.update).toHaveBeenCalledWith({
        where: {
          id: 'txn-1',
          userId: 'user-1',
        },
        data: {
          isSubscription: false,
          confidence: 0,
          subscriptionId: null,
        },
      });
    });
  });

  describe('detectSubscription', () => {
    it('should detect subscription for transaction', async () => {
      const transaction = mockTransactions[1];
      const detectionResult = {
        isSubscription: true,
        confidence: 0.85,
        frequency: 'monthly' as const,
        merchantName: 'Starbucks',
        averageAmount: 5.25,
        nextBillingDate: new Date('2024-08-20'),
      };

      (db.transaction.findUnique as Mock).mockResolvedValueOnce(transaction);

      // Mock subscription detector
      const mockDetector = {
        detectSingleTransaction: vi.fn().mockResolvedValue(detectionResult),
        createSubscriptionsFromDetection: vi.fn().mockResolvedValue({
          created: 1,
          updated: 0,
          skipped: 0,
          errors: 0,
        }),
      };

      vi.doMock('@/server/services/subscription-detector', () => ({
        SubscriptionDetector: vi.fn().mockImplementation(() => mockDetector),
      }));

      const result = await caller.detectSubscription({ id: 'txn-2' });

      expect(result).toEqual({
        detected: true,
        confidence: 0.85,
        frequency: 'monthly',
        merchantName: 'Starbucks',
        subscriptionCreated: true,
      });

      expect(mockDetector.detectSingleTransaction).toHaveBeenCalledWith(
        'txn-2'
      );
    });

    it('should handle no subscription detected', async () => {
      const transaction = mockTransactions[1];

      (db.transaction.findUnique as Mock).mockResolvedValueOnce(transaction);

      const mockDetector = {
        detectSingleTransaction: vi.fn().mockResolvedValue(null),
        createSubscriptionsFromDetection: vi.fn(),
      };

      vi.doMock('@/server/services/subscription-detector', () => ({
        SubscriptionDetector: vi.fn().mockImplementation(() => mockDetector),
      }));

      const result = await caller.detectSubscription({ id: 'txn-2' });

      expect(result).toEqual({
        detected: false,
        confidence: 0,
        subscriptionCreated: false,
      });
    });
  });

  describe('getStats', () => {
    it('should return comprehensive transaction statistics', async () => {
      (db.transaction.count as Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25) // subscriptions
        .mockResolvedValueOnce(5); // pending

      (db.transaction.aggregate as Mock)
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(-1250.75) } }) // total spent
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(-350.25) } }); // subscription spent

      const result = await caller.getStats();

      expect(result).toEqual({
        totalTransactions: 100,
        subscriptionTransactions: 25,
        pendingTransactions: 5,
        totalSpent: 1250.75,
        subscriptionSpent: 350.25,
        averageTransactionAmount: 12.51,
        subscriptionPercentage: 25,
      });
    });

    it('should handle zero transactions', async () => {
      (db.transaction.count as Mock).mockResolvedValue(0);
      (db.transaction.aggregate as Mock).mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await caller.getStats();

      expect(result.totalTransactions).toBe(0);
      expect(result.totalSpent).toBe(0);
      expect(result.averageTransactionAmount).toBe(0);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction', async () => {
      const transaction = mockTransactions[0];
      (db.transaction.findUnique as Mock).mockResolvedValueOnce(transaction);
      (db.transaction.delete as Mock).mockResolvedValueOnce(transaction);

      const result = await caller.deleteTransaction({ id: 'txn-1' });

      expect(result).toEqual({ success: true });

      expect(db.transaction.delete).toHaveBeenCalledWith({
        where: {
          id: 'txn-1',
          userId: 'user-1',
        },
      });
    });

    it('should handle transaction not found', async () => {
      (db.transaction.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(
        caller.deleteTransaction({ id: 'invalid-id' })
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('performance', () => {
    it('should handle large transaction datasets efficiently', async () => {
      const largeTransactionSet = Array.from({ length: 5000 }, (_, i) => ({
        ...mockTransactions[0],
        id: `txn-${i}`,
        merchantName: `Merchant ${i}`,
        amount: new Decimal(-(10 + (i % 100))),
      }));

      (db.transaction.findMany as Mock).mockResolvedValueOnce(
        largeTransactionSet
      );

      const start = performance.now();
      const result = await caller.getAll({});
      const duration = performance.now() - start;

      expect(result).toHaveLength(5000);
      expect(duration).toBeLessThan(300); // Should handle 5000 transactions within 300ms
    });

    it('should efficiently filter large datasets', async () => {
      const largeFilteredSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockTransactions[0],
        id: `txn-${i}`,
        isSubscription: true,
      }));

      (db.transaction.findMany as Mock).mockResolvedValueOnce(largeFilteredSet);

      const start = performance.now();
      const result = await caller.getAll({
        subscriptionsOnly: true,
        search: 'netflix',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const duration = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(200); // Complex filtering should be fast
    });
  });

  describe('data validation', () => {
    it('should validate date formats', async () => {
      await expect(
        caller.getAll({
          startDate: 'invalid-date',
          endDate: '2024-07-31',
        })
      ).rejects.toThrow();
    });

    it('should validate amount ranges', async () => {
      (db.transaction.findMany as Mock).mockResolvedValue([]);

      // Should handle edge cases
      await caller.getAll({
        minAmount: -999999,
        maxAmount: 999999,
      });

      expect(db.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            amount: {
              gte: -999999,
              lte: 999999,
            },
          }),
        })
      );
    });

    it('should validate pagination limits', async () => {
      (db.transaction.findMany as Mock).mockResolvedValue([]);

      // Test maximum limit enforcement
      await caller.getAll({ limit: 100 });

      expect(db.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Should be capped at 100
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle transactions with null values', async () => {
      const transactionWithNulls = {
        ...mockTransactions[0],
        merchantName: null,
        subcategory: null,
        authorizedDate: null,
        location: null,
        subscriptionId: null,
      };

      (db.transaction.findMany as Mock).mockResolvedValueOnce([
        transactionWithNulls,
      ]);

      const result = await caller.getAll({});

      expect(result[0].merchantName).toBeNull();
      expect(result[0].subcategory).toBeNull();
      expect(result[0].authorizedDate).toBeNull();
      expect(result[0].location).toBeNull();
    });

    it('should handle very large amounts', async () => {
      const largeAmountTransaction = {
        ...mockTransactions[0],
        amount: new Decimal(-999999.99),
      };

      (db.transaction.findMany as Mock).mockResolvedValueOnce([
        largeAmountTransaction,
      ]);

      const result = await caller.getAll({});

      expect(result[0].amount).toBe(-999999.99);
    });

    it('should handle future transaction dates', async () => {
      const futureTransaction = {
        ...mockTransactions[0],
        date: new Date('2025-12-31'),
        authorizedDate: new Date('2025-12-31'),
      };

      (db.transaction.findMany as Mock).mockResolvedValueOnce([
        futureTransaction,
      ]);

      const result = await caller.getAll({});

      expect(result[0].date).toEqual(new Date('2025-12-31'));
    });
  });
});
