#!/usr/bin/env tsx
/**
 * Script to start the categorization background job processor
 * Run with: npx tsx scripts/start-categorization-job.ts
 */

import { PrismaClient } from '@prisma/client';
import { getCategorizationJobProcessor } from '@/server/services/categorization-job';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Categorization Job Processor\n');

  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.log('💡 Add OPENAI_API_KEY to your .env.local file');
    process.exit(1);
  }

  // Get the job processor
  const jobProcessor = getCategorizationJobProcessor(prisma);

  // Configuration
  const intervalMinutes = parseInt(
    process.env.CATEGORIZATION_JOB_INTERVAL ?? '5'
  );

  console.log(`⚙️  Configuration:`);
  console.log(`   - Interval: ${intervalMinutes} minutes`);
  console.log(`   - Batch size: 50 transactions per user`);
  console.log(`   - Max users per run: 10`);
  console.log(`   - OpenAI Model: gpt-4o-mini (cost-effective)`);
  console.log('');

  // Start the job processor
  jobProcessor.start(intervalMinutes);

  console.log('✅ Job processor started successfully!');
  console.log('📊 The processor will:');
  console.log('   1. Find users with uncategorized transactions');
  console.log('   2. Batch categorize transactions using AI');
  console.log('   3. Cache results for improved performance');
  console.log('   4. Process uncategorized subscriptions');
  console.log('   5. Clean up old merchant aliases');
  console.log('');
  console.log('Press Ctrl+C to stop the job processor\n');

  // Keep the process running
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Stopping job processor...');
    jobProcessor.stop();
    await prisma.$disconnect();
    console.log('✅ Job processor stopped');
    process.exit(0);
  });

  // Periodic status update
  setInterval(async () => {
    const stats = await getStats();
    console.log(`📈 Status Update: ${new Date().toLocaleTimeString()}`);
    console.log(
      `   - Uncategorized transactions: ${stats.uncategorizedTransactions}`
    );
    console.log(
      `   - Uncategorized subscriptions: ${stats.uncategorizedSubscriptions}`
    );
    console.log(`   - Merchant aliases: ${stats.merchantAliases}`);
    console.log('');
  }, 60000); // Every minute
}

async function getStats() {
  const [
    uncategorizedTransactions,
    uncategorizedSubscriptions,
    merchantAliases,
  ] = await Promise.all([
    prisma.transaction.count({
      where: {
        OR: [{ aiCategory: null }, { normalizedMerchantName: null }],
      },
    }),
    prisma.subscription.count({
      where: {
        aiCategory: null,
        categoryOverride: null,
        isActive: true,
      },
    }),
    prisma.merchantAlias.count(),
  ]);

  return {
    uncategorizedTransactions,
    uncategorizedSubscriptions,
    merchantAliases,
  };
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
