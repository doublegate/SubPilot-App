import { type PrismaClient } from '@prisma/client';
import { addDays, subDays } from 'date-fns';

interface MockSubscription {
  merchantName: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  category: string;
  startDate: Date;
}

const MOCK_SUBSCRIPTIONS: MockSubscription[] = [
  {
    merchantName: 'Netflix',
    amount: 15.99,
    frequency: 'monthly',
    category: 'streaming',
    startDate: subDays(new Date(), 180),
  },
  {
    merchantName: 'Spotify Premium',
    amount: 9.99,
    frequency: 'monthly',
    category: 'music',
    startDate: subDays(new Date(), 365),
  },
  {
    merchantName: 'Amazon Prime',
    amount: 14.99,
    frequency: 'monthly',
    category: 'shopping',
    startDate: subDays(new Date(), 270),
  },
  {
    merchantName: 'GitHub Pro',
    amount: 7.0,
    frequency: 'monthly',
    category: 'software',
    startDate: subDays(new Date(), 400),
  },
  {
    merchantName: 'Adobe Creative Cloud',
    amount: 54.99,
    frequency: 'monthly',
    category: 'software',
    startDate: subDays(new Date(), 200),
  },
  {
    merchantName: 'Disney Plus',
    amount: 7.99,
    frequency: 'monthly',
    category: 'streaming',
    startDate: subDays(new Date(), 150),
  },
  {
    merchantName: 'Hulu',
    amount: 12.99,
    frequency: 'monthly',
    category: 'streaming',
    startDate: subDays(new Date(), 120),
  },
  {
    merchantName: 'Dropbox Plus',
    amount: 11.99,
    frequency: 'monthly',
    category: 'storage',
    startDate: subDays(new Date(), 300),
  },
  {
    merchantName: 'ChatGPT Plus',
    amount: 20.0,
    frequency: 'monthly',
    category: 'ai',
    startDate: subDays(new Date(), 90),
  },
  {
    merchantName: 'Apple iCloud',
    amount: 0.99,
    frequency: 'monthly',
    category: 'storage',
    startDate: subDays(new Date(), 500),
  },
  {
    merchantName: 'Microsoft 365',
    amount: 99.99,
    frequency: 'yearly',
    category: 'software',
    startDate: subDays(new Date(), 400),
  },
  {
    merchantName: 'The New York Times',
    amount: 4.25,
    frequency: 'weekly',
    category: 'news',
    startDate: subDays(new Date(), 180),
  },
  {
    merchantName: 'Gym Membership',
    amount: 49.99,
    frequency: 'monthly',
    category: 'fitness',
    startDate: subDays(new Date(), 250),
  },
  {
    merchantName: 'YouTube Premium',
    amount: 11.99,
    frequency: 'monthly',
    category: 'streaming',
    startDate: subDays(new Date(), 180),
  },
  {
    merchantName: 'Audible',
    amount: 14.95,
    frequency: 'monthly',
    category: 'books',
    startDate: subDays(new Date(), 160),
  },
];

// Add some one-time transactions to make it more realistic
const ONE_TIME_MERCHANTS = [
  { name: 'Walmart', category: 'shopping', minAmount: 20, maxAmount: 150 },
  { name: 'Target', category: 'shopping', minAmount: 15, maxAmount: 120 },
  { name: 'Starbucks', category: 'food', minAmount: 4, maxAmount: 12 },
  {
    name: 'Shell Gas Station',
    category: 'transport',
    minAmount: 30,
    maxAmount: 80,
  },
  { name: 'Amazon', category: 'shopping', minAmount: 10, maxAmount: 200 },
  { name: 'Uber', category: 'transport', minAmount: 8, maxAmount: 45 },
  { name: 'Chipotle', category: 'food', minAmount: 10, maxAmount: 25 },
  { name: 'CVS Pharmacy', category: 'health', minAmount: 5, maxAmount: 50 },
  { name: 'Home Depot', category: 'home', minAmount: 25, maxAmount: 300 },
  { name: 'Best Buy', category: 'electronics', minAmount: 50, maxAmount: 500 },
];

export class MockDataGenerator {
  constructor(private db: PrismaClient) {}

  async generateMockTransactions(userId: string, accountId: string) {
    const transactions = [];
    const today = new Date();

    // Generate subscription transactions
    for (const sub of MOCK_SUBSCRIPTIONS) {
      const transactionDates = this.generateTransactionDates(
        sub.startDate,
        today,
        sub.frequency
      );

      for (const date of transactionDates) {
        // Add small variations to amounts (±2%)
        const variation = (Math.random() - 0.5) * 0.04;
        const amount = sub.amount * (1 + variation);

        transactions.push({
          userId,
          accountId,
          plaidTransactionId: `mock_${sub.merchantName.toLowerCase().replace(/\s+/g, '_')}_${date.getTime()}`,
          amount: Math.round(amount * 100) / 100,
          isoCurrencyCode: 'USD',
          name: sub.merchantName,
          description: `${sub.merchantName} subscription payment`,
          date,
          pending: false,
          category: [sub.category],
          subcategory: null,
          merchantName: sub.merchantName,
          paymentChannel: 'online',
          transactionType: 'special',
          isSubscription: false, // Will be detected
          confidence: 0,
        });
      }
    }

    // Generate one-time transactions
    const numOneTimeTransactions = Math.floor(Math.random() * 50) + 30; // 30-80 one-time transactions

    for (let i = 0; i < numOneTimeTransactions; i++) {
      const merchant =
        ONE_TIME_MERCHANTS[
          Math.floor(Math.random() * ONE_TIME_MERCHANTS.length)
        ]!;
      const date = subDays(today, Math.floor(Math.random() * 180)); // Random date in last 6 months
      const amount =
        Math.random() * (merchant.maxAmount - merchant.minAmount) +
        merchant.minAmount;

      transactions.push({
        userId,
        accountId,
        plaidTransactionId: `mock_onetime_${merchant.name.toLowerCase().replace(/\s+/g, '_')}_${date.getTime()}_${i}`,
        amount: Math.round(amount * 100) / 100,
        isoCurrencyCode: 'USD',
        name: merchant.name,
        description: `Purchase at ${merchant.name}`,
        date,
        pending: false,
        category: [merchant.category],
        subcategory: null,
        merchantName: merchant.name,
        paymentChannel: Math.random() > 0.5 ? 'in store' : 'online',
        transactionType: 'place',
        isSubscription: false,
        confidence: 0,
      });
    }

    // Sort by date
    transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Insert into database
    const { count } = await this.db.transaction.createMany({
      data: transactions,
      skipDuplicates: true,
    });

    console.log(`Generated ${count} mock transactions`);
    return count;
  }

  private generateTransactionDates(
    startDate: Date,
    endDate: Date,
    frequency: MockSubscription['frequency']
  ): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));

      switch (frequency) {
        case 'weekly':
          currentDate = addDays(currentDate, 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }

    return dates;
  }

  async clearUserTransactions(userId: string) {
    await this.db.transaction.deleteMany({
      where: { userId },
    });

    await this.db.subscription.deleteMany({
      where: { userId },
    });
  }
}
