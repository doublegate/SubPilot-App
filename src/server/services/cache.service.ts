// Cache service for API response caching

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Simple in-memory cache service
 * Can be replaced with Redis for production use
 */
export class CacheService {
  private static instance: CacheService;
  private cache = new Map<string, CacheItem<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern: string): void {
    // Escape special regex characters except for our wildcard
    const escapedPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${escapedPattern}$`);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Destroy the cache service
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();

/**
 * Cache key generators for consistency
 */
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  subscriptions: (userId: string, filters?: Record<string, unknown>) =>
    `subscriptions:${userId}:${JSON.stringify(filters ?? {})}`,
  analytics: (userId: string, type: string, params?: Record<string, unknown>) =>
    `analytics:${userId}:${type}:${JSON.stringify(params ?? {})}`,
  transactions: (userId: string, filters?: Record<string, unknown>) =>
    `transactions:${userId}:${JSON.stringify(filters ?? {})}`,
  notifications: (userId: string) => `notifications:${userId}`,
};

/**
 * Cache TTL defaults (in seconds)
 */
export const cacheTTL = {
  short: 60, // 1 minute
  medium: 300, // 5 minutes
  long: 900, // 15 minutes
  veryLong: 3600, // 1 hour
};
