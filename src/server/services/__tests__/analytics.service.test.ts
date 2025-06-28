import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../analytics.service';
import { type PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma client
const mockPrisma = {
  transaction: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
  },
  subscription: {
    findMany: vi.fn(),
  },
} as unknown as PrismaClient;

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService(mockPrisma);
    vi.clearAllMocks();
  });

  describe('generateTimeSeriesData', () => {
    it('should generate time series data grouped by month', async () => {
      const mockTransactions = [
        {
          id: '1',
          date: new Date('2024-01-15'),
          amount: new Decimal(100),
          isSubscription: true,
        },
        {
          id: '2',
          date: new Date('2024-01-20'),
          amount: new Decimal(50),
          isSubscription: false,
        },
        {
          id: '3',
          date: new Date('2024-02-10'),
          amount: new Decimal(200),
          isSubscription: true,
        },
      ];

      vi.mocked(mockPrisma.transaction.findMany).mockResolvedValue(
        mockTransactions as any
      );

      const result = await service.generateTimeSeriesData(
        'user-123',
        new Date('2024-01-01'),
        new Date('2024-02-28'),
        'month'
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-01',
        value: 150,
        count: 2,
        metadata: {
          recurring: 100,
          nonRecurring: 50,
        },
      });
      expect(result[1]).toEqual({
        date: '2024-02',
        value: 200,
        count: 1,
        metadata: {
          recurring: 200,
          nonRecurring: 0,
        },
      });
    });

    it('should handle empty transaction data', async () => {
      vi.mocked(mockPrisma.transaction.findMany).mockResolvedValue([]);

      const result = await service.generateTimeSeriesData(
        'user-123',
        new Date('2024-01-01'),
        new Date('2024-02-28'),
        'month'
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('predictFutureSpending', () => {
    it('should predict future spending based on historical data', async () => {
      const mockTransactions = Array.from({ length: 12 }, (_, i) => ({
        id: `${i}`,
        date: new Date(2024, i, 15),
        amount: new Decimal(100 + i * 10), // Increasing trend
        isSubscription: true,
      }));

      vi.mocked(mockPrisma.transaction.findMany).mockResolvedValue(
        mockTransactions as any
      );

      const result = await service.predictFutureSpending('user-123', 3);

      expect(result.predictedValue).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.trend).toBe('increasing');
    });

    it('should return zero prediction with insufficient data', async () => {
      vi.mocked(mockPrisma.transaction.findMany).mockResolvedValue([]);

      const result = await service.predictFutureSpending('user-123', 3);

      expect(result.predictedValue).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.trend).toBe('stable');
    });
  });

  describe('detectAnomalies', () => {
    it('should detect price spike anomalies', async () => {
      const mockTransactions = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          amount: new Decimal(10),
          isSubscription: true,
          subscriptionId: 'sub-1',
          subscription: {
            id: 'sub-1',
            name: 'Netflix',
            amount: new Decimal(10),
          },
        },
        {
          id: '2',
          date: new Date('2024-01-15'),
          amount: new Decimal(10),
          isSubscription: true,
          subscriptionId: 'sub-1',
          subscription: {
            id: 'sub-1',
            name: 'Netflix',
            amount: new Decimal(10),
          },
        },
        {
          id: '3',
          date: new Date('2024-01-20'),
          amount: new Decimal(15), // 50% increase
          isSubscription: true,
          subscriptionId: 'sub-1',
          subscription: {
            id: 'sub-1',
            name: 'Netflix',
            amount: new Decimal(15),
          },
        },
      ];

      vi.mocked(mockPrisma.transaction.findMany).mockResolvedValue(
        mockTransactions as any
      );

      const result = await service.detectAnomalies('user-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'price_spike',
        severity: 'high',
        subscription: {
          id: 'sub-1',
          name: 'Netflix',
        },
      });
    });

    it('should detect duplicate charge anomalies', async () => {
      const mockTransactions = [
        {
          id: '1',
          date: new Date('2024-01-15'),
          amount: new Decimal(10),
          isSubscription: true,
          subscriptionId: 'sub-1',
          subscription: {
            id: 'sub-1',
            name: 'Spotify',
            amount: new Decimal(10),
          },
        },
        {
          id: '2',
          date: new Date('2024-01-15'), // Same day
          amount: new Decimal(10),
          isSubscription: true,
          subscriptionId: 'sub-1',
          subscription: {
            id: 'sub-1',
            name: 'Spotify',
            amount: new Decimal(10),
          },
        },
      ];

      vi.mocked(mockPrisma.transaction.findMany).mockResolvedValue(
        mockTransactions as any
      );

      const result = await service.detectAnomalies('user-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'duplicate_charge',
        severity: 'high',
        description: 'Multiple charges detected on the same day',
      });
    });
  });

  describe('generateOptimizationSuggestions', () => {
    it('should suggest cancelling unused subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          name: 'Unused Service',
          amount: new Decimal(20),
          frequency: 'monthly',
          isActive: true,
          transactions: [
            {
              id: 'tx-1',
              date: new Date('2023-01-01'), // Very old
              amount: new Decimal(20),
            },
          ],
        },
        {
          id: 'sub-2',
          name: 'Active Service',
          amount: new Decimal(15),
          frequency: 'monthly',
          isActive: true,
          transactions: [
            {
              id: 'tx-2',
              date: new Date(), // Recent
              amount: new Decimal(15),
            },
          ],
        },
      ];

      vi.mocked(mockPrisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as any
      );

      const result = await service.generateOptimizationSuggestions('user-123');

      expect(result).toHaveLength(2); // Unused + annual switch suggestions
      expect(result[0]).toMatchObject({
        type: 'unused',
        priority: 'high',
        potentialSavings: 20,
      });
    });

    it('should suggest switching to annual plans', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          name: 'Premium Service',
          amount: new Decimal(50),
          frequency: 'monthly',
          isActive: true,
          transactions: [],
        },
      ];

      vi.mocked(mockPrisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as any
      );

      const result = await service.generateOptimizationSuggestions('user-123');

      const annualSuggestion = result.find(s => s.type === 'annual_switch');
      expect(annualSuggestion).toBeDefined();
      expect(annualSuggestion?.potentialSavings).toBeGreaterThan(0);
    });
  });

  describe('compareSpendingPeriods', () => {
    it('should compare spending between two periods', async () => {
      // Mock current period spending
      vi.mocked(mockPrisma.transaction.aggregate)
        .mockResolvedValueOnce({
          _sum: { amount: new Decimal(500) },
          _avg: { amount: null },
          _count: { amount: 0 },
          _max: { amount: null },
          _min: { amount: null },
        })
        // Mock previous period spending
        .mockResolvedValueOnce({
          _sum: { amount: new Decimal(400) },
          _avg: { amount: null },
          _count: { amount: 0 },
          _max: { amount: null },
          _min: { amount: null },
        });

      const result = await service.compareSpendingPeriods(
        'user-123',
        new Date('2024-02-01'),
        new Date('2024-02-29'),
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result).toEqual({
        current: 500,
        previous: 400,
        change: 100,
        changePercentage: 25,
        trend: 'up',
      });
    });

    it('should handle zero previous spending', async () => {
      vi.mocked(mockPrisma.transaction.aggregate)
        .mockResolvedValueOnce({
          _sum: { amount: new Decimal(500) },
          _avg: { amount: null },
          _count: { amount: 0 },
          _max: { amount: null },
          _min: { amount: null },
        })
        .mockResolvedValueOnce({
          _sum: { amount: null },
          _avg: { amount: null },
          _count: { amount: 0 },
          _max: { amount: null },
          _min: { amount: null },
        });

      const result = await service.compareSpendingPeriods(
        'user-123',
        new Date('2024-02-01'),
        new Date('2024-02-29'),
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result.changePercentage).toBe(0);
    });
  });

  describe('analyzeCategorySpending', () => {
    it('should analyze spending by category', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          name: 'Netflix',
          amount: new Decimal(15),
          frequency: 'monthly',
          category: 'Entertainment',
          isActive: true,
          provider: { name: 'Netflix' },
        },
        {
          id: 'sub-2',
          name: 'Spotify',
          amount: new Decimal(10),
          frequency: 'monthly',
          category: 'Entertainment',
          isActive: true,
          provider: { name: 'Spotify' },
        },
        {
          id: 'sub-3',
          name: 'AWS',
          amount: new Decimal(100),
          frequency: 'monthly',
          category: 'Cloud Services',
          isActive: true,
          provider: { name: 'Amazon' },
        },
      ];

      vi.mocked(mockPrisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as any
      );

      const result = await service.analyzeCategorySpending('user-123', 'month');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        category: 'Cloud Services',
        totalSpending: 100,
        subscriptionCount: 1,
        averageAmount: 100,
      });
      expect(result[1]).toMatchObject({
        category: 'Entertainment',
        totalSpending: 25,
        subscriptionCount: 2,
        averageAmount: 12.5,
      });
    });

    it('should handle subscriptions without categories', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          name: 'Unknown Service',
          amount: new Decimal(20),
          frequency: 'monthly',
          category: null,
          isActive: true,
        },
      ];

      vi.mocked(mockPrisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as any
      );

      const result = await service.analyzeCategorySpending('user-123', 'month');

      expect(result).toHaveLength(1);
      expect(result[0]?.category).toBe('Other');
    });
  });
});
