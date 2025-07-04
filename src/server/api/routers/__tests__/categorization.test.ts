import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { categorizationRouter } from '../categorization';
import { getCategorizationService } from '@/server/services/categorization.service';
import { cacheService } from '@/server/services/cache.service';
import { type Session } from 'next-auth';
import { TRPCError } from '@trpc/server';

// Mock categorization service interface
interface MockCategorizationService {
  categorizeTransaction: ReturnType<typeof vi.fn>;
  getCategoryMapping: ReturnType<typeof vi.fn>;
  bulkCategorize: ReturnType<typeof vi.fn>;
}

// Mock dependencies
vi.mock('@/server/services/categorization.service');
vi.mock('@/server/services/cache.service');

const mockSession: Session = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

describe('categorizationRouter', () => {
  let ctx: ReturnType<typeof createInnerTRPCContext>;
  let mockCategorizationService: MockCategorizationService;

  beforeEach(() => {
    vi.clearAllMocks();

    ctx = createInnerTRPCContext({
      session: mockSession,
    });

    mockCategorizationService = {
      categorizeTransaction: vi.fn(),
      bulkCategorizeTransactions: vi.fn(),
      categorizeSubscription: vi.fn(),
      updateSubscriptionCategory: vi.fn(),
      getMerchantAliases: vi.fn(),
      initializeCategories: vi.fn(),
    };

    vi.mocked(getCategorizationService).mockReturnValue(
      mockCategorizationService
    );
    vi.mocked(cacheService.get).mockReturnValue(null);
    vi.mocked(cacheService.set).mockImplementation(() => {});
    vi.mocked(cacheService.invalidate).mockImplementation(() => {});
  });

  describe('categorizeTransaction', () => {
    it('should categorize a transaction successfully', async () => {
      const mockResult = {
        category: 'streaming',
        confidence: 0.95,
        normalizedName: 'Netflix',
      };

      mockCategorizationService.categorizeTransaction.mockResolvedValue(
        mockResult
      );

      const result = await categorizationRouter
        .createCaller(ctx)
        .categorizeTransaction({
          transactionId: 'trans123',
          forceRecategorize: false,
        });

      expect(result).toEqual({
        success: true,
        ...mockResult,
      });
      expect(
        mockCategorizationService.categorizeTransaction
      ).toHaveBeenCalledWith('trans123', 'test-user-id', false);
      expect(cacheService.invalidate).toHaveBeenCalledWith(
        'transactions:test-user-id:*'
      );
      expect(cacheService.invalidate).toHaveBeenCalledWith(
        'analytics:test-user-id:*'
      );
    });

    it('should handle errors properly', async () => {
      mockCategorizationService.categorizeTransaction.mockRejectedValue(
        new Error('AI service unavailable')
      );

      await expect(
        categorizationRouter.createCaller(ctx).categorizeTransaction({
          transactionId: 'trans123',
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('bulkCategorize', () => {
    it('should bulk categorize transactions', async () => {
      const mockResult = {
        categorized: 5,
        failed: 1,
        results: [
          {
            transactionId: 'trans1',
            category: 'streaming',
            confidence: 0.95,
            normalizedName: 'Netflix',
          },
          {
            transactionId: 'trans2',
            category: 'music',
            confidence: 0.92,
            normalizedName: 'Spotify',
          },
        ],
      };

      mockCategorizationService.bulkCategorizeTransactions.mockResolvedValue(
        mockResult
      );

      const result = await categorizationRouter
        .createCaller(ctx)
        .bulkCategorize({
          transactionIds: ['trans1', 'trans2'],
        });

      expect(result).toEqual(mockResult);
      expect(cacheService.invalidate).toHaveBeenCalledWith(
        'transactions:test-user-id:*'
      );
      expect(cacheService.invalidate).toHaveBeenCalledWith(
        'analytics:test-user-id:*'
      );
      expect(cacheService.invalidate).toHaveBeenCalledWith(
        'subscriptions:test-user-id:*'
      );
    });
  });

  describe('categorizeSubscription', () => {
    it('should categorize a subscription', async () => {
      const mockResult = {
        category: 'streaming',
        confidence: 0.93,
      };

      mockCategorizationService.categorizeSubscription.mockResolvedValue(
        mockResult
      );

      const result = await categorizationRouter
        .createCaller(ctx)
        .categorizeSubscription({
          subscriptionId: 'sub123',
          forceRecategorize: true,
        });

      expect(result).toEqual({
        success: true,
        ...mockResult,
      });
      expect(
        mockCategorizationService.categorizeSubscription
      ).toHaveBeenCalledWith('sub123', 'test-user-id', true);
    });
  });

  describe('updateCategory', () => {
    it('should update subscription category', async () => {
      mockCategorizationService.updateSubscriptionCategory.mockResolvedValue(
        undefined
      );

      const result = await categorizationRouter
        .createCaller(ctx)
        .updateCategory({
          subscriptionId: 'sub123',
          category: 'music',
        });

      expect(result).toEqual({ success: true });
      expect(
        mockCategorizationService.updateSubscriptionCategory
      ).toHaveBeenCalledWith('sub123', 'test-user-id', 'music');
    });
  });

  describe('getCategories', () => {
    it('should return cached categories if available', async () => {
      const mockCategories = {
        streaming: {
          name: 'Streaming',
          description: 'Video streaming services',
          icon: '🎬',
          keywords: ['netflix', 'hulu'],
        },
      };

      vi.mocked(cacheService.get).mockReturnValue(mockCategories);

      const result = await categorizationRouter
        .createCaller(ctx)
        .getCategories();

      expect(result).toEqual(mockCategories);
      expect(ctx.db.category.findMany).not.toHaveBeenCalled();
    });

    it('should fetch categories from database', async () => {
      vi.mocked(cacheService.get).mockReturnValue(null);

      const dbCategories = [
        {
          id: 'streaming',
          name: 'Streaming',
          description: 'Video streaming services',
          icon: '🎬',
          keywords: ['netflix', 'hulu'],
          isActive: true,
          sortOrder: 0,
          parentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      ctx.db.category.findMany = vi.fn().mockResolvedValue(dbCategories);

      const result = await categorizationRouter
        .createCaller(ctx)
        .getCategories();

      expect(result).toHaveProperty('streaming');
      expect(result.streaming).toEqual({
        name: 'Streaming',
        description: 'Video streaming services',
        icon: '🎬',
        keywords: ['netflix', 'hulu'],
      });
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should initialize categories if none exist', async () => {
      vi.mocked(cacheService.get).mockReturnValue(null);
      ctx.db.category.findMany = vi.fn().mockResolvedValue([]);

      const result = await categorizationRouter
        .createCaller(ctx)
        .getCategories();

      expect(mockCategorizationService.initializeCategories).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });

  describe('getMerchantAliases', () => {
    it('should get merchant aliases with filters', async () => {
      const mockResult = {
        aliases: [
          {
            id: 'alias1',
            originalName: 'netflix',
            normalizedName: 'Netflix',
            category: 'streaming',
            confidence: 0.98,
            isVerified: true,
            usageCount: 100,
            lastUsedAt: new Date(),
          },
        ],
        total: 1,
      };

      mockCategorizationService.getMerchantAliases.mockResolvedValue(
        mockResult
      );

      const result = await categorizationRouter
        .createCaller(ctx)
        .getMerchantAliases({
          category: 'streaming',
          verified: true,
          limit: 10,
          offset: 0,
        });

      expect(result).toEqual(mockResult);
      expect(mockCategorizationService.getMerchantAliases).toHaveBeenCalledWith(
        {
          category: 'streaming',
          verified: true,
          search: undefined,
        },
        {
          limit: 10,
          offset: 0,
        }
      );
    });
  });

  describe('updateMerchantAlias', () => {
    it('should update merchant alias', async () => {
      const updatedAlias = {
        id: 'alias1',
        originalName: 'netflix',
        normalizedName: 'Netflix Premium',
        category: 'streaming',
        confidence: 0.99,
        isVerified: true,
        usageCount: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      };

      ctx.db.merchantAlias.update = vi.fn().mockResolvedValue(updatedAlias);

      const result = await categorizationRouter
        .createCaller(ctx)
        .updateMerchantAlias({
          aliasId: 'alias1',
          normalizedName: 'Netflix Premium',
          isVerified: true,
        });

      expect(result).toEqual({
        success: true,
        alias: {
          ...updatedAlias,
          confidence: 0.99,
        },
      });
      expect(cacheService.invalidate).toHaveBeenCalledWith(
        'ai-categorization:*'
      );
    });
  });

  describe('getStats', () => {
    it('should return categorization statistics', async () => {
      const mockStats = {
        transactions: {
          total: 100,
          categorized: 85,
          percentage: 85,
        },
        subscriptions: {
          total: 20,
          categorized: 18,
          percentage: 90,
        },
        categoryBreakdown: [
          { category: 'streaming', count: 5 },
          { category: 'music', count: 3 },
        ],
      };

      vi.mocked(cacheService.get).mockReturnValue(null);

      ctx.db.transaction.count = vi
        .fn()
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85); // categorized

      ctx.db.subscription.count = vi
        .fn()
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(18); // categorized

      ctx.db.subscription.groupBy = vi.fn().mockResolvedValue([
        { category: 'streaming', _count: { id: 5 } },
        { category: 'music', _count: { id: 3 } },
      ]);

      const result = await categorizationRouter.createCaller(ctx).getStats();

      expect(result).toEqual(mockStats);
      expect(cacheService.set).toHaveBeenCalled();
    });
  });
});
