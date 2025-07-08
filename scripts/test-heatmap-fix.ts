#!/usr/bin/env npx tsx
/**
 * Test script to verify the heatmap fix for users without linked accounts
 */

import { db as prisma } from '@/server/db';

async function testHeatmapFix() {
  console.log('Testing heatmap fix...\n');

  try {
    // Get a test user
    const testUser = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
      },
    });

    if (!testUser) {
      console.log('No users found in database');
      return;
    }

    console.log(`Testing with user: ${testUser.email}`);

    // Check if user has any linked Plaid items
    const plaidItems = await prisma.plaidItem.findMany({
      where: { userId: testUser.id },
      include: {
        bankAccounts: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`\nLinked bank accounts: ${plaidItems.length}`);

    if (plaidItems.length === 0) {
      console.log(
        '✓ User has no linked accounts - heatmap should show empty state'
      );
    } else {
      console.log('User has linked accounts. Checking for transactions...');

      // Get transaction count for current year
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);

      const transactionCount = await prisma.transaction.count({
        where: {
          userId: testUser.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
          amount: {
            lt: 0, // Only spending
          },
        },
      });

      console.log(`\nTransactions in ${currentYear}: ${transactionCount}`);

      if (transactionCount === 0) {
        console.log('✓ No transactions found - heatmap will be empty');
      } else {
        console.log('✓ Transactions found - heatmap will show real data');

        // Get a sample of daily spending
        const transactions = await prisma.transaction.findMany({
          where: {
            userId: testUser.id,
            date: {
              gte: startDate,
              lte: endDate,
            },
            amount: {
              lt: 0,
            },
          },
          orderBy: {
            amount: 'asc', // Most expensive first
          },
          take: 5,
          include: {
            subscription: {
              select: {
                name: true,
              },
            },
          },
        });

        console.log('\nTop 5 spending transactions:');
        transactions.forEach(txn => {
          const name = txn.subscription?.name || txn.merchantName || 'Unknown';
          console.log(
            `  - ${new Date(txn.date).toLocaleDateString()}: ${name} - $${Math.abs(txn.amount.toNumber()).toFixed(2)}`
          );
        });
      }
    }

    console.log('\n✅ Heatmap fix verification complete!');
    console.log('\nExpected behavior:');
    console.log(
      '- If no linked accounts: Show "Link a bank account to see your spending heatmap" message'
    );
    console.log('- If linked accounts but no transactions: Show empty heatmap');
    console.log(
      '- If linked accounts with transactions: Show real spending data in heatmap'
    );
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHeatmapFix().catch(console.error);
