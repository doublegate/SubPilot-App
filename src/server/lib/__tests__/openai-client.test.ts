import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OpenAICategorizationClient,
  SUBSCRIPTION_CATEGORIES,
} from '../openai-client';
import { cacheService } from '@/server/services/cache.service';

// Mock the fetch function
global.fetch = vi.fn();

// Mock the cache service
vi.mock('@/server/services/cache.service', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
  },
  cacheKeys: {},
  cacheTTL: {
    veryLong: 3600,
  },
}));

// Mock the rate limiter
vi.mock('@/server/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 60000,
  }),
}));

describe('OpenAICategorizationClient', () => {
  let client: OpenAICategorizationClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OpenAICategorizationClient('test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('categorizeTransaction', () => {
    it('should return cached result if available', async () => {
      const cachedResult = {
        category: 'streaming',
        confidence: 0.95,
        merchantName: 'Netflix',
        reasoning: 'Cached result',
      };

      vi.mocked(cacheService.get).mockReturnValue(cachedResult);

      const result = await client.categorizeTransaction('NETFLIX.COM');

      expect(result).toEqual(cachedResult);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should call OpenAI API and cache result', async () => {
      vi.mocked(cacheService.get).mockReturnValue(null);

      const apiResponse = {
        category: 'streaming',
        confidence: 0.92,
        merchantName: 'Netflix',
        reasoning: 'Video streaming service',
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(apiResponse),
              },
            },
          ],
        }),
      } as Response);

      const result = await client.categorizeTransaction(
        'NETFLIX.COM *123456',
        'Netflix subscription',
        9.99
      );

      expect(result).toEqual(apiResponse);
      expect(cacheService.set).toHaveBeenCalledWith(
        'ai-categorization:netflix.com *123456',
        apiResponse,
        expect.any(Number)
      );
    });

    it('should fall back to keyword categorization on API error', async () => {
      vi.mocked(cacheService.get).mockReturnValue(null);
      vi.mocked(fetch).mockRejectedValue(new Error('API error'));

      const result = await client.categorizeTransaction('Spotify USA');

      expect(result.category).toBe('music');
      expect(result.confidence).toBe(0.7);
      expect(result.merchantName).toBe('Spotify Usa');
    });

    it('should normalize merchant names correctly', async () => {
      vi.mocked(cacheService.get).mockReturnValue(null);
      vi.mocked(fetch).mockRejectedValue(new Error('API error'));

      const testCases = [
        { input: 'NETFLIX.COM *123456', expected: 'Netflix' },
        { input: 'Spotify USA 8884407', expected: 'Spotify Usa' },
        { input: 'ADOBE *CREATIVE CLOUD', expected: 'Adobe Creative Cloud' },
        { input: 'amazon prime*2v4gh8', expected: 'Amazon Prime' },
      ];

      for (const testCase of testCases) {
        const result = await client.categorizeTransaction(testCase.input);
        expect(result.merchantName).toBe(testCase.expected);
      }
    });
  });

  describe('bulkCategorize', () => {
    it('should use cached results when available', async () => {
      const merchants = [
        { name: 'Netflix', description: 'Streaming' },
        { name: 'Spotify', description: 'Music' },
      ];

      const cachedNetflix = {
        category: 'streaming',
        confidence: 0.95,
        merchantName: 'Netflix',
      };

      vi.mocked(cacheService.get)
        .mockReturnValueOnce(cachedNetflix) // Netflix cached
        .mockReturnValueOnce(null); // Spotify not cached

      const apiResponse = {
        categorizations: [
          {
            originalName: 'Spotify',
            category: 'music',
            confidence: 0.9,
            normalizedName: 'Spotify',
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(apiResponse),
              },
            },
          ],
        }),
      } as Response);

      const result = await client.bulkCategorize(merchants);

      expect(result.categorizations).toHaveLength(2);
      expect(result.categorizations[0]).toEqual({
        originalName: 'Netflix',
        category: 'streaming',
        confidence: 0.95,
        normalizedName: 'Netflix',
      });
      expect(result.categorizations[1]).toEqual({
        originalName: 'Spotify',
        category: 'music',
        confidence: 0.9,
        normalizedName: 'Spotify',
      });
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(cacheService.get).mockReturnValue(null);
      vi.mocked(fetch).mockRejectedValue(new Error('API error'));

      const merchants = [{ name: 'Netflix' }, { name: 'Unknown Service XYZ' }];

      const result = await client.bulkCategorize(merchants);

      expect(result.categorizations).toHaveLength(2);
      expect(result.categorizations[0].category).toBe('streaming');
      expect(result.categorizations[0].confidence).toBe(0.7);
      expect(result.categorizations[1].category).toBe('other');
      expect(result.categorizations[1].confidence).toBe(0.5);
    });
  });

  describe('normalizeMerchantName', () => {
    it('should normalize merchant names using AI', async () => {
      vi.mocked(cacheService.get).mockReturnValue(null);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Netflix',
              },
            },
          ],
        }),
      } as Response);

      const result = await client.normalizeMerchantName('NETFLIX.COM *123456');

      expect(result).toBe('Netflix');
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should use basic normalization on API error', async () => {
      vi.mocked(cacheService.get).mockReturnValue(null);
      vi.mocked(fetch).mockRejectedValue(new Error('API error'));

      const result = await client.normalizeMerchantName('SPOTIFY USA 8884407');

      expect(result).toBe('Spotify Usa');
    });
  });

  describe('fallback categorization', () => {
    it('should categorize based on keywords', async () => {
      vi.mocked(cacheService.get).mockReturnValue(null);
      vi.mocked(fetch).mockRejectedValue(new Error('API error'));

      const testCases = [
        { merchant: 'Netflix', expectedCategory: 'streaming' },
        { merchant: 'Spotify Premium', expectedCategory: 'music' },
        { merchant: 'Adobe Creative Cloud', expectedCategory: 'software' },
        { merchant: 'Xbox Game Pass', expectedCategory: 'gaming' },
        { merchant: 'NY Times Digital', expectedCategory: 'news' },
        { merchant: 'Peloton Membership', expectedCategory: 'fitness' },
        { merchant: 'Coursera Plus', expectedCategory: 'education' },
        { merchant: 'Dropbox Pro', expectedCategory: 'storage' },
        { merchant: 'DoorDash Pass', expectedCategory: 'food' },
        { merchant: 'Unknown Service', expectedCategory: 'other' },
      ];

      for (const testCase of testCases) {
        const result = await client.categorizeTransaction(testCase.merchant);
        expect(result.category).toBe(testCase.expectedCategory);
      }
    });
  });

  describe('cost tracking', () => {
    it('should track API usage costs', async () => {
      vi.mocked(cacheService.get).mockReturnValue(null);

      const apiResponse = {
        category: 'streaming',
        confidence: 0.92,
        merchantName: 'Netflix',
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(apiResponse),
              },
            },
          ],
        }),
      } as Response);

      // Make several categorization requests
      await client.categorizeTransaction(
        'Netflix',
        undefined,
        undefined,
        'user123'
      );
      await client.categorizeTransaction(
        'Spotify',
        undefined,
        undefined,
        'user123'
      );

      const stats = client.getCostStats('user123');
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byUser.user123).toBeGreaterThan(0);
    });
  });
});
