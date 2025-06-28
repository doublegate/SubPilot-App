import { type PrismaClient } from '@prisma/client';
import { getCategorizationService } from './categorization.service';
import { cacheService } from './cache.service';

/**
 * Background job processor for categorization tasks
 */
export class CategorizationJobProcessor {
  private isProcessing = false;
  private batchSize = 50;
  private processInterval: NodeJS.Timeout | null = null;

  constructor(private db: PrismaClient) {}

  /**
   * Start the job processor
   */
  start(intervalMinutes = 5): void {
    if (this.processInterval) {
      return; // Already running
    }

    // Run immediately on start
    this.processUncategorizedTransactions().catch(console.error);

    // Then run periodically
    this.processInterval = setInterval(
      () => {
        this.processUncategorizedTransactions().catch(console.error);
      },
      intervalMinutes * 60 * 1000
    );

    console.log(
      `Categorization job processor started (every ${intervalMinutes} minutes)`
    );
  }

  /**
   * Stop the job processor
   */
  stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      console.log('Categorization job processor stopped');
    }
  }

  /**
   * Process uncategorized transactions for all users
   */
  async processUncategorizedTransactions(): Promise<void> {
    if (this.isProcessing) {
      console.log('Categorization job already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log('Starting categorization job...');

    try {
      // Get users with uncategorized transactions
      const usersWithUncategorized = await this.db.user.findMany({
        where: {
          transactions: {
            some: {
              OR: [{ aiCategory: null }, { normalizedMerchantName: null }],
            },
          },
        },
        select: {
          id: true,
          email: true,
          _count: {
            select: {
              transactions: {
                where: {
                  OR: [{ aiCategory: null }, { normalizedMerchantName: null }],
                },
              },
            },
          },
        },
        take: 10, // Process up to 10 users at a time
      });

      console.log(
        `Found ${usersWithUncategorized.length} users with uncategorized transactions`
      );

      const service = getCategorizationService(this.db);
      let totalCategorized = 0;
      let totalFailed = 0;

      // Process each user
      for (const user of usersWithUncategorized) {
        console.log(
          `Processing ${user._count.transactions} uncategorized transactions for user ${user.email}`
        );

        try {
          const result = await service.bulkCategorizeTransactions(
            user.id,
            undefined, // Process all uncategorized
            false // Don't force recategorization
          );

          totalCategorized += result.categorized;
          totalFailed += result.failed;

          console.log(
            `User ${user.email}: ${result.categorized} categorized, ${result.failed} failed`
          );

          // Clear user's caches
          cacheService.invalidate(`transactions:${user.id}:*`);
          cacheService.invalidate(`analytics:${user.id}:*`);
          cacheService.invalidate(`subscriptions:${user.id}:*`);
        } catch (error) {
          console.error(`Failed to process user ${user.email}:`, error);
        }

        // Add a small delay between users to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(
        `Categorization job completed: ${totalCategorized} categorized, ${totalFailed} failed`
      );

      // Also process uncategorized subscriptions
      await this.processUncategorizedSubscriptions();
    } catch (error) {
      console.error('Categorization job error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process uncategorized subscriptions
   */
  private async processUncategorizedSubscriptions(): Promise<void> {
    console.log('Processing uncategorized subscriptions...');

    try {
      // Get uncategorized subscriptions
      const uncategorizedSubs = await this.db.subscription.findMany({
        where: {
          aiCategory: null,
          categoryOverride: null,
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
          name: true,
        },
        take: this.batchSize,
      });

      console.log(
        `Found ${uncategorizedSubs.length} uncategorized subscriptions`
      );

      if (uncategorizedSubs.length === 0) {
        return;
      }

      const service = getCategorizationService(this.db);
      let categorized = 0;
      let failed = 0;

      // Group by user for rate limiting
      const subsByUser = uncategorizedSubs.reduce(
        (acc, sub) => {
          acc[sub.userId] ??= [];
          acc[sub.userId].push(sub);
          return acc;
        },
        {} as Record<string, typeof uncategorizedSubs>
      );

      for (const [userId, userSubs] of Object.entries(subsByUser)) {
        for (const sub of userSubs) {
          try {
            await service.categorizeSubscription(sub.id, userId, false);
            categorized++;
          } catch (error) {
            console.error(
              `Failed to categorize subscription ${sub.name}:`,
              error
            );
            failed++;
          }
        }

        // Clear user's caches
        cacheService.invalidate(`subscriptions:${userId}:*`);
        cacheService.invalidate(`analytics:${userId}:*`);

        // Add delay between users
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(
        `Subscription categorization: ${categorized} categorized, ${failed} failed`
      );
    } catch (error) {
      console.error('Subscription categorization error:', error);
    }
  }

  /**
   * Clean up old merchant aliases
   */
  async cleanupOldAliases(daysOld = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      const deleted = await this.db.merchantAlias.deleteMany({
        where: {
          lastUsedAt: { lt: cutoffDate },
          usageCount: { lt: 5 }, // Only delete rarely used aliases
          isVerified: false, // Don't delete verified aliases
        },
      });

      console.log(`Cleaned up ${deleted.count} old merchant aliases`);
    } catch (error) {
      console.error('Failed to clean up old aliases:', error);
    }
  }

  /**
   * Update category statistics
   */
  async updateCategoryStats(): Promise<void> {
    try {
      // Get all active categories
      const categories = await this.db.category.findMany({
        where: { isActive: true },
      });

      for (const category of categories) {
        // Count subscriptions in this category
        const count = await this.db.subscription.count({
          where: {
            isActive: true,
            OR: [
              { category: category.id },
              { aiCategory: category.id },
              { categoryOverride: category.id },
            ],
          },
        });

        // You could store this in a stats table or cache
        console.log(`Category ${category.name}: ${count} active subscriptions`);
      }
    } catch (error) {
      console.error('Failed to update category stats:', error);
    }
  }
}

// Export singleton instance
let jobProcessorInstance: CategorizationJobProcessor | null = null;

export function getCategorizationJobProcessor(
  db: PrismaClient
): CategorizationJobProcessor {
  jobProcessorInstance ??= new CategorizationJobProcessor(db);
  return jobProcessorInstance;
}
