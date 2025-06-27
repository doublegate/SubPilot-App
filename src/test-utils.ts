import { vi, type MockedFunction } from 'vitest';
import type { Session } from 'next-auth';
import type {
  Prisma,
  User,
  Subscription,
  Transaction,
  Notification,
  PrismaClient,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Type-safe mock factory
export function createMockFunction<
  T extends (...args: unknown[]) => unknown,
>(): MockedFunction<T> {
  return vi.fn<Parameters<T>, ReturnType<T>>();
}

// Common test data factories
export const createMockSession = (overrides?: Partial<Session>): Session => ({
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
  ...overrides,
});

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user-1',
  email: 'test@example.com',
  emailVerified: null,
  image: null,
  name: 'Test User',
  password: null,
  notificationPreferences: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockSubscription = (
  overrides?: Partial<Subscription>
): Subscription => ({
  id: 'sub-1',
  userId: 'user-1',
  name: 'Test Subscription',
  merchantName: 'Test Merchant',
  amount: new Decimal(9.99),
  frequency: 'monthly',
  status: 'active',
  isActive: true,
  category: 'Entertainment',
  description: null,
  startDate: new Date(),
  cancelledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastBillingDate: new Date(),
  nextBillingDate: new Date(Date.now() + 30 * 86400000),
  provider: { name: 'Test Provider' },
  metadata: {},
  confidence: new Decimal(0.9),
  isManual: false,
  detectedAt: new Date(),
  ...overrides,
});

export const createMockTransaction = (
  overrides?: Partial<Transaction>
): Transaction => ({
  id: 'tx-1',
  userId: 'user-1',
  amount: new Decimal(9.99),
  merchantName: 'Test Merchant',
  date: new Date(),
  accountId: 'account-1',
  plaidTransactionId: 'plaid-tx-1',
  plaidAccountId: 'plaid-account-1',
  plaidItemId: 'plaid-item-1',
  category: ['Entertainment'],
  subcategory: null,
  description: 'Test Transaction',
  pending: false,
  isoCurrencyCode: 'USD',
  personalFinanceCategory: null,
  transactionCode: null,
  transactionType: null,
  logo: null,
  website: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  isRecurring: true,
  subscriptionId: 'sub-1',
  isSubscription: true,
  ...overrides,
});

export const createMockNotification = (
  overrides?: Partial<Notification>
): Notification => ({
  id: 'notif-1',
  userId: 'user-1',
  type: 'subscription_renewal',
  subscriptionId: 'sub-1',
  title: 'Test Notification',
  message: 'Test message',
  data: {},
  read: false,
  readAt: null,
  scheduledFor: new Date(),
  sentAt: null,
  createdAt: new Date(),
  ...overrides,
});

// Type guards for Prisma results
export function isPrismaError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Error && 'code' in error;
}

// Mock database helpers
export type MockedDb = {
  user: {
    findUnique: MockedFunction<PrismaClient['user']['findUnique']>;
    findFirst: MockedFunction<PrismaClient['user']['findFirst']>;
    create: MockedFunction<PrismaClient['user']['create']>;
    update: MockedFunction<PrismaClient['user']['update']>;
    delete: MockedFunction<PrismaClient['user']['delete']>;
  };
  subscription: {
    findMany: MockedFunction<PrismaClient['subscription']['findMany']>;
    findUnique: MockedFunction<PrismaClient['subscription']['findUnique']>;
    create: MockedFunction<PrismaClient['subscription']['create']>;
    update: MockedFunction<PrismaClient['subscription']['update']>;
    delete: MockedFunction<PrismaClient['subscription']['delete']>;
    count: MockedFunction<PrismaClient['subscription']['count']>;
    aggregate: MockedFunction<PrismaClient['subscription']['aggregate']>;
  };
  transaction: {
    findMany: MockedFunction<PrismaClient['transaction']['findMany']>;
    findUnique: MockedFunction<PrismaClient['transaction']['findUnique']>;
    create: MockedFunction<PrismaClient['transaction']['create']>;
    update: MockedFunction<PrismaClient['transaction']['update']>;
    groupBy: MockedFunction<PrismaClient['transaction']['groupBy']>;
    aggregate: MockedFunction<PrismaClient['transaction']['aggregate']>;
  };
  notification: {
    findMany: MockedFunction<PrismaClient['notification']['findMany']>;
    create: MockedFunction<PrismaClient['notification']['create']>;
    update: MockedFunction<PrismaClient['notification']['update']>;
    count: MockedFunction<PrismaClient['notification']['count']>;
  };
  plaidItem: {
    findUnique: MockedFunction<PrismaClient['plaidItem']['findUnique']>;
    create: MockedFunction<PrismaClient['plaidItem']['create']>;
    update: MockedFunction<PrismaClient['plaidItem']['update']>;
    delete: MockedFunction<PrismaClient['plaidItem']['delete']>;
  };
  account: {
    findMany: MockedFunction<PrismaClient['account']['findMany']>;
    create: MockedFunction<PrismaClient['account']['create']>;
    update: MockedFunction<PrismaClient['account']['update']>;
  };
};

// Performance measurement utilities
export function measurePerformance<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = fn();

  if (result instanceof Promise) {
    return result.then(res => ({
      result: res,
      duration: performance.now() - start,
    }));
  }

  return Promise.resolve({
    result,
    duration: performance.now() - start,
  });
}
