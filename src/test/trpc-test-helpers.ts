import { appRouter } from '@/server/api/root';
import type { Session } from 'next-auth';
import { db } from '@/server/db';

const createCaller = appRouter.createCaller;

/**
 * Creates a tRPC caller with a mocked session for testing
 */
export const createMockTRPCCaller = (session: Session | null) => {
  const ctx = {
    session,
    db,
  };

  return createCaller(ctx);
};

/**
 * Creates a mock session for testing
 */
export const createMockSession = (
  overrides: Partial<Session> = {}
): Session => {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
};

/**
 * Creates an authenticated tRPC caller for testing
 */
export const createAuthenticatedCaller = (
  sessionOverrides: Partial<Session> = {}
) => {
  const session = createMockSession(sessionOverrides);
  return createMockTRPCCaller(session);
};

/**
 * Creates an unauthenticated tRPC caller for testing
 */
export const createUnauthenticatedCaller = () => {
  return createMockTRPCCaller(null);
};

/**
 * Test helper for database cleanup
 */
export const cleanupTestData = async (userId: string) => {
  // Clean up test data in the correct order to avoid foreign key constraints
  await db.notification.deleteMany({ where: { userId } });
  await db.subscription.deleteMany({ where: { userId } });
  await db.transaction.deleteMany({ where: { userId } });
  await db.account.deleteMany({ where: { userId } });
  await db.plaidItem.deleteMany({ where: { userId } });
  await db.session.deleteMany({ where: { userId } });
  await db.user.deleteMany({ where: { id: userId } });
};

/**
 * Creates test data for a user
 */
export const createTestUser = async (userData: {
  id?: string;
  email?: string;
  name?: string;
}) => {
  const user = await db.user.create({
    data: {
      id: userData.id ?? 'test-user-id',
      email: userData.email ?? 'test@example.com',
      name: userData.name ?? 'Test User',
      emailVerified: new Date(),
      notificationPreferences: {
        emailAlerts: true,
        pushNotifications: false,
        weeklyReports: true,
        renewalReminders: true,
        priceChangeAlerts: true,
        cancelledServiceAlerts: true,
        digestFrequency: 'weekly',
        quietHoursStart: null,
        quietHoursEnd: null,
      },
    },
  });
  return user;
};

/**
 * Creates test subscription data
 */
export const createTestSubscription = async (
  userId: string,
  subscriptionData: {
    name?: string;
    amount?: number;
    frequency?: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
    category?: string;
    status?: 'active' | 'cancelled' | 'pending';
  }
) => {
  return await db.subscription.create({
    data: {
      userId,
      name: subscriptionData.name ?? 'Test Subscription',
      description: 'Test subscription description',
      amount: subscriptionData.amount ?? 15.99,
      currency: 'USD',
      frequency: subscriptionData.frequency ?? 'monthly',
      category: subscriptionData.category ?? 'general',
      status: subscriptionData.status ?? 'active',
      isActive: subscriptionData.status !== 'cancelled',
      nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      provider: {
        name: subscriptionData.name ?? 'Test Provider',
        detected: true,
      },
      detectionConfidence: 0.85,
    },
  });
};

/**
 * Creates test transaction data
 */
export const createTestTransaction = async (
  userId: string,
  accountId: string,
  transactionData: {
    merchantName?: string;
    amount?: number;
    date?: Date;
    isSubscription?: boolean;
    category?: string[];
  }
) => {
  return await db.transaction.create({
    data: {
      userId,
      accountId,
      plaidTransactionId: `test-txn-${Date.now()}`,
      merchantName: transactionData.merchantName ?? 'Test Merchant',
      amount: transactionData.amount ?? -15.99,
      date: transactionData.date ?? new Date(),
      description: `Transaction from ${transactionData.merchantName ?? 'Test Merchant'}`,
      category: transactionData.category ?? ['General'],
      subcategory: null,
      pending: false,
      isSubscription: transactionData.isSubscription ?? false,
      isoCurrencyCode: 'USD',
      transactionType: 'special',
      paymentChannel: 'online',
      authorizedDate: null,
      location: undefined,
      confidence: 0.85,
    },
  });
};
