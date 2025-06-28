import { type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { SubscriptionManagerService } from './subscription-manager.service';

export class AccountService {
  private subscriptionManager: SubscriptionManagerService;

  constructor(private prisma: PrismaClient) {
    this.subscriptionManager = new SubscriptionManagerService(prisma);
  }

  /**
   * Create a new team account
   */
  async createAccount({
    userId,
    name,
    type = 'personal',
  }: {
    userId: string;
    name: string;
    type?: 'personal' | 'family' | 'team';
  }) {
    // Check if user has team features
    await this.subscriptionManager.enforceFeatureAccess(userId, 'multi_account');

    // Check usage limits
    const usage = await this.subscriptionManager.checkUsageLimits(userId);
    if (!usage.teamMembers.canAdd) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You've reached the limit of ${usage.teamMembers.limit} team accounts for your plan`,
      });
    }

    // Create the account
    const account = await this.prisma.teamAccount.create({
      data: {
        name,
        type,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'owner',
            status: 'active',
            joinedAt: new Date(),
          },
        },
      },
      include: {
        members: true,
      },
    });

    // Update usage tracking
    await this.subscriptionManager.updateUsage(userId, 'teamMember', 1);

    return account;
  }

  /**
   * Get all accounts for a user
   */
  async getUserAccounts(userId: string) {
    const accounts = await this.prisma.accountMember.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        teamAccount: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return accounts.map(membership => ({
      ...membership.teamAccount,
      role: membership.role,
      joinedAt: membership.joinedAt,
    }));
  }

  /**
   * Get a specific account
   */
  async getAccount(accountId: string, userId: string) {
    const membership = await this.prisma.accountMember.findUnique({
      where: {
        accountId_userId: {
          accountId,
          userId,
        },
      },
      include: {
        teamAccount: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!membership || membership.status !== 'active') {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Account not found or access denied',
      });
    }

    return {
      ...membership.teamAccount,
      role: membership.role,
      permissions: membership.permissions,
    };
  }

  /**
   * Invite a member to an account
   */
  async inviteMember({
    accountId,
    invitedByUserId,
    email,
    role = 'member',
  }: {
    accountId: string;
    invitedByUserId: string;
    email: string;
    role?: 'admin' | 'member';
  }) {
    // Check if inviter has permission
    const inviterMembership = await this.prisma.accountMember.findUnique({
      where: {
        accountId_userId: {
          accountId,
          userId: invitedByUserId,
        },
      },
    });

    if (!inviterMembership || inviterMembership.status !== 'active') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    if (inviterMembership.role === 'member') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only owners and admins can invite members',
      });
    }

    // Find user by email
    const invitedUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!invitedUser) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found. They must sign up first.',
      });
    }

    // Check if already a member
    const existingMembership = await this.prisma.accountMember.findUnique({
      where: {
        accountId_userId: {
          accountId,
          userId: invitedUser.id,
        },
      },
    });

    if (existingMembership) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User is already a member of this account',
      });
    }

    // Check team member limits
    const account = await this.prisma.teamAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Account not found',
      });
    }

    const usage = await this.subscriptionManager.checkUsageLimits(account.ownerId);
    if (!usage.teamMembers.canAdd) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Team member limit reached. Please upgrade your plan.`,
      });
    }

    // Create membership
    const membership = await this.prisma.accountMember.create({
      data: {
        accountId,
        userId: invitedUser.id,
        role,
        status: 'invited',
        invitedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // TODO: Send invitation email

    return membership;
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(accountId: string, userId: string) {
    const membership = await this.prisma.accountMember.findUnique({
      where: {
        accountId_userId: {
          accountId,
          userId,
        },
      },
    });

    if (!membership || membership.status !== 'invited') {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invitation not found',
      });
    }

    // Update membership
    await this.prisma.accountMember.update({
      where: { id: membership.id },
      data: {
        status: 'active',
        joinedAt: new Date(),
      },
    });

    // Update usage tracking
    const account = await this.prisma.teamAccount.findUnique({
      where: { id: accountId },
    });
    
    if (account) {
      await this.subscriptionManager.updateUsage(account.ownerId, 'teamMember', 1);
    }
  }

  /**
   * Remove a member from an account
   */
  async removeMember({
    accountId,
    userId,
    removedByUserId,
  }: {
    accountId: string;
    userId: string;
    removedByUserId: string;
  }) {
    // Check if remover has permission
    const removerMembership = await this.prisma.accountMember.findUnique({
      where: {
        accountId_userId: {
          accountId,
          userId: removedByUserId,
        },
      },
    });

    if (!removerMembership || removerMembership.status !== 'active') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    // Check permissions
    const targetMembership = await this.prisma.accountMember.findUnique({
      where: {
        accountId_userId: {
          accountId,
          userId,
        },
      },
    });

    if (!targetMembership) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Member not found',
      });
    }

    // Can't remove owner
    if (targetMembership.role === 'owner') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot remove account owner',
      });
    }

    // Only owners can remove admins
    if (targetMembership.role === 'admin' && removerMembership.role !== 'owner') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only owners can remove admins',
      });
    }

    // Members can remove themselves
    if (userId !== removedByUserId && removerMembership.role === 'member') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Members can only remove themselves',
      });
    }

    // Remove member
    await this.prisma.accountMember.delete({
      where: { id: targetMembership.id },
    });

    // Update usage tracking
    const account = await this.prisma.teamAccount.findUnique({
      where: { id: accountId },
    });
    
    if (account) {
      await this.subscriptionManager.updateUsage(account.ownerId, 'teamMember', -1);
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole({
    accountId,
    userId,
    newRole,
    updatedByUserId,
  }: {
    accountId: string;
    userId: string;
    newRole: 'admin' | 'member';
    updatedByUserId: string;
  }) {
    // Check if updater has permission (must be owner)
    const updaterMembership = await this.prisma.accountMember.findUnique({
      where: {
        accountId_userId: {
          accountId,
          userId: updatedByUserId,
        },
      },
    });

    if (!updaterMembership || updaterMembership.role !== 'owner') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only owners can change member roles',
      });
    }

    // Update role
    await this.prisma.accountMember.update({
      where: {
        accountId_userId: {
          accountId,
          userId,
        },
      },
      data: { role: newRole },
    });
  }

  /**
   * Get shared subscriptions for an account
   */
  async getSharedSubscriptions(accountId: string, userId: string) {
    // Verify access
    await this.getAccount(accountId, userId);

    // Get all member IDs
    const members = await this.prisma.accountMember.findMany({
      where: {
        accountId,
        status: 'active',
      },
      select: { userId: true },
    });

    const memberIds = members.map(m => m.userId);

    // Get all subscriptions for members
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        userId: { in: memberIds },
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { nextBilling: 'asc' },
    });

    return subscriptions;
  }

  /**
   * Get account analytics
   */
  async getAccountAnalytics(accountId: string, userId: string) {
    // Verify access
    await this.getAccount(accountId, userId);

    // Get all member IDs
    const members = await this.prisma.accountMember.findMany({
      where: {
        accountId,
        status: 'active',
      },
      select: { userId: true },
    });

    const memberIds = members.map(m => m.userId);

    // Get aggregated subscription data
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        userId: { in: memberIds },
        isActive: true,
      },
    });

    // Calculate totals
    const totalMonthlySpend = subscriptions
      .filter(sub => sub.frequency === 'monthly')
      .reduce((sum, sub) => sum + Number(sub.amount), 0);

    const totalYearlySpend = subscriptions
      .filter(sub => sub.frequency === 'yearly')
      .reduce((sum, sub) => sum + Number(sub.amount), 0);

    const estimatedAnnualSpend = totalMonthlySpend * 12 + totalYearlySpend;

    // Group by category
    const byCategory = subscriptions.reduce((acc, sub) => {
      const category = sub.categoryOverride ?? sub.aiCategory ?? sub.category ?? 'Other';
      if (!acc[category]) {
        acc[category] = { count: 0, amount: 0 };
      }
      acc[category].count++;
      acc[category].amount += Number(sub.amount);
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    // Group by member
    const byMember = await Promise.all(
      memberIds.map(async memberId => {
        const memberSubs = subscriptions.filter(sub => sub.userId === memberId);
        const user = await this.prisma.user.findUnique({
          where: { id: memberId },
          select: { id: true, name: true, email: true, image: true },
        });

        return {
          user,
          subscriptionCount: memberSubs.length,
          monthlySpend: memberSubs
            .filter(sub => sub.frequency === 'monthly')
            .reduce((sum, sub) => sum + Number(sub.amount), 0),
        };
      })
    );

    return {
      totalSubscriptions: subscriptions.length,
      totalMonthlySpend,
      estimatedAnnualSpend,
      byCategory,
      byMember,
      memberCount: members.length,
    };
  }
}