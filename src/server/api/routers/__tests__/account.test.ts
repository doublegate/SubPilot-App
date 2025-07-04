import { expect, describe, it, vi, beforeEach } from 'vitest';
import { accountRouter } from '../account';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { AccountService } from '@/server/services/account.service';
import type { Session } from 'next-auth';

// Mock the AccountService
vi.mock('@/server/services/account.service');

// Mock Prisma client
vi.mock('@/server/db', () => ({
  db: {
    // Add any specific mocks as needed
  },
}));

const mockSession: Session = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

describe('Account Router', () => {
  let ctx: ReturnType<typeof createInnerTRPCContext>;
  let caller: ReturnType<typeof accountRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();

    ctx = createInnerTRPCContext({ session: mockSession });
    caller = accountRouter.createCaller(ctx);
  });

  describe('create', () => {
    it('should create a new personal account', async () => {
      const mockAccount = {
        id: 'acc-123',
        name: 'My Personal Account',
        type: 'personal',
        ownerId: 'user-123',
        createdAt: new Date(),
      };

      const mockCreateAccount = vi.fn().mockResolvedValue(mockAccount);
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            createAccount: mockCreateAccount,
          }) as any
      );

      const result = await caller.create({
        name: 'My Personal Account',
        type: 'personal',
      });

      expect(mockCreateAccount).toHaveBeenCalledWith({
        userId: 'user-123',
        name: 'My Personal Account',
        type: 'personal',
      });
      expect(result).toEqual(mockAccount);
    });

    it('should create a family account', async () => {
      const mockAccount = {
        id: 'acc-456',
        name: 'Smith Family',
        type: 'family',
        ownerId: 'user-123',
        createdAt: new Date(),
      };

      const mockCreateAccount = vi.fn().mockResolvedValue(mockAccount);
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            createAccount: mockCreateAccount,
          }) as any
      );

      const result = await caller.create({
        name: 'Smith Family',
        type: 'family',
      });

      expect(mockCreateAccount).toHaveBeenCalledWith({
        userId: 'user-123',
        name: 'Smith Family',
        type: 'family',
      });
      expect(result).toEqual(mockAccount);
    });

    it('should default to personal account type', async () => {
      const mockCreateAccount = vi.fn().mockResolvedValue({});
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            createAccount: mockCreateAccount,
          }) as any
      );

      await caller.create({ name: 'Default Account' });

      expect(mockCreateAccount).toHaveBeenCalledWith({
        userId: 'user-123',
        name: 'Default Account',
        type: 'personal',
      });
    });

    it('should validate account name length', async () => {
      await expect(caller.create({ name: '' })).rejects.toThrow();
      await expect(caller.create({ name: 'x'.repeat(101) })).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('should get all user accounts', async () => {
      const mockAccounts = [
        {
          id: 'acc-123',
          name: 'Personal Account',
          type: 'personal',
          role: 'owner',
        },
        {
          id: 'acc-456',
          name: 'Family Account',
          type: 'family',
          role: 'admin',
        },
      ];

      const mockGetUserAccounts = vi.fn().mockResolvedValue(mockAccounts);
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            getUserAccounts: mockGetUserAccounts,
          }) as any
      );

      const result = await caller.list();

      expect(mockGetUserAccounts).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockAccounts);
    });

    it('should return empty array when user has no accounts', async () => {
      const mockGetUserAccounts = vi.fn().mockResolvedValue([]);
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            getUserAccounts: mockGetUserAccounts,
          }) as any
      );

      const result = await caller.list();

      expect(result).toEqual([]);
    });
  });

  describe('get', () => {
    it('should get specific account by ID', async () => {
      const mockAccount = {
        id: 'acc-123',
        name: 'Test Account',
        type: 'team',
        members: [
          { userId: 'user-123', role: 'owner' },
          { userId: 'user-456', role: 'member' },
        ],
      };

      const mockGetAccount = vi.fn().mockResolvedValue(mockAccount);
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            getAccount: mockGetAccount,
          }) as any
      );

      const result = await caller.get({ accountId: 'acc-123' });

      expect(mockGetAccount).toHaveBeenCalledWith('acc-123', 'user-123');
      expect(result).toEqual(mockAccount);
    });

    it('should handle account not found', async () => {
      const mockGetAccount = vi
        .fn()
        .mockRejectedValue(new Error('Account not found'));
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            getAccount: mockGetAccount,
          }) as any
      );

      await expect(caller.get({ accountId: 'nonexistent' })).rejects.toThrow(
        'Account not found'
      );
    });
  });

  describe('inviteMember', () => {
    it('should invite a member to account', async () => {
      const mockInvitation = {
        id: 'inv-123',
        accountId: 'acc-123',
        email: 'newmember@example.com',
        role: 'member',
        status: 'pending',
      };

      const mockInviteMember = vi.fn().mockResolvedValue(mockInvitation);
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            inviteMember: mockInviteMember,
          }) as any
      );

      const result = await caller.inviteMember({
        accountId: 'acc-123',
        email: 'newmember@example.com',
        role: 'member',
      });

      expect(mockInviteMember).toHaveBeenCalledWith({
        accountId: 'acc-123',
        invitedByUserId: 'user-123',
        email: 'newmember@example.com',
        role: 'member',
      });
      expect(result).toEqual(mockInvitation);
    });

    it('should invite admin member', async () => {
      const mockInviteMember = vi.fn().mockResolvedValue({});
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            inviteMember: mockInviteMember,
          }) as any
      );

      await caller.inviteMember({
        accountId: 'acc-123',
        email: 'admin@example.com',
        role: 'admin',
      });

      expect(mockInviteMember).toHaveBeenCalledWith({
        accountId: 'acc-123',
        invitedByUserId: 'user-123',
        email: 'admin@example.com',
        role: 'admin',
      });
    });

    it('should default to member role', async () => {
      const mockInviteMember = vi.fn().mockResolvedValue({});
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            inviteMember: mockInviteMember,
          }) as any
      );

      await caller.inviteMember({
        accountId: 'acc-123',
        email: 'member@example.com',
      });

      expect(mockInviteMember).toHaveBeenCalledWith({
        accountId: 'acc-123',
        invitedByUserId: 'user-123',
        email: 'member@example.com',
        role: 'member',
      });
    });

    it('should validate email format', async () => {
      await expect(
        caller.inviteMember({
          accountId: 'acc-123',
          email: 'invalid-email',
          role: 'member',
        })
      ).rejects.toThrow();
    });

    it('should validate role enum', async () => {
      await expect(
        caller.inviteMember({
          accountId: 'acc-123',
          email: 'test@example.com',
          role: 'invalid' as any,
        })
      ).rejects.toThrow();
    });
  });

  describe('acceptInvitation', () => {
    it('should accept account invitation', async () => {
      const mockAcceptInvitation = vi.fn().mockResolvedValue(undefined);
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            acceptInvitation: mockAcceptInvitation,
          }) as any
      );

      const result = await caller.acceptInvitation({ accountId: 'acc-123' });

      expect(mockAcceptInvitation).toHaveBeenCalledWith('acc-123', 'user-123');
      expect(result).toEqual({ success: true });
    });

    it('should handle invitation errors', async () => {
      const mockAcceptInvitation = vi
        .fn()
        .mockRejectedValue(new Error('Invalid invitation'));
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            acceptInvitation: mockAcceptInvitation,
          }) as any
      );

      await expect(
        caller.acceptInvitation({ accountId: 'acc-123' })
      ).rejects.toThrow('Invalid invitation');
    });
  });

  describe('removeMember', () => {
    it('should remove member from account', async () => {
      const mockRemoveMember = vi.fn().mockResolvedValue(undefined);
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            removeMember: mockRemoveMember,
          }) as any
      );

      const result = await caller.removeMember({
        accountId: 'acc-123',
        userId: 'user-456',
      });

      expect(mockRemoveMember).toHaveBeenCalledWith({
        accountId: 'acc-123',
        userId: 'user-456',
        removedByUserId: 'user-123',
      });
      expect(result).toEqual({ success: true });
    });

    it('should handle member removal errors', async () => {
      const mockRemoveMember = vi
        .fn()
        .mockRejectedValue(new Error('Cannot remove member'));
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            removeMember: mockRemoveMember,
          }) as any
      );

      await expect(
        caller.removeMember({
          accountId: 'acc-123',
          userId: 'user-456',
        })
      ).rejects.toThrow('Cannot remove member');
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role to admin', async () => {
      const mockUpdateMemberRole = vi.fn().mockResolvedValue(undefined);
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            updateMemberRole: mockUpdateMemberRole,
          }) as any
      );

      const result = await caller.updateMemberRole({
        accountId: 'acc-123',
        userId: 'user-456',
        role: 'admin',
      });

      expect(mockUpdateMemberRole).toHaveBeenCalledWith({
        accountId: 'acc-123',
        userId: 'user-456',
        newRole: 'admin',
        updatedByUserId: 'user-123',
      });
      expect(result).toEqual({ success: true });
    });

    it('should update member role to member', async () => {
      const mockUpdateMemberRole = vi.fn().mockResolvedValue(undefined);
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            updateMemberRole: mockUpdateMemberRole,
          }) as any
      );

      await caller.updateMemberRole({
        accountId: 'acc-123',
        userId: 'user-456',
        role: 'member',
      });

      expect(mockUpdateMemberRole).toHaveBeenCalledWith({
        accountId: 'acc-123',
        userId: 'user-456',
        newRole: 'member',
        updatedByUserId: 'user-123',
      });
    });

    it('should validate role enum', async () => {
      await expect(
        caller.updateMemberRole({
          accountId: 'acc-123',
          userId: 'user-456',
          role: 'invalid' as any,
        })
      ).rejects.toThrow();
    });
  });

  describe('getSharedSubscriptions', () => {
    it('should get shared subscriptions for account', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-123',
          provider: 'Netflix',
          amount: 1299,
          billingCycle: 'monthly',
          sharedBy: 'user-456',
        },
        {
          id: 'sub-456',
          provider: 'Spotify Family',
          amount: 1599,
          billingCycle: 'monthly',
          sharedBy: 'user-123',
        },
      ];

      const mockGetSharedSubscriptions = vi
        .fn()
        .mockResolvedValue(mockSubscriptions);
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            getSharedSubscriptions: mockGetSharedSubscriptions,
          }) as any
      );

      const result = await caller.getSharedSubscriptions({
        accountId: 'acc-123',
      });

      expect(mockGetSharedSubscriptions).toHaveBeenCalledWith(
        'acc-123',
        'user-123'
      );
      expect(result).toEqual(mockSubscriptions);
    });

    it('should return empty array when no shared subscriptions', async () => {
      const mockGetSharedSubscriptions = vi.fn().mockResolvedValue([]);
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            getSharedSubscriptions: mockGetSharedSubscriptions,
          }) as any
      );

      const result = await caller.getSharedSubscriptions({
        accountId: 'acc-123',
      });

      expect(result).toEqual([]);
    });
  });

  describe('getAnalytics', () => {
    it('should get account analytics', async () => {
      const mockAnalytics = {
        totalSpending: 5999,
        memberCount: 4,
        topCategories: ['Entertainment', 'Software', 'Fitness'],
        monthlyTrends: [
          { month: '2024-01', amount: 1999 },
          { month: '2024-02', amount: 2199 },
          { month: '2024-03', amount: 1899 },
        ],
        sharedSubscriptions: {
          total: 6,
          totalSavings: 3600,
        },
      };

      const mockGetAccountAnalytics = vi.fn().mockResolvedValue(mockAnalytics);
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            getAccountAnalytics: mockGetAccountAnalytics,
          }) as any
      );

      const result = await caller.getAnalytics({ accountId: 'acc-123' });

      expect(mockGetAccountAnalytics).toHaveBeenCalledWith(
        'acc-123',
        'user-123'
      );
      expect(result).toEqual(mockAnalytics);
    });

    it('should handle analytics errors', async () => {
      const mockGetAccountAnalytics = vi
        .fn()
        .mockRejectedValue(new Error('Analytics unavailable'));
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            getAccountAnalytics: mockGetAccountAnalytics,
          }) as any
      );

      await expect(
        caller.getAnalytics({ accountId: 'acc-123' })
      ).rejects.toThrow('Analytics unavailable');
    });
  });

  describe('switchAccount', () => {
    it('should switch to specified account', async () => {
      const mockGetAccount = vi.fn().mockResolvedValue({
        id: 'acc-123',
        name: 'Test Account',
      });
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            getAccount: mockGetAccount,
          }) as any
      );

      const result = await caller.switchAccount({ accountId: 'acc-123' });

      expect(mockGetAccount).toHaveBeenCalledWith('acc-123', 'user-123');
      expect(result).toEqual({ success: true, activeAccountId: 'acc-123' });
    });

    it('should switch to null account (personal mode)', async () => {
      const result = await caller.switchAccount({ accountId: null });

      expect(result).toEqual({ success: true, activeAccountId: null });
    });

    it('should verify account access before switching', async () => {
      const mockGetAccount = vi
        .fn()
        .mockRejectedValue(new Error('Access denied'));
      vi.mocked(AccountService).mockImplementation(
        () =>
          ({
            getAccount: mockGetAccount,
          }) as any
      );

      await expect(
        caller.switchAccount({ accountId: 'acc-123' })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('Input Validation', () => {
    it('should validate account ID format', async () => {
      await expect(caller.get({ accountId: '' })).rejects.toThrow();
      await expect(
        caller.inviteMember({ accountId: '', email: 'test@example.com' })
      ).rejects.toThrow();
      await expect(
        caller.acceptInvitation({ accountId: '' })
      ).rejects.toThrow();
    });

    it('should validate user ID format', async () => {
      await expect(
        caller.removeMember({ accountId: 'acc-123', userId: '' })
      ).rejects.toThrow();
      await expect(
        caller.updateMemberRole({
          accountId: 'acc-123',
          userId: '',
          role: 'admin',
        })
      ).rejects.toThrow();
    });

    it('should validate email format in invitations', async () => {
      await expect(
        caller.inviteMember({
          accountId: 'acc-123',
          email: 'notanemail',
        })
      ).rejects.toThrow();
    });

    it('should validate account type enum', async () => {
      await expect(
        caller.create({
          name: 'Test Account',
          type: 'invalid' as any,
        })
      ).rejects.toThrow();
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      const unauthenticatedCtx = createInnerTRPCContext({ session: null });
      const unauthenticatedCaller =
        accountRouter.createCaller(unauthenticatedCtx);

      // Test a few endpoints to ensure they all require authentication
      await expect(unauthenticatedCaller.list()).rejects.toThrow();
      await expect(
        unauthenticatedCaller.create({ name: 'Test' })
      ).rejects.toThrow();
      await expect(
        unauthenticatedCaller.get({ accountId: 'acc-123' })
      ).rejects.toThrow();
      await expect(
        unauthenticatedCaller.inviteMember({
          accountId: 'acc-123',
          email: 'test@example.com',
        })
      ).rejects.toThrow();
    });
  });
});
