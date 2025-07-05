import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  applyRateLimitHeaders,
  RATE_LIMITS,
  PREMIUM_MULTIPLIERS,
  type RateLimitType,
} from '../rate-limiter';

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  type: RateLimitType;
};
import { AuditLogger } from '../audit-logger';

// Mock the AuditLogger
vi.mock('../audit-logger', () => ({
  AuditLogger: {
    log: vi.fn(),
  },
}));

// Mock environment variables to use in-memory store
vi.mock('@/env', () => ({
  env: {
    REDIS_URL: undefined, // Force in-memory store
    NODE_ENV: 'test',
  },
}));

describe('Rate Limiter Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rate Limit Configuration', () => {
    it('should have expected rate limit configurations', () => {
      expect(RATE_LIMITS.auth.max).toBe(5);
      expect(RATE_LIMITS.api.max).toBe(100);
      expect(RATE_LIMITS.ai.max).toBe(50);
      expect(RATE_LIMITS.export.max).toBe(10);
      expect(RATE_LIMITS.admin.max).toBe(10);
      expect(RATE_LIMITS.billing.max).toBe(20);
      expect(RATE_LIMITS.banking.max).toBe(30);
    });

    it('should have expected premium multipliers', () => {
      expect(PREMIUM_MULTIPLIERS.basic).toBe(1);
      expect(PREMIUM_MULTIPLIERS.pro).toBe(2);
      expect(PREMIUM_MULTIPLIERS.team).toBe(3);
      expect(PREMIUM_MULTIPLIERS.enterprise).toBe(5);
    });
  });

  describe('Basic Rate Limiting', () => {
    it('should allow first request', async () => {
      const result = await checkRateLimit('test-client-1', {
        type: 'api',
      });

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(99);
      expect(result.type).toBe('api');
    });

    it('should apply premium multipliers', async () => {
      const basicResult = await checkRateLimit('test-client-basic', {
        type: 'api',
        userTier: 'basic',
      });

      const proResult = await checkRateLimit('test-client-pro', {
        type: 'api',
        userTier: 'pro',
      });

      const enterpriseResult = await checkRateLimit('test-client-enterprise', {
        type: 'api',
        userTier: 'enterprise',
      });

      expect(basicResult.limit).toBe(100);
      expect(proResult.limit).toBe(200);
      expect(enterpriseResult.limit).toBe(500);
    });

    it('should track different rate limit types separately', async () => {
      const clientId = 'test-client-types';

      const apiResult = await checkRateLimit(clientId, { type: 'api' });
      const authResult = await checkRateLimit(clientId, { type: 'auth' });
      const aiResult = await checkRateLimit(clientId, { type: 'ai' });

      expect(apiResult.remaining).toBe(99);
      expect(authResult.remaining).toBe(4);
      expect(aiResult.remaining).toBe(49);
    });

    it('should track different endpoints separately', async () => {
      const clientId = 'test-client-endpoints';

      const endpoint1Result = await checkRateLimit(clientId, {
        type: 'api',
        endpoint: '/api/endpoint1',
      });

      const endpoint2Result = await checkRateLimit(clientId, {
        type: 'api',
        endpoint: '/api/endpoint2',
      });

      // Both should be at limit - 1 since they're tracked separately
      expect(endpoint1Result.remaining).toBe(99);
      expect(endpoint2Result.remaining).toBe(99);
    });
  });

  describe('Rate Limit Enforcement', () => {
    it('should eventually block requests when limit exceeded', async () => {
      const clientId = 'test-client-block';
      const type: RateLimitType = 'auth'; // Lower limit for faster testing

      let lastResult: RateLimitResult | undefined;

      // Make requests up to the limit
      for (let i = 0; i < RATE_LIMITS.auth.max + 5; i++) {
        lastResult = await checkRateLimit(clientId, { type });
      }

      // Last result should be blocked
      expect(lastResult).toBeDefined();
      expect(lastResult!.allowed).toBe(false);
      expect(lastResult!.remaining).toBe(0);

      // Should have logged rate limit violation
      expect(AuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'rate_limit.violation',
          result: 'failure',
        })
      );
    });

    it('should track remaining count correctly', async () => {
      const clientId = 'test-client-remaining';

      const results = [];
      for (let i = 0; i < 3; i++) {
        results.push(await checkRateLimit(clientId, { type: 'auth' }));
      }

      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      expect(results[2]).toBeDefined();
      expect(results[0]!.remaining).toBe(4);
      expect(results[1]!.remaining).toBe(3);
      expect(results[2]!.remaining).toBe(2);
    });
  });

  describe('applyRateLimitHeaders', () => {
    it('should set correct headers', () => {
      const headers = new Headers();
      const rateLimitInfo = {
        limit: 100,
        remaining: 75,
        reset: Date.now() + 60000,
        type: 'api' as RateLimitType,
      };

      applyRateLimitHeaders(headers, rateLimitInfo);

      expect(headers.get('X-RateLimit-Limit')).toBe('100');
      expect(headers.get('X-RateLimit-Remaining')).toBe('75');
      expect(headers.get('X-RateLimit-Reset')).toBe(
        rateLimitInfo.reset.toString()
      );
      expect(headers.get('X-RateLimit-Type')).toBe('api');
    });

    it('should set Retry-After when limit reached', () => {
      const headers = new Headers();
      const rateLimitInfo = {
        limit: 100,
        remaining: 0,
        reset: Date.now() + 30000, // 30 seconds
      };

      applyRateLimitHeaders(headers, rateLimitInfo);

      const retryAfter = headers.get('Retry-After');
      expect(retryAfter).toBeTruthy();
      expect(parseInt(retryAfter!)).toBeGreaterThan(0);
      expect(parseInt(retryAfter!)).toBeLessThanOrEqual(30);
    });
  });

  describe('Error Handling', () => {
    it('should handle all valid rate limit types', async () => {
      const types: RateLimitType[] = [
        'auth',
        'api',
        'ai',
        'export',
        'admin',
        'billing',
        'banking',
      ];

      for (const type of types) {
        const result = await checkRateLimit('test-client', { type });
        expect(result).toBeDefined();
        expect(result.allowed).toBe(true);
        expect(result.type).toBe(type);
      }
    });

    it('should handle missing client ID', async () => {
      const result = await checkRateLimit('', {
        type: 'api',
      });

      expect(result).toBeDefined();
      expect(result.allowed).toBeDefined();
    });

    it('should handle undefined user tier', async () => {
      const result = await checkRateLimit('test-client', {
        type: 'api',
        userTier: undefined as any,
      });

      expect(result.limit).toBe(100); // Should use basic (default)
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent rate limit checks', async () => {
      const clientId = 'test-client-concurrent';

      const promises = Array(10)
        .fill(0)
        .map(() => checkRateLimit(clientId, { type: 'api' }));

      const results = await Promise.all(promises);

      // All should be defined
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.allowed).toBeDefined();
      });

      // Total remaining should reflect all requests
      const lastResult = results[results.length - 1];
      expect(lastResult).toBeDefined();
      expect(lastResult!.remaining).toBeLessThan(100);
    });

    it('should handle multiple clients concurrently', async () => {
      const promises = Array(5)
        .fill(0)
        .map((_, i) => checkRateLimit(`client-${i}`, { type: 'api' }));

      const results = await Promise.all(promises);

      // Each client should have their own limit
      results.forEach(result => {
        expect(result.remaining).toBe(99); // First request for each client
      });
    });
  });

  describe('Premium Features', () => {
    it('should give premium users higher limits', async () => {
      const basicUser = await checkRateLimit('basic-user', {
        type: 'ai',
        userTier: 'basic',
      });

      const proUser = await checkRateLimit('pro-user', {
        type: 'ai',
        userTier: 'pro',
      });

      const enterpriseUser = await checkRateLimit('enterprise-user', {
        type: 'ai',
        userTier: 'enterprise',
      });

      expect(basicUser.limit).toBe(50);
      expect(proUser.limit).toBe(100);
      expect(enterpriseUser.limit).toBe(250);
    });

    it('should apply multipliers correctly to different types', async () => {
      const userTier = 'team'; // 3x multiplier

      const authResult = await checkRateLimit('team-user', {
        type: 'auth',
        userTier,
      });

      const exportResult = await checkRateLimit('team-user-2', {
        type: 'export',
        userTier,
      });

      expect(authResult.limit).toBe(15); // 5 * 3
      expect(exportResult.limit).toBe(30); // 10 * 3
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in client ID', async () => {
      const specialClientId = 'client@#$%^&*()[]{}|;:,.<>?`~';

      const result = await checkRateLimit(specialClientId, {
        type: 'api',
      });

      expect(result).toBeDefined();
      expect(result.allowed).toBe(true);
    });

    it('should handle very long client IDs', async () => {
      const longClientId = 'x'.repeat(1000);

      const result = await checkRateLimit(longClientId, {
        type: 'api',
      });

      expect(result).toBeDefined();
      expect(result.allowed).toBe(true);
    });

    it('should handle empty endpoint', async () => {
      const result = await checkRateLimit('test-client', {
        type: 'api',
        endpoint: '',
      });

      expect(result).toBeDefined();
      expect(result.allowed).toBe(true);
    });

    it('should track different IPs separately', async () => {
      const clientId = 'test-client-ip';

      const ip1Result = await checkRateLimit(clientId, {
        type: 'api',
        ip: '192.168.1.1',
      });

      const ip2Result = await checkRateLimit(clientId, {
        type: 'api',
        ip: '192.168.1.2',
      });

      // Different IPs but same client ID should use same rate limit
      expect(ip1Result.remaining).toBe(99);
      expect(ip2Result.remaining).toBe(98); // Second request for same client
    });
  });

  describe('Security Logging', () => {
    it('should log rate limit violations with metadata', async () => {
      const clientId = 'test-client-logging';

      // Exceed rate limit
      for (let i = 0; i <= RATE_LIMITS.auth.max; i++) {
        await checkRateLimit(clientId, {
          type: 'auth',
          userId: 'user-123',
          ip: '192.168.1.100',
          endpoint: '/api/auth/login',
        });
      }

      expect(AuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          action: 'rate_limit.violation',
          result: 'failure',
          metadata: expect.objectContaining({
            type: 'auth',
            endpoint: '/api/auth/login',
            clientId,
            ip: '192.168.1.100',
            current: expect.any(Number),
            limit: expect.any(Number),
          }),
        })
      );
    });

    it('should include user tier in violation logs', async () => {
      const clientId = 'test-client-tier-logging';

      // Exceed rate limit for premium user
      for (let i = 0; i <= RATE_LIMITS.auth.max * 2; i++) {
        await checkRateLimit(clientId, {
          type: 'auth',
          userTier: 'pro',
        });
      }

      expect(AuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userTier: 'pro',
          }),
        })
      );
    });
  });
});
