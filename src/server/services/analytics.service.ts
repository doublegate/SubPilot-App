import {
  type PrismaClient,
  type Subscription,
  type Transaction,
} from '@prisma/client';

// Type definitions
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  count: number;
  metadata?: Record<string, unknown>;
}

export interface PredictiveAnalysis {
  predictedValue: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonalFactor?: number;
}

export interface ComparisonResult {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CategoryAnalysis {
  category: string;
  totalSpending: number;
  subscriptionCount: number;
  averageAmount: number;
  trend: ComparisonResult;
  providers: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
}

export interface AnomalyDetection {
  type:
    | 'price_spike'
    | 'unusual_charge'
    | 'duplicate_charge'
    | 'missing_charge';
  severity: 'low' | 'medium' | 'high';
  subscription?: {
    id: string;
    name: string;
    amount: number;
  };
  description: string;
  detectedAt: Date;
  affectedAmount: number;
}

export interface CostOptimizationSuggestion {
  type: 'unused' | 'duplicate' | 'downgrade' | 'annual_switch' | 'cancel';
  priority: 'low' | 'medium' | 'high';
  potentialSavings: number;
  subscriptions: Array<{
    id: string;
    name: string;
    currentCost: number;
    recommendedAction: string;
  }>;
  description: string;
}

export interface SpendingPattern {
  dayOfWeek: number[];
  dayOfMonth: number[];
  seasonalIndex: Record<string, number>;
  growthRate: number;
}

export interface AnalyticsReport {
  period: { start: Date; end: Date };
  summary: {
    totalSpending: number;
    subscriptionSpending: number;
    savingsOpportunities: number;
    activeSubscriptions: number;
    cancelledSubscriptions: number;
  };
  trends: TimeSeriesDataPoint[];
  categories: CategoryAnalysis[];
  anomalies: AnomalyDetection[];
  optimizations: CostOptimizationSuggestion[];
  predictions: {
    nextMonth: PredictiveAnalysis;
    nextQuarter: PredictiveAnalysis;
    nextYear: PredictiveAnalysis;
  };
}

export class AnalyticsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate time-series data for spending trends
   */
  async generateTimeSeriesData(
    userId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'month'
  ): Promise<TimeSeriesDataPoint[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        bankAccount: {
          userId,
        },
        date: {
          gte: startDate,
          lte: endDate,
        },
        amount: { gt: 0 },
      },
      orderBy: { date: 'asc' },
    });

    const grouped = this.groupTransactionsByPeriod(transactions, groupBy);

    return Object.entries(grouped).map(([date, data]) => ({
      date,
      value: data.total,
      count: data.count,
      metadata: {
        recurring: data.recurring,
        nonRecurring: data.total - data.recurring,
      },
    }));
  }

  /**
   * Perform predictive analysis on spending patterns
   */
  async predictFutureSpending(
    userId: string,
    horizonMonths: number
  ): Promise<PredictiveAnalysis> {
    // Get historical data (last 12 months)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const timeSeries = await this.generateTimeSeriesData(
      userId,
      startDate,
      endDate,
      'month'
    );

    if (timeSeries.length < 3) {
      return {
        predictedValue: 0,
        confidence: 0,
        trend: 'stable',
      };
    }

    // Simple linear regression for trend
    const { slope, intercept } = this.calculateLinearRegression(
      timeSeries.map((point, index) => ({ x: index, y: point.value }))
    );

    // Calculate seasonal factors
    const seasonalFactors = this.calculateSeasonalFactors(timeSeries);

    // Predict future value
    const futureIndex = timeSeries.length + horizonMonths - 1;
    const trendValue = slope * futureIndex + intercept;
    const month = (new Date().getMonth() + horizonMonths) % 12;
    const seasonalFactor = seasonalFactors[month] ?? 1;
    const predictedValue = trendValue * seasonalFactor;

    // Calculate confidence based on data consistency
    const variance = this.calculateVariance(timeSeries.map(p => p.value));
    const confidence = Math.max(0, Math.min(1, 1 - variance / predictedValue));

    return {
      predictedValue: Math.max(0, predictedValue),
      confidence,
      trend:
        slope > 0.05 ? 'increasing' : slope < -0.05 ? 'decreasing' : 'stable',
      seasonalFactor,
    };
  }

  /**
   * Compare spending periods (month-over-month, year-over-year)
   */
  async compareSpendingPeriods(
    userId: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<ComparisonResult> {
    const [currentSpending, previousSpending] = await Promise.all([
      this.getSpendingForPeriod(userId, currentStart, currentEnd),
      this.getSpendingForPeriod(userId, previousStart, previousEnd),
    ]);

    const change = currentSpending - previousSpending;
    const changePercentage =
      previousSpending > 0 ? (change / previousSpending) * 100 : 0;

    return {
      current: currentSpending,
      previous: previousSpending,
      change,
      changePercentage,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  }

  /**
   * Analyze spending by category with trends
   */
  async analyzeCategorySpending(
    userId: string,
    timeRange: 'month' | 'quarter' | 'year' = 'month'
  ): Promise<CategoryAnalysis[]> {
    const endDate = new Date();
    const startDate = new Date();
    const previousStartDate = new Date();
    const previousEndDate = new Date();

    switch (timeRange) {
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        previousStartDate.setMonth(endDate.getMonth() - 2);
        previousEndDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        previousStartDate.setMonth(endDate.getMonth() - 6);
        previousEndDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        previousStartDate.setFullYear(endDate.getFullYear() - 2);
        previousEndDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    const categoryMap = new Map<string, CategoryAnalysis>();

    for (const sub of subscriptions) {
      const category = sub.category ?? 'Other';
      const existing = categoryMap.get(category) ?? {
        category,
        totalSpending: 0,
        subscriptionCount: 0,
        averageAmount: 0,
        trend: {
          current: 0,
          previous: 0,
          change: 0,
          changePercentage: 0,
          trend: 'stable' as const,
        },
        providers: [],
      };

      const monthlyAmount = this.convertToMonthlyAmount(
        sub.amount.toNumber(),
        sub.frequency
      );
      existing.totalSpending += monthlyAmount;
      existing.subscriptionCount += 1;

      const providerName = this.extractProviderName(sub.provider);
      const providerIndex = existing.providers.findIndex(
        p => p.name === providerName
      );

      if (providerIndex >= 0) {
        existing.providers[providerIndex]!.amount += monthlyAmount;
      } else {
        existing.providers.push({
          name: providerName,
          amount: monthlyAmount,
          percentage: 0,
        });
      }

      categoryMap.set(category, existing);
    }

    // Calculate averages and percentages
    const results = Array.from(categoryMap.values()).map(cat => {
      cat.averageAmount =
        cat.subscriptionCount > 0
          ? cat.totalSpending / cat.subscriptionCount
          : 0;

      // Calculate provider percentages
      cat.providers = cat.providers
        .map(p => ({
          ...p,
          percentage:
            cat.totalSpending > 0 ? (p.amount / cat.totalSpending) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5); // Top 5 providers

      return cat;
    });

    // Sort by total spending
    return results.sort((a, b) => b.totalSpending - a.totalSpending);
  }

  /**
   * Detect anomalies in subscription spending
   */
  async detectAnomalies(userId: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get recent transactions
    const recentTransactions = await this.prisma.transaction.findMany({
      where: {
        bankAccount: { userId },
        date: { gte: thirtyDaysAgo },
        isSubscription: true,
      },
      include: {
        subscription: true,
      },
      orderBy: { date: 'desc' },
    });

    // Group by subscription
    const transactionsBySubscription = new Map<string, Transaction[]>();
    for (const tx of recentTransactions) {
      if (tx.subscriptionId) {
        const existing =
          transactionsBySubscription.get(tx.subscriptionId) ?? [];
        existing.push(tx);
        transactionsBySubscription.set(tx.subscriptionId, existing);
      }
    }

    // Check for anomalies
    for (const [, transactions] of transactionsBySubscription) {
      const subscriptionId = transactions[0]?.subscriptionId;
      if (!subscriptionId) continue;

      // Fetch subscription details
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });
      if (!subscription) continue;

      // Price spike detection
      const amounts = transactions.map(t => t.amount.toNumber());
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const maxAmount = Math.max(...amounts);

      if (maxAmount > avgAmount * 1.2) {
        anomalies.push({
          type: 'price_spike',
          severity: maxAmount > avgAmount * 1.5 ? 'high' : 'medium',
          subscription: {
            id: subscription.id,
            name: subscription.name,
            amount: subscription.amount.toNumber(),
          },
          description: `Price increased from $${avgAmount.toFixed(2)} to $${maxAmount.toFixed(2)}`,
          detectedAt: new Date(),
          affectedAmount: maxAmount - avgAmount,
        });
      }

      // Duplicate charge detection
      const dates = transactions.map(t => t.date.toISOString().split('T')[0]);
      const duplicateDates = dates.filter(
        (date, index) => dates.indexOf(date) !== index
      );

      if (duplicateDates.length > 0) {
        anomalies.push({
          type: 'duplicate_charge',
          severity: 'high',
          subscription: {
            id: subscription.id,
            name: subscription.name,
            amount: subscription.amount.toNumber(),
          },
          description: `Multiple charges detected on the same day`,
          detectedAt: new Date(),
          affectedAmount:
            subscription.amount.toNumber() * duplicateDates.length,
        });
      }
    }

    return anomalies;
  }

  /**
   * Generate cost optimization suggestions
   */
  async generateOptimizationSuggestions(
    userId: string
  ): Promise<CostOptimizationSuggestion[]> {
    const suggestions: CostOptimizationSuggestion[] = [];

    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId, isActive: true },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
    });

    // Check for unused subscriptions
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const unusedSubs = subscriptions.filter(sub => {
      const lastTransaction = sub.transactions?.[0];
      return !lastTransaction || lastTransaction.date < sixtyDaysAgo;
    });

    if (unusedSubs.length > 0) {
      const totalSavings = unusedSubs.reduce(
        (sum, sub) =>
          sum +
          this.convertToMonthlyAmount(sub.amount.toNumber(), sub.frequency),
        0
      );

      suggestions.push({
        type: 'unused',
        priority: 'high',
        potentialSavings: totalSavings,
        subscriptions: unusedSubs.map(sub => ({
          id: sub.id,
          name: sub.name,
          currentCost: this.convertToMonthlyAmount(
            sub.amount.toNumber(),
            sub.frequency
          ),
          recommendedAction: 'Consider cancelling this unused subscription',
        })),
        description: `You have ${unusedSubs.length} subscriptions that haven't been used in over 60 days`,
      });
    }

    // Check for potential annual savings
    const monthlySubsWithAnnualOption = subscriptions.filter(
      sub => sub.frequency === 'monthly' && sub.amount.toNumber() > 10
    );

    if (monthlySubsWithAnnualOption.length > 0) {
      // Estimate 10-20% savings for annual plans
      const estimatedSavings = monthlySubsWithAnnualOption.reduce(
        (sum, sub) => sum + sub.amount.toNumber() * 12 * 0.15,
        0
      );

      suggestions.push({
        type: 'annual_switch',
        priority: 'medium',
        potentialSavings: estimatedSavings / 12, // Monthly savings
        subscriptions: monthlySubsWithAnnualOption.slice(0, 5).map(sub => ({
          id: sub.id,
          name: sub.name,
          currentCost: sub.amount.toNumber(),
          recommendedAction: 'Switch to annual billing for 10-20% savings',
        })),
        description:
          'Consider switching to annual plans for long-term subscriptions',
      });
    }

    // Check for duplicates by similar names
    const potentialDuplicates = this.findPotentialDuplicates(subscriptions);

    if (potentialDuplicates.length > 0) {
      suggestions.push({
        type: 'duplicate',
        priority: 'high',
        potentialSavings: potentialDuplicates.reduce(
          (sum, group) => sum + group.potentialSavings,
          0
        ),
        subscriptions: potentialDuplicates.flatMap(
          group => group.subscriptions
        ),
        description:
          'You may have duplicate subscriptions for similar services',
      });
    }

    return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Generate a comprehensive analytics report
   */
  async generateReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsReport> {
    const [summary, trends, categories, anomalies, optimizations, predictions] =
      await Promise.all([
        this.generateSummary(userId, startDate, endDate),
        this.generateTimeSeriesData(userId, startDate, endDate, 'month'),
        this.analyzeCategorySpending(userId, 'month'),
        this.detectAnomalies(userId),
        this.generateOptimizationSuggestions(userId),
        this.generatePredictions(userId),
      ]);

    return {
      period: { start: startDate, end: endDate },
      summary,
      trends,
      categories,
      anomalies,
      optimizations,
      predictions,
    };
  }

  // Helper methods
  private groupTransactionsByPeriod(
    transactions: Transaction[],
    groupBy: 'day' | 'week' | 'month'
  ): Record<string, { total: number; recurring: number; count: number }> {
    const grouped: Record<
      string,
      { total: number; recurring: number; count: number }
    > = {};

    for (const tx of transactions) {
      const key = this.getDateKey(tx.date, groupBy);

      grouped[key] ??= { total: 0, recurring: 0, count: 0 };

      grouped[key].total += tx.amount.toNumber();
      grouped[key].count += 1;

      if (tx.isSubscription) {
        grouped[key].recurring += tx.amount.toNumber();
      }
    }

    return grouped;
  }

  private getDateKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    switch (groupBy) {
      case 'day':
        return date.toISOString().split('T')[0] ?? '';
      case 'week': {
        const week = new Date(date);
        week.setDate(week.getDate() - week.getDay());
        return week.toISOString().split('T')[0] ?? '';
      }
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  private calculateLinearRegression(points: Array<{ x: number; y: number }>): {
    slope: number;
    intercept: number;
  } {
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private calculateSeasonalFactors(
    timeSeries: TimeSeriesDataPoint[]
  ): Record<number, number> {
    const monthlyAverages: Record<number, number[]> = {};

    for (const point of timeSeries) {
      const month = new Date(point.date).getMonth();
      monthlyAverages[month] ??= [];
      monthlyAverages[month].push(point.value);
    }

    const overallAverage =
      timeSeries.reduce((sum, p) => sum + p.value, 0) / timeSeries.length;
    const seasonalFactors: Record<number, number> = {};

    for (const [month, values] of Object.entries(monthlyAverages)) {
      const monthAverage =
        values.reduce((sum, v) => sum + v, 0) / values.length;
      seasonalFactors[parseInt(month)] = monthAverage / overallAverage;
    }

    return seasonalFactors;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDifferences = values.map(v => Math.pow(v - mean, 2));
    return squaredDifferences.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private async getSpendingForPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const result = await this.prisma.transaction.aggregate({
      where: {
        bankAccount: { userId },
        date: { gte: startDate, lte: endDate },
        amount: { gt: 0 },
      },
      _sum: { amount: true },
    });

    return result._sum.amount?.toNumber() ?? 0;
  }

  private convertToMonthlyAmount(amount: number, frequency: string): number {
    switch (frequency) {
      case 'yearly':
        return amount / 12;
      case 'quarterly':
        return amount / 3;
      case 'weekly':
        return amount * 4.33;
      case 'monthly':
      default:
        return amount;
    }
  }

  private extractProviderName(provider: unknown): string {
    if (provider && typeof provider === 'object' && 'name' in provider) {
      return String(provider.name);
    }
    return 'Unknown';
  }

  private findPotentialDuplicates(subscriptions: Subscription[]): Array<{
    subscriptions: Array<{
      id: string;
      name: string;
      currentCost: number;
      recommendedAction: string;
    }>;
    potentialSavings: number;
  }> {
    const groups = new Map<string, Subscription[]>();

    // Group by normalized name
    for (const sub of subscriptions) {
      const normalized = sub.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 10);

      const existing = groups.get(normalized) ?? [];
      existing.push(sub);
      groups.set(normalized, existing);
    }

    // Find groups with duplicates
    const duplicateGroups: Array<{
      subscriptions: Array<{
        id: string;
        name: string;
        currentCost: number;
        recommendedAction: string;
      }>;
      potentialSavings: number;
    }> = [];

    for (const [, subs] of groups) {
      if (subs.length > 1) {
        const monthlyAmounts = subs.map(s =>
          this.convertToMonthlyAmount(s.amount.toNumber(), s.frequency)
        );
        const totalCost = monthlyAmounts.reduce((sum, a) => sum + a, 0);
        const minCost = Math.min(...monthlyAmounts);
        const potentialSavings = totalCost - minCost;

        duplicateGroups.push({
          subscriptions: subs.map(s => ({
            id: s.id,
            name: s.name,
            currentCost: this.convertToMonthlyAmount(
              s.amount.toNumber(),
              s.frequency
            ),
            recommendedAction: 'Review for potential duplicate service',
          })),
          potentialSavings,
        });
      }
    }

    return duplicateGroups;
  }

  private async generateSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsReport['summary']> {
    const [totalSpending, subscriptions, savingsOpportunities] =
      await Promise.all([
        this.getSpendingForPeriod(userId, startDate, endDate),
        this.prisma.subscription.findMany({
          where: { userId },
        }),
        this.generateOptimizationSuggestions(userId),
      ]);

    const activeSubscriptions = subscriptions.filter(s => s.isActive);
    const subscriptionSpending = activeSubscriptions.reduce(
      (sum, s) =>
        sum + this.convertToMonthlyAmount(s.amount.toNumber(), s.frequency),
      0
    );

    return {
      totalSpending,
      subscriptionSpending,
      savingsOpportunities: savingsOpportunities.reduce(
        (sum, s) => sum + s.potentialSavings,
        0
      ),
      activeSubscriptions: activeSubscriptions.length,
      cancelledSubscriptions: subscriptions.length - activeSubscriptions.length,
    };
  }

  private async generatePredictions(
    userId: string
  ): Promise<AnalyticsReport['predictions']> {
    const [nextMonth, nextQuarter, nextYear] = await Promise.all([
      this.predictFutureSpending(userId, 1),
      this.predictFutureSpending(userId, 3),
      this.predictFutureSpending(userId, 12),
    ]);

    return { nextMonth, nextQuarter, nextYear };
  }
}
