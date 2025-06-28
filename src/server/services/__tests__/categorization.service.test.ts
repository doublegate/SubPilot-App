import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CategorizationService } from '../categorization.service';
import { openAIClient } from '@/server/lib/openai-client';
import { cacheService } from '../cache.service';
import { type PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock dependencies
vi.mock('@/server/lib/openai-client');
vi.mock('../cache.service');

// Create mock Prisma client
const createMockPrismaClient = () => ({
  transaction: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  subscription: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  merchantAlias: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  category: {
    count: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
} as unknown as PrismaClient);

describe('CategorizationService', () => {
  let service: CategorizationService;
  let mockDb: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockPrismaClient();
    service = new CategorizationService(mockDb);
  });

  describe('categorizeTransaction', () => {
    const mockTransaction = {
      id: 'trans123',
      userId: 'user123',
      merchantName: 'NETFLIX.COM',
      description: 'Netflix subscription',
      amount: new Decimal(9.99),
      aiCategory: null,
      normalizedMerchantName: null,
      aiCategoryConfidence: null,
    };

    it('should return existing categorization if not forcing recategorize', async () => {
      const categorizedTransaction = {
        ...mockTransaction,
        aiCategory: 'streaming',
        normalizedMerchantName: 'Netflix',
        aiCategoryConfidence: new Decimal(0.95),
      };

      vi.mocked(mockDb.transaction.findFirst).mockResolvedValue(categorizedTransaction);

      const result = await service.categorizeTransaction('trans123', 'user123', false);

      expect(result).toEqual({
        category: 'streaming',
        confidence: 0.95,
        normalizedName: 'Netflix',
      });
      expect(openAIClient.categorizeTransaction).not.toHaveBeenCalled();
    });

    it('should use merchant alias if available', async () => {
      vi.mocked(mockDb.transaction.findFirst).mockResolvedValue(mockTransaction);
      vi.mocked(mockDb.merchantAlias.findUnique).mockResolvedValue({
        id: 'alias123',
        originalName: 'netflix.com',
        normalizedName: 'Netflix',
        category: 'streaming',
        confidence: new Decimal(0.98),
        isVerified: true,
        usageCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      });

      const result = await service.categorizeTransaction('trans123', 'user123');

      expect(result).toEqual({
        category: 'streaming',
        confidence: 0.98,
        normalizedName: 'Netflix',
      });
      expect(mockDb.merchantAlias.update).toHaveBeenCalledWith({
        where: { id: 'alias123' },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: expect.any(Date),
        },
      });
      expect(openAIClient.categorizeTransaction).not.toHaveBeenCalled();
    });

    it('should use AI categorization when no alias exists', async () => {
      vi.mocked(mockDb.transaction.findFirst).mockResolvedValue(mockTransaction);
      vi.mocked(mockDb.merchantAlias.findUnique).mockResolvedValue(null);
      vi.mocked(openAIClient.categorizeTransaction).mockResolvedValue({
        category: 'streaming',
        confidence: 0.92,
        merchantName: 'Netflix',
        reasoning: 'Video streaming service',
      });

      const result = await service.categorizeTransaction('trans123', 'user123');

      expect(result).toEqual({
        category: 'streaming',
        confidence: 0.92,
        normalizedName: 'Netflix',
      });
      expect(mockDb.merchantAlias.upsert).toHaveBeenCalled();
      expect(mockDb.transaction.update).toHaveBeenCalledWith({
        where: { id: 'trans123' },
        data: {
          aiCategory: 'streaming',
          aiCategoryConfidence: 0.92,
          normalizedMerchantName: 'Netflix',
        },
      });
    });

    it('should throw error if transaction not found', async () => {
      vi.mocked(mockDb.transaction.findFirst).mockResolvedValue(null);

      await expect(
        service.categorizeTransaction('trans123', 'user123')
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('bulkCategorizeTransactions', () => {
    it('should categorize multiple transactions efficiently', async () => {
      const mockTransactions = [
        {
          id: 'trans1',
          merchantName: 'Netflix',
          description: 'Streaming',
          amount: new Decimal(9.99),
          aiCategory: null,
          normalizedMerchantName: null,
        },
        {
          id: 'trans2',
          merchantName: 'Spotify',
          description: 'Music',
          amount: new Decimal(4.99),
          aiCategory: null,
          normalizedMerchantName: null,
        },
      ];

      vi.mocked(mockDb.transaction.findMany).mockResolvedValue(mockTransactions);
      vi.mocked(mockDb.merchantAlias.findUnique).mockResolvedValue(null);
      vi.mocked(openAIClient.bulkCategorize).mockResolvedValue({
        categorizations: [
          {
            originalName: 'Netflix',
            category: 'streaming',
            confidence: 0.95,
            normalizedName: 'Netflix',
          },
          {
            originalName: 'Spotify',
            category: 'music',
            confidence: 0.93,
            normalizedName: 'Spotify',
          },
        ],
      });

      const result = await service.bulkCategorizeTransactions('user123');

      expect(result.categorized).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(mockDb.transaction.update).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed cached and new categorizations', async () => {
      const mockTransactions = [
        {
          id: 'trans1',
          merchantName: 'Netflix',
          description: 'Streaming',
          amount: new Decimal(9.99),
          aiCategory: null,
          normalizedMerchantName: null,
        },
        {
          id: 'trans2',
          merchantName: 'Spotify',
          description: 'Music',
          amount: new Decimal(4.99),
          aiCategory: null,
          normalizedMerchantName: null,
        },
      ];

      vi.mocked(mockDb.transaction.findMany).mockResolvedValue(mockTransactions);
      
      // Netflix has alias, Spotify doesn't
      vi.mocked(mockDb.merchantAlias.findUnique)
        .mockResolvedValueOnce({
          id: 'alias1',
          originalName: 'netflix',
          normalizedName: 'Netflix',
          category: 'streaming',
          confidence: new Decimal(0.98),
          isVerified: true,
          usageCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastUsedAt: new Date(),
        })
        .mockResolvedValueOnce(null);

      vi.mocked(openAIClient.bulkCategorize).mockResolvedValue({
        categorizations: [
          {
            originalName: 'Spotify',
            category: 'music',
            confidence: 0.93,
            normalizedName: 'Spotify',
          },
        ],
      });

      const result = await service.bulkCategorizeTransactions('user123');

      expect(result.categorized).toBe(2);
      expect(result.failed).toBe(0);
      expect(openAIClient.bulkCategorize).toHaveBeenCalledWith(
        [{ name: 'Spotify', description: 'Music', amount: 4.99 }],
        'user123'
      );
    });

    it('should handle API failures gracefully', async () => {
      const mockTransactions = [
        {
          id: 'trans1',
          merchantName: 'Unknown Service',
          description: 'Some service',
          amount: new Decimal(19.99),
          aiCategory: null,
          normalizedMerchantName: null,
        },
      ];

      vi.mocked(mockDb.transaction.findMany).mockResolvedValue(mockTransactions);
      vi.mocked(mockDb.merchantAlias.findUnique).mockResolvedValue(null);
      vi.mocked(openAIClient.bulkCategorize).mockRejectedValue(new Error('API error'));

      const result = await service.bulkCategorizeTransactions('user123');

      expect(result.categorized).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0]?.error).toBe('AI categorization failed');
    });
  });

  describe('categorizeSubscription', () => {
    const mockSubscription = {
      id: 'sub123',
      userId: 'user123',
      name: 'Netflix Premium',
      description: 'Premium streaming plan',
      amount: new Decimal(15.99),
      category: null,
      aiCategory: null,
      aiCategoryConfidence: null,
      categoryOverride: null,
    };

    it('should return manual override if exists', async () => {
      const overriddenSubscription = {
        ...mockSubscription,
        categoryOverride: 'entertainment',
      };

      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(overriddenSubscription);

      const result = await service.categorizeSubscription('sub123', 'user123');

      expect(result).toEqual({
        category: 'entertainment',
        confidence: 1.0,
      });
      expect(openAIClient.categorizeTransaction).not.toHaveBeenCalled();
    });

    it('should use AI categorization when needed', async () => {
      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(mockSubscription);
      vi.mocked(openAIClient.categorizeTransaction).mockResolvedValue({
        category: 'streaming',
        confidence: 0.94,
        merchantName: 'Netflix',
      });

      const result = await service.categorizeSubscription('sub123', 'user123');

      expect(result).toEqual({
        category: 'streaming',
        confidence: 0.94,
      });
      expect(mockDb.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub123' },
        data: {
          aiCategory: 'streaming',
          aiCategoryConfidence: 0.94,
          category: 'streaming',
        },
      });
    });
  });

  describe('updateSubscriptionCategory', () => {
    it('should update category and clear cache', async () => {
      await service.updateSubscriptionCategory('sub123', 'user123', 'music');

      expect(mockDb.subscription.update).toHaveBeenCalledWith({
        where: {
          id: 'sub123',
          userId: 'user123',
        },
        data: {
          categoryOverride: 'music',
          category: 'music',
        },
      });
      expect(cacheService.invalidate).toHaveBeenCalledWith('subscriptions:user123:*');
    });
  });

  describe('getMerchantAliases', () => {
    it('should filter and paginate merchant aliases', async () => {
      const mockAliases = [
        {
          id: 'alias1',
          originalName: 'netflix',
          normalizedName: 'Netflix',
          category: 'streaming',
          confidence: new Decimal(0.98),
          isVerified: true,
          usageCount: 100,
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockDb.merchantAlias.findMany).mockResolvedValue(mockAliases);
      vi.mocked(mockDb.merchantAlias.count).mockResolvedValue(1);

      const result = await service.getMerchantAliases(
        { category: 'streaming', verified: true },
        { limit: 10, offset: 0 }
      );

      expect(result.total).toBe(1);
      expect(result.aliases).toHaveLength(1);
      expect(result.aliases[0]?.confidence).toBe(0.98);
      expect(mockDb.merchantAlias.findMany).toHaveBeenCalledWith({
        where: {
          category: 'streaming',
          isVerified: true,
        },
        orderBy: { usageCount: 'desc' },
        take: 10,
        skip: 0,
      });
    });
  });

  describe('initializeCategories', () => {
    it('should create default categories if none exist', async () => {
      vi.mocked(mockDb.category.count).mockResolvedValue(0);

      await service.initializeCategories();

      expect(mockDb.category.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'streaming',
            name: 'Streaming',
            icon: '🎬',
          }),
          expect.objectContaining({
            id: 'music',
            name: 'Music',
            icon: '🎵',
          }),
        ]),
      });
    });

    it('should not create categories if they already exist', async () => {
      vi.mocked(mockDb.category.count).mockResolvedValue(10);

      await service.initializeCategories();

      expect(mockDb.category.createMany).not.toHaveBeenCalled();
    });
  });
});