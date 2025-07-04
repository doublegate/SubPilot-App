import type {
  Subscription,
  Transaction,
  Account,
  PlaidItem,
  User,
  Notification,
} from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';

// Advanced Generic Constraints for Type Safety
type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Branded Types for Domain Modeling
type Brand<T, B> = T & { readonly __brand: B };
type UserId = Brand<string, 'UserId'>;
type SubscriptionId = Brand<string, 'SubscriptionId'>;
type TransactionId = Brand<string, 'TransactionId'>;
type AccountId = Brand<string, 'AccountId'>;

// Advanced Mock Types with Generic Constraints
export type MockSubscription = RequiredFields<
  Partial<Subscription>,
  'id' | 'userId' | 'name' | 'amount' | 'frequency' | 'isActive'
> & {
  id: SubscriptionId;
  userId: UserId;
  transactions?: Array<MockTransaction>;
};

export type MockTransaction = RequiredFields<
  Partial<Transaction>,
  'id' | 'amount' | 'date'
> & {
  id: TransactionId;
  isSubscription?: boolean;
};

export type MockAccount = RequiredFields<Partial<Account>, 'id' | 'userId'> & {
  id: AccountId;
  userId: UserId;
};

export type MockPlaidItem = RequiredFields<
  Partial<PlaidItem>,
  'id' | 'userId'
> & {
  id: string;
  userId: UserId;
};

export type MockUser = RequiredFields<Partial<User>, 'id' | 'email'> & {
  id: UserId;
};

export type MockNotification = RequiredFields<
  Partial<Notification>,
  'id' | 'userId'
> & {
  id: string;
  userId: UserId;
};

// Advanced Aggregate Types with Conditional Types
type AggregateFields<T> = {
  [K in keyof T]?: T[K] extends number | Decimal
    ? T[K] | null
    : T[K] extends Date
      ? T[K] | null
      : never;
};

export interface AggregateResult<T = Record<string, unknown>> {
  _sum: AggregateFields<T>;
  _count: number | Record<string, number>;
  _avg: AggregateFields<T>;
  _min: AggregateFields<T>;
  _max: AggregateFields<T>;
}

// Specific aggregate types for common use cases
export type TransactionAggregateResult = AggregateResult<{
  amount: Decimal;
  date: Date;
}>;

export type SubscriptionAggregateResult = AggregateResult<{
  amount: Decimal;
  nextBillingDate: Date;
}>;

// Template Literal Types for String Validation
export type SortOrder = 'asc' | 'desc';
export type SortableFields<T> = keyof T;
export type SortExpression<T> = `${string & SortableFields<T>}:${SortOrder}`;

// Utility Types for API Response Normalization
export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      meta?: {
        total?: number;
        page?: number;
        limit?: number;
      };
    }
  | {
      success: false;
      error: string;
      code?: string;
    };

// Mapped Types for Service Layer Composition
export type ServiceMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
    : never;
};

// Discriminated Unions for State Management
export type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

// Export branded type helpers
export const createUserId = (id: string): UserId => id as UserId;
export const createSubscriptionId = (id: string): SubscriptionId =>
  id as SubscriptionId;
export const createTransactionId = (id: string): TransactionId =>
  id as TransactionId;
export const createAccountId = (id: string): AccountId => id as AccountId;
