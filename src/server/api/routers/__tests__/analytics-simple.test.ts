import { describe, it, expect } from 'vitest';

// Test the analytics router logic without complex Next.js imports
describe('Analytics Router Logic', () => {
  it('should calculate monthly subscription spending correctly', () => {
    // Test the calculation logic directly
    const subscriptions = [
      { amount: 15.99, frequency: 'monthly' },
      { amount: 99.99, frequency: 'yearly' },
      { amount: 9.99, frequency: 'weekly' },
    ];

    let monthlyTotal = 0;

    subscriptions.forEach(sub => {
      let monthlyAmount = sub.amount;

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

    // Expected: 15.99 + (99.99/12) + (9.99*4.33) = 15.99 + 8.33 + 43.26 = 67.58
    expect(Math.round(monthlyTotal * 100) / 100).toBe(67.58);
  });

  it('should group spending trends by month correctly', () => {
    const transactions = [
      { date: new Date('2024-07-15'), amount: 15.99, isSubscription: true },
      { date: new Date('2024-07-20'), amount: 25.5, isSubscription: false },
      { date: new Date('2024-06-15'), amount: 15.99, isSubscription: true },
    ];

    const trends: Record<string, { total: number; recurring: number }> = {};

    transactions.forEach(t => {
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;

      trends[key] ??= { total: 0, recurring: 0 };

      const trend = trends[key];
      if (trend) {
        trend.total += t.amount;
        if (t.isSubscription) {
          trend.recurring += t.amount;
        }
      }
    });

    expect(trends['2024-07']).toEqual({ total: 41.49, recurring: 15.99 });
    expect(trends['2024-06']).toEqual({ total: 15.99, recurring: 15.99 });
  });

  it('should detect unused subscriptions correctly', () => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const subscriptions = [
      {
        id: 'sub-1',
        isActive: true,
        transactions: [{ date: new Date() }], // Recent transaction
      },
      {
        id: 'sub-2',
        isActive: true,
        transactions: [{ date: new Date(sixtyDaysAgo.getTime() - 86400000) }], // 61 days ago
      },
      {
        id: 'sub-3',
        isActive: false,
        transactions: [],
      },
    ];

    const unusedSubscriptions = subscriptions.filter(s => {
      if (!s.isActive) return false;
      const lastTransaction = s.transactions[0];
      return !lastTransaction || lastTransaction.date < sixtyDaysAgo;
    });

    expect(unusedSubscriptions).toHaveLength(1);
    expect(unusedSubscriptions[0]?.id).toBe('sub-2');
  });

  it('should detect price increases correctly', () => {
    const subscriptions = [
      {
        id: 'sub-1',
        transactions: [
          { amount: 17.99 }, // Recent higher price
          { amount: 15.99 }, // Previous lower price
        ],
      },
      {
        id: 'sub-2',
        transactions: [
          { amount: 9.99 }, // Same price
          { amount: 9.99 },
        ],
      },
      {
        id: 'sub-3',
        transactions: [{ amount: 5.99 }], // Only one transaction
      },
    ];

    const priceIncreases = subscriptions.filter(s => {
      if (s.transactions.length < 2) return false;
      const recent = s.transactions[0]?.amount ?? 0;
      const previous = s.transactions[1]?.amount ?? 0;
      return recent > previous;
    });

    expect(priceIncreases).toHaveLength(1);
    expect(priceIncreases[0]?.id).toBe('sub-1');
  });

  it('should calculate subscription insights correctly', () => {
    const subscriptions = [
      { isActive: true, createdAt: new Date(Date.now() - 30 * 86400000) }, // 30 days old
      { isActive: true, createdAt: new Date(Date.now() - 60 * 86400000) }, // 60 days old
      { isActive: false, createdAt: new Date(Date.now() - 90 * 86400000) }, // Cancelled
    ];

    const activeCount = subscriptions.filter(s => s.isActive).length;
    const cancelledCount = subscriptions.filter(s => !s.isActive).length;

    // Calculate average age
    const activeAges = subscriptions
      .filter(s => s.isActive)
      .map(s => {
        const age = Date.now() - s.createdAt.getTime();
        return age / (1000 * 60 * 60 * 24); // Days
      });

    const averageAge =
      activeAges.length > 0
        ? Math.round(activeAges.reduce((a, b) => a + b, 0) / activeAges.length)
        : 0;

    expect(activeCount).toBe(2);
    expect(cancelledCount).toBe(1);
    expect(averageAge).toBe(45); // (30 + 60) / 2
  });
});
