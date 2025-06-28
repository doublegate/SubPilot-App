import { type PrismaClient, type Transaction, type Subscription, Prisma } from '@prisma/client';
import { openAIClient, type SubscriptionCategory, SUBSCRIPTION_CATEGORIES } from '@/server/lib/openai-client';
import { cacheService, cacheKeys, cacheTTL } from './cache.service';

/**
 * Service for categorizing subscriptions and transactions
 */
export class CategorizationService {
  constructor(private db: PrismaClient) {}

  /**
   * Categorize a single transaction using AI
   */
  async categorizeTransaction(
    transactionId: string,
    userId: string,
    forceRecategorize = false
  ): Promise<{
    category: string;
    confidence: number;
    normalizedName: string;
  }> {
    // Get transaction details
    const transaction = await this.db.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Check if already categorized and not forcing recategorization
    if (!forceRecategorize && transaction.aiCategory && transaction.normalizedMerchantName) {
      return {
        category: transaction.aiCategory,
        confidence: transaction.aiCategoryConfidence?.toNumber() ?? 0,
        normalizedName: transaction.normalizedMerchantName,
      };
    }

    // Check merchant alias cache first
    const merchantAlias = await this.getMerchantAlias(transaction.merchantName ?? transaction.description);
    
    if (merchantAlias && merchantAlias.category) {
      // Update transaction with cached alias
      await this.updateTransactionCategory(transactionId, {
        category: merchantAlias.category,
        confidence: merchantAlias.confidence.toNumber(),
        normalizedName: merchantAlias.normalizedName,
      });

      // Update usage count
      await this.db.merchantAlias.update({
        where: { id: merchantAlias.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      return {
        category: merchantAlias.category,
        confidence: merchantAlias.confidence.toNumber(),
        normalizedName: merchantAlias.normalizedName,
      };
    }

    // Use AI for categorization
    try {
      const result = await openAIClient.categorizeTransaction(
        transaction.merchantName ?? transaction.description,
        transaction.description,
        transaction.amount.toNumber(),
        userId
      );

      // Save merchant alias for future use
      await this.saveMerchantAlias(
        transaction.merchantName ?? transaction.description,
        result.merchantName,
        result.category,
        result.confidence
      );

      // Update transaction
      await this.updateTransactionCategory(transactionId, {
        category: result.category,
        confidence: result.confidence,
        normalizedName: result.merchantName,
      });

      return {
        category: result.category,
        confidence: result.confidence,
        normalizedName: result.merchantName,
      };
    } catch (error) {
      console.error('Failed to categorize transaction:', error);
      throw error;
    }
  }

  /**
   * Bulk categorize transactions
   */
  async bulkCategorizeTransactions(
    userId: string,
    transactionIds?: string[],
    forceRecategorize = false
  ): Promise<{
    categorized: number;
    failed: number;
    results: Array<{
      transactionId: string;
      category: string;
      confidence: number;
      normalizedName: string;
      error?: string;
    }>;
  }> {
    // Get transactions to categorize
    const whereClause: Prisma.TransactionWhereInput = {
      userId,
      ...(transactionIds && { id: { in: transactionIds } }),
      ...((!forceRecategorize && {
        OR: [
          { aiCategory: null },
          { normalizedMerchantName: null },
        ],
      }) || {}),
    };

    const transactions = await this.db.transaction.findMany({
      where: whereClause,
      take: 100, // Limit batch size
      select: {
        id: true,
        merchantName: true,
        description: true,
        amount: true,
        aiCategory: true,
        normalizedMerchantName: true,
      },
    });

    if (transactions.length === 0) {
      return {
        categorized: 0,
        failed: 0,
        results: [],
      };
    }

    // Group by merchant for efficient AI calls
    const merchantGroups = new Map<string, typeof transactions>();
    for (const transaction of transactions) {
      const merchantKey = (transaction.merchantName ?? transaction.description).toLowerCase();
      const group = merchantGroups.get(merchantKey) ?? [];
      group.push(transaction);
      merchantGroups.set(merchantKey, group);
    }

    // Process in batches
    const results: Array<{
      transactionId: string;
      category: string;
      confidence: number;
      normalizedName: string;
      error?: string;
    }> = [];

    let categorized = 0;
    let failed = 0;

    // Check aliases first
    for (const [merchantKey, transactionGroup] of merchantGroups) {
      const alias = await this.getMerchantAlias(merchantKey);
      
      if (alias?.category) {
        // Use cached alias
        for (const transaction of transactionGroup) {
          try {
            await this.updateTransactionCategory(transaction.id, {
              category: alias.category,
              confidence: alias.confidence.toNumber(),
              normalizedName: alias.normalizedName,
            });

            results.push({
              transactionId: transaction.id,
              category: alias.category,
              confidence: alias.confidence.toNumber(),
              normalizedName: alias.normalizedName,
            });
            categorized++;
          } catch (error) {
            failed++;
            results.push({
              transactionId: transaction.id,
              category: 'other',
              confidence: 0,
              normalizedName: merchantKey,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        // Update alias usage
        await this.db.merchantAlias.update({
          where: { id: alias.id },
          data: {
            usageCount: { increment: transactionGroup.length },
            lastUsedAt: new Date(),
          },
        });

        // Remove from map since we've processed it
        merchantGroups.delete(merchantKey);
      }
    }

    // Process remaining with AI
    if (merchantGroups.size > 0) {
      const merchantsToProcess = Array.from(merchantGroups.entries()).map(([key, group]) => ({
        name: group[0]!.merchantName ?? group[0]!.description,
        description: group[0]!.description,
        amount: group[0]!.amount.toNumber(),
      }));

      try {
        const aiResults = await openAIClient.bulkCategorize(merchantsToProcess, userId);

        // Process AI results
        for (const aiResult of aiResults.categorizations) {
          const merchantKey = aiResult.originalName.toLowerCase();
          const transactionGroup = merchantGroups.get(merchantKey);

          if (transactionGroup) {
            // Save merchant alias
            await this.saveMerchantAlias(
              aiResult.originalName,
              aiResult.normalizedName,
              aiResult.category,
              aiResult.confidence
            );

            // Update all transactions for this merchant
            for (const transaction of transactionGroup) {
              try {
                await this.updateTransactionCategory(transaction.id, {
                  category: aiResult.category,
                  confidence: aiResult.confidence,
                  normalizedName: aiResult.normalizedName,
                });

                results.push({
                  transactionId: transaction.id,
                  category: aiResult.category,
                  confidence: aiResult.confidence,
                  normalizedName: aiResult.normalizedName,
                });
                categorized++;
              } catch (error) {
                failed++;
                results.push({
                  transactionId: transaction.id,
                  category: 'other',
                  confidence: 0,
                  normalizedName: merchantKey,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Bulk AI categorization failed:', error);
        // Mark all remaining as failed
        for (const [merchantKey, transactionGroup] of merchantGroups) {
          for (const transaction of transactionGroup) {
            failed++;
            results.push({
              transactionId: transaction.id,
              category: 'other',
              confidence: 0,
              normalizedName: merchantKey,
              error: 'AI categorization failed',
            });
          }
        }
      }
    }

    return {
      categorized,
      failed,
      results,
    };
  }

  /**
   * Categorize a subscription
   */
  async categorizeSubscription(
    subscriptionId: string,
    userId: string,
    forceRecategorize = false
  ): Promise<{
    category: string;
    confidence: number;
  }> {
    const subscription = await this.db.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Check manual override first
    if (subscription.categoryOverride) {
      return {
        category: subscription.categoryOverride,
        confidence: 1.0,
      };
    }

    // Check if already categorized
    if (!forceRecategorize && subscription.aiCategory) {
      return {
        category: subscription.aiCategory,
        confidence: subscription.aiCategoryConfidence?.toNumber() ?? 0,
      };
    }

    // Use AI for categorization
    try {
      const result = await openAIClient.categorizeTransaction(
        subscription.name,
        subscription.description ?? undefined,
        subscription.amount.toNumber(),
        userId
      );

      // Update subscription
      await this.db.subscription.update({
        where: { id: subscriptionId },
        data: {
          aiCategory: result.category,
          aiCategoryConfidence: result.confidence,
          category: result.category, // Also update the main category field
        },
      });

      return {
        category: result.category,
        confidence: result.confidence,
      };
    } catch (error) {
      console.error('Failed to categorize subscription:', error);
      throw error;
    }
  }

  /**
   * Update category for a subscription (manual override)
   */
  async updateSubscriptionCategory(
    subscriptionId: string,
    userId: string,
    category: string
  ): Promise<void> {
    await this.db.subscription.update({
      where: {
        id: subscriptionId,
        userId,
      },
      data: {
        categoryOverride: category,
        category, // Update main category field
      },
    });

    // Clear cache
    cacheService.invalidate(`subscriptions:${userId}:*`);
  }

  /**
   * Get or create merchant alias
   */
  private async getMerchantAlias(merchantName: string): Promise<{
    id: string;
    normalizedName: string;
    category: string | null;
    confidence: Prisma.Decimal;
  } | null> {
    const cleanName = merchantName.trim().toLowerCase();
    
    return await this.db.merchantAlias.findUnique({
      where: { originalName: cleanName },
      select: {
        id: true,
        normalizedName: true,
        category: true,
        confidence: true,
      },
    });
  }

  /**
   * Save merchant alias
   */
  private async saveMerchantAlias(
    originalName: string,
    normalizedName: string,
    category: string,
    confidence: number
  ): Promise<void> {
    const cleanOriginal = originalName.trim().toLowerCase();

    try {
      await this.db.merchantAlias.upsert({
        where: { originalName: cleanOriginal },
        update: {
          normalizedName,
          category,
          confidence,
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
        },
        create: {
          originalName: cleanOriginal,
          normalizedName,
          category,
          confidence,
        },
      });
    } catch (error) {
      console.error('Failed to save merchant alias:', error);
    }
  }

  /**
   * Update transaction category
   */
  private async updateTransactionCategory(
    transactionId: string,
    data: {
      category: string;
      confidence: number;
      normalizedName: string;
    }
  ): Promise<void> {
    await this.db.transaction.update({
      where: { id: transactionId },
      data: {
        aiCategory: data.category,
        aiCategoryConfidence: data.confidence,
        normalizedMerchantName: data.normalizedName,
      },
    });
  }

  /**
   * Get merchant aliases
   */
  async getMerchantAliases(
    filters?: {
      category?: string;
      verified?: boolean;
      search?: string;
    },
    pagination?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    aliases: Array<{
      id: string;
      originalName: string;
      normalizedName: string;
      category: string | null;
      confidence: number;
      isVerified: boolean;
      usageCount: number;
      lastUsedAt: Date;
    }>;
    total: number;
  }> {
    const where: Prisma.MerchantAliasWhereInput = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.verified !== undefined) {
      where.isVerified = filters.verified;
    }

    if (filters?.search) {
      where.OR = [
        { originalName: { contains: filters.search, mode: 'insensitive' } },
        { normalizedName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [aliases, total] = await Promise.all([
      this.db.merchantAlias.findMany({
        where,
        orderBy: { usageCount: 'desc' },
        take: pagination?.limit ?? 50,
        skip: pagination?.offset ?? 0,
      }),
      this.db.merchantAlias.count({ where }),
    ]);

    return {
      aliases: aliases.map(alias => ({
        ...alias,
        confidence: alias.confidence.toNumber(),
      })),
      total,
    };
  }

  /**
   * Initialize default categories
   */
  async initializeCategories(): Promise<void> {
    const existingCategories = await this.db.category.count();
    
    if (existingCategories > 0) {
      return; // Already initialized
    }

    const categories = Object.entries(SUBSCRIPTION_CATEGORIES).map(([id, data], index) => ({
      id,
      name: data.name,
      description: data.description,
      icon: data.icon,
      keywords: data.keywords,
      sortOrder: index,
    }));

    await this.db.category.createMany({
      data: categories,
    });

    console.log(`Initialized ${categories.length} subscription categories`);
  }
}

// Export singleton instance
let categorizationServiceInstance: CategorizationService | null = null;

export function getCategorizationService(db: PrismaClient): CategorizationService {
  if (!categorizationServiceInstance) {
    categorizationServiceInstance = new CategorizationService(db);
  }
  return categorizationServiceInstance;
}