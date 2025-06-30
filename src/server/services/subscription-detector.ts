import {
  type Transaction,
  type PrismaClient,
  type Subscription,
} from '@prisma/client';
import { type Decimal } from '@prisma/client/runtime/library';
import { getCategoryDisplayName } from '@/lib/category-utils';

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
   * Normalize merchant name for consistent comparison
   */
  private normalizeMerchantName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\b(inc|corp|llc|ltd|company|co)\b/g, '') // Remove corporate suffixes
      .trim();
  }

  /**
   * Find existing subscription with smart matching
   */
  private async findExistingSubscription(
    userId: string,
    merchantName: string
  ): Promise<any> {
    const normalizedName = this.normalizeMerchantName(merchantName);
    
    // First try exact match
    let existing = await this.db.subscription.findFirst({
      where: {
        userId,
        name: merchantName,
      },
    });

    if (existing) return existing;

    // Try case-insensitive match
    existing = await this.db.subscription.findFirst({
      where: {
        userId,
        name: {
          mode: 'insensitive',
          equals: merchantName,
        },
      },
    });

    if (existing) return existing;

    // Try normalized name match - check for similar merchants
    const possibleMatches = await this.db.subscription.findMany({
      where: {
        userId,
        OR: [
          {
            name: {
              mode: 'insensitive',
              contains: normalizedName.split(' ')[0], // Match first word
            },
          },
          {
            name: {
              mode: 'insensitive',
              contains: merchantName.split(' ')[0],
            },
          },
        ],
      },
    });

    // Find the best match by comparing normalized names
    for (const match of possibleMatches) {
      const matchNormalized = this.normalizeMerchantName(match.name);
      if (matchNormalized === normalizedName) {
        return match;
      }
    }

    return null;
  }

  /**
   * Clean up duplicate subscriptions for a user
   * This consolidates subscriptions that are essentially the same but have different names
   */
  async cleanupDuplicateSubscriptions(userId: string): Promise<number> {
    console.log(`Cleaning up duplicate subscriptions for user ${userId}`);
    
    const subscriptions = await this.db.subscription.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' }, // Keep oldest entries
    });

    const groups = new Map<string, any[]>();
    let duplicatesRemoved = 0;

    // Group subscriptions by normalized name
    for (const subscription of subscriptions) {
      const normalizedName = this.normalizeMerchantName(subscription.name);
      if (!groups.has(normalizedName)) {
        groups.set(normalizedName, []);
      }
      groups.get(normalizedName)!.push(subscription);
    }

    // Process groups with duplicates
    for (const [normalizedName, group] of groups) {
      if (group.length > 1) {
        console.log(`Found ${group.length} duplicates for "${normalizedName}"`);
        
        // Keep the best subscription (prioritize AI-categorized and newer data)
        const keeper = group.reduce((best, current) => {
          // Prefer AI-categorized over non-categorized
          if (current.aiCategory && !best.aiCategory) return current;
          if (best.aiCategory && !current.aiCategory) return best;
          
          // Prefer higher detection confidence
          if (current.detectionConfidence > best.detectionConfidence) return current;
          if (best.detectionConfidence > current.detectionConfidence) return best;
          
          // Prefer newer data
          if (current.updatedAt > best.updatedAt) return current;
          return best;
        });

        // Remove the duplicates
        for (const subscription of group) {
          if (subscription.id !== keeper.id) {
            await this.db.subscription.delete({
              where: { id: subscription.id },
            });
            duplicatesRemoved++;
            console.log(`Removed duplicate subscription: ${subscription.name} (ID: ${subscription.id})`);
          }
        }
      }
    }

    console.log(`Cleanup complete: removed ${duplicatesRemoved} duplicate subscriptions`);
    return duplicatesRemoved;
  }

  /**
   * Analyze all transactions for a user and detect subscriptions
   */
  async detectUserSubscriptions(userId: string): Promise<DetectionResult[]> {
    // Get all transactions for the user from the past year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // First, use aggregation to find potential subscription merchants
    const merchantAggregates = await this.db.transaction.groupBy({
      by: ['merchantName'],
      where: {
        userId,
        date: { gte: oneYearAgo },
        pending: false,
        amount: { gt: 0 }, // Only consider charges, not refunds
        merchantName: { not: null },
      },
      _count: {
        id: true,
      },
      _avg: {
        amount: true,
      },
      _min: {
        date: true,
      },
      _max: {
        date: true,
      },
      having: {
        id: {
          _count: {
            gte: this.MIN_TRANSACTIONS,
          },
        },
      },
    });

    // Filter merchants that have potential subscription patterns
    const potentialMerchants = merchantAggregates.filter(agg => {
      if (!agg._min.date || !agg._max.date || !agg._avg.amount) return false;

      // Quick check: if transactions span at least 30 days, it might be recurring
      const daySpan = this.daysBetween(agg._min.date, agg._max.date);
      return daySpan >= 30;
    });

    // Now fetch detailed transactions only for potential subscription merchants
    const detectionResults: DetectionResult[] = [];

    for (const merchant of potentialMerchants) {
      if (!merchant.merchantName) continue;

      // Fetch transactions for this specific merchant
      const transactions = await this.db.transaction.findMany({
        where: {
          userId,
          merchantName: merchant.merchantName,
          date: { gte: oneYearAgo },
          pending: false,
          amount: { gt: 0 },
        },
        orderBy: { date: 'asc' },
        select: {
          id: true,
          date: true,
          amount: true,
          merchantName: true,
          description: true,
        },
      });

      const group: TransactionGroup = {
        merchantName: merchant.merchantName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transactions: transactions as any,
      };

      const result = this.analyzeTransactionGroup(group);
      if (result && result.confidence >= this.MIN_CONFIDENCE) {
        detectionResults.push(result);

        // Update transaction records with detection results
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.updateTransactionDetection(transactions as any, result);
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
  protected groupByMerchant(transactions: Transaction[]): TransactionGroup[] {
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
  protected analyzeTransactionGroup(
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
   * Group transactions by merchant (exposed for testing)
   */
  public testGroupByMerchant(transactions: Transaction[]): TransactionGroup[] {
    return this.groupByMerchant(transactions);
  }

  /**
   * Detect frequency pattern from intervals
   */
  public detectFrequency(
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
  protected calculateAmountConsistency(amounts: number[]): number {
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
  protected calculateConfidence(
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
  public async updateTransactionDetection(
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
  ): Promise<Subscription[]> {
    console.log(
      `Creating subscriptions for user ${userId} from ${results.length} detection results`
    );

    const createdSubscriptions: Subscription[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Import categorization service if available
    let categorizationService: any;
    try {
      const { getCategorizationService } = await import(
        './categorization.service'
      );
      categorizationService = getCategorizationService(this.db);
    } catch (error) {
      console.log(
        'Categorization service not available, using default categories'
      );
    }

    for (const result of results) {
      if (!result.isSubscription || !result.frequency) {
        skipped++;
        continue;
      }

      try {
        // Check if subscription already exists using smart matching
        const existing = await this.findExistingSubscription(
          userId,
          result.merchantName
        );

        if (!existing) {
          // Create new subscription
          const newSubscription = await this.db.subscription.create({
            data: {
              userId,
              name: result.merchantName,
              description: `Recurring payment to ${result.merchantName}`,
              category: getCategoryDisplayName('other'), // Default category with proper capitalization
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
          createdSubscriptions.push(newSubscription);
          created++;
          console.log(
            `Created subscription: ${result.merchantName} (${result.frequency}, confidence: ${result.confidence})`
          );

          // Categorize the new subscription using AI
          if (categorizationService) {
            try {
              await categorizationService.categorizeSubscription(
                newSubscription.id,
                userId,
                false
              );
              console.log(
                `AI categorized subscription: ${result.merchantName}`
              );
            } catch (error) {
              console.error(
                `Failed to categorize subscription ${result.merchantName}:`,
                error
              );
            }
          }
        } else {
          // Update existing subscription - reactivate if needed
          const updatedSubscription = await this.db.subscription.update({
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

          // Re-categorize if it doesn't have a category
          if (
            categorizationService &&
            !existing.aiCategory &&
            !existing.categoryOverride
          ) {
            try {
              await categorizationService.categorizeSubscription(
                existing.id,
                userId,
                false
              );
              console.log(
                `AI categorized updated subscription: ${result.merchantName}`
              );
            } catch (error) {
              console.error(
                `Failed to categorize subscription ${result.merchantName}:`,
                error
              );
            }
          }
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

    // Clean up any duplicates that may have been created
    if (created > 0 || updated > 0) {
      try {
        const duplicatesRemoved = await this.cleanupDuplicateSubscriptions(userId);
        if (duplicatesRemoved > 0) {
          console.log(`Removed ${duplicatesRemoved} duplicate subscriptions during cleanup`);
        }
      } catch (error) {
        console.error('Failed to cleanup duplicate subscriptions:', error);
        // Don't fail the whole process if cleanup fails
      }
    }

    return createdSubscriptions;
  }
}
