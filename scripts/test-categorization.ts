#!/usr/bin/env tsx
/**
 * Script to test the AI categorization system
 * Run with: npx tsx scripts/test-categorization.ts
 */

import { PrismaClient } from '@prisma/client';
import { OpenAICategorizationClient } from '@/server/lib/openai-client';
import { getCategorizationService } from '@/server/services/categorization.service';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

// Test merchant names
const testMerchants = [
  // Streaming services
  'NETFLIX.COM *123456',
  'HULU 877-824-4858',
  'DISNEY PLUS',
  'HBO MAX SUBSCRIPTION',
  'AMAZON PRIME*2V4GH8',

  // Music services
  'SPOTIFY USA 8884407',
  'APPLE.COM/BILL APPLE MUSIC',
  'PANDORA*SUBSCRIPTION',

  // Software
  'ADOBE *CREATIVE CLOUD',
  'MICROSOFT*365',
  'GITHUB.COM',
  'NOTION LABS INC',

  // Gaming
  'XBOX GAME PASS',
  'PLAYSTATION PLUS',
  'NINTENDO ESHOP',
  'STEAM GAMES',

  // Food delivery
  'DOORDASH*DASHPASS',
  'UBER* EATS PASS',
  'GRUBHUB+ MEMBERSHIP',

  // Fitness
  'PELOTON INTERACTIVE',
  'APPLE.COM/BILL FITNESS+',
  'STRAVA SUBSCRIPTION',

  // News
  'NYTIMES DIGITAL',
  'WSJ DIGITAL ACCESS',
  'THE ECONOMIST',

  // Unknown/Edge cases
  'RANDOM MERCHANT 12345',
  'SQ *COFFEE SHOP',
  'PAYPAL *JOHNDOE',
];

async function testOpenAIClient() {
  console.log('🤖 Testing OpenAI Client...\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.log('💡 Add OPENAI_API_KEY to your .env.local file');
    return;
  }

  const client = new OpenAICategorizationClient(apiKey);

  // Test single categorization
  console.log('📌 Testing single categorization:');
  try {
    const result = await client.categorizeTransaction(
      'NETFLIX.COM *123456',
      'Netflix subscription',
      9.99
    );
    console.log('✅ Result:', result);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Test merchant normalization
  console.log('\n📌 Testing merchant normalization:');
  try {
    const normalized = await client.normalizeMerchantName(
      'SPOTIFY USA 8884407'
    );
    console.log('✅ Normalized:', normalized);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Test bulk categorization
  console.log('\n📌 Testing bulk categorization:');
  try {
    const merchants = testMerchants.slice(0, 5).map(name => ({
      name,
      description: `Transaction for ${name}`,
      amount: Math.random() * 50 + 5,
    }));

    const result = await client.bulkCategorize(merchants);
    console.log('✅ Bulk results:');
    result.categorizations.forEach(cat => {
      console.log(
        `   ${cat.originalName} → ${cat.normalizedName} (${cat.category}, ${(cat.confidence * 100).toFixed(0)}%)`
      );
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Test fallback categorization
  console.log('\n📌 Testing fallback categorization (without AI):');
  const fallbackTests = [
    'Netflix Premium',
    'Spotify Premium',
    'Adobe Creative Suite',
    'Unknown Service XYZ',
  ];

  for (const merchant of fallbackTests) {
    // Force an error to trigger fallback
    const mockClient = new OpenAICategorizationClient('invalid-key');
    try {
      const result = await mockClient.categorizeTransaction(merchant);
      console.log(
        `   ${merchant} → ${result.category} (${(result.confidence * 100).toFixed(0)}%)`
      );
    } catch (error) {
      console.error(`   ${merchant} → Error: ${error}`);
    }
  }
}

async function testCategorizationService() {
  console.log('\n\n🔧 Testing Categorization Service...\n');

  const service = getCategorizationService(prisma);

  // First, ensure we have a test user
  let testUser = await prisma.user.findFirst({
    where: { email: 'test@example.com' },
  });

  if (!testUser) {
    console.log('Creating test user...');
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  }

  // Create a test bank account
  let testAccount = await prisma.bankAccount.findFirst({
    where: { userId: testUser.id },
  });

  if (!testAccount) {
    console.log('Creating test bank account...');

    // Create a test Plaid item first
    const testPlaidItem = await prisma.plaidItem.create({
      data: {
        userId: testUser.id,
        plaidItemId: 'test-item-' + Date.now(),
        accessToken: 'test-access-token',
        institutionId: 'test-institution',
        institutionName: 'Test Bank',
      },
    });

    testAccount = await prisma.bankAccount.create({
      data: {
        userId: testUser.id,
        plaidAccountId: 'test-account-' + Date.now(),
        plaidItemId: testPlaidItem.id,
        name: 'Test Checking',
        mask: '1234',
        type: 'depository',
        subtype: 'checking',
        currentBalance: 1000,
      },
    });
  }

  // Create test transactions
  console.log('\n📌 Creating test transactions...');
  const testTransactions = [];

  for (let i = 0; i < 5; i++) {
    const merchant = testMerchants[i];
    if (!merchant) continue;

    const transaction = await prisma.transaction.create({
      data: {
        userId: testUser.id,
        accountId: testAccount.id,
        plaidTransactionId: `test-trans-${Date.now()}-${i}`,
        merchantName: merchant,
        description: `Payment to ${merchant}`,
        amount: Math.random() * 50 + 5,
        date: new Date(),
        isSubscription: true,
        confidence: 0.8,
      },
    });
    testTransactions.push(transaction);
  }

  // Test single transaction categorization
  console.log('\n📌 Testing transaction categorization:');
  if (testTransactions[0]) {
    try {
      const result = await service.categorizeTransaction(
        testTransactions[0].id,
        testUser.id
      );
      console.log('✅ Categorized:', result);
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }

  // Test bulk categorization
  console.log('\n📌 Testing bulk categorization:');
  try {
    const result = await service.bulkCategorizeTransactions(
      testUser.id,
      testTransactions.map(t => t.id)
    );
    console.log(
      `✅ Categorized: ${result.categorized}, Failed: ${result.failed}`
    );
    result.results.forEach(r => {
      console.log(
        `   Transaction ${r.transactionId.slice(-8)} → ${r.category} (${(r.confidence * 100).toFixed(0)}%)`
      );
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Test subscription categorization
  console.log('\n📌 Testing subscription categorization:');

  // Create a test subscription
  const testSubscription = await prisma.subscription.create({
    data: {
      userId: testUser.id,
      name: 'Netflix Premium',
      description: 'Streaming service subscription',
      amount: 15.99,
      frequency: 'monthly',
      status: 'active',
    },
  });

  try {
    const result = await service.categorizeSubscription(
      testSubscription.id,
      testUser.id
    );
    console.log('✅ Subscription categorized:', result);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Test merchant aliases
  console.log('\n📌 Checking merchant aliases:');
  try {
    const aliases = await service.getMerchantAliases({
      category: 'streaming',
      verified: true,
    });
    console.log(`✅ Found ${aliases.total} aliases:`);
    aliases.aliases.slice(0, 5).forEach(alias => {
      console.log(
        `   ${alias.originalName} → ${alias.normalizedName} (${alias.category})`
      );
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Cleanup test data
  console.log('\n🧹 Cleaning up test data...');
  await prisma.transaction.deleteMany({
    where: { id: { in: testTransactions.map(t => t.id) } },
  });
  await prisma.subscription.delete({
    where: { id: testSubscription.id },
  });
}

async function testCategorizationStats() {
  console.log('\n\n📊 Testing Categorization Statistics...\n');

  const testUser = await prisma.user.findFirst({
    where: { email: 'test@example.com' },
  });

  if (!testUser) {
    console.log('❌ Test user not found');
    return;
  }

  // Get categorization stats
  const [
    totalTransactions,
    categorizedTransactions,
    totalSubscriptions,
    categorizedSubscriptions,
  ] = await Promise.all([
    prisma.transaction.count({
      where: { userId: testUser.id },
    }),
    prisma.transaction.count({
      where: {
        userId: testUser.id,
        aiCategory: { not: null },
      },
    }),
    prisma.subscription.count({
      where: { userId: testUser.id },
    }),
    prisma.subscription.count({
      where: {
        userId: testUser.id,
        OR: [
          { aiCategory: { not: null } },
          { categoryOverride: { not: null } },
        ],
      },
    }),
  ]);

  console.log('📈 Categorization Statistics:');
  console.log(
    `   Transactions: ${categorizedTransactions}/${totalTransactions} (${totalTransactions > 0 ? Math.round((categorizedTransactions / totalTransactions) * 100) : 0}%)`
  );
  console.log(
    `   Subscriptions: ${categorizedSubscriptions}/${totalSubscriptions} (${totalSubscriptions > 0 ? Math.round((categorizedSubscriptions / totalSubscriptions) * 100) : 0}%)`
  );

  // Get category breakdown
  const categoryBreakdown = await prisma.subscription.groupBy({
    by: ['category'],
    where: {
      userId: testUser.id,
      isActive: true,
    },
    _count: {
      id: true,
    },
  });

  if (categoryBreakdown.length > 0) {
    console.log('\n📊 Category Breakdown:');
    categoryBreakdown.forEach(item => {
      console.log(
        `   ${item.category ?? 'uncategorized'}: ${item._count.id} subscriptions`
      );
    });
  }
}

async function main() {
  console.log('🚀 SubPilot AI Categorization Test Suite\n');
  console.log('='.repeat(50));

  try {
    // Test OpenAI client directly
    await testOpenAIClient();

    // Test categorization service
    await testCategorizationService();

    // Test statistics
    await testCategorizationStats();

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test suite
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
