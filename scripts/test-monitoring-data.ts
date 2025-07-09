#!/usr/bin/env tsx
/**
 * Script to generate test monitoring data for the admin panel
 * This simulates real API calls to populate the performance middleware
 */

import { PrismaClient } from '@prisma/client';
import { env } from '@/env';

const prisma = new PrismaClient();

async function generateTestData() {
  console.log('🚀 Generating test monitoring data...');

  const userId = process.argv[2];
  if (!userId) {
    console.error('Please provide a user ID as an argument');
    console.log('Usage: npm run test:monitoring <userId>');
    process.exit(1);
  }

  // Check if user exists and is admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  if (!user.isAdmin) {
    console.error('User is not an admin');
    process.exit(1);
  }

  console.log(`✅ Using admin user: ${user.email}`);

  // Generate various types of audit log entries
  const actions = [
    // API calls
    'api.subscription.list',
    'api.transaction.sync',
    'api.user.update',
    'api.analytics.getSpending',
    'api.plaid.syncTransactions',

    // Webhook calls
    'webhook.plaid.transaction_update',
    'webhook.stripe.payment_succeeded',

    // Service-specific actions
    'plaid.sync_transactions',
    'plaid.refresh_access_token',
    'stripe.create_subscription',
    'stripe.update_payment_method',
    'email.send_notification',
    'email.send_weekly_report',
    'ai.generate_insights',
    'ai.categorize_transaction',

    // Auth actions
    'auth.login',
    'auth.logout',
    'auth.failed',

    // Error scenarios
    'database.connection_timeout',
    'validation.invalid_input',
    'rate_limit.exceeded',
  ];

  const results = ['success', 'failure'];
  const severities = ['info', 'warning', 'error'];

  // Generate audit logs for the last 48 hours
  const now = new Date();
  const entries = [];

  for (let hours = 0; hours < 48; hours++) {
    for (let i = 0; i < Math.floor(Math.random() * 20) + 10; i++) {
      const timestamp = new Date(
        now.getTime() - hours * 60 * 60 * 1000 - Math.random() * 60 * 60 * 1000
      );
      const action = actions[
        Math.floor(Math.random() * actions.length)
      ] as string;
      const isError = Math.random() > 0.9; // 10% error rate

      entries.push({
        userId: Math.random() > 0.3 ? userId : null, // 70% have user context
        action,
        resource: action.includes('api.')
          ? `/api/trpc/${action.replace('api.', '')}`
          : null,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Test Agent)',
        result: isError ? 'failure' : 'success',
        metadata: {
          severity: isError
            ? severities[Math.floor(Math.random() * severities.length)]
            : 'info',
          duration: Math.floor(Math.random() * 200) + 10,
          ...(isError && {
            error: 'Test error message',
            stack: 'Error: Test error\\n    at testFunction',
            statusCode: [400, 401, 403, 404, 500][
              Math.floor(Math.random() * 5)
            ],
          }),
        },
        error: isError ? 'Test error' : null,
        timestamp,
      });
    }
  }

  console.log(`📝 Creating ${entries.length} audit log entries...`);

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    await prisma.auditLog.createMany({
      data: batch,
    });
    process.stdout.write('.');
  }
  console.log('\n✅ Audit logs created');

  // Create some user sessions for activity tracking
  console.log('👥 Creating user sessions...');

  const sessionData = [];
  for (let i = 0; i < 20; i++) {
    const lastActivity = new Date(
      now.getTime() - Math.random() * 24 * 60 * 60 * 1000
    );
    sessionData.push({
      userId,
      fingerprint: `test-fingerprint-${i}`,
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Test Session)',
      deviceInfo: {
        browser: 'Chrome',
        os: 'Windows',
        device: 'Desktop',
      },
      lastActivity,
      expiresAt: new Date(lastActivity.getTime() + 24 * 60 * 60 * 1000),
      isActive: i < 5, // First 5 are active
    });
  }

  await prisma.userSession.createMany({
    data: sessionData,
  });
  console.log('✅ User sessions created');

  // Create some cancellation requests for system metrics
  console.log('🚫 Creating cancellation requests...');

  const cancellationData = [];
  for (let i = 0; i < 15; i++) {
    const createdAt = new Date(
      now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000
    );
    const status = ['pending', 'processing', 'completed', 'failed'][
      Math.floor(Math.random() * 4)
    ] as string;

    // First, we need to create a subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        name: `Test Subscription ${i}`,
        amount: Math.random() * 100,
        currency: 'USD',
        frequency: 'monthly',
        status: 'active',
      },
    });

    cancellationData.push({
      userId,
      subscriptionId: subscription.id,
      status,
      method: ['api', 'web_automation', 'manual'][
        Math.floor(Math.random() * 3)
      ] as string,
      priority: 'normal',
      attempts: status === 'failed' ? 3 : 1,
      createdAt,
      updatedAt: createdAt,
      ...(status === 'completed' && {
        completedAt: new Date(
          createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000
        ),
      }),
    });
  }

  await prisma.cancellationRequest.createMany({
    data: cancellationData,
  });
  console.log('✅ Cancellation requests created');

  // Summary
  const summary = await prisma.auditLog.groupBy({
    by: ['action'],
    _count: {
      action: true,
    },
    where: {
      timestamp: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    orderBy: {
      _count: {
        action: 'desc',
      },
    },
    take: 10,
  });

  console.log('\n📊 Summary of generated data:');
  console.log('Top actions in last 24 hours:');
  summary.forEach(item => {
    console.log(`  - ${item.action}: ${item._count.action} calls`);
  });

  console.log('\n✨ Test monitoring data generated successfully!');
  console.log('You can now view real metrics in the admin panel.');
}

generateTestData()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
