import { vi } from 'vitest';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { Session } from 'next-auth';

// Type-safe mock database structure
export type MockPrismaModel = {
  findMany: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  createMany: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  aggregate: ReturnType<typeof vi.fn>;
  groupBy?: ReturnType<typeof vi.fn>;
  upsert?: ReturnType<typeof vi.fn>;
  // Add missing methods for full Prisma compatibility
  findUniqueOrThrow?: ReturnType<typeof vi.fn>;
  findFirstOrThrow?: ReturnType<typeof vi.fn>;
  createManyAndReturn?: ReturnType<typeof vi.fn>;
  updateManyAndReturn?: ReturnType<typeof vi.fn>;
  fields?: unknown;
};

export type MockPrismaClient = {
  [K in keyof PrismaClient]: K extends `$${string}`
    ? PrismaClient[K]
    : MockPrismaModel;
};

// Create a type-safe mock database
export function createMockDb(): MockPrismaClient {
  return {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirstOrThrow: vi.fn(),
      createManyAndReturn: vi.fn(),
      updateManyAndReturn: vi.fn(),
      fields: {},
    },
    subscription: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirstOrThrow: vi.fn(),
      createManyAndReturn: vi.fn(),
      updateManyAndReturn: vi.fn(),
      fields: {},
    },
    transaction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirstOrThrow: vi.fn(),
      createManyAndReturn: vi.fn(),
      updateManyAndReturn: vi.fn(),
      fields: {},
    },
    plaidItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirstOrThrow: vi.fn(),
      createManyAndReturn: vi.fn(),
      updateManyAndReturn: vi.fn(),
      fields: {},
    },
    account: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirstOrThrow: vi.fn(),
      createManyAndReturn: vi.fn(),
      updateManyAndReturn: vi.fn(),
      fields: {},
    },
    bankAccount: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirstOrThrow: vi.fn(),
      createManyAndReturn: vi.fn(),
      updateManyAndReturn: vi.fn(),
      fields: {},
    },
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirstOrThrow: vi.fn(),
      createManyAndReturn: vi.fn(),
      updateManyAndReturn: vi.fn(),
      fields: {},
    },
    subscriptionHistory: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirstOrThrow: vi.fn(),
      createManyAndReturn: vi.fn(),
      updateManyAndReturn: vi.fn(),
      fields: {},
    },
    session: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirstOrThrow: vi.fn(),
      createManyAndReturn: vi.fn(),
      updateManyAndReturn: vi.fn(),
      fields: {},
    },
    verificationToken: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirstOrThrow: vi.fn(),
      createManyAndReturn: vi.fn(),
      updateManyAndReturn: vi.fn(),
      fields: {},
    },
    // Add Prisma client methods
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $executeRaw: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
    $on: vi.fn(),
    $use: vi.fn(),
    $extends: vi.fn(),
  } as unknown as MockPrismaClient;
}

// Type-safe mock context
export interface MockContext {
  session: Session | null;
  db: MockPrismaClient;
}

// Type for tRPC router caller context
export interface RouterCallerContext {
  session: Session | null;
  db: MockPrismaClient;
}

// Create a mock context with session
export function createMockContext(session?: Session | null): MockContext {
  return {
    session: session ?? {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    db: createMockDb(),
  };
}

// Helper to create Decimal values like Prisma does
export function createDecimal(value: number): Prisma.Decimal {
  return {
    toNumber: () => value,
    toString: () => value.toString(),
    toFixed: (decimalPlaces?: number) => value.toFixed(decimalPlaces),
    valueOf: () => value,
    toJSON: () => value,
    equals: (other: Prisma.Decimal) => other.toNumber() === value,
    gt: (other: Prisma.Decimal) => value > other.toNumber(),
    gte: (other: Prisma.Decimal) => value >= other.toNumber(),
    lt: (other: Prisma.Decimal) => value < other.toNumber(),
    lte: (other: Prisma.Decimal) => value <= other.toNumber(),
    abs: () => createDecimal(Math.abs(value)),
    add: (other: Prisma.Decimal) => createDecimal(value + other.toNumber()),
    sub: (other: Prisma.Decimal) => createDecimal(value - other.toNumber()),
    mul: (other: Prisma.Decimal) => createDecimal(value * other.toNumber()),
    div: (other: Prisma.Decimal) => createDecimal(value / other.toNumber()),
    mod: (other: Prisma.Decimal) => createDecimal(value % other.toNumber()),
    round: () => createDecimal(Math.round(value)),
    floor: () => createDecimal(Math.floor(value)),
    ceil: () => createDecimal(Math.ceil(value)),
    pow: (exponent: Prisma.Decimal) =>
      createDecimal(Math.pow(value, exponent.toNumber())),
    sqrt: () => createDecimal(Math.sqrt(value)),
    isNaN: () => isNaN(value),
    isFinite: () => isFinite(value),
    isInteger: () => Number.isInteger(value),
    isPositive: () => value > 0,
    isNegative: () => value < 0,
    isZero: () => value === 0,
    trunc: () => createDecimal(Math.trunc(value)),
    clamp: (min: Prisma.Decimal, max: Prisma.Decimal) =>
      createDecimal(Math.max(min.toNumber(), Math.min(max.toNumber(), value))),
    constructor: Prisma.Decimal,
  } as unknown as Prisma.Decimal;
}

// Type guard for Decimal values
export function isDecimal(value: unknown): value is Prisma.Decimal {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof (value as Prisma.Decimal).toNumber === 'function'
  );
}

// Helper types for mock data based on Prisma schema
export interface MockSubscription {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  notes?: string | null;
  amount: Prisma.Decimal;
  currency: string;
  frequency: string;
  nextBilling?: Date | null;
  lastBilling?: Date | null;
  status: string;
  isActive: boolean;
  provider: Record<string, unknown>; // JsonValue
  cancellationInfo: Record<string, unknown>; // JsonValue
  detectionConfidence: Prisma.Decimal;
  detectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockTransaction {
  id: string;
  userId: string;
  accountId: string;
  plaidTransactionId: string;
  subscriptionId?: string | null;
  amount: Prisma.Decimal;
  isoCurrencyCode: string;
  description: string;
  merchantName?: string | null;
  category: string[]; // JsonValue array
  subcategory?: string | null;
  transactionType: string;
  date: Date;
  authorizedDate?: Date | null;
  pending: boolean;
  paymentChannel?: string | null;
  location?: Record<string, unknown> | null; // JsonValue
  confidence: Prisma.Decimal;
  isSubscription: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockNotification {
  id: string;
  userId: string;
  subscriptionId?: string | null;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>; // JsonValue
  read: boolean;
  readAt?: Date | null;
  scheduledFor: Date;
  sentAt?: Date | null;
  createdAt: Date;
}

// Helper functions to create properly structured mock data
export function createMockSubscription(
  overrides?: Partial<MockSubscription>
): MockSubscription {
  const now = new Date();
  return {
    id: 'sub-test-id',
    userId: 'test-user-id',
    name: 'Test Subscription',
    description: null,
    category: 'Streaming',
    notes: null,
    amount: createDecimal(15.99),
    currency: 'USD',
    frequency: 'monthly',
    nextBilling: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    lastBilling: null,
    status: 'active',
    isActive: true,
    provider: {},
    cancellationInfo: {},
    detectionConfidence: createDecimal(0.9),
    detectedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockTransaction(
  overrides?: Partial<MockTransaction>
): MockTransaction {
  const now = new Date();
  return {
    id: 'tx-test-id',
    userId: 'test-user-id',
    accountId: 'acc-test-id',
    plaidTransactionId: 'plaid-tx-id',
    subscriptionId: null,
    amount: createDecimal(15.99),
    isoCurrencyCode: 'USD',
    description: 'Test Transaction',
    merchantName: 'Test Merchant',
    category: ['Transfer', 'Digital'],
    subcategory: null,
    transactionType: 'other',
    date: now,
    authorizedDate: now,
    pending: false,
    paymentChannel: null,
    location: null,
    confidence: createDecimal(0.8),
    isSubscription: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockNotification(
  overrides?: Partial<MockNotification>
): MockNotification {
  const now = new Date();
  return {
    id: 'notif-test-id',
    userId: 'test-user-id',
    subscriptionId: null,
    type: 'renewal_reminder',
    title: 'Test Notification',
    message: 'Test message',
    data: {},
    read: false,
    readAt: null,
    scheduledFor: now,
    sentAt: null,
    createdAt: now,
    ...overrides,
  };
}

// Helper to create mock session
export function createMockSession(
  overrides?: Partial<Record<string, unknown>>
): Record<string, unknown> {
  return {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
    ...overrides,
  };
}
