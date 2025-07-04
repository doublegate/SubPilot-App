import { AuditLogger } from './audit-logger';

// Enhanced rate limiting configuration with different limits per endpoint type
export const RATE_LIMITS = {
  // Authentication endpoints - strict limits
  auth: {
    window: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
  },

  // General API endpoints
  api: {
    window: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
  },

  // AI assistant endpoints - more restrictive due to cost
  ai: {
    window: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 AI requests per hour
  },

  // Data export endpoints - very restrictive
  export: {
    window: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 exports per hour
  },

  // Admin endpoints - very strict
  admin: {
    window: 60 * 1000, // 1 minute
    max: 10, // 10 admin actions per minute
  },

  // Billing/payment endpoints - strict
  billing: {
    window: 60 * 1000, // 1 minute
    max: 20, // 20 billing requests per minute
  },

  // Bank/Plaid endpoints - moderate
  banking: {
    window: 60 * 1000, // 1 minute
    max: 30, // 30 banking requests per minute
  },
} as const;

// Legacy constants for backwards compatibility
const RATE_LIMIT_WINDOW = RATE_LIMITS.api.window;
const MAX_FAILED_AUTH_ATTEMPTS = 5;
const AUTH_LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

// Premium user rate limit multipliers
export const PREMIUM_MULTIPLIERS = {
  basic: 1,
  pro: 2,
  team: 3,
  enterprise: 5,
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;
export type PremiumTier = keyof typeof PREMIUM_MULTIPLIERS;

// Redis client interface (to avoid direct dependency if Redis not configured)
interface RedisLike {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode?: string,
    duration?: number
  ): Promise<string | null>;
  del(key: string): Promise<number>;
  on?(event: string, listener: (error: Error) => void): void;
  once?(event: string, listener: () => void): void;
  disconnect?(): void;
}

// In-memory fallback for development
class InMemoryStore implements RedisLike {
  private store = new Map<string, { value: number; expires: number }>();

  async incr(key: string): Promise<number> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.expires > now) {
      existing.value++;
      return existing.value;
    }

    this.store.set(key, { value: 1, expires: now + RATE_LIMIT_WINDOW });
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
    const expires = duration
      ? Date.now() + duration
      : Date.now() + RATE_LIMIT_WINDOW;
    this.store.set(key, { value: parseInt(value), expires });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  // Cleanup expired entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.expires < now) {
        this.store.delete(key);
      }
    }
  }
}

// Get or create Redis client
let redisClient: RedisLike | null = null;

async function getRedisClient(): Promise<RedisLike> {
  if (redisClient) return redisClient;

  // Use Redis if available
  if (process.env.REDIS_URL) {
    try {
      // Dynamic import to avoid build errors if ioredis is not installed
      // @ts-expect-error - ioredis is an optional dependency
      const redisModule = (await import('ioredis')) as {
        default: new (url: string, options?: object) => RedisLike;
      };
      const Redis = redisModule.default;

      // Create Redis instance with proper error handling
      const client = new Redis(process.env.REDIS_URL, {
        // Disable auto-reconnect to prevent connection spam
        retryStrategy: () => null,
        // Don't show connection errors in console
        showFriendlyErrorStack: false,
      });

      // Handle connection errors gracefully
      client.on?.('error', (error: Error) => {
        if (!error.message.includes('ECONNREFUSED')) {
          console.error('Redis error:', error.message);
        }
      });

      // Test the connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.disconnect?.();
          reject(new Error('Redis connection timeout'));
        }, 5000);

        client.once?.('ready', () => {
          clearTimeout(timeout);
          console.log('✅ Redis rate limiter initialized');
          resolve();
        });

        client.once?.('error', () => {
          clearTimeout(timeout);
          client.disconnect?.();
          reject(new Error('Redis connection failed'));
        });
      });

      redisClient = client;
      return client;
    } catch {
      console.warn(
        '⚠️  Failed to connect to Redis, falling back to in-memory rate limiting'
      );
    }
  }

  // Fallback to in-memory store
  if (!process.env.REDIS_URL) {
    console.log('📝 Using in-memory rate limiting (Redis not configured)');
  }
  redisClient = new InMemoryStore();

  // Cleanup expired entries every minute
  setInterval(() => {
    if (redisClient instanceof InMemoryStore) {
      redisClient.cleanup();
    }
  }, 60000);

  return redisClient;
}

/**
 * Enhanced rate limit check with different limits per endpoint type
 */
export async function checkRateLimit(
  clientId: string,
  options: {
    type?: RateLimitType;
    endpoint?: string;
    userTier?: PremiumTier;
    userId?: string;
    ip?: string;
  } = {}
): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  type: RateLimitType;
}> {
  const { type = 'api', endpoint, userTier = 'basic', userId, ip } = options;
  const redis = await getRedisClient();

  // Get rate limit configuration for this type
  const config = RATE_LIMITS[type];
  const baseLimit = config.max;
  const window = config.window;

  // Apply premium multiplier
  const premiumMultiplier = PREMIUM_MULTIPLIERS[userTier];
  const effectiveLimit = Math.floor(baseLimit * premiumMultiplier);

  // Create rate limit key
  const key = endpoint
    ? `rate_limit:${type}:${clientId}:${endpoint}`
    : `rate_limit:${type}:${clientId}`;

  try {
    const current = await redis.incr(key);

    // Set expiry on first request
    if (current === 1) {
      await redis.expire(key, Math.floor(window / 1000));
    }

    const allowed = current <= effectiveLimit;
    const reset = Date.now() + window;

    // Log rate limit violations for security monitoring
    if (!allowed) {
      await AuditLogger.log({
        userId,
        action: 'rate_limit.violation',
        result: 'failure',
        metadata: {
          type,
          endpoint,
          current,
          limit: effectiveLimit,
          clientId,
          ip,
          userTier,
        },
      });

      console.warn(
        `🚨 Rate limit exceeded: ${clientId} (${type}) - ${current}/${effectiveLimit}`
      );
    }

    return {
      allowed,
      limit: effectiveLimit,
      remaining: Math.max(0, effectiveLimit - current),
      reset,
      type,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);

    // Log the error
    await AuditLogger.log({
      userId,
      action: 'rate_limit.system_error',
      result: 'failure',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: { type, endpoint, clientId },
    });

    // Fail open in case of errors (security vs availability trade-off)
    return {
      allowed: true,
      limit: effectiveLimit,
      remaining: effectiveLimit,
      reset: Date.now() + window,
      type,
    };
  }
}

/**
 * Legacy function for backwards compatibility
 */
export async function checkRateLimitLegacy(
  clientId: string,
  endpoint?: string
): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const result = await checkRateLimit(clientId, {
    type: 'api',
    endpoint,
  });

  return {
    allowed: result.allowed,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Track failed authentication attempts
 */
export async function trackFailedAuth(identifier: string): Promise<{
  attempts: number;
  locked: boolean;
  lockUntil?: Date;
}> {
  const redis = await getRedisClient();
  const key = `auth_fails:${identifier}`;

  try {
    const attempts = await redis.incr(key);

    // Set expiry on first attempt (reset after 30 minutes)
    if (attempts === 1) {
      await redis.expire(key, 1800); // 30 minutes
    }

    // Check if account should be locked
    if (attempts >= MAX_FAILED_AUTH_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + AUTH_LOCKOUT_DURATION);
      await redis.set(
        `auth_lock:${identifier}`,
        lockUntil.toISOString(),
        'PX',
        AUTH_LOCKOUT_DURATION
      );

      return {
        attempts,
        locked: true,
        lockUntil,
      };
    }

    return {
      attempts,
      locked: false,
    };
  } catch (error) {
    console.error('Failed auth tracking error:', error);
    return {
      attempts: 0,
      locked: false,
    };
  }
}

/**
 * Check if an account is locked
 */
export async function isAccountLocked(identifier: string): Promise<{
  locked: boolean;
  until?: Date;
}> {
  const redis = await getRedisClient();
  const key = `auth_lock:${identifier}`;

  try {
    const lockUntil = await redis.get(key);

    if (lockUntil) {
      return {
        locked: true,
        until: new Date(lockUntil),
      };
    }

    return {
      locked: false,
    };
  } catch (error) {
    console.error('Account lock check error:', error);
    return {
      locked: false,
    };
  }
}

/**
 * Clear failed authentication attempts (on successful login)
 */
export async function clearFailedAuth(identifier: string): Promise<void> {
  const redis = await getRedisClient();

  try {
    await redis.del(`auth_fails:${identifier}`);
    await redis.del(`auth_lock:${identifier}`);
  } catch (error) {
    console.error('Failed to clear auth attempts:', error);
  }
}

/**
 * Apply rate limit headers to response
 */
export function applyRateLimitHeaders(
  headers: Headers,
  rateLimitInfo: {
    limit: number;
    remaining: number;
    reset: number;
    type?: RateLimitType;
  }
): void {
  headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
  headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
  headers.set('X-RateLimit-Reset', rateLimitInfo.reset.toString());

  // Add rate limit type for debugging
  if (rateLimitInfo.type) {
    headers.set('X-RateLimit-Type', rateLimitInfo.type);
  }

  if (rateLimitInfo.remaining === 0) {
    const retryAfter = Math.ceil((rateLimitInfo.reset - Date.now()) / 1000);
    headers.set('Retry-After', retryAfter.toString());
  }
}

/**
 * Create rate limit middleware for tRPC procedures
 */
interface TRPCContext {
  session?: {
    user?: {
      id: string;
      subscriptionTier?: string;
    };
  };
  clientIp?: string;
}

export function createRateLimitMiddleware(
  type: RateLimitType,
  options: {
    keyGenerator?: (ctx: TRPCContext) => string;
    skipSuccessful?: boolean;
    skipFailed?: boolean;
  } = {}
) {
  const { keyGenerator, skipSuccessful = false, skipFailed = false } = options;

  return async (opts: {
    ctx: TRPCContext;
    next: () => Promise<unknown>;
    path: string;
  }) => {
    const { ctx, next, path } = opts;

    // Generate client identifier
    const clientId = keyGenerator
      ? keyGenerator(ctx)
      : (ctx.session?.user?.id ?? ctx.clientIp ?? 'anonymous');

    // Get user tier for premium rate limits
    const userTier = ctx.session?.user?.subscriptionTier ?? 'basic';

    // Check rate limit before proceeding
    const rateLimitResult = await checkRateLimit(clientId, {
      type,
      endpoint: path,
      userTier,
      userId: ctx.session?.user?.id,
      ip: ctx.clientIp,
    });

    if (!rateLimitResult.allowed) {
      const error = new Error(`Rate limit exceeded for ${type} endpoints`);

      // Add rate limit info to error for middleware to use
      (
        error as Error & { rateLimitInfo?: typeof rateLimitResult }
      ).rateLimitInfo = rateLimitResult;

      throw error;
    }

    try {
      const result = await next();

      // Track successful requests if not skipping
      if (!skipSuccessful) {
        await AuditLogger.log({
          userId: ctx.session?.user?.id,
          action: `rate_limit.${type}.success`,
          result: 'success',
          metadata: {
            endpoint: path,
            remaining: rateLimitResult.remaining,
            limit: rateLimitResult.limit,
          },
        });
      }

      return result;
    } catch (error) {
      // Track failed requests if not skipping
      if (!skipFailed) {
        await AuditLogger.log({
          userId: ctx.session?.user?.id,
          action: `rate_limit.${type}.error`,
          result: 'failure',
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            endpoint: path,
            remaining: rateLimitResult.remaining,
            limit: rateLimitResult.limit,
          },
        });
      }

      throw error;
    }
  };
}

/**
 * Get rate limit status for a client (useful for dashboards)
 */
export async function getRateLimitStatus(
  clientId: string,
  type: RateLimitType = 'api'
): Promise<{
  current: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  blocked: boolean;
}> {
  const redis = await getRedisClient();
  const key = `rate_limit:${type}:${clientId}`;

  try {
    const current = parseInt((await redis.get(key)) ?? '0');
    const config = RATE_LIMITS[type];
    const limit = config.max;

    return {
      current,
      limit,
      remaining: Math.max(0, limit - current),
      resetAt: new Date(Date.now() + config.window),
      blocked: current >= limit,
    };
  } catch (error) {
    console.error('Failed to get rate limit status:', error);
    return {
      current: 0,
      limit: RATE_LIMITS[type].max,
      remaining: RATE_LIMITS[type].max,
      resetAt: new Date(Date.now() + RATE_LIMITS[type].window),
      blocked: false,
    };
  }
}

/**
 * Clear rate limit for a client (admin function)
 */
export async function clearRateLimit(
  clientId: string,
  type?: RateLimitType
): Promise<void> {
  const redis = await getRedisClient();

  try {
    if (type) {
      await redis.del(`rate_limit:${type}:${clientId}`);
    } else {
      // Clear all rate limits for this client
      for (const rateLimitType of Object.keys(RATE_LIMITS)) {
        await redis.del(`rate_limit:${rateLimitType}:${clientId}`);
      }
    }

    console.log(
      `✅ Rate limit cleared for ${clientId}${type ? ` (${type})` : ''}`
    );
  } catch (error) {
    console.error('Failed to clear rate limit:', error);
  }
}

/**
 * Get rate limit statistics (admin function)
 */
export async function getRateLimitStats(): Promise<{
  totalViolations: number;
  violationsByType: Record<RateLimitType, number>;
  topViolators: Array<{ clientId: string; violations: number }>;
}> {
  // This would typically query your audit logs or metrics system
  // For now, return a placeholder structure
  return {
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
  };
}
