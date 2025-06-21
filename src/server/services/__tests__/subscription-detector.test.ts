import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { SubscriptionDetector } from '@/server/services/subscription-detector';
import { db } from '@/server/db';

// Mock Prisma client
vi.mock('@/server/db', () => ({
  db: {
    transaction: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe.skip('SubscriptionDetector', () => {
  let detector: SubscriptionDetector;

  const mockTransaction = {
    id: 'txn-1',
    userId: 'user-1',
    merchantName: 'Netflix',
    amount: -15.99,
    date: new Date('2024-07-15'),
    description: 'Netflix Monthly Subscription',
    category: ['Entertainment'],
    pending: false,
    isSubscription: false,
    plaidTransactionId: 'plaid_txn_1',
    accountId: 'acc-1',
    name: 'Netflix',
    isoCurrencyCode: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    detector = new SubscriptionDetector(db);
  });

  describe('detectSingleTransaction', () => {
    it('returns null for non-existent transaction', async () => {
      (db.transaction.findUnique as Mock).mockResolvedValueOnce(null);

      const result = await detector.detectSingleTransaction('invalid-id');

      expect(result).toBeNull();
    });

    it('returns null for transaction without merchant name', async () => {
      (db.transaction.findUnique as Mock).mockResolvedValueOnce({
        ...mockTransaction,
        merchantName: null,
      });

      const result = await detector.detectSingleTransaction('txn-1');

      expect(result).toBeNull();
    });

    it('detects subscription from recurring transactions', async () => {
      const similarTransactions = [
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
        {
          ...mockTransaction,
          id: 'txn-4',
          date: new Date('2024-04-15'),
          amount: -15.99,
        },
      ];

      (db.transaction.findUnique as Mock).mockResolvedValueOnce(
        mockTransaction
      );
      (db.transaction.findMany as Mock).mockResolvedValueOnce(
        similarTransactions
      );

      const result = await detector.detectSingleTransaction('txn-1');

      expect(result).toEqual({
        isSubscription: true,
        confidence: expect.any(Number),
        frequency: 'monthly',
        averageAmount: 15.99,
        nextBillingDate: expect.any(Date),
        merchantName: 'Netflix',
        category: 'Entertainment',
        transactions: expect.arrayContaining([
          expect.objectContaining({ id: 'txn-1' }),
          ...similarTransactions,
        ]),
      });
    });

    it('calculates correct frequency for weekly transactions', async () => {
      const weeklyTransactions = [
        {
          ...mockTransaction,
          id: 'txn-2',
          date: new Date('2024-07-08'),
        },
        {
          ...mockTransaction,
          id: 'txn-3',
          date: new Date('2024-07-01'),
        },
        {
          ...mockTransaction,
          id: 'txn-4',
          date: new Date('2024-06-24'),
        },
      ];

      (db.transaction.findUnique as Mock).mockResolvedValueOnce(
        mockTransaction
      );
      (db.transaction.findMany as Mock).mockResolvedValueOnce(
        weeklyTransactions
      );

      const result = await detector.detectSingleTransaction('txn-1');

      expect(result?.frequency).toBe('weekly');
    });

    it('calculates correct frequency for yearly transactions', async () => {
      const yearlyTransactions = [
        {
          ...mockTransaction,
          id: 'txn-2',
          date: new Date('2023-07-15'),
          amount: -99.99,
        },
        {
          ...mockTransaction,
          id: 'txn-3',
          date: new Date('2022-07-15'),
          amount: -99.99,
        },
      ];

      (db.transaction.findUnique as Mock).mockResolvedValueOnce({
        ...mockTransaction,
        amount: -99.99,
      });
      (db.transaction.findMany as Mock).mockResolvedValueOnce(
        yearlyTransactions
      );

      const result = await detector.detectSingleTransaction('txn-1');

      expect(result?.frequency).toBe('yearly');
    });

    it('returns low confidence for irregular transactions', async () => {
      const irregularTransactions = [
        {
          ...mockTransaction,
          id: 'txn-2',
          date: new Date('2024-06-20'), // 25 days ago
          amount: -15.99,
        },
        {
          ...mockTransaction,
          id: 'txn-3',
          date: new Date('2024-05-10'), // 41 days before that
          amount: -15.99,
        },
      ];

      (db.transaction.findUnique as Mock).mockResolvedValueOnce(
        mockTransaction
      );
      (db.transaction.findMany as Mock).mockResolvedValueOnce(
        irregularTransactions
      );

      const result = await detector.detectSingleTransaction('txn-1');

      expect(result?.confidence).toBeLessThan(0.7);
    });

    it('handles varying amounts within tolerance', async () => {
      const varyingTransactions = [
        {
          ...mockTransaction,
          id: 'txn-2',
          date: new Date('2024-06-15'),
          amount: -16.99, // $1 more
        },
        {
          ...mockTransaction,
          id: 'txn-3',
          date: new Date('2024-05-15'),
          amount: -14.99, // $1 less
        },
      ];

      (db.transaction.findUnique as Mock).mockResolvedValueOnce(
        mockTransaction
      );
      (db.transaction.findMany as Mock).mockResolvedValueOnce(
        varyingTransactions
      );

      const result = await detector.detectSingleTransaction('txn-1');

      expect(result?.isSubscription).toBe(true);
      expect(result?.averageAmount).toBeCloseTo(15.99, 1);
    });

    it('rejects transactions with too much amount variance', async () => {
      const highVarianceTransactions = [
        {
          ...mockTransaction,
          id: 'txn-2',
          date: new Date('2024-06-15'),
          amount: -25.99, // Over 50% difference
        },
        {
          ...mockTransaction,
          id: 'txn-3',
          date: new Date('2024-05-15'),
          amount: -5.99, // Over 50% difference
        },
      ];

      (db.transaction.findUnique as Mock).mockResolvedValueOnce(
        mockTransaction
      );
      (db.transaction.findMany as Mock).mockResolvedValueOnce(
        highVarianceTransactions
      );

      const result = await detector.detectSingleTransaction('txn-1');

      expect(result?.confidence).toBeLessThan(0.5);
    });
  });

  describe('detectUserSubscriptions', () => {
    it('processes all user transactions and detects subscriptions', async () => {
      const allTransactions = [
        mockTransaction,
        {
          ...mockTransaction,
          id: 'txn-2',
          merchantName: 'Spotify',
          amount: -9.99,
        },
      ];

      (db.transaction.findMany as Mock).mockResolvedValueOnce(allTransactions);

      // Mock detection results for each transaction
      vi.spyOn(detector, 'detectSingleTransaction')
        .mockResolvedValueOnce({
          isSubscription: true,
          confidence: 0.9,
          frequency: 'monthly',
          averageAmount: 15.99,
          nextBillingDate: new Date(),
          merchantName: 'Netflix',
        })
        .mockResolvedValueOnce({
          isSubscription: true,
          confidence: 0.85,
          frequency: 'monthly',
          averageAmount: 9.99,
          nextBillingDate: new Date(),
          merchantName: 'Spotify',
        });

      const results = await detector.detectUserSubscriptions('user-1');

      expect(results).toHaveLength(2);
      expect(results[0]?.merchantName).toBe('Netflix');
      expect(results[1]?.merchantName).toBe('Spotify');
    });

    it('filters out low confidence detections', async () => {
      const allTransactions = [mockTransaction];

      (db.transaction.findMany as Mock).mockResolvedValueOnce(allTransactions);

      vi.spyOn(detector, 'detectSingleTransaction').mockResolvedValueOnce({
        isSubscription: true,
        confidence: 0.3, // Low confidence
        frequency: 'monthly',
        averageAmount: 15.99,
        nextBillingDate: new Date(),
        merchantName: 'Netflix',
      });

      const results = await detector.detectUserSubscriptions('user-1');

      expect(results).toHaveLength(0);
    });
  });

  describe('createSubscriptionFromDetection', () => {
    const mockDetection = {
      isSubscription: true,
      confidence: 0.9,
      frequency: 'monthly' as const,
      averageAmount: 15.99,
      nextBillingDate: new Date('2024-08-15'),
      merchantName: 'Netflix',
    };

    it('creates new subscription from detection', async () => {
      (db.subscription.findFirst as Mock).mockResolvedValueOnce(null);
      (db.subscription.create as Mock).mockResolvedValueOnce({
        id: 'sub-1',
        userId: 'user-1',
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        category: 'Entertainment',
        nextBilling: new Date('2024-08-15'),
        isActive: true,
      });

      const result = await detector.createSubscriptionsFromDetection(
        'user-1',
        [mockDetection]
      );

      expect(db.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Netflix',
          amount: 15.99,
          currency: 'USD',
          frequency: 'monthly',
          category: 'Entertainment',
          nextBilling: new Date('2024-08-15'),
          lastBilling: new Date('2024-07-15'),
          isActive: true,
          provider: {
            name: 'Netflix',
          },
        },
      });

      expect(result).toBeDefined();
    });

    it('skips creation if subscription already exists', async () => {
      (db.subscription.findFirst as Mock).mockResolvedValueOnce({
        id: 'existing-sub',
        name: 'Netflix',
      });

      const result = await detector.createSubscriptionsFromDetection(
        'user-1',
        [mockDetection]
      );

      expect(db.subscription.create).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  // describe('normalizeMerchantName', () => {
  //   it('normalizes merchant names consistently', () => {
  //     const detector = new SubscriptionDetector(db);

  //     expect(detector['normalizeMerchantName']('NETFLIX.COM')).toBe('netflix');
  //     expect(detector['normalizeMerchantName']('Netflix Inc.')).toBe('netflix');
  //     expect(detector['normalizeMerchantName']('  Spotify  ')).toBe('spotify');
  //     expect(detector['normalizeMerchantName']('Amazon Prime Video')).toBe(
  //       'amazon prime video'
  //     );
  //   });
  // });

  describe('calculateFrequency', () => {
    it('correctly identifies monthly frequency', () => {
      const dates = [
        new Date('2024-07-15'),
        new Date('2024-06-15'),
        new Date('2024-05-15'),
      ];

      // @ts-expect-error - accessing private method for testing
      const frequency = detector['calculateFrequency'](dates);
      expect(frequency).toBe('monthly');
    });

    it('correctly identifies weekly frequency', () => {
      const dates = [
        new Date('2024-07-15'),
        new Date('2024-07-08'),
        new Date('2024-07-01'),
      ];

      // @ts-expect-error - accessing private method for testing
      const frequency = detector['calculateFrequency'](dates);
      expect(frequency).toBe('weekly');
    });

    it('correctly identifies yearly frequency', () => {
      const dates = [
        new Date('2024-07-15'),
        new Date('2023-07-15'),
        new Date('2022-07-15'),
      ];

      // @ts-expect-error - accessing private method for testing
      const frequency = detector['calculateFrequency'](dates);
      expect(frequency).toBe('yearly');
    });

    it('defaults to monthly for ambiguous patterns', () => {
      const dates = [new Date('2024-07-15'), new Date('2024-06-20')];

      // @ts-expect-error - accessing private method for testing
      const frequency = detector['calculateFrequency'](dates);
      expect(frequency).toBe('monthly');
    });
  });
});
