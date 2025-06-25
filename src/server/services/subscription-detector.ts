import { type Transaction, type PrismaClient } from '@prisma/client';
import { type Decimal } from '@prisma/client/runtime/library';

interface DetectionResult {
  isSubscription: boolean;
  confidence: number;
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  merchantName: string;
  averageAmount: number;
  nextBillingDate?: Date;
}

interface TransactionGroup {
  merchantName: string;
  transactions: Transaction[];
}

export class SubscriptionDetector {
  private readonly db: PrismaClient;

  // Minimum requirements for detection
  private readonly MIN_TRANSACTIONS = 2;
  private readonly MIN_CONFIDENCE = 0.5; // Lowered from 0.7 to catch more subscriptions

  // Time windows for frequency detection (in days)
  // Widened ranges to account for billing date variations
  private readonly FREQUENCY_WINDOWS = {
    weekly: { min: 5, max: 10, ideal: 7 },
    biweekly: { min: 11, max: 17, ideal: 14 },
    monthly: { min: 24, max: 38, ideal: 30 }, // Accounts for month length variations
    quarterly: { min: 75, max: 105, ideal: 90 },
    yearly: { min: 340, max: 390, ideal: 365 },
  };

  constructor(db: PrismaClient) {
    this.db = db;
  }

  /**
   * Analyze all transactions for a user and detect subscriptions
   */
  async detectUserSubscriptions(userId: string): Promise<DetectionResult[]> {
    // Get all transactions for the user from the past year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const transactions = await this.db.transaction.findMany({
      where: {
        userId,
        date: { gte: oneYearAgo },
        pending: false,
        amount: { gt: 0 }, // Only consider charges, not refunds
      },
      orderBy: { date: 'desc' },
    });

    // Group transactions by merchant
    const merchantGroups = this.groupByMerchant(transactions);

    // Analyze each merchant group
    const detectionResults: DetectionResult[] = [];

    for (const group of merchantGroups) {
      const result = this.analyzeTransactionGroup(group);
      if (result && result.confidence >= this.MIN_CONFIDENCE) {
        detectionResults.push(result);

        // Update transaction records with detection results
        await this.updateTransactionDetection(group.transactions, result);
      }
    }

    return detectionResults;
  }

  /**
   * Analyze a single transaction to see if it's part of a subscription
   */
  async detectSingleTransaction(
    transactionId: string
  ): Promise<DetectionResult | null> {
    const transaction = await this.db.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction?.merchantName) {
      return null;
    }

    // Find similar transactions from the same merchant
    const similarTransactions = await this.db.transaction.findMany({
      where: {
        userId: transaction.userId,
        merchantName: transaction.merchantName,
        id: { not: transactionId },
        pending: false,
      },
      orderBy: { date: 'desc' },
      take: 12, // Look at up to 12 transactions
    });

    if (similarTransactions.length < this.MIN_TRANSACTIONS - 1) {
      return null;
    }

    const group: TransactionGroup = {
      merchantName: transaction.merchantName,
      transactions: [transaction, ...similarTransactions],
    };

    return this.analyzeTransactionGroup(group);
  }

  /**
   * Group transactions by merchant name
   */
  private groupByMerchant(transactions: Transaction[]): TransactionGroup[] {
    const groups = new Map<string, Transaction[]>();

    for (const transaction of transactions) {
      const merchantName = this.normalizeMerchantName(
        transaction.merchantName ?? transaction.description
      );

      if (!groups.has(merchantName)) {
        groups.set(merchantName, []);
      }

      groups.get(merchantName)!.push(transaction);
    }

    return Array.from(groups.entries())
      .map(([merchantName, transactions]) => ({ merchantName, transactions }))
      .filter(group => group.transactions.length >= this.MIN_TRANSACTIONS);
  }

  /**
   * Normalize merchant names to handle variations
   */
  private normalizeMerchantName(name: string): string {
    // Keep the original name if it's too short after normalization
    const normalized = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[*#]+\d+$/, '') // Remove trailing transaction IDs like *1234 or #5678
      .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b\.?$/i, '') // Remove company suffixes
      .trim();

    // If normalization made the name too short, use the original
    return normalized.length < 3 ? name.trim() : normalized;
  }

  /**
   * Analyze a group of transactions from the same merchant
   */
  private analyzeTransactionGroup(
    group: TransactionGroup
  ): DetectionResult | null {
    const { transactions } = group;

    if (transactions.length < this.MIN_TRANSACTIONS) {
      return null;
    }

    // Sort by date
    const sortedTransactions = [...transactions].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // Calculate intervals between transactions
    const intervals: number[] = [];
    for (let i = 1; i < sortedTransactions.length; i++) {
      const daysBetween = this.daysBetween(
        sortedTransactions[i - 1]!.date,
        sortedTransactions[i]!.date
      );
      intervals.push(daysBetween);
    }

    // Determine frequency pattern
    const frequencyResult = this.detectFrequency(intervals);

    if (!frequencyResult) {
      return null;
    }

    // Calculate amount consistency
    const amounts = transactions.map(t => this.decimalToNumber(t.amount));
    const amountConsistency = this.calculateAmountConsistency(amounts);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(
      frequencyResult.confidence,
      amountConsistency,
      transactions.length
    );

    // Predict next billing date
    const latestTransaction =
      sortedTransactions[sortedTransactions.length - 1]!;
    const nextBillingDate = this.predictNextBilling(
      latestTransaction.date,
      frequencyResult.frequency
    );

    return {
      isSubscription: confidence >= this.MIN_CONFIDENCE,
      confidence,
      frequency: frequencyResult.frequency,
      merchantName: group.merchantName,
      averageAmount: amounts.reduce((a, b) => a + b, 0) / amounts.length,
      nextBillingDate,
    };
  }

  /**
   * Detect frequency pattern from intervals
   */
  private detectFrequency(
    intervals: number[]
  ): { frequency: DetectionResult['frequency']; confidence: number } | null {
    if (intervals.length === 0) return null;

    // Try each frequency pattern
    for (const [frequency, window] of Object.entries(this.FREQUENCY_WINDOWS)) {
      const matches = intervals.filter(
        interval => interval >= window.min && interval <= window.max
      );

      const matchRatio = matches.length / intervals.length;

      if (matchRatio >= 0.6) {
        // 60% of intervals match the pattern
        const avgInterval = matches.reduce((a, b) => a + b, 0) / matches.length;
        const variance =
          matches.reduce(
            (acc, interval) => acc + Math.pow(interval - avgInterval, 2),
            0
          ) / matches.length;

        // Lower variance means more consistent intervals
        const consistency = 1 - Math.sqrt(variance) / avgInterval;

        return {
          frequency: frequency as DetectionResult['frequency'],
          confidence: matchRatio * consistency,
        };
      }
    }

    return null;
  }

  /**
   * Calculate how consistent the amounts are
   */
  private calculateAmountConsistency(amounts: number[]): number {
    if (amounts.length === 0) return 0;
    if (amounts.length === 1) return 1; // Single amount is perfectly consistent

    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    // Allow up to 5% variation in amounts (common for currency conversion, taxes, etc.)
    const tolerance = avg * 0.05;
    const withinTolerance = amounts.filter(
      amount => Math.abs(amount - avg) <= tolerance
    ).length;

    // If most amounts are within tolerance, consider it highly consistent
    const toleranceRatio = withinTolerance / amounts.length;
    if (toleranceRatio >= 0.8) {
      return 0.95; // Very high consistency
    }

    // Otherwise, calculate coefficient of variation
    const variance =
      amounts.reduce((acc, amount) => acc + Math.pow(amount - avg, 2), 0) /
      amounts.length;
    const cv = Math.sqrt(variance) / avg;

    // More lenient scoring: CV of 0.1 (10% variation) still gets 0.8 score
    return Math.max(0, 1 - cv * 2);
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(
    frequencyConfidence: number,
    amountConsistency: number,
    transactionCount: number
  ): number {
    // Weight factors
    const FREQUENCY_WEIGHT = 0.5;
    const AMOUNT_WEIGHT = 0.3;
    const COUNT_WEIGHT = 0.2;

    // Transaction count score (more transactions = higher confidence)
    const countScore = Math.min(transactionCount / 12, 1); // Max out at 12 transactions

    return (
      frequencyConfidence * FREQUENCY_WEIGHT +
      amountConsistency * AMOUNT_WEIGHT +
      countScore * COUNT_WEIGHT
    );
  }

  /**
   * Predict next billing date based on frequency
   */
  private predictNextBilling(
    lastDate: Date,
    frequency?: DetectionResult['frequency']
  ): Date | undefined {
    if (!frequency) return undefined;

    const next = new Date(lastDate);

    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }

  /**
   * Update transaction records with detection results
   */
  private async updateTransactionDetection(
    transactions: Transaction[],
    result: DetectionResult
  ): Promise<void> {
    const transactionIds = transactions.map(t => t.id);

    await this.db.transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: {
        isSubscription: result.isSubscription,
        confidence: result.confidence,
      },
    });
  }

  /**
   * Calculate days between two dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.round((date2.getTime() - date1.getTime()) / MS_PER_DAY);
  }

  /**
   * Convert Prisma Decimal to number
   */
  private decimalToNumber(decimal: Decimal): number {
    return parseFloat(decimal.toString());
  }

  /**
   * Create or update subscription records based on detection results
   */
  async createSubscriptionsFromDetection(
    userId: string,
    results: DetectionResult[]
  ): Promise<void> {
    console.log(
      `Creating subscriptions for user ${userId} from ${results.length} detection results`
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const result of results) {
      if (!result.isSubscription || !result.frequency) {
        skipped++;
        continue;
      }

      try {
        // Check if subscription already exists
        const existing = await this.db.subscription.findFirst({
          where: {
            userId,
            name: result.merchantName,
            // Don't filter by status - update inactive ones too
          },
        });

        if (!existing) {
          // Create new subscription
          await this.db.subscription.create({
            data: {
              userId,
              name: result.merchantName,
              description: `Recurring payment to ${result.merchantName}`,
              category: 'general', // Could be enhanced with category detection
              amount: result.averageAmount,
              currency: 'USD',
              frequency: result.frequency,
              nextBilling: result.nextBillingDate,
              status: 'active',
              isActive: true, // Explicitly set to ensure dashboard queries work
              provider: {
                name: result.merchantName,
                detected: true,
              },
              detectionConfidence: result.confidence,
            },
          });
          created++;
          console.log(
            `Created subscription: ${result.merchantName} (${result.frequency}, confidence: ${result.confidence})`
          );
        } else {
          // Update existing subscription - reactivate if needed
          await this.db.subscription.update({
            where: { id: existing.id },
            data: {
              amount: result.averageAmount,
              nextBilling: result.nextBillingDate,
              detectionConfidence: result.confidence,
              status: 'active', // Reactivate if it was cancelled
              isActive: true, // Ensure it's active for dashboard
            },
          });
          updated++;
          console.log(
            `Updated subscription: ${result.merchantName} (${result.frequency})`
          );
        }
      } catch (error) {
        errors++;
        console.error(
          `Failed to create/update subscription for ${result.merchantName}:`,
          error
        );
      }
    }

    console.log(
      `Subscription processing complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors`
    );
  }
}
