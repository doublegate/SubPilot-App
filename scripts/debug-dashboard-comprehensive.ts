#!/usr/bin/env npx tsx

import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}\n`),
  subheader: (msg: string) => console.log(`\n${colors.bright}${colors.magenta}--- ${msg} ---${colors.reset}`),
};

async function debugDashboard() {
  try {
    log.header('Dashboard Debug - Comprehensive Analysis');

    // Step 1: Basic Database Check
    log.subheader('1. Database Connection & Schema Check');
    
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'subscriptions', 'transactions', 'accounts', 'plaid_items')
    ` as any[];
    
    log.info(`Found ${tableCheck.length} required tables`);
    if (tableCheck.length < 5) {
      log.error('Missing required tables! Run: npm run db:push');
      return;
    }

    // Step 2: User Data Check
    log.subheader('2. User Data Analysis');
    
    const users = await prisma.user.findMany({
      include: {
        plaidItems: {
          include: {
            accounts: true
          }
        },
        subscriptions: true,
        transactions: true,
      }
    });

    log.info(`Total users: ${users.length}`);
    
    for (const user of users) {
      console.log(`\nUser: ${user.email || user.id}`);
      console.log(`  - Plaid Items: ${user.plaidItems.length}`);
      console.log(`  - Total Accounts: ${user.plaidItems.reduce((sum, item) => sum + item.accounts.length, 0)}`);
      console.log(`  - Total Transactions: ${user.transactions.length}`);
      console.log(`  - Total Subscriptions: ${user.subscriptions.length}`);
      
      if (user.subscriptions.length > 0) {
        const active = user.subscriptions.filter(s => s.isActive && s.status === 'active');
        console.log(`  - Active Subscriptions: ${active.length}`);
        console.log(`  - Inactive Subscriptions: ${user.subscriptions.length - active.length}`);
      }
    }

    // Step 3: Subscription Data Deep Dive
    log.subheader('3. Subscription Data Analysis');
    
    const allSubscriptions = await prisma.subscription.findMany({
      include: {
        user: true,
      }
    });

    console.log(`\nTotal subscriptions in database: ${allSubscriptions.length}`);
    
    // Group by status
    const statusGroups = allSubscriptions.reduce((acc, sub) => {
      const key = `${sub.status}/${sub.isActive ? 'active' : 'inactive'}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nSubscriptions by status:');
    Object.entries(statusGroups).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });

    // Check for data issues
    const issues = {
      noAmount: allSubscriptions.filter(s => !s.amount || s.amount.equals(new Decimal(0))),
      noFrequency: allSubscriptions.filter(s => !s.frequency),
      noNextBilling: allSubscriptions.filter(s => !s.nextBilling),
      notActive: allSubscriptions.filter(s => !s.isActive || s.status !== 'active'),
    };

    if (issues.noAmount.length > 0) log.warning(`${issues.noAmount.length} subscriptions have no amount`);
    if (issues.noFrequency.length > 0) log.warning(`${issues.noFrequency.length} subscriptions have no frequency`);
    if (issues.noNextBilling.length > 0) log.warning(`${issues.noNextBilling.length} subscriptions have no next billing date`);
    if (issues.notActive.length > 0) log.warning(`${issues.notActive.length} subscriptions are not active`);

    // Step 4: Dashboard Query Simulation
    log.subheader('4. Dashboard Query Simulation');
    
    if (users.length === 0) {
      log.error('No users found! Cannot simulate dashboard queries.');
      return;
    }

    for (const user of users) {
      console.log(`\nSimulating dashboard for user: ${user.email || user.id}`);
      
      // Simulate the exact getStats query
      const activeSubscriptions = await prisma.subscription.findMany({
        where: {
          userId: user.id,
          isActive: true,
        },
      });

      console.log(`  Active subscriptions found: ${activeSubscriptions.length}`);

      if (activeSubscriptions.length > 0) {
        // Calculate monthly spend
        let monthlySpend = new Decimal(0);
        
        for (const sub of activeSubscriptions) {
          console.log(`    - ${sub.name}: ${sub.amount} ${sub.currency} (${sub.frequency})`);
          
          let monthlyAmount = sub.amount;
          switch (sub.frequency) {
            case 'weekly':
              monthlyAmount = sub.amount.mul(52).div(12);
              break;
            case 'biweekly':
              monthlyAmount = sub.amount.mul(26).div(12);
              break;
            case 'quarterly':
              monthlyAmount = sub.amount.div(3);
              break;
            case 'yearly':
              monthlyAmount = sub.amount.div(12);
              break;
          }
          
          monthlySpend = monthlySpend.add(monthlyAmount);
        }

        const yearlyProjection = monthlySpend.mul(12);
        
        console.log(`\n  Dashboard calculations:`);
        console.log(`    - Active Subscriptions: ${activeSubscriptions.length}`);
        console.log(`    - Monthly Spend: $${monthlySpend.toFixed(2)}`);
        console.log(`    - Yearly Projection: $${yearlyProjection.toFixed(2)}`);
      }
    }

    // Step 5: Transaction Analysis
    log.subheader('5. Transaction Analysis for Subscription Detection');
    
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 20,
    });

    console.log(`\nRecent transactions (last 90 days): ${recentTransactions.length}`);
    
    // Group by merchant to find recurring patterns
    const merchantGroups = recentTransactions.reduce((acc, txn) => {
      const merchant = txn.merchantName || txn.name || 'Unknown';
      if (!acc[merchant]) acc[merchant] = [];
      acc[merchant].push(txn);
      return acc;
    }, {} as Record<string, typeof recentTransactions>);

    console.log('\nTransactions by merchant:');
    Object.entries(merchantGroups)
      .filter(([_, txns]) => txns.length >= 2) // Only show potential subscriptions
      .forEach(([merchant, txns]) => {
        console.log(`  - ${merchant}: ${txns.length} transactions`);
        if (txns.length >= 2) {
          const amounts = txns.map(t => t.amount.toString());
          const unique = [...new Set(amounts)];
          if (unique.length === 1) {
            console.log(`    ✓ Consistent amount: $${unique[0]}`);
          } else {
            console.log(`    ⚠ Variable amounts: ${unique.join(', ')}`);
          }
        }
      });

    // Step 6: Raw SQL Verification
    log.subheader('6. Raw SQL Verification');
    
    const rawStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_active,
        COALESCE(SUM(
          CASE 
            WHEN frequency = 'monthly' THEN amount
            WHEN frequency = 'weekly' THEN amount * 52 / 12
            WHEN frequency = 'biweekly' THEN amount * 26 / 12
            WHEN frequency = 'quarterly' THEN amount / 3
            WHEN frequency = 'yearly' THEN amount / 12
            ELSE amount
          END
        ), 0) as monthly_spend
      FROM subscriptions
      WHERE "isActive" = true AND status = 'active'
    ` as any[];

    const stats = rawStats[0];
    console.log('\nRaw SQL Results:');
    console.log(`  - Total Active Subscriptions: ${stats.total_active}`);
    console.log(`  - Monthly Spend: $${parseFloat(stats.monthly_spend).toFixed(2)}`);
    console.log(`  - Yearly Projection: $${(parseFloat(stats.monthly_spend) * 12).toFixed(2)}`);

    // Step 7: Recommendations
    log.subheader('7. Analysis Results & Recommendations');
    
    if (allSubscriptions.length === 0) {
      log.error('NO SUBSCRIPTIONS FOUND IN DATABASE!');
      log.warning('Possible causes:');
      console.log('  1. Subscription detection never ran after Plaid sync');
      console.log('  2. Detection algorithm confidence threshold too high');
      console.log('  3. Transactions missing merchant names');
      console.log('  4. Account ID mapping issues preventing transaction saves');
      
      log.info('Recommended actions:');
      console.log('  1. Check Plaid sync logs for errors');
      console.log('  2. Manually trigger subscription detection');
      console.log('  3. Lower detection confidence threshold');
      console.log('  4. Check transaction import process');
    } else if (issues.notActive.length === allSubscriptions.length) {
      log.error('ALL SUBSCRIPTIONS ARE INACTIVE!');
      log.warning('This is why the dashboard shows zeros.');
      log.info('Recommended actions:');
      console.log('  1. Check why subscriptions are being created as inactive');
      console.log('  2. Update existing subscriptions to active status');
      console.log('  3. Fix the subscription creation logic');
    } else if (stats.total_active > 0) {
      log.success('Active subscriptions exist in the database!');
      log.warning('Dashboard may have a different issue:');
      console.log('  1. User session context might be wrong');
      console.log('  2. Dashboard might be querying with wrong userId');
      console.log('  3. There might be a caching issue');
      console.log('  4. Check browser console for API errors');
    }

  } catch (error) {
    log.error(`Error during analysis: ${error}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug script
debugDashboard().catch(console.error);