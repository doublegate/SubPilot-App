import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  checkRateLimitLegacy,
  trackFailedAuth,
  isAccountLocked,
  clearFailedAuth,
  applyRateLimitHeaders,
  createRateLimitMiddleware,
  getRateLimitStatus,
  clearRateLimit,
  getRateLimitStats,
  RATE_LIMITS,
  PREMIUM_MULTIPLIERS,
  type RateLimitType,
  type PremiumTier,
} from '../rate-limiter';
import { AuditLogger } from '../audit-logger';

// Mock the AuditLogger
vi.mock('../audit-logger', () => ({
  AuditLogger: {
    log: vi.fn(),
  },
}));

// Mock environment variables
vi.mock('@/env', () => ({
  env: {
    REDIS_URL: undefined,
    NODE_ENV: 'test',
  },
}));

// Mock Redis client for testing
class MockRedisClient {
  private store = new Map<string, { value: number; expires: number }>();

  async incr(key: string): Promise<number> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.expires > now) {
      existing.value++;
      return existing.value;
    }

    this.store.set(key, { value: 1, expires: now + 60000 });
    return 1;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const existing = this.store.get(key);
    if (existing) {
      existing.expires = Date.now() + seconds * 1000;
      return 1;
    }
    return 0;
  }

  async get(key: string): Promise<string | null> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.expires > now) {
      return existing.value.toString();
    }

    this.store.delete(key);
    return null;
  }

  async set(
    key: string,
    value: string,
    mode?: string,
    duration?: number
  ): Promise<string | null> {
    const expires = duration ? Date.now() + duration : Date.now() + 60000;
    this.store.set(key, { value: parseInt(value), expires });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  // Test helper methods
  clear() {
    this.store.clear();
  }

  getStore() {
    return this.store;
  }
}

describe('Rate Limiter', () => {
  let mockRedis: MockRedisClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = new MockRedisClient();

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockRedis.clear();
  });

  describe('RATE_LIMITS Configuration', () => {
    it('should have correct rate limit configurations', () => {
      expect(RATE_LIMITS.auth).toEqual({
        window: 15 * 60 * 1000, // 15 minutes
        max: 5,
      });

      expect(RATE_LIMITS.api).toEqual({
        window: 60 * 1000, // 1 minute
        max: 100,
      });

      expect(RATE_LIMITS.ai).toEqual({
        window: 60 * 60 * 1000, // 1 hour
        max: 50,
      });

      expect(RATE_LIMITS.export).toEqual({
        window: 60 * 60 * 1000, // 1 hour
        max: 10,
      });

      expect(RATE_LIMITS.admin).toEqual({
        window: 60 * 1000, // 1 minute
        max: 10,
      });

      expect(RATE_LIMITS.billing).toEqual({
        window: 60 * 1000, // 1 minute
        max: 20,
      });

      expect(RATE_LIMITS.banking).toEqual({
        window: 60 * 1000, // 1 minute
        max: 30,
      });
    });
  });

  describe('PREMIUM_MULTIPLIERS Configuration', () => {
    it('should have correct premium multipliers', () => {
      expect(PREMIUM_MULTIPLIERS.basic).toBe(1);
      expect(PREMIUM_MULTIPLIERS.pro).toBe(2);
      expect(PREMIUM_MULTIPLIERS.team).toBe(3);
      expect(PREMIUM_MULTIPLIERS.enterprise).toBe(5);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const result = await checkRateLimit('client-123', {
        type: 'api',
        endpoint: '/api/test',
        userTier: 'basic',
      });

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(99);
      expect(result.type).toBe('api');
      expect(result.reset).toBeGreaterThan(Date.now());
    });

    it('should apply premium multipliers correctly', async () => {
      const proResult = await checkRateLimit('pro-client', {
        type: 'api',
        userTier: 'pro',
      });

      expect(proResult.limit).toBe(200); // 100 * 2

      const enterpriseResult = await checkRateLimit('enterprise-client', {
        type: 'api',
        userTier: 'enterprise',
      });

      expect(enterpriseResult.limit).toBe(500); // 100 * 5
    });

    it('should reject requests exceeding rate limit', async () => {
      const clientId = 'client-123';

      // Simulate exceeding rate limit by making many requests
      for (let i = 0; i < 10; i++) {
        await mockRedis.incr(`rate_limit:auth:${clientId}`);
      }

      const result = await checkRateLimit(clientId, {
        type: 'auth',
        userId: 'user-123',
        ip: '192.168.1.1',
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(AuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'rate_limit.violation',
          result: 'failure',
          metadata: expect.objectContaining({
            type: 'auth',
            current: expect.any(Number),
            limit: 5,
            clientId,
            ip: '192.168.1.1',
            userTier: 'basic',
          }),
        })
      );
    });

    it('should handle different rate limit types', async () => {
      const rateLimitTypes: RateLimitType[] = [
        'auth',
        'api',
        'ai',
        'export',
        'admin',
        'billing',
        'banking',
      ];

      for (const type of rateLimitTypes) {
        const result = await checkRateLimit('client-123', { type });
        expect(result.type).toBe(type);
        expect(result.limit).toBe(RATE_LIMITS[type].max);
      }
    });

    it('should fail open on Redis errors', async () => {
      // Mock Redis to throw an error
      vi.spyOn(mockRedis, 'incr').mockRejectedValue(new Error('Redis error'));

      const result = await checkRateLimit('client-123', {
        type: 'api',
        userId: 'user-123',
      });

      expect(result.allowed).toBe(true);
      expect(AuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'rate_limit.system_error',
          result: 'failure',
          error: 'Redis error',
        })
      );
    });

    it('should use endpoint-specific keys when provided', async () => {
      const result1 = await checkRateLimit('client-123', {
        type: 'api',
        endpoint: '/api/endpoint1',
      });

      const result2 = await checkRateLimit('client-123', {
        type: 'api',
        endpoint: '/api/endpoint2',
      });

      // Both should be allowed since they use different keys
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('checkRateLimitLegacy', () => {
    it('should maintain backwards compatibility', async () => {
      const result = await checkRateLimitLegacy('client-123');

      expect(result).toEqual({
        allowed: true,
        limit: 100,
        remaining: 99,
        reset: expect.any(Number),
      });
    });

    it('should support endpoint parameter', async () => {
      const result = await checkRateLimitLegacy('client-123', '/api/legacy');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
    });
  });

  describe('trackFailedAuth', () => {
    it('should track failed authentication attempts', async () => {
      const identifier = 'user@example.com';

      const result1 = await trackFailedAuth(identifier);
      expect(result1.attempts).toBe(1);
      expect(result1.locked).toBe(false);

      const result2 = await trackFailedAuth(identifier);
      expect(result2.attempts).toBe(2);
      expect(result2.locked).toBe(false);
    });

    it('should lock account after max failed attempts', async () => {
      const identifier = 'user@example.com';

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await trackFailedAuth(identifier);
      }

      const result = await trackFailedAuth(identifier);
      expect(result.attempts).toBe(6);
      expect(result.locked).toBe(true);
      expect(result.lockUntil).toBeInstanceOf(Date);
      expect(result.lockUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle Redis errors gracefully', async () => {
      vi.spyOn(mockRedis, 'incr').mockRejectedValue(new Error('Redis error'));

      const result = await trackFailedAuth('user@example.com');

      expect(result.attempts).toBe(0);
      expect(result.locked).toBe(false);
    });
  });

  describe('isAccountLocked', () => {
    it('should check if account is locked', async () => {
      const identifier = 'user@example.com';
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000);

      await mockRedis.set(`auth_lock:${identifier}`, lockUntil.toISOString());

      const result = await isAccountLocked(identifier);
      expect(result.locked).toBe(true);
      expect(result.until).toEqual(lockUntil);
    });

    it('should return not locked for unlocked accounts', async () => {
      const result = await isAccountLocked('unlocked@example.com');
      expect(result.locked).toBe(false);
      expect(result.until).toBeUndefined();
    });

    it('should handle Redis errors gracefully', async () => {
      vi.spyOn(mockRedis, 'get').mockRejectedValue(new Error('Redis error'));

      const result = await isAccountLocked('user@example.com');
      expect(result.locked).toBe(false);
    });
  });

  describe('clearFailedAuth', () => {
    it('should clear failed auth attempts and lock', async () => {
      const identifier = 'user@example.com';

      // Set up some failed attempts and lock
      await mockRedis.set(`auth_fails:${identifier}`, '3');
      await mockRedis.set(`auth_lock:${identifier}`, new Date().toISOString());

      await clearFailedAuth(identifier);

      // Should have cleared both keys
      expect(await mockRedis.get(`auth_fails:${identifier}`)).toBeNull();
      expect(await mockRedis.get(`auth_lock:${identifier}`)).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      vi.spyOn(mockRedis, 'del').mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(
        clearFailedAuth('user@example.com')
      ).resolves.toBeUndefined();
    });
  });

  describe('applyRateLimitHeaders', () => {
    it('should apply rate limit headers correctly', () => {
      const headers = new Headers();
      const rateLimitInfo = {
        limit: 100,
        remaining: 50,
        reset: Date.now() + 60000,
        type: 'api' as RateLimitType,
      };

      applyRateLimitHeaders(headers, rateLimitInfo);

      expect(headers.get('X-RateLimit-Limit')).toBe('100');
      expect(headers.get('X-RateLimit-Remaining')).toBe('50');
      expect(headers.get('X-RateLimit-Reset')).toBe(
        rateLimitInfo.reset.toString()
      );
      expect(headers.get('X-RateLimit-Type')).toBe('api');
      expect(headers.get('Retry-After')).toBeNull();
    });

    it('should set Retry-After header when limit exceeded', () => {
      const headers = new Headers();
      const reset = Date.now() + 60000;
      const rateLimitInfo = {
        limit: 100,
        remaining: 0,
        reset,
      };

      applyRateLimitHeaders(headers, rateLimitInfo);

      expect(headers.get('Retry-After')).toBeTruthy();
      const retryAfter = parseInt(headers.get('Retry-After')!);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });
  });

  describe('createRateLimitMiddleware', () => {
    it('should create middleware that checks rate limits', async () => {
      const middleware = createRateLimitMiddleware('api');

      const mockCtx = {
        session: { user: { id: 'user-123' } },
        clientIp: '192.168.1.1',
      };

      const mockNext = vi.fn().mockResolvedValue('success');

      const result = await middleware({
        ctx: mockCtx,
        next: mockNext,
        path: '/api/test',
      });

      expect(result).toBe('success');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error when rate limit exceeded', async () => {
      const middleware = createRateLimitMiddleware('auth');

      // Simulate exceeding rate limit
      const clientId = 'user-123';
      for (let i = 0; i < 10; i++) {
        await mockRedis.incr(`rate_limit:auth:${clientId}`);
      }

      const mockCtx = {
        session: { user: { id: 'user-123' } },
        clientIp: '192.168.1.1',
      };

      const mockNext = vi.fn();

      await expect(
        middleware({
          ctx: mockCtx,
          next: mockNext,
          path: '/api/auth/signin',
        })
      ).rejects.toThrow('Rate limit exceeded for auth endpoints');

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use custom key generator', async () => {
      const customKeyGenerator = (ctx: any) => `custom:${ctx.customId}`;
      const middleware = createRateLimitMiddleware('api', {
        keyGenerator: customKeyGenerator,
      });

      const mockCtx = {
        customId: 'custom-123',
        session: null,
      };

      const mockNext = vi.fn().mockResolvedValue('success');

      await middleware({
        ctx: mockCtx,
        next: mockNext,
        path: '/api/test',
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should log successful and failed requests', async () => {
      const middleware = createRateLimitMiddleware('api');

      const mockCtx = {
        session: { user: { id: 'user-123' } },
        clientIp: '192.168.1.1',
      };

      // Test successful request
      const mockNext = vi.fn().mockResolvedValue('success');
      await middleware({
        ctx: mockCtx,
        next: mockNext,
        path: '/api/test',
      });

      expect(AuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'rate_limit.api.success',
          result: 'success',
        })
      );

      // Test failed request
      const mockNextFail = vi.fn().mockRejectedValue(new Error('API error'));
      await expect(
        middleware({
          ctx: mockCtx,
          next: mockNextFail,
          path: '/api/test',
        })
      ).rejects.toThrow('API error');

      expect(AuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'rate_limit.api.error',
          result: 'failure',
          error: 'API error',
        })
      );
    });

    it('should skip logging when configured', async () => {
      const middleware = createRateLimitMiddleware('api', {
        skipSuccessful: true,
        skipFailed: true,
      });

      const mockCtx = {
        session: { user: { id: 'user-123' } },
        clientIp: '192.168.1.1',
      };

      // Clear previous calls
      vi.mocked(AuditLogger.log).mockClear();

      const mockNext = vi.fn().mockResolvedValue('success');
      await middleware({
        ctx: mockCtx,
        next: mockNext,
        path: '/api/test',
      });

      // Should not have logged success
      expect(AuditLogger.log).not.toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'rate_limit.api.success',
        })
      );
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current rate limit status', async () => {
      const clientId = 'client-123';
      await mockRedis.set(`rate_limit:api:${clientId}`, '25');

      const status = await getRateLimitStatus(clientId, 'api');

      expect(status.current).toBe(25);
      expect(status.limit).toBe(100);
      expect(status.remaining).toBe(75);
      expect(status.blocked).toBe(false);
      expect(status.resetAt).toBeInstanceOf(Date);
    });

    it('should indicate when blocked', async () => {
      const clientId = 'client-123';
      await mockRedis.set(`rate_limit:api:${clientId}`, '150');

      const status = await getRateLimitStatus(clientId, 'api');

      expect(status.current).toBe(150);
      expect(status.blocked).toBe(true);
      expect(status.remaining).toBe(0);
    });

    it('should handle Redis errors gracefully', async () => {
      vi.spyOn(mockRedis, 'get').mockRejectedValue(new Error('Redis error'));

      const status = await getRateLimitStatus('client-123', 'api');

      expect(status.current).toBe(0);
      expect(status.limit).toBe(100);
      expect(status.remaining).toBe(100);
      expect(status.blocked).toBe(false);
    });
  });

  describe('clearRateLimit', () => {
    it('should clear rate limit for specific type', async () => {
      const clientId = 'client-123';
      await mockRedis.set(`rate_limit:api:${clientId}`, '50');
      await mockRedis.set(`rate_limit:auth:${clientId}`, '3');

      await clearRateLimit(clientId, 'api');

      expect(await mockRedis.get(`rate_limit:api:${clientId}`)).toBeNull();
      expect(await mockRedis.get(`rate_limit:auth:${clientId}`)).toBe('3');
    });

    it('should clear all rate limits when no type specified', async () => {
      const clientId = 'client-123';
      await mockRedis.set(`rate_limit:api:${clientId}`, '50');
      await mockRedis.set(`rate_limit:auth:${clientId}`, '3');
      await mockRedis.set(`rate_limit:ai:${clientId}`, '10');

      await clearRateLimit(clientId);

      expect(await mockRedis.get(`rate_limit:api:${clientId}`)).toBeNull();
      expect(await mockRedis.get(`rate_limit:auth:${clientId}`)).toBeNull();
      expect(await mockRedis.get(`rate_limit:ai:${clientId}`)).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      vi.spyOn(mockRedis, 'del').mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(clearRateLimit('client-123')).resolves.toBeUndefined();
    });
  });

  describe('getRateLimitStats', () => {
    it('should return rate limit statistics', async () => {
      const stats = await getRateLimitStats();

      expect(stats).toEqual({
        totalViolations: 0,
        violationsByType: {
          auth: 0,
          api: 0,
          ai: 0,
          export: 0,
          admin: 0,
          billing: 0,
          banking: 0,
        },
        topViolators: [],
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle non-numeric Redis values', async () => {
      await mockRedis.set('rate_limit:api:client-123', 'invalid');

      const status = await getRateLimitStatus('client-123', 'api');
      expect(status.current).toBe(0); // NaN should become 0
    });

    it('should handle extremely large request counts', async () => {
      const clientId = 'client-123';
      await mockRedis.set(`rate_limit:api:${clientId}`, '999999999');

      const result = await checkRateLimit(clientId, { type: 'api' });
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle negative remaining values correctly', async () => {
      const clientId = 'client-123';
      await mockRedis.set(`rate_limit:api:${clientId}`, '150');

      const status = await getRateLimitStatus(clientId, 'api');
      expect(status.remaining).toBe(0); // Should not be negative
    });

    it('should handle missing session in middleware', async () => {
      const middleware = createRateLimitMiddleware('api');

      const mockCtx = {
        session: null,
        clientIp: '192.168.1.1',
      };

      const mockNext = vi.fn().mockResolvedValue('success');

      const result = await middleware({
        ctx: mockCtx,
        next: mockNext,
        path: '/api/test',
      });

      expect(result).toBe('success');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use fallback client identifier', async () => {
      const middleware = createRateLimitMiddleware('api');

      const mockCtx = {
        session: null,
        clientIp: null,
      };

      const mockNext = vi.fn().mockResolvedValue('success');

      const result = await middleware({
        ctx: mockCtx,
        next: mockNext,
        path: '/api/test',
      });

      expect(result).toBe('success');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
