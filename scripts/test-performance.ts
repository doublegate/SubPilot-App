#!/usr/bin/env tsx
/**
 * Performance Testing Script for SubPilot API Optimizations
 *
 * This script tests the performance of key API endpoints to ensure
 * they meet the target response time of < 200ms
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';
import { SubscriptionDetector } from '../src/server/services/subscription-detector';

const prisma = new PrismaClient();

interface TestResult {
  endpoint: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  passed: boolean;
}

const TARGET_RESPONSE_TIME = 200; // milliseconds

async function measureTime<T>(
  fn: () => Promise<T>,
  iterations = 10
): Promise<{ result: T; times: number[] }> {
  const times: number[] = [];
  let result: T;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = await fn();
    const end = performance.now();
    times.push(end - start);
  }

  return { result: result!, times };
}

async function testSubscriptionQueries(userId: string): Promise<TestResult> {
  console.log('\n📊 Testing Subscription Queries...');

  const { times } = await measureTime(async () => {
    return await prisma.subscription.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        _count: {
          select: { transactions: true },
        },
        transactions: {
          orderBy: { date: 'desc' },
          take: 1,
          select: {
            id: true,
            amount: true,
            date: true,
            description: true,
          },
        },
      },
      take: 20,
    });
  });

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return {
    endpoint: 'subscriptions.getAll',
    averageTime: Math.round(avg),
    minTime: Math.round(min),
    maxTime: Math.round(max),
    iterations: times.length,
    passed: avg < TARGET_RESPONSE_TIME,
  };
}

async function testTransactionQueries(userId: string): Promise<TestResult> {
  console.log('\n💳 Testing Transaction Queries...');

  const { times } = await measureTime(async () => {
    return await prisma.transaction.findMany({
      where: {
        bankAccount: {
          userId,
        },
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: 50,
      include: {
        bankAccount: {
          select: {
            name: true,
            isoCurrencyCode: true,
            plaidItem: {
              select: {
                institutionName: true,
              },
            },
          },
        },
        subscription: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return {
    endpoint: 'transactions.getAll',
    averageTime: Math.round(avg),
    minTime: Math.round(min),
    maxTime: Math.round(max),
    iterations: times.length,
    passed: avg < TARGET_RESPONSE_TIME,
  };
}

async function testAnalyticsQueries(userId: string): Promise<TestResult> {
  console.log('\n📈 Testing Analytics Queries...');

  const { times } = await measureTime(async () => {
    // Test the spending overview query
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        amount: true,
        frequency: true,
        category: true,
      },
    });

    // Calculate monthly spending
    let monthlyTotal = 0;
    subscriptions.forEach(sub => {
      let monthlyAmount = sub.amount.toNumber();
      switch (sub.frequency) {
        case 'yearly':
          monthlyAmount = monthlyAmount / 12;
          break;
        case 'quarterly':
          monthlyAmount = monthlyAmount / 3;
          break;
        case 'weekly':
          monthlyAmount = monthlyAmount * 4.33;
          break;
      }
      monthlyTotal += monthlyAmount;
    });

    return { monthlyTotal, subscriptionCount: subscriptions.length };
  });

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return {
    endpoint: 'analytics.getSpendingOverview',
    averageTime: Math.round(avg),
    minTime: Math.round(min),
    maxTime: Math.round(max),
    iterations: times.length,
    passed: avg < TARGET_RESPONSE_TIME,
  };
}

async function testSubscriptionDetection(userId: string): Promise<TestResult> {
  console.log('\n🔍 Testing Subscription Detection...');

  const detector = new SubscriptionDetector(prisma);
  const { times } = await measureTime(
    async () => {
      return await detector.detectUserSubscriptions(userId);
    },
    3 // Fewer iterations for this expensive operation
  );

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return {
    endpoint: 'subscriptions.detectSubscriptions',
    averageTime: Math.round(avg),
    minTime: Math.round(min),
    maxTime: Math.round(max),
    iterations: times.length,
    passed: avg < TARGET_RESPONSE_TIME * 2, // Allow 400ms for detection
  };
}

async function main() {
  console.log('🚀 SubPilot Performance Testing');
  console.log('================================');
  console.log(`Target Response Time: ${TARGET_RESPONSE_TIME}ms`);

  try {
    // Get a test user
    const user = await prisma.user.findFirst({
      where: {
        subscriptions: {
          some: {},
        },
      },
    });

    if (!user) {
      console.error(
        '❌ No user with subscriptions found. Please run seed script first.'
      );
      process.exit(1);
    }

    console.log(`\n👤 Testing with user: ${user.email}`);

    // Run performance tests
    const results: TestResult[] = [];

    results.push(await testSubscriptionQueries(user.id));
    results.push(await testTransactionQueries(user.id));
    results.push(await testAnalyticsQueries(user.id));
    results.push(await testSubscriptionDetection(user.id));

    // Display results
    console.log('\n\n📊 PERFORMANCE TEST RESULTS');
    console.log('==========================');
    console.log('');

    const table = results.map(r => ({
      Endpoint: r.endpoint,
      'Avg (ms)': r.averageTime,
      'Min (ms)': r.minTime,
      'Max (ms)': r.maxTime,
      Status: r.passed ? '✅ PASS' : '❌ FAIL',
    }));

    console.table(table);

    // Summary
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const passRate = (passedCount / totalCount) * 100;

    console.log('\n📈 SUMMARY');
    console.log('==========');
    console.log(`Total Tests: ${totalCount}`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${totalCount - passedCount}`);
    console.log(`Pass Rate: ${passRate.toFixed(1)}%`);

    if (passRate === 100) {
      console.log('\n✅ All performance targets met!');
    } else {
      console.log('\n⚠️  Some endpoints need optimization');
      results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(
            `  - ${r.endpoint}: ${r.averageTime}ms (target: ${r.endpoint.includes('detect') ? TARGET_RESPONSE_TIME * 2 : TARGET_RESPONSE_TIME}ms)`
          );
        });
    }
  } catch (error) {
    console.error('❌ Error running performance tests:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
main().catch(console.error);
