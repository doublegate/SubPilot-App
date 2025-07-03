import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { AuthorizationMiddleware, type ResourceType } from '../authorization';
import { type PrismaClient, type Subscription, type User, type BankAccount } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock AuditLogger
vi.mock('@/server/lib/audit-logger', () => ({
  AuditLogger: {
    log: vi.fn(),
  },
}));

// Helper to create a mock subscription
const createMockSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'sub_123',
  userId: 'user_123',
  name: 'Test Subscription',
  amount: new Decimal(9.99),
  currency: 'USD',
  frequency: 'monthly',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  provider: {},
  cancellationInfo: {},
  isActive: true,
  detectedAt: new Date(),
  detectionConfidence: new Decimal(0.95),
  nextBilling: null,
  lastBilling: null,
  description: null,
  category: null,
  notes: null,
  aiCategory: null,
  aiCategoryConfidence: null,
  categoryOverride: null,
  ...overrides,
});

// Helper to create a mock user
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user_123',
  email: 'test@example.com',
  emailVerified: null,
  name: 'Test User',
  image: null,
  password: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  isAdmin: false,
  notificationPreferences: {},
  failedLoginAttempts: 0,
  lockedUntil: null,
  ...overrides,
});

// Helper to create a mock bank account
const createMockBankAccount = (overrides: Partial<BankAccount> = {}): BankAccount => ({
  id: 'acc_123',
  userId: 'user_123',
  plaidItemId: 'item_123',
  plaidAccountId: 'plaid_acc_123',
  name: 'Test Checking',
  officialName: 'Test Checking Account',
  type: 'depository',
  subtype: 'checking',
  mask: '1234',
  availableBalance: new Decimal(900.00),
  currentBalance: new Decimal(1000.00),
  isoCurrencyCode: 'USD',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSync: new Date(),
  ...overrides,
});

// Helper to create a mock transaction
const createMockTransaction = (overrides: any = {}): any => ({
  id: 'txn_123',
  bankAccountId: 'acc_123',
  amount: new Decimal(50.00),
  currency: 'USD',
  date: new Date(),
  name: 'Test Transaction',
  merchantName: 'Test Merchant',
  transactionId: 'plaid_txn_123',
  createdAt: new Date(),
  updatedAt: new Date(),
  category: null,
  categoryDetailed: null,
  paymentChannel: null,
  pending: false,
  accountOwner: null,
  isRecurring: false,
  subscriptionId: null,
  ...overrides,
});

// Mock Prisma client
const mockDb = {
  user: {
    findUnique: vi.fn(),
  },
  subscription: {
    findFirst: vi.fn(),
  },
  bankAccount: {
    findFirst: vi.fn(),
  },
  transaction: {
    findFirst: vi.fn(),
  },
  notification: {
    findFirst: vi.fn(),
  },
  cancellationRequest: {
    findFirst: vi.fn(),
  },
  conversation: {
    findFirst: vi.fn(),
  },
  userSubscription: {
    findFirst: vi.fn(),
  },
  plaidItem: {
    findFirst: vi.fn(),
  },
} as unknown as PrismaClient;

describe('AuthorizationMiddleware', () => {
  let authz: AuthorizationMiddleware;
  const userId = 'user-123';
  const resourceId = 'resource-456';

  beforeEach(() => {
    vi.clearAllMocks();
    authz = new AuthorizationMiddleware(mockDb);
  });

  describe('requireResourceOwnership', () => {
    it('should allow access for resource owner', async () => {
      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(
        createMockSubscription({ id: resourceId, userId })
      );

      await expect(
        authz.requireResourceOwnership('subscription', resourceId, userId)
      ).resolves.not.toThrow();
    });

    it('should deny access for non-owner', async () => {
      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(null);

      await expect(
        authz.requireResourceOwnership('subscription', resourceId, userId)
      ).rejects.toThrow(TRPCError);
    });

    it('should allow admin access regardless of ownership', async () => {
      vi.mocked(mockDb.user.findUnique).mockResolvedValue(
        createMockUser({ id: userId, isAdmin: true })
      );
      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(null);

      await expect(
        authz.requireResourceOwnership('subscription', resourceId, userId, {
          allowedRoles: ['admin'],
        })
      ).resolves.not.toThrow();
    });

    it('should throw NOT_FOUND for unauthorized access', async () => {
      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(null);

      try {
        await authz.requireResourceOwnership('subscription', resourceId, userId);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('NOT_FOUND');
        expect((error as TRPCError).message).toBe('Resource not found or access denied');
      }
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(mockDb.subscription.findFirst).mockRejectedValue(new Error('DB Error'));

      try {
        await authz.requireResourceOwnership('subscription', resourceId, userId);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('INTERNAL_SERVER_ERROR');
        expect((error as TRPCError).message).toBe('Authorization check failed');
      }
    });
  });

  describe('Resource type verification', () => {
    const testCases: Array<{
      type: ResourceType;
      mockMethod: keyof typeof mockDb;
      mockResult: any;
    }> = [
      {
        type: 'subscription',
        mockMethod: 'subscription',
        mockResult: createMockSubscription({ id: resourceId, userId }),
      },
      {
        type: 'account',
        mockMethod: 'bankAccount',
        mockResult: createMockBankAccount({ id: resourceId, userId }),
      },
      {
        type: 'transaction',
        mockMethod: 'transaction',
        mockResult: createMockTransaction({ id: resourceId }),
      },
      {
        type: 'notification',
        mockMethod: 'notification',
        mockResult: { id: resourceId },
      },
      {
        type: 'cancellation_request',
        mockMethod: 'cancellationRequest',
        mockResult: { id: resourceId },
      },
      {
        type: 'conversation',
        mockMethod: 'conversation',
        mockResult: { id: resourceId },
      },
      {
        type: 'billing_subscription',
        mockMethod: 'userSubscription',
        mockResult: { id: resourceId },
      },
      {
        type: 'plaid_item',
        mockMethod: 'plaidItem',
        mockResult: { id: resourceId },
      },
    ];

    testCases.forEach(({ type, mockMethod, mockResult }) => {
      it(`should verify ${type} ownership`, async () => {
        (mockDb[mockMethod] as any).findFirst.mockResolvedValue(mockResult);

        await expect(
          authz.requireResourceOwnership(type, resourceId, userId)
        ).resolves.not.toThrow();

        expect((mockDb[mockMethod] as any).findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              id: resourceId,
            }),
            select: { id: true },
          })
        );
      });
    });
  });

  describe('requireActive option', () => {
    it('should include isActive filter when requireActive is true', async () => {
      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(
        createMockSubscription({ id: resourceId, userId, isActive: true })
      );

      await authz.requireResourceOwnership('subscription', resourceId, userId, {
        requireActive: true,
      });

      expect(mockDb.subscription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: resourceId,
            userId,
            isActive: true,
          }),
        })
      );
    });

    it('should not include isActive filter when requireActive is false', async () => {
      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(
        createMockSubscription({ id: resourceId, userId })
      );

      await authz.requireResourceOwnership('subscription', resourceId, userId, {
        requireActive: false,
      });

      expect(mockDb.subscription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            isActive: expect.anything(),
          }),
        })
      );
    });
  });

  describe('requireAdminRole', () => {
    it('should allow admin users', async () => {
      vi.mocked(mockDb.user.findUnique).mockResolvedValue(
        createMockUser({ id: userId, isAdmin: true })
      );

      await expect(authz.requireAdminRole(userId)).resolves.not.toThrow();
    });

    it('should deny non-admin users', async () => {
      vi.mocked(mockDb.user.findUnique).mockResolvedValue(
        createMockUser({ id: userId, isAdmin: false })
      );

      try {
        await authz.requireAdminRole(userId);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('FORBIDDEN');
        expect((error as TRPCError).message).toBe('Administrator access required');
      }
    });

    it('should deny users without role', async () => {
      vi.mocked(mockDb.user.findUnique).mockResolvedValue(null);

      try {
        await authz.requireAdminRole(userId);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('FORBIDDEN');
      }
    });
  });

  describe('requireMultipleResourceOwnership', () => {
    it('should verify ownership of multiple resources', async () => {
      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(
        createMockSubscription({ id: 'sub-1', userId })
      );
      vi.mocked(mockDb.bankAccount.findFirst).mockResolvedValue(
        createMockBankAccount({ id: 'acc-1', userId })
      );

      await expect(
        authz.requireMultipleResourceOwnership(
          [
            { type: 'subscription', id: 'sub-1' },
            { type: 'account', id: 'acc-1' },
          ],
          userId
        )
      ).resolves.not.toThrow();
    });

    it('should fail if any resource is not owned', async () => {
      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(
        createMockSubscription({ id: 'sub-1', userId })
      );
      vi.mocked(mockDb.bankAccount.findFirst).mockResolvedValue(null);

      await expect(
        authz.requireMultipleResourceOwnership(
          [
            { type: 'subscription', id: 'sub-1' },
            { type: 'account', id: 'acc-1' },
          ],
          userId
        )
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('Transaction ownership verification', () => {
    it('should verify transaction ownership through account relationship', async () => {
      vi.mocked(mockDb.transaction.findFirst).mockResolvedValue(
        createMockTransaction({ id: resourceId })
      );

      await authz.requireResourceOwnership('transaction', resourceId, userId);

      expect(mockDb.transaction.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: resourceId,
            account: {
              userId,
            },
          },
          select: { id: true },
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should use generic error messages to prevent information disclosure', async () => {
      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(null);

      try {
        await authz.requireResourceOwnership('subscription', resourceId, userId);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        // Should not reveal whether resource exists or user lacks permission
        expect((error as TRPCError).message).toBe('Resource not found or access denied');
      }
    });

    it('should handle unknown resource types gracefully', async () => {
      try {
        await authz.requireResourceOwnership(
          'unknown_type' as ResourceType,
          resourceId,
          userId
        );
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('NOT_FOUND');
      }
    });
  });
});