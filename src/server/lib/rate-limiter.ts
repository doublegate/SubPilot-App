import { env } from '~/env.js';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 100;
const MAX_FAILED_AUTH_ATTEMPTS = 5;
const AUTH_LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

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
  if (env.REDIS_URL) {
    try {
      // Dynamic import to avoid build errors if ioredis is not installed
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - ioredis is an optional dependency
      const redisModule = (await import('ioredis')) as {
        default: any;
      };
      const Redis = redisModule.default;

      // Create Redis instance with proper error handling
      const client = new Redis(env.REDIS_URL, {
        // Disable auto-reconnect to prevent connection spam
        retryStrategy: () => null,
        // Don't show connection errors in console
        showFriendlyErrorStack: false,
      });

      // Handle connection errors gracefully
      client.on('error', (error: Error) => {
        if (!error.message.includes('ECONNREFUSED')) {
          console.error('Redis error:', error.message);
        }
      });

      // Test the connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.disconnect();
          reject(new Error('Redis connection timeout'));
        }, 5000);

        client.once('ready', () => {
          clearTimeout(timeout);
          console.log('✅ Redis rate limiter initialized');
          resolve();
        });

        client.once('error', () => {
          clearTimeout(timeout);
          client.disconnect();
          reject(new Error('Redis connection failed'));
        });
      });

      redisClient = client as RedisLike;
      return client as RedisLike;
    } catch (error) {
      console.warn(
        '⚠️  Failed to connect to Redis, falling back to in-memory rate limiting'
      );
    }
  }

  // Fallback to in-memory store
  if (!env.REDIS_URL) {
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
 * Check if a client has exceeded the rate limit
 */
export async function checkRateLimit(
  clientId: string,
  endpoint?: string
): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const redis = await getRedisClient();
  const key = endpoint
    ? `rate_limit:${clientId}:${endpoint}`
    : `rate_limit:${clientId}`;

  try {
    const current = await redis.incr(key);

    // Set expiry on first request
    if (current === 1) {
      await redis.expire(key, 60); // 60 seconds
    }

    const allowed = current <= MAX_REQUESTS_PER_WINDOW;
    const reset = Date.now() + RATE_LIMIT_WINDOW;

    return {
      allowed,
      limit: MAX_REQUESTS_PER_WINDOW,
      remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - current),
      reset,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open in case of errors
    return {
      allowed: true,
      limit: MAX_REQUESTS_PER_WINDOW,
      remaining: MAX_REQUESTS_PER_WINDOW,
      reset: Date.now() + RATE_LIMIT_WINDOW,
    };
  }
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
  }
): void {
  headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
  headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
  headers.set('X-RateLimit-Reset', rateLimitInfo.reset.toString());

  if (rateLimitInfo.remaining === 0) {
    const retryAfter = Math.ceil((rateLimitInfo.reset - Date.now()) / 1000);
    headers.set('Retry-After', retryAfter.toString());
  }
}
