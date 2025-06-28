import { type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

// Feature flags for different subscription tiers
export const FEATURES = {
  // Free tier features
  FREE: [
    'basic_subscription_tracking',
    'manual_cancellation',
    'basic_analytics',
    'email_notifications',
  ],

  // Pro tier features (includes all free features)
  PRO: [
    'unlimited_bank_accounts',
    'ai_assistant',
    'predictive_analytics',
    'auto_categorization',
    'advanced_analytics',
    'priority_support',
    'export_data',
  ],

  // Team tier features (includes all pro features)
  TEAM: [
    'multi_account',
    'shared_subscriptions',
    'team_analytics',
    'admin_controls',
    'audit_logs',
    'bulk_operations',
  ],

  // Enterprise tier features (includes all team features)
  ENTERPRISE: [
    'sso',
    'api_access',
    'white_label',
    'custom_integrations',
    'dedicated_support',
    'sla',
  ],
} as const;

export type Feature =
  | (typeof FEATURES.FREE)[number]
  | (typeof FEATURES.PRO)[number]
  | (typeof FEATURES.TEAM)[number]
  | (typeof FEATURES.ENTERPRISE)[number];

export class SubscriptionManagerService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get user's current subscription with plan details
   */
  async getUserSubscription(userId: string) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription) {
      // Return free plan by default
      const freePlan = await this.prisma.pricingPlan.findUnique({
        where: { name: 'free' },
      });

      return {
        plan: freePlan,
        status: 'active',
        features: this.getPlanFeatures('free'),
      };
    }

    return {
      ...subscription,
      features: this.getPlanFeatures(subscription.plan.name),
    };
  }

  /**
   * Check if user has access to a specific feature
   */
  async hasFeature(userId: string, feature: Feature): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    return subscription.features.includes(feature);
  }

  /**
   * Get all features for a plan
   */
  getPlanFeatures(planName: string): Feature[] {
    const allFeatures: Feature[] = [...FEATURES.FREE];

    if (
      planName === 'pro' ||
      planName === 'team' ||
      planName === 'enterprise'
    ) {
      allFeatures.push(...FEATURES.PRO);
    }

    if (planName === 'team' || planName === 'enterprise') {
      allFeatures.push(...FEATURES.TEAM);
    }

    if (planName === 'enterprise') {
      allFeatures.push(...FEATURES.ENTERPRISE);
    }

    return [...new Set(allFeatures)]; // Remove duplicates
  }

  /**
   * Check usage limits for a user
   */
  async checkUsageLimits(userId: string): Promise<{
    bankAccounts: { used: number; limit: number; canAdd: boolean };
    teamMembers: { used: number; limit: number; canAdd: boolean };
  }> {
    const subscription = await this.getUserSubscription(userId);

    // Count current usage
    const bankAccountCount = await this.prisma.bankAccount.count({
      where: { userId, isActive: true },
    });

    const teamMemberCount = await this.prisma.accountMember.count({
      where: {
        teamAccount: {
          ownerId: userId,
        },
        status: 'active',
      },
    });

    const limits = {
      bankAccounts: subscription.plan?.maxBankAccounts ?? 2,
      teamMembers: subscription.plan?.maxTeamMembers ?? 1,
    };

    return {
      bankAccounts: {
        used: bankAccountCount,
        limit: limits.bankAccounts,
        canAdd:
          limits.bankAccounts === -1 || bankAccountCount < limits.bankAccounts,
      },
      teamMembers: {
        used: teamMemberCount,
        limit: limits.teamMembers,
        canAdd:
          limits.teamMembers === -1 || teamMemberCount < limits.teamMembers,
      },
    };
  }

  /**
   * Enforce feature access
   */
  async enforceFeatureAccess(userId: string, feature: Feature): Promise<void> {
    const hasAccess = await this.hasFeature(userId, feature);

    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This feature requires a premium subscription',
      });
    }
  }

  /**
   * Get available plans for upgrade
   */
  async getAvailablePlans(userId: string) {
    const currentSubscription = await this.getUserSubscription(userId);
    const allPlans = await this.prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return allPlans.map(plan => ({
      ...plan,
      features: this.getPlanFeatures(plan.name),
      isCurrent: plan.id === currentSubscription.plan?.id,
      canUpgrade: plan.price > (currentSubscription.plan?.price ?? 0),
    }));
  }

  /**
   * Update usage tracking
   */
  async updateUsage(
    userId: string,
    type: 'bankAccount' | 'teamMember',
    increment: number
  ): Promise<void> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return; // Free users don't have usage tracking in subscription
    }

    if (type === 'bankAccount') {
      await this.prisma.userSubscription.update({
        where: { id: subscription.id },
        data: {
          bankAccountsUsed: {
            increment,
          },
        },
      });
    }
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(userId: string) {
    const subscription = await this.getUserSubscription(userId);
    const billingEvents = await this.prisma.billingEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 12, // Last 12 events
    });

    const totalSpent = billingEvents
      .filter(event => event.status === 'completed' && event.amount)
      .reduce((sum, event) => sum + Number(event.amount), 0);

    const nextBillingDate =
      subscription.plan?.name !== 'free' && 'currentPeriodEnd' in subscription
        ? subscription.currentPeriodEnd
        : null;

    return {
      currentPlan: subscription.plan?.displayName ?? 'Free',
      status: subscription.status ?? 'active',
      totalSpent,
      nextBillingDate,
      billingHistory: billingEvents,
      memberSince:
        'createdAt' in subscription ? subscription.createdAt : new Date(),
    };
  }

  /**
   * Check if user can perform an action based on their plan
   */
  async canPerformAction(
    userId: string,
    action:
      | 'add_bank_account'
      | 'invite_team_member'
      | 'use_ai_assistant'
      | 'export_data'
  ): Promise<{ allowed: boolean; reason?: string; upgradeRequired?: string }> {
    const subscription = await this.getUserSubscription(userId);
    const usage = await this.checkUsageLimits(userId);

    switch (action) {
      case 'add_bank_account': {
        if (!usage.bankAccounts.canAdd) {
          return {
            allowed: false,
            reason: `You've reached the limit of ${usage.bankAccounts.limit} bank accounts for your plan`,
            upgradeRequired: 'pro',
          };
        }
        return { allowed: true };
      }

      case 'invite_team_member': {
        const hasTeamFeature = await this.hasFeature(userId, 'multi_account');
        if (!hasTeamFeature) {
          return {
            allowed: false,
            reason: 'Team features require a Team or Enterprise plan',
            upgradeRequired: 'team',
          };
        }
        if (!usage.teamMembers.canAdd) {
          return {
            allowed: false,
            reason: `You've reached the limit of ${usage.teamMembers.limit} team members`,
            upgradeRequired: 'enterprise',
          };
        }
        return { allowed: true };
      }

      case 'use_ai_assistant': {
        const hasAI = await this.hasFeature(userId, 'ai_assistant');
        if (!hasAI) {
          return {
            allowed: false,
            reason: 'AI Assistant requires a Pro plan or higher',
            upgradeRequired: 'pro',
          };
        }
        return { allowed: true };
      }

      case 'export_data': {
        const hasExport = await this.hasFeature(userId, 'export_data');
        if (!hasExport) {
          return {
            allowed: false,
            reason: 'Data export requires a Pro plan or higher',
            upgradeRequired: 'pro',
          };
        }
        return { allowed: true };
      }

      default:
        return { allowed: true };
    }
  }
}
