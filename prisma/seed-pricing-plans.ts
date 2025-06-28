import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding pricing plans...');

  // Create pricing plans
  const plans = [
    {
      name: 'free',
      displayName: 'Free',
      description: 'Perfect for getting started with subscription management',
      price: 0,
      currency: 'USD',
      stripePriceId: null,
      features: [
        'basic_subscription_tracking',
        'manual_cancellation',
        'basic_analytics',
        'email_notifications',
      ],
      maxBankAccounts: 2,
      maxTeamMembers: 1,
      sortOrder: 0,
    },
    {
      name: 'pro',
      displayName: 'Professional',
      description: 'Advanced features for power users',
      price: 9.99,
      currency: 'USD',
      stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
      features: [
        'basic_subscription_tracking',
        'manual_cancellation',
        'basic_analytics',
        'email_notifications',
        'unlimited_bank_accounts',
        'ai_assistant',
        'predictive_analytics',
        'auto_categorization',
        'advanced_analytics',
        'priority_support',
        'export_data',
      ],
      maxBankAccounts: -1, // unlimited
      maxTeamMembers: 1,
      sortOrder: 1,
    },
    {
      name: 'team',
      displayName: 'Team',
      description: 'Perfect for families and small teams',
      price: 24.99,
      currency: 'USD',
      stripePriceId: process.env.STRIPE_PRICE_TEAM_MONTHLY || null,
      features: [
        'basic_subscription_tracking',
        'manual_cancellation',
        'basic_analytics',
        'email_notifications',
        'unlimited_bank_accounts',
        'ai_assistant',
        'predictive_analytics',
        'auto_categorization',
        'advanced_analytics',
        'priority_support',
        'export_data',
        'multi_account',
        'shared_subscriptions',
        'team_analytics',
        'admin_controls',
        'audit_logs',
        'bulk_operations',
      ],
      maxBankAccounts: -1, // unlimited
      maxTeamMembers: 5,
      sortOrder: 2,
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'Custom solutions for large organizations',
      price: 99.99,
      currency: 'USD',
      stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || null,
      features: [
        'basic_subscription_tracking',
        'manual_cancellation',
        'basic_analytics',
        'email_notifications',
        'unlimited_bank_accounts',
        'ai_assistant',
        'predictive_analytics',
        'auto_categorization',
        'advanced_analytics',
        'priority_support',
        'export_data',
        'multi_account',
        'shared_subscriptions',
        'team_analytics',
        'admin_controls',
        'audit_logs',
        'bulk_operations',
        'sso',
        'api_access',
        'white_label',
        'custom_integrations',
        'dedicated_support',
        'sla',
      ],
      maxBankAccounts: -1, // unlimited
      maxTeamMembers: -1, // unlimited
      sortOrder: 3,
    },
  ];

  for (const plan of plans) {
    await prisma.pricingPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`✅ Created/updated plan: ${plan.displayName}`);
  }

  console.log('\n🎉 Pricing plans seeded successfully!');

  // Create default user subscriptions for existing users (all on free plan)
  const users = await prisma.user.findMany({
    where: {
      userSubscription: null,
    },
  });

  const freePlan = await prisma.pricingPlan.findUnique({
    where: { name: 'free' },
  });

  if (freePlan) {
    for (const user of users) {
      await prisma.userSubscription.create({
        data: {
          userId: user.id,
          planId: freePlan.id,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
      console.log(`✅ Created free subscription for user: ${user.email}`);
    }
  }

  console.log('\n✨ All done!');
}

main()
  .catch(e => {
    console.error('Error seeding pricing plans:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
