// Test file
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from 'vitest';
import { TRPCError } from '@trpc/server';
import { plaidRouter } from '../plaid';
import { createInnerTRPCContext } from '@/server/api/trpc';
// PlaidApi import removed as unused - fixes ESLint warning
import type { Session } from 'next-auth';
import { plaid } from '@/server/plaid-client';

// Mock environment
vi.mock('@/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PLAID_CLIENT_ID: 'test_client_id',
    PLAID_SECRET: 'test_secret',
    PLAID_ENV: 'sandbox',
    PLAID_PRODUCTS: 'transactions,accounts',
    PLAID_COUNTRY_CODES: 'US,CA',
    PLAID_WEBHOOK_URL: 'https://example.com/webhooks/plaid',
    NEXTAUTH_SECRET: 'test-secret',
  },
}));

// Mock crypto functions
vi.mock('@/server/lib/crypto', () => ({
  encrypt: vi.fn().mockResolvedValue('encrypted_token'),
  decrypt: vi.fn().mockResolvedValue('decrypted_token'),
}));

// Mock institution service
vi.mock('@/server/services/institution.service', () => ({
  InstitutionService: {
    getInstitution: vi.fn().mockResolvedValue({
      id: 'ins_1',
      name: 'Test Bank',
      logo: 'https://example.com/logo.png',
      oauth: false,
      mfa: [],
    }),
  },
}));

// Mock Plaid client
vi.mock('@/server/plaid-client', () => {
  const mockPlaidClient = {
    linkTokenCreate: vi.fn(),
    itemPublicTokenExchange: vi.fn(),
    accountsGet: vi.fn(),
    transactionsGet: vi.fn(),
    transactionsSync: vi.fn(),
    itemRemove: vi.fn(),
    webhookVerificationKeyGet: vi.fn(),
  };

  return {
    plaid: vi.fn().mockReturnValue(mockPlaidClient),
    isPlaidConfigured: vi.fn().mockReturnValue(true),
    handlePlaidError: vi.fn().mockReturnValue({
      message: 'Test error',
      code: 'TEST_ERROR',
      type: 'API_ERROR',
    }),
    plaidWithRetry: vi
      .fn()
      .mockImplementation(async (operation: () => Promise<unknown>) =>
        operation()
      ),
  };
});

// MockDb interface removed as unused - fixes ESLint warning

// Mock database module - define inside factory function to avoid hoisting issues
vi.mock('@/server/db', () => ({
  db: {
    plaidItem: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    bankAccount: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    transaction: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Import db after mocking
import { db } from '@/server/db';

// Helper to get mocked plaid client
const getMockPlaidClient = () => {
  const mockedPlaid = plaid as MockedFunction<typeof plaid>;
  return mockedPlaid();
};

// Mock session
const mockSession: Session = {
  user: {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

describe('Plaid Router', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Ensure isPlaidConfigured returns true by default
    const plaidClient = await import('@/server/plaid-client');
    vi.mocked(plaidClient.isPlaidConfigured).mockReturnValue(true);
  });

  describe('createLinkToken', () => {
    it('should create a link token successfully', async () => {
      const mockResponse = {
        data: {
          link_token: 'link-token-123',
          expiration: '2024-12-31T23:59:59Z',
        },
      };

      getMockPlaidClient()!.linkTokenCreate = vi
        .fn()
        .mockResolvedValue(mockResponse);

      const ctx = createInnerTRPCContext({ session: mockSession });
      // Mocking db for tests
      // Database is already mocked globally
      const caller = plaidRouter.createCaller(ctx);
      const result = await caller.createLinkToken();

      expect(result).toEqual({
        linkToken: 'link-token-123',
        expiration: new Date('2024-12-31T23:59:59Z'),
      });

      expect(getMockPlaidClient()!.linkTokenCreate).toHaveBeenCalledWith({
        user: { client_user_id: 'user123' },
        client_name: 'SubPilot',
        products: ['transactions', 'accounts'],
        country_codes: ['US', 'CA'],
        language: 'en',
        webhook: 'https://example.com/webhooks/plaid',
        redirect_uri: undefined,
      });
    });

    it('should throw error when Plaid is not configured', async () => {
      const plaidClient = await import('@/server/plaid-client');
      vi.mocked(plaidClient.isPlaidConfigured).mockReturnValue(false);

      const ctx = createInnerTRPCContext({ session: mockSession });
      // Mocking db for tests
      // Database is already mocked globally
      const caller = plaidRouter.createCaller(ctx);

      await expect(caller.createLinkToken()).rejects.toThrow(TRPCError);
      await expect(caller.createLinkToken()).rejects.toThrow(
        'Plaid is not configured'
      );
    });
  });

  describe('exchangePublicToken', () => {
    const mockInput = {
      publicToken: 'public-token-123',
      metadata: {
        institution: {
          name: 'Test Bank',
          institution_id: 'ins_1',
        },
        accounts: [
          {
            id: 'acc_1',
            name: 'Checking',
            type: 'depository',
            subtype: 'checking',
            mask: '1234',
          },
        ],
      },
    };

    beforeEach(() => {
      // Reset all mocks
      vi.clearAllMocks();

      getMockPlaidClient()!.itemPublicTokenExchange = vi
        .fn()
        .mockResolvedValue({
          data: {
            access_token: 'access-token-123',
            item_id: 'item-123',
          },
        });

      getMockPlaidClient()!.accountsGet = vi.fn().mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: 'acc_1',
              name: 'Checking',
              official_name: 'Test Checking Account',
              type: 'depository',
              subtype: 'checking',
              mask: '1234',
              balances: {
                current: 1000,
                available: 950,
                iso_currency_code: 'USD',
              },
            },
          ],
        },
      });

      // Mock all database operations that might be called
      (db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
      });

      (db.plaidItem.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'plaid-item-1',
        plaidItemId: 'item-123',
        userId: 'user123',
        institutionName: 'Test Bank',
        accessToken: 'encrypted_token',
      });

      (db.bankAccount.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'bank-account-1',
        plaidAccountId: 'acc_1',
        name: 'Checking',
        currentBalance: 1000,
        plaidItemId: 'plaid-item-1',
      });

      getMockPlaidClient()!.transactionsGet = vi.fn().mockResolvedValue({
        data: {
          transactions: [
            {
              transaction_id: 'txn_1',
              account_id: 'acc_1',
              amount: 100,
              name: 'Test Transaction',
              date: '2024-01-01',
              pending: false,
              category: ['Payment', 'Subscription'],
              merchant_name: 'Test Merchant',
              payment_channel: 'online',
              transaction_type: 'special',
              iso_currency_code: 'USD',
            },
          ],
          total_transactions: 1,
        },
      });

      (db.transaction.createMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        { count: 1 }
      );
      (db.notification.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'notif-1',
        userId: 'user123',
        type: 'plaid_item_connected',
        title: 'Bank Account Connected',
        message: 'Successfully connected Test Bank',
      });
    });

    it.skip('should exchange public token and set up bank connection', async () => {
      const ctx = createInnerTRPCContext({ session: mockSession });
      // Mocking db for tests
      // Database is already mocked globally
      const caller = plaidRouter.createCaller(ctx);
      const result = await caller.exchangePublicToken(mockInput);

      expect(result.success).toBe(true);
      expect(result.itemId).toBe('plaid-item-1');
      expect(result.accounts).toHaveLength(1);

      // Verify Plaid calls
      expect(
        getMockPlaidClient()!.itemPublicTokenExchange
      ).toHaveBeenCalledWith({
        public_token: 'public-token-123',
      });
      expect(getMockPlaidClient()!.accountsGet).toHaveBeenCalled();
      expect(getMockPlaidClient()!.transactionsGet).toHaveBeenCalled();

      // Verify database calls
      expect(db.plaidItem.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          plaidItemId: 'item-123',
          accessToken: 'encrypted_token',
          institutionId: 'ins_1',
          institutionName: 'Test Bank',
          institutionLogo: 'https://example.com/logo.png',
          status: 'good',
        },
      });
    });

    it.skip('should handle transaction fetch errors gracefully', async () => {
      getMockPlaidClient()!.transactionsGet = vi
        .fn()
        .mockRejectedValue(new Error('Transaction fetch failed'));

      const ctx = createInnerTRPCContext({ session: mockSession });
      // Mocking db for tests
      // Database is already mocked globally
      const caller = plaidRouter.createCaller(ctx);
      const result = await caller.exchangePublicToken(mockInput);

      // Should still succeed despite transaction fetch failure
      expect(result.success).toBe(true);
      expect(result.itemId).toBe('plaid-item-1');
    });
  });

  describe('syncTransactions', () => {
    beforeEach(() => {
      vi.mocked(db.plaidItem.findMany).mockResolvedValue([
        {
          id: 'plaid-item-1',
          userId: 'user123',
          plaidItemId: 'item-123',
          accessToken: 'encrypted_token',
          institutionId: 'ins_1',
          institutionName: 'Test Bank',
          institutionLogo: null,
          availableProducts: [],
          billedProducts: [],
          status: 'good',
          lastWebhook: null,
          needsSync: false,
          isActive: true,
          errorCode: null,
          errorMessage: null,
          syncCursor: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          bankAccounts: [
            {
              id: 'bank-account-1',
              plaidAccountId: 'acc_1',
              lastSync: new Date('2024-01-01'),
            },
          ],
        } as any,
      ]);

      getMockPlaidClient()!.transactionsSync = vi.fn().mockResolvedValue({
        data: {
          added: [
            {
              transaction_id: 'txn_new',
              account_id: 'acc_1',
              amount: 50,
              name: 'New Transaction',
              date: '2024-01-02',
              pending: false,
              category: ['Food'],
              iso_currency_code: 'USD',
            },
          ],
          modified: [],
          removed: [],
          has_more: false,
          next_cursor: 'cursor_123',
        },
      });

      getMockPlaidClient()!.accountsGet = vi.fn().mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: 'acc_1',
              balances: {
                current: 950,
                available: 900,
              },
            },
          ],
        },
      });

      vi.mocked(db.transaction.createMany).mockResolvedValue({ count: 1 });
    });

    it('should sync transactions using sync endpoint', async () => {
      const ctx = createInnerTRPCContext({ session: mockSession });
      // Mocking db for tests
      // Database is already mocked globally
      const caller = plaidRouter.createCaller(ctx);
      const result = await caller.syncTransactions({});

      expect(result.success).toBe(true);
      expect(result.totalNewTransactions).toBe(1);

      // Verify sync endpoint was called
      expect(getMockPlaidClient()!.transactionsSync).toHaveBeenCalledWith({
        access_token: 'decrypted_token',
        cursor: '',
      });

      // Verify item was updated
      expect(db.plaidItem.update).toHaveBeenCalledWith({
        where: { id: 'plaid-item-1' },
        data: { needsSync: false },
      });

      // Verify balances were updated
      expect(db.bankAccount.update).toHaveBeenCalled();
    });

    it('should handle removed transactions', async () => {
      getMockPlaidClient()!.transactionsSync = vi.fn().mockResolvedValue({
        data: {
          added: [],
          modified: [],
          removed: [{ transaction_id: 'txn_old' }],
          has_more: false,
          next_cursor: 'cursor_123',
        },
      });

      const ctx = createInnerTRPCContext({ session: mockSession });
      // Mocking db for tests
      // Database is already mocked globally
      const caller = plaidRouter.createCaller(ctx);
      await caller.syncTransactions({});

      expect(db.transaction.deleteMany).toHaveBeenCalledWith({
        where: {
          plaidTransactionId: { in: ['txn_old'] },
          userId: 'user123',
        },
      });
    });

    it('should handle modified transactions', async () => {
      getMockPlaidClient()!.transactionsSync = vi.fn().mockResolvedValue({
        data: {
          added: [],
          modified: [
            {
              transaction_id: 'txn_modified',
              account_id: 'acc_1',
              amount: 75,
              name: 'Modified Transaction',
              date: '2024-01-02',
              pending: true,
              iso_currency_code: 'USD',
            },
          ],
          removed: [],
          has_more: false,
          next_cursor: 'cursor_123',
        },
      });

      const ctx = createInnerTRPCContext({ session: mockSession });
      // Mocking db for tests
      // Database is already mocked globally
      const caller = plaidRouter.createCaller(ctx);
      await caller.syncTransactions({});

      expect(db.transaction.upsert).toHaveBeenCalledWith({
        where: { plaidTransactionId: 'txn_modified' },
        update: expect.objectContaining({
          amount: 75,
          description: 'Modified Transaction',
          pending: true,
        }),
        create: expect.objectContaining({
          userId: 'user123',
          plaidTransactionId: 'txn_modified',
          amount: 75,
        }),
      });
    });
  });

  describe('getAccounts', () => {
    it('should return accounts with institution logos', async () => {
      vi.mocked(db.plaidItem.findMany).mockResolvedValue([
        {
          id: 'plaid-item-1',
          userId: 'user123',
          plaidItemId: 'item-123',
          accessToken: 'encrypted_token',
          institutionId: 'ins_1',
          institutionName: 'Test Bank',
          institutionLogo: 'https://example.com/logo.png',
          availableProducts: [],
          billedProducts: [],
          status: 'good',
          lastWebhook: null,
          needsSync: false,
          isActive: true,
          errorCode: null,
          errorMessage: null,
          syncCursor: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          bankAccounts: [
            {
              id: 'account-1',
              plaidAccountId: 'acc_1',
              name: 'Checking',
              type: 'depository',
              subtype: 'checking',
              currentBalance: { toNumber: () => 1000 },
              isoCurrencyCode: 'USD',
              isActive: true,
              lastSync: new Date('2024-01-01'),
              createdAt: new Date('2024-01-01'),
            },
          ],
        } as any,
      ]);

      const ctx = createInnerTRPCContext({ session: mockSession });
      // Mocking db for tests
      // Database is already mocked globally
      const caller = plaidRouter.createCaller(ctx);
      const result = await caller.getAccounts();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'account-1',
        plaidAccountId: 'acc_1',
        name: 'Checking',
        type: 'depository',
        subtype: 'checking',
        balance: 1000,
        currency: 'USD',
        institution: {
          name: 'Test Bank',
          logo: 'https://example.com/logo.png',
        },
        isActive: true,
        lastSync: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      });
    });
  });

  describe('disconnectAccount', () => {
    beforeEach(() => {
      vi.mocked(db.plaidItem.findFirst).mockResolvedValue({
        id: 'plaid-item-1',
        userId: 'user123',
        plaidItemId: 'item-123',
        accessToken: 'encrypted_token',
        institutionId: 'ins_1',
        institutionName: 'Test Bank',
        institutionLogo: null,
        availableProducts: [],
        billedProducts: [],
        status: 'good',
        lastWebhook: null,
        needsSync: false,
        isActive: true,
        errorCode: null,
        errorMessage: null,
        syncCursor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    });

    it('should disconnect account and remove from Plaid', async () => {
      const ctx = createInnerTRPCContext({ session: mockSession });
      // Mocking db for tests
      // Database is already mocked globally
      const caller = plaidRouter.createCaller(ctx);
      const result = await caller.disconnectAccount({
        plaidItemId: 'plaid-item-1',
      });

      expect(result.success).toBe(true);

      // Verify Plaid removal
      expect(getMockPlaidClient()!.itemRemove).toHaveBeenCalledWith({
        access_token: 'decrypted_token',
      });

      // Verify database updates
      expect(db.plaidItem.update).toHaveBeenCalledWith({
        where: { id: 'plaid-item-1' },
        data: { status: 'inactive' },
      });

      expect(db.bankAccount.updateMany).toHaveBeenCalledWith({
        where: { plaidItemId: 'plaid-item-1' },
        data: { isActive: false },
      });
    });

    it('should handle Plaid removal errors gracefully', async () => {
      getMockPlaidClient()!.itemRemove = vi
        .fn()
        .mockRejectedValue(new Error('Plaid removal failed'));

      const ctx = createInnerTRPCContext({ session: mockSession });
      // Mocking db for tests
      // Database is already mocked globally
      const caller = plaidRouter.createCaller(ctx);
      const result = await caller.disconnectAccount({
        plaidItemId: 'plaid-item-1',
      });

      // Should still succeed and clean up locally
      expect(result.success).toBe(true);
      expect(db.plaidItem.update).toHaveBeenCalled();
    });

    it('should throw error if account not found', async () => {
      vi.mocked(db.plaidItem.findFirst).mockResolvedValue(null);

      const ctx = createInnerTRPCContext({ session: mockSession });
      // Mocking db for tests
      // Database is already mocked globally
      const caller = plaidRouter.createCaller(ctx);

      await expect(
        caller.disconnectAccount({ plaidItemId: 'non-existent' })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status for all items', async () => {
      vi.mocked(db.plaidItem.findMany).mockResolvedValue([
        {
          id: 'plaid-item-1',
          userId: 'user123',
          plaidItemId: 'item-123-1',
          accessToken: 'encrypted_token',
          institutionId: 'ins_1',
          institutionName: 'Test Bank',
          institutionLogo: null,
          availableProducts: [],
          billedProducts: [],
          status: 'good',
          lastWebhook: null,
          needsSync: false,
          isActive: true,
          errorCode: null,
          errorMessage: null,
          syncCursor: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          bankAccounts: [{ id: 'acc-1', lastSync: new Date('2024-01-01') }],
        },
        {
          id: 'plaid-item-2',
          userId: 'user123',
          plaidItemId: 'item-123-2',
          accessToken: 'encrypted_token',
          institutionId: 'ins_2',
          institutionName: 'Another Bank',
          institutionLogo: null,
          availableProducts: [],
          billedProducts: [],
          status: 'error',
          lastWebhook: null,
          needsSync: false,
          isActive: true,
          errorCode: null,
          errorMessage: null,
          syncCursor: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          bankAccounts: [],
        },
      ] as any);

      const ctx = createInnerTRPCContext({ session: mockSession });
      // Mocking db for tests
      // Database is already mocked globally
      const caller = plaidRouter.createCaller(ctx);
      const result = await caller.getSyncStatus();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'plaid-item-1',
        institutionName: 'Test Bank',
        lastSync: new Date('2024-01-01'),
        status: 'good',
        error: null,
        accountCount: 1,
      });
      expect(result[1]).toEqual({
        id: 'plaid-item-2',
        institutionName: 'Another Bank',
        lastSync: null,
        status: 'error',
        error: null,
        accountCount: 0,
      });
    });
  });
});
