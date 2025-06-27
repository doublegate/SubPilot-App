import type {
  Subscription,
  Transaction,
  Account,
  PlaidItem,
  User,
  Notification,
} from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';

// Partial mock types for testing
export type MockSubscription = Partial<Subscription> & {
  id: string;
  userId: string;
  name: string;
  amount: Decimal;
  frequency: string;
  isActive: boolean;
  transactions?: Array<Partial<Transaction>>;
};

export type MockTransaction = Partial<Transaction> & {
  id: string;
  amount: Decimal;
  date: Date;
  isSubscription?: boolean;
};

export type MockAccount = Partial<Account> & {
  id: string;
  userId: string;
};

export type MockPlaidItem = Partial<PlaidItem> & {
  id: string;
  userId: string;
};

export type MockUser = Partial<User> & {
  id: string;
  email: string;
};

export type MockNotification = Partial<Notification> & {
  id: string;
  userId: string;
};

// Aggregate result types
export interface AggregateResult {
  _sum: { amount: Decimal | null };
  _count: unknown;
  _avg: unknown;
  _min: unknown;
  _max: unknown;
}
