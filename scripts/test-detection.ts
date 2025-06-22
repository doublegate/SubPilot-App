import { PrismaClient } from '@prisma/client';
import { SubscriptionDetector } from '../src/server/services/subscription-detector';

async function testDetection() {
  const db = new PrismaClient();
  
  try {
    // Get a user to test with
    const user = await db.user.findFirst({});
    
    if (!user) {
      console.log('No users found in database');
      return;
    }
    
    console.log(`Testing detection for user: ${user.email}`);
    
    // Count transactions
    const transactionCount = await db.transaction.count({
      where: { userId: user.id }
    });
    
    console.log(`Total transactions: ${transactionCount}`);
    
    // Get sample transactions
    const transactions = await db.transaction.findMany({
      where: { userId: user.id },
      take: 10,
      orderBy: { date: 'desc' }
    });
    
    console.log('\nRecent transactions:');
    transactions.forEach(t => {
      console.log(`- ${t.merchantName || t.name} - $${t.amount} - ${t.date.toISOString().split('T')[0]}`);
    });
    
    // Run detection
    const detector = new SubscriptionDetector(db);
    const results = await detector.detectUserSubscriptions(user.id);
    
    console.log(`\nDetection results: ${results.length} potential subscriptions found`);
    
    results.forEach(r => {
      console.log(`\n- Merchant: ${r.merchantName}`);
      console.log(`  Is Subscription: ${r.isSubscription}`);
      console.log(`  Confidence: ${(r.confidence * 100).toFixed(1)}%`);
      console.log(`  Frequency: ${r.frequency || 'Unknown'}`);
      console.log(`  Average Amount: $${r.averageAmount.toFixed(2)}`);
      console.log(`  Next Billing: ${r.nextBillingDate ? r.nextBillingDate.toISOString().split('T')[0] : 'Unknown'}`);
    });
    
    // Check existing subscriptions
    const existingSubscriptions = await db.subscription.count({
      where: { userId: user.id }
    });
    
    console.log(`\nExisting subscriptions in database: ${existingSubscriptions}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

testDetection();