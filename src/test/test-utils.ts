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
  } as MockPrismaClient;
}

// Type-safe mock context
export interface MockContext {
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
  } as Prisma.Decimal;
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
