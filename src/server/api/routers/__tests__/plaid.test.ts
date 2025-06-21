import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { plaidRouter } from '@/server/api/routers/plaid';
import type { Session } from 'next-auth';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/db';
import { isPlaidConfigured } from '@/server/plaid-client';

// Mock Prisma client
vi.mock('@/server/db', () => ({
  db: {
    plaidItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
    transaction: {
      createMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock Plaid client
vi.mock('@/server/plaid-client', () => ({
  plaid: () => ({
    linkTokenCreate: vi.fn(),
    itemPublicTokenExchange: vi.fn(),
    accountsGet: vi.fn(),
    transactionsGet: vi.fn(),
    institutionsGetById: vi.fn(),
  }),
  isPlaidConfigured: vi.fn(),
  handlePlaidError: vi.fn(),
}));

describe('plaidRouter', () => {
  let ctx: Awaited<ReturnType<typeof createInnerTRPCContext>>;
  let caller: ReturnType<typeof plaidRouter.createCaller>;

  const mockSession: Session = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockPlaidItem = {
    id: 'plaid-item-1',
    userId: 'test-user-id',
    plaidItemId: 'item_123',
    plaidAccessToken: 'access-token-123',
    institution: {
      id: 'ins_1',
      name: 'Chase Bank',
      logo: 'https://example.com/chase-logo.png',
    },
    isActive: true,
    lastSync: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAccount = {
    id: 'acc-1',
    userId: 'test-user-id',
    plaidItemId: 'plaid-item-1',
    plaidAccountId: 'account_123',
    name: 'Checking Account',
    officialName: 'Chase Total Checking',
    type: 'depository',
    subtype: 'checking',
    mask: '0000',
    availableBalance: 1500.50,
    currentBalance: 1500.50,
    isoCurrencyCode: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    ctx = createInnerTRPCContext({
      session: mockSession,
    });

    caller = plaidRouter.createCaller(ctx);

    // Mock Plaid as configured by default
    (isPlaidConfigured as Mock).mockReturnValue(true);
  });

  describe('createLinkToken', () => {
    it('creates a link token when Plaid is configured', async () => {
      const mockPlaidClient = await import('@/server/plaid-client');
      const mockLinkTokenCreate = vi.fn().mockResolvedValue({
        data: { link_token: 'link-token-123' },
      });
      
      (mockPlaidClient.plaid as Mock).mockReturnValue({
        linkTokenCreate: mockLinkTokenCreate,
      });

      const result = await caller.createLinkToken();

      expect(mockLinkTokenCreate).toHaveBeenCalledWith({
        user: { client_user_id: 'test-user-id' },
        client_name: 'SubPilot',
        products: ['transactions', 'accounts'],
        country_codes: ['US', 'CA'],
        language: 'en',
        webhook: expect.stringContaining('/api/webhooks/plaid'),
      });
      
      expect(result).toEqual({ linkToken: 'link-token-123' });
    });

    it('throws error when Plaid is not configured', async () => {
      (isPlaidConfigured as Mock).mockReturnValue(false);

      await expect(caller.createLinkToken()).rejects.toThrow('Plaid integration is not configured');
    });

    it('handles Plaid API errors', async () => {
      const mockPlaidClient = await import('@/server/plaid-client');
      const mockError = new Error('Plaid API Error');
      
      (mockPlaidClient.plaid as Mock).mockReturnValue({
        linkTokenCreate: vi.fn().mockRejectedValue(mockError),
      });

      (mockPlaidClient.handlePlaidError as Mock).mockReturnValue({
        message: 'Failed to create link token',
        code: 'LINK_TOKEN_CREATE_ERROR',
      });

      await expect(caller.createLinkToken()).rejects.toThrow('Failed to create link token');
    });
  });

  describe('exchangePublicToken', () => {
    const exchangeInput = {
      publicToken: 'public-token-123',
      metadata: {
        institution: {
          name: 'Chase Bank',
          institution_id: 'ins_1',
        },
        accounts: [
          {
            id: 'account_123',
            name: 'Checking Account',
            type: 'depository',
            subtype: 'checking',
            mask: '0000',
          },
        ],
      },
    };

    it('exchanges public token and creates plaid item', async () => {
      const mockPlaidClient = await import('@/server/plaid-client');
      
      (mockPlaidClient.plaid as Mock).mockReturnValue({
        itemPublicTokenExchange: vi.fn().mockResolvedValue({
          data: { access_token: 'access-token-123', item_id: 'item_123' },
        }),
        institutionsGetById: vi.fn().mockResolvedValue({
          data: {
            institution: {
              institution_id: 'ins_1',
              name: 'Chase Bank',
              logo: 'https://example.com/chase-logo.png',
            },
          },
        }),
        accountsGet: vi.fn().mockResolvedValue({
          data: {
            accounts: [
              {
                account_id: 'account_123',
                name: 'Checking Account',
                official_name: 'Chase Total Checking',
                type: 'depository',
                subtype: 'checking',
                mask: '0000',
                balances: {
                  available: 1500.50,
                  current: 1500.50,
                  iso_currency_code: 'USD',
                },
              },
            ],
          },
        }),
      });

      (db.plaidItem.create as Mock).mockResolvedValueOnce(mockPlaidItem);
      (db.account.createMany as Mock).mockResolvedValueOnce({ count: 1 });

      const result = await caller.exchangePublicToken(exchangeInput);

      expect(db.plaidItem.create).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-id',
          plaidItemId: 'item_123',
          plaidAccessToken: 'access-token-123',
          institution: {
            id: 'ins_1',
            name: 'Chase Bank',
            logo: 'https://example.com/chase-logo.png',
          },
          isActive: true,
        },
      });

      expect(db.account.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'test-user-id',
            plaidItemId: 'plaid-item-1',
            plaidAccountId: 'account_123',
            name: 'Checking Account',
            officialName: 'Chase Total Checking',
            type: 'depository',
            subtype: 'checking',
            mask: '0000',
            availableBalance: 1500.50,
            currentBalance: 1500.50,
            isoCurrencyCode: 'USD',
          },
        ],
      });

      expect(result).toEqual({ success: true, itemId: 'plaid-item-1' });
    });

    it('handles missing institution information', async () => {
      const mockPlaidClient = await import('@/server/plaid-client');
      
      (mockPlaidClient.plaid as Mock).mockReturnValue({
        itemPublicTokenExchange: vi.fn().mockResolvedValue({
          data: { access_token: 'access-token-123', item_id: 'item_123' },
        }),
        institutionsGetById: vi.fn().mockRejectedValue(new Error('Institution not found')),
        accountsGet: vi.fn().mockResolvedValue({
          data: { accounts: [] },
        }),
      });

      (db.plaidItem.create as Mock).mockResolvedValueOnce({
        ...mockPlaidItem,
        institution: { id: 'ins_1', name: 'Unknown Bank', logo: null },
      });

      const result = await caller.exchangePublicToken(exchangeInput);

      expect(result.success).toBe(true);
    });
  });

  describe('getAccounts', () => {
    it('returns user plaid items with accounts', async () => {
      (db.plaidItem.findMany as Mock).mockResolvedValueOnce([
        {
          ...mockPlaidItem,
          accounts: [mockAccount],
        },
      ]);

      const result = await caller.getAccounts();

      expect(db.plaidItem.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id', isActive: true },
        include: { accounts: true },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual([
        {
          ...mockPlaidItem,
          accounts: [mockAccount],
        },
      ]);
    });

    it('returns empty array for user with no accounts', async () => {
      (db.plaidItem.findMany as Mock).mockResolvedValueOnce([]);

      const result = await caller.getAccounts();

      expect(result).toEqual([]);
    });
  });

  describe('syncTransactions', () => {
    it('syncs transactions for plaid item', async () => {
      const mockPlaidClient = await import('@/server/plaid-client');
      
      (db.plaidItem.findUnique as Mock).mockResolvedValueOnce({
        ...mockPlaidItem,
        accounts: [mockAccount],
      });

      (mockPlaidClient.plaid as Mock).mockReturnValue({
        transactionsGet: vi.fn().mockResolvedValue({
          data: {
            transactions: [
              {
                transaction_id: 'txn_123',
                account_id: 'account_123',
                amount: -15.99,
                iso_currency_code: 'USD',
                name: 'Netflix',
                merchant_name: 'Netflix',
                date: '2024-07-15',
                category: ['Entertainment'],
                pending: false,
              },
            ],
            total_transactions: 1,
          },
        }),
      });

      (db.transaction.createMany as Mock).mockResolvedValueOnce({ count: 1 });
      (db.transaction.count as Mock).mockResolvedValueOnce(1);

      const result = await caller.syncTransactions({ itemId: 'plaid-item-1' });

      expect(db.transaction.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'test-user-id',
            accountId: 'acc-1',
            plaidTransactionId: 'txn_123',
            name: 'Netflix',
            merchantName: 'Netflix',
            amount: -15.99,
            isoCurrencyCode: 'USD',
            date: new Date('2024-07-15'),
            category: ['Entertainment'],
            pending: false,
            isSubscription: false,
          },
        ],
        skipDuplicates: true,
      });

      expect(result).toEqual({
        success: true,
        transactionsAdded: 1,
        totalTransactions: 1,
      });
    });

    it('throws error for invalid plaid item', async () => {
      (db.plaidItem.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(
        caller.syncTransactions({ itemId: 'invalid-item' })
      ).rejects.toThrow('Plaid item not found');
    });
  });

  describe('deleteItem', () => {
    it('soft deletes plaid item', async () => {
      (db.plaidItem.findUnique as Mock).mockResolvedValueOnce(mockPlaidItem);
      (db.plaidItem.update as Mock).mockResolvedValueOnce({
        ...mockPlaidItem,
        isActive: false,
      });

      const result = await caller.deleteItem({ itemId: 'plaid-item-1' });

      expect(db.plaidItem.update).toHaveBeenCalledWith({
        where: { id: 'plaid-item-1', userId: 'test-user-id' },
        data: { isActive: false },
      });

      expect(result).toEqual({ success: true });
    });

    it('throws error for non-existent item', async () => {
      (db.plaidItem.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(
        caller.deleteItem({ itemId: 'invalid-item' })
      ).rejects.toThrow('Plaid item not found');
    });
  });

  describe('unauthorized access', () => {
    it('throws UNAUTHORIZED for all endpoints without session', async () => {
      const unauthenticatedCaller = plaidRouter.createCaller(
        createInnerTRPCContext({ session: null })
      );

      await expect(unauthenticatedCaller.createLinkToken()).rejects.toThrow(TRPCError);
      await expect(
        unauthenticatedCaller.exchangePublicToken({
          publicToken: 'test',
          metadata: { institution: { name: 'Test', institution_id: 'test' }, accounts: [] },
        })
      ).rejects.toThrow(TRPCError);
      await expect(unauthenticatedCaller.getAccounts()).rejects.toThrow(TRPCError);
    });
  });
});