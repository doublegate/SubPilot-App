# tRPC API Design Patterns for SubPilot

## Overview

This document outlines proven patterns and best practices for designing type-safe APIs using tRPC in financial applications like SubPilot. It covers security, validation, error handling, and performance optimization patterns.

## Core API Design Principles

### 1. Type Safety First

Every API endpoint should have complete type safety from input to output, ensuring data integrity in financial operations.

### 2. Security by Design

Financial data requires strict authentication, authorization, and input validation at every layer.

### 3. Audit Trail

All financial operations should be logged and traceable for compliance and debugging.

### 4. Idempotency

Critical operations should be idempotent to prevent duplicate charges or data corruption.

## Authentication & Authorization Patterns

### Middleware-Based Authentication

```typescript
// server/middleware/auth.ts
import { TRPCError } from '@trpc/server';
import { middleware } from '../trpc';

export const authMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
    },
  });
});

export const adminMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user?.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN', 
      message: 'Admin access required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
    },
  });
});
```

### Resource-Based Authorization

```typescript
// server/middleware/ownership.ts
export const subscriptionOwnershipMiddleware = middleware(async ({ ctx, next, input }) => {
  const subscriptionId = (input as any)?.id || (input as any)?.subscriptionId;
  
  if (subscriptionId) {
    const subscription = await ctx.prisma.subscription.findFirst({
      where: { 
        id: subscriptionId,
        userId: ctx.user.id,
      },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found or access denied',
      });
    }
  }

  return next();
});

// Usage in procedures
export const updateSubscription = protectedProcedure
  .use(subscriptionOwnershipMiddleware)
  .input(updateSubscriptionSchema)
  .mutation(async ({ ctx, input }) => {
    // Safe to proceed - ownership verified
    return ctx.prisma.subscription.update({
      where: { id: input.id },
      data: input.data,
    });
  });
```

## Input Validation Patterns

### Financial Amount Validation

```typescript
// schemas/financial.ts
import { z } from 'zod';

export const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']);

export const monetaryAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .max(1000000, 'Amount exceeds maximum limit')
  .refine(
    (val) => Number.isFinite(val) && Number((val * 100).toFixed(0)) / 100 === val,
    'Amount must have at most 2 decimal places'
  );

export const subscriptionAmountSchema = monetaryAmountSchema
  .min(0.01, 'Minimum subscription amount is $0.01')
  .max(10000, 'Maximum subscription amount is $10,000');

// Usage in subscription schema
export const createSubscriptionSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Invalid characters in name'),
  amount: subscriptionAmountSchema,
  currency: currencySchema.default('USD'),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  nextPayment: z.date()
    .min(new Date(), 'Next payment cannot be in the past'),
  category: z.string()
    .max(50, 'Category name too long')
    .optional(),
});
```

### Date and Time Validation

```typescript
// schemas/datetime.ts
export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
).refine(
  (data) => {
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year
    return data.endDate.getTime() - data.startDate.getTime() <= maxRange;
  },
  {
    message: 'Date range cannot exceed 1 year',
    path: ['endDate'],
  }
);

export const paymentDateSchema = z.date()
  .min(new Date(), 'Payment date cannot be in the past')
  .max(
    new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
    'Payment date too far in the future'
  );
```

## Error Handling Patterns

### Structured Error Types

```typescript
// lib/errors.ts
export enum FinancialErrorCode {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_ACCOUNT = 'INVALID_ACCOUNT',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export class FinancialError extends Error {
  constructor(
    public code: FinancialErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'FinancialError';
  }
}

// Usage in procedures
export const chargeSubscription = protectedProcedure
  .input(z.object({ subscriptionId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    try {
      const result = await processPayment(input.subscriptionId);
      return result;
    } catch (error) {
      if (error instanceof PaymentProcessorError) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Payment processing failed',
          cause: new FinancialError(
            FinancialErrorCode.PAYMENT_FAILED,
            error.message,
            { subscriptionId: input.subscriptionId }
          ),
        });
      }
      throw error;
    }
  });
```

### Graceful Degradation

```typescript
// patterns/graceful-degradation.ts
export const getSubscriptionsWithFallback = protectedProcedure
  .query(async ({ ctx }) => {
    try {
      // Try to get enriched data from external services
      const subscriptions = await ctx.prisma.subscription.findMany({
        where: { userId: ctx.user.id },
        include: {
          transactions: {
            orderBy: { date: 'desc' },
            take: 5,
          },
        },
      });

      // Enrich with external data
      const enrichedSubscriptions = await Promise.allSettled(
        subscriptions.map(async (sub) => {
          try {
            const externalData = await getSubscriptionMetadata(sub.name);
            return { ...sub, metadata: externalData };
          } catch {
            return sub; // Fallback to base data
          }
        })
      );

      return enrichedSubscriptions.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      );
    } catch (error) {
      // Fallback to minimal data if main query fails
      console.error('Failed to fetch full subscription data:', error);
      
      return ctx.prisma.subscription.findMany({
        where: { userId: ctx.user.id },
        select: {
          id: true,
          name: true,
          amount: true,
          frequency: true,
          nextPayment: true,
        },
      });
    }
  });
```

## Data Transformation Patterns

### Currency Conversion

```typescript
// services/currency.ts
export class CurrencyService {
  private cache = new Map<string, { rate: number; timestamp: number }>();
  private cacheTimeout = 60 * 60 * 1000; // 1 hour

  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) return amount;

    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return amount * cached.rate;
    }

    const rate = await this.fetchExchangeRate(fromCurrency, toCurrency);
    this.cache.set(cacheKey, { rate, timestamp: Date.now() });
    
    return amount * rate;
  }

  private async fetchExchangeRate(from: string, to: string): Promise<number> {
    // Implementation depends on currency API
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from}`
    );
    const data = await response.json();
    return data.rates[to];
  }
}

// Usage in tRPC procedures
export const getSubscriptionTotals = protectedProcedure
  .input(z.object({
    targetCurrency: currencySchema.default('USD'),
  }))
  .query(async ({ ctx, input }) => {
    const subscriptions = await ctx.prisma.subscription.findMany({
      where: { userId: ctx.user.id, isActive: true },
    });

    const currencyService = new CurrencyService();
    
    const convertedAmounts = await Promise.all(
      subscriptions.map(async (sub) => {
        const convertedAmount = await currencyService.convertAmount(
          sub.amount,
          sub.currency,
          input.targetCurrency
        );
        
        return {
          ...sub,
          convertedAmount,
          originalAmount: sub.amount,
          originalCurrency: sub.currency,
        };
      })
    );

    return {
      subscriptions: convertedAmounts,
      totalMonthly: convertedAmounts.reduce((sum, sub) => {
        return sum + calculateMonthlyAmount(sub.convertedAmount, sub.frequency);
      }, 0),
      currency: input.targetCurrency,
    };
  });
```

## Pagination Patterns

### Cursor-Based Pagination

```typescript
// schemas/pagination.ts
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const createPaginatedResponse = <T>(
  items: T[],
  limit: number,
  getId: (item: T) => string
) => {
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? getId(items[limit - 1]) : null;

  return {
    items: resultItems,
    nextCursor,
    hasMore,
  };
};

// Usage in transaction queries
export const getTransactions = protectedProcedure
  .input(z.object({
    ...paginationSchema.shape,
    filters: z.object({
      category: z.string().optional(),
      type: z.enum(['INCOME', 'EXPENSE', 'SUBSCRIPTION']).optional(),
      dateRange: dateRangeSchema.optional(),
    }).optional(),
  }))
  .query(async ({ ctx, input }) => {
    const { limit, cursor, filters } = input;
    
    const transactions = await ctx.prisma.transaction.findMany({
      where: {
        userId: ctx.user.id,
        ...(cursor && { id: { lt: cursor } }),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.type && { type: filters.type }),
        ...(filters?.dateRange && {
          date: {
            gte: filters.dateRange.startDate,
            lte: filters.dateRange.endDate,
          },
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        subscription: {
          select: { name: true, category: true },
        },
      },
    });

    return createPaginatedResponse(
      transactions,
      limit,
      (transaction) => transaction.id
    );
  });
```

## Caching Patterns

### Smart Cache Invalidation

```typescript
// lib/cache-manager.ts
export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateUserData(userId: string): void {
    this.invalidatePattern(`user:${userId}:*`);
  }
}

// Cached procedure pattern
export const getCachedSubscriptions = protectedProcedure
  .query(async ({ ctx }) => {
    const cacheManager = CacheManager.getInstance();
    const cacheKey = `user:${ctx.user.id}:subscriptions`;
    
    let subscriptions = await cacheManager.get<any[]>(cacheKey);
    
    if (!subscriptions) {
      subscriptions = await ctx.prisma.subscription.findMany({
        where: { userId: ctx.user.id, isActive: true },
        include: {
          _count: { select: { transactions: true } },
        },
        orderBy: { nextPayment: 'asc' },
      });
      
      cacheManager.set(cacheKey, subscriptions, 10 * 60 * 1000); // 10 minutes
    }

    return subscriptions;
  });
```

## Background Job Patterns

### Queue-Based Processing

```typescript
// lib/job-queue.ts
export interface Job {
  id: string;
  type: string;
  data: any;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
}

export class JobQueue {
  private queue: Job[] = [];
  private processing = false;

  async enqueue(type: string, data: any, maxAttempts = 3): Promise<string> {
    const job: Job = {
      id: crypto.randomUUID(),
      type,
      data,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts,
    };

    this.queue.push(job);
    this.processQueue();
    
    return job.id;
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      
      try {
        await this.processJob(job);
      } catch (error) {
        job.attempts++;
        
        if (job.attempts < job.maxAttempts) {
          // Exponential backoff
          setTimeout(() => {
            this.queue.unshift(job);
            this.processQueue();
          }, Math.pow(2, job.attempts) * 1000);
        } else {
          console.error(`Job ${job.id} failed after ${job.maxAttempts} attempts:`, error);
        }
      }
    }

    this.processing = false;
  }

  private async processJob(job: Job): Promise<void> {
    switch (job.type) {
      case 'SEND_PAYMENT_REMINDER':
        await this.sendPaymentReminder(job.data);
        break;
      case 'SYNC_BANK_TRANSACTIONS':
        await this.syncBankTransactions(job.data);
        break;
      case 'UPDATE_SUBSCRIPTION_STATUS':
        await this.updateSubscriptionStatus(job.data);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  private async sendPaymentReminder(data: any): Promise<void> {
    // Implementation for sending payment reminders
  }

  private async syncBankTransactions(data: any): Promise<void> {
    // Implementation for syncing bank transactions
  }

  private async updateSubscriptionStatus(data: any): Promise<void> {
    // Implementation for updating subscription status
  }
}

// tRPC procedure that queues background jobs
export const syncTransactions = protectedProcedure
  .mutation(async ({ ctx }) => {
    const jobQueue = new JobQueue();
    
    const jobId = await jobQueue.enqueue('SYNC_BANK_TRANSACTIONS', {
      userId: ctx.user.id,
      timestamp: new Date(),
    });

    return { jobId, status: 'queued' };
  });
```

## Rate Limiting Patterns

### User-Based Rate Limiting

```typescript
// middleware/rate-limit.ts
export class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  isAllowed(userId: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      this.requests.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (userRequests.count >= limit) {
      return false;
    }

    userRequests.count++;
    return true;
  }

  getRemainingRequests(userId: string, limit: number): number {
    const userRequests = this.requests.get(userId);
    if (!userRequests || Date.now() > userRequests.resetTime) {
      return limit;
    }
    return Math.max(0, limit - userRequests.count);
  }
}

export const rateLimitMiddleware = (limit: number, windowMs: number) =>
  middleware(async ({ ctx, next }) => {
    const rateLimiter = new RateLimiter();
    
    if (!rateLimiter.isAllowed(ctx.user.id, limit, windowMs)) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded',
      });
    }

    return next();
  });

// Usage for sensitive operations
export const createSubscription = protectedProcedure
  .use(rateLimitMiddleware(10, 60 * 1000)) // 10 requests per minute
  .input(createSubscriptionSchema)
  .mutation(async ({ ctx, input }) => {
    // Implementation
  });
```

## Testing Patterns

### Mock Data Factory

```typescript
// test/factories.ts
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user_' + Math.random().toString(36).substr(2, 9),
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockSubscription = (
  userId: string,
  overrides: Partial<Subscription> = {}
): Subscription => ({
  id: 'sub_' + Math.random().toString(36).substr(2, 9),
  userId,
  name: 'Test Subscription',
  amount: 9.99,
  currency: 'USD',
  frequency: 'MONTHLY',
  nextPayment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  isActive: true,
  isPaused: false,
  reminderDays: 3,
  category: 'Entertainment',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Integration test example
describe('Subscriptions API', () => {
  let caller: ReturnType<typeof createCaller>;
  let user: User;

  beforeEach(async () => {
    user = await prisma.user.create({
      data: createMockUser(),
    });

    const ctx = {
      prisma,
      user,
      session: { user },
    };

    caller = createCaller(ctx);
  });

  it('should create a subscription', async () => {
    const input = {
      name: 'Netflix',
      amount: 15.99,
      frequency: 'MONTHLY' as const,
      nextPayment: new Date('2024-02-01'),
    };

    const result = await caller.subscriptions.create(input);

    expect(result).toMatchObject(input);
    expect(result.userId).toBe(user.id);
  });

  it('should validate amount constraints', async () => {
    const input = {
      name: 'Invalid Subscription',
      amount: -10, // Invalid negative amount
      frequency: 'MONTHLY' as const,
      nextPayment: new Date('2024-02-01'),
    };

    await expect(caller.subscriptions.create(input))
      .rejects.toThrow('Amount must be positive');
  });
});
```

These patterns provide a solid foundation for building secure, scalable, and maintainable APIs for financial applications using tRPC.
