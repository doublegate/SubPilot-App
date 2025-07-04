#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function manualSync() {
  console.log('🔄 Manual Transaction Sync\n');

  try {
    // Get all Plaid items
    const plaidItems = await prisma.plaidItem.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: true,
        bankAccounts: true,
      },
    });

    console.log(`Found ${plaidItems.length} active Plaid items\n`);

    if (plaidItems.length === 0) {
      console.log('❌ No active Plaid items found!');
      return;
    }

    // For each Plaid item, check its status
    for (const item of plaidItems) {
      console.log(`\n📊 Plaid Item: ${item.institutionName}`);
      console.log(`   User: ${item.user.email}`);
      console.log(`   Status: ${item.status}`);
      console.log(`   Accounts: ${item.bankAccounts.length}`);
      console.log(`   Last Webhook: ${item.lastWebhook ?? 'Never'}`);
      console.log(`   Needs Sync: ${item.needsSync}`);
      console.log(
        `   Access Token: ${item.accessToken ? '✓ Present' : '✗ Missing'}`
      );

      // Check when accounts were last synced
      for (const account of item.bankAccounts) {
        const transactionCount = await prisma.transaction.count({
          where: { accountId: account.id },
        });

        console.log(`\n   📁 Account: ${account.name} (${account.mask})`);
        console.log(`      Type: ${account.type}/${account.subtype}`);
        console.log(`      Last Sync: ${account.lastSync || 'Never'}`);
        console.log(`      Transactions: ${transactionCount}`);
      }
    }

    // Check if there's a sync endpoint we can call
    console.log('\n\n💡 To sync transactions, you can:');
    console.log('1. Go to the dashboard and click "Sync Transactions" button');
    console.log(
      '2. Use the API endpoint: POST /api/trpc/plaid.syncTransactions'
    );
    console.log('3. Generate mock data for testing');

    // Check for any errors
    const errorItems = await prisma.plaidItem.findMany({
      where: {
        status: 'error',
      },
    });

    if (errorItems.length > 0) {
      console.log(`\n⚠️  ${errorItems.length} Plaid items have errors:`);
      for (const item of errorItems) {
        console.log(
          `   - ${item.institutionName}: ${item.errorMessage ?? 'Unknown error'}`
        );
      }
    }
  } catch (error) {
    console.error(
      '❌ Error:',
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    await prisma.$disconnect();
  }
}

void manualSync().catch((error: unknown) => {
  console.error(
    'Failed to run manual sync:',
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
