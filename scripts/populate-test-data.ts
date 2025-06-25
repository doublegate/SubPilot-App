#!/usr/bin/env npx tsx

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function populateTestData() {
  console.log('🎯 Populating test data for dashboard testing\n');

  try {
    // Get the first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No user found! Please create a user first.');
      return;
    }

    console.log(`✓ Found user: ${user.email}`);

    // Get the first account
    const account = await prisma.account.findFirst({
      where: { userId: user.id }
    });

    if (!account) {
      console.error('❌ No bank account found! Please connect a bank first.');
      return;
    }

    console.log(`✓ Found account: ${account.name} (${account.mask})`);

    // Create test transactions for various subscriptions
    const subscriptions = [
      { name: 'Netflix', amount: 15.99, merchant: 'Netflix', category: 'Entertainment' },
      { name: 'Spotify', amount: 9.99, merchant: 'Spotify USA', category: 'Entertainment' },
      { name: 'Amazon Prime', amount: 14.99, merchant: 'Amazon Prime', category: 'Shopping' },
      { name: 'Gym Membership', amount: 49.99, merchant: '24 Hour Fitness', category: 'Health & Fitness' },
      { name: 'Cloud Storage', amount: 9.99, merchant: 'Dropbox', category: 'Technology' },
      { name: 'Disney+', amount: 7.99, merchant: 'Disney Plus', category: 'Entertainment' },
      { name: 'Adobe Creative Cloud', amount: 54.99, merchant: 'Adobe Systems', category: 'Software' },
      { name: 'ChatGPT Plus', amount: 20.00, merchant: 'OpenAI', category: 'Technology' },
    ];

    console.log('\n📝 Creating test transactions...\n');

    // Create 3 months of transactions for each subscription
    const now = new Date();
    for (const sub of subscriptions) {
      const transactions = [];
      
      // Create transactions for the last 3 months
      for (let i = 0; i < 3; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        
        transactions.push({
          userId: user.id,
          accountId: account.id,
          plaidTransactionId: `test-${sub.merchant.toLowerCase().replace(/\s+/g, '-')}-${date.getTime()}`,
          amount: sub.amount,
          isoCurrencyCode: 'USD',
          description: `${sub.merchant} monthly subscription`,
          merchantName: sub.merchant,
          category: [sub.category],
          subcategory: null,
          transactionType: 'special',
          date: date,
          pending: false,
          paymentChannel: 'online',
          isSubscription: false, // Will be detected
          confidence: 0,
        });
      }

      // Insert transactions
      const result = await prisma.transaction.createMany({
        data: transactions,
        skipDuplicates: true,
      });

      console.log(`✓ Created ${result.count} transactions for ${sub.name}`);
    }

    // Run subscription detection
    console.log('\n🔍 Running subscription detection...\n');
    
    const { SubscriptionDetector } = await import('../src/server/services/subscription-detector.js');
    const detector = new SubscriptionDetector(prisma);
    
    const detectionResults = await detector.detectUserSubscriptions(user.id);
    console.log(`✓ Detected ${detectionResults.length} potential subscriptions`);
    
    if (detectionResults.length > 0) {
      await detector.createSubscriptionsFromDetection(user.id, detectionResults);
    }

    // Verify the results
    console.log('\n📊 Verifying dashboard data...\n');
    
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
    });

    const totalTransactions = await prisma.transaction.count({
      where: { userId: user.id }
    });

    console.log(`✓ Total transactions: ${totalTransactions}`);
    console.log(`✓ Active subscriptions: ${activeSubscriptions.length}`);
    
    if (activeSubscriptions.length > 0) {
      let monthlyTotal = 0;
      for (const sub of activeSubscriptions) {
        monthlyTotal += parseFloat(sub.amount.toString());
        console.log(`  - ${sub.name}: $${sub.amount}/month`);
      }
      console.log(`\n💰 Total monthly spend: $${monthlyTotal.toFixed(2)}`);
      console.log(`💰 Yearly projection: $${(monthlyTotal * 12).toFixed(2)}`);
    }

    console.log('\n✅ Test data populated successfully!');
    console.log('🎯 Go to the dashboard to see the results.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateTestData().catch(console.error);