import { type PrismaClient } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { addDays, startOfDay, endOfDay } from 'date-fns';

export interface AnalyticsJobConfig {
  userId?: string;
  generateDailyReports?: boolean;
  detectAnomalies?: boolean;
  updatePredictions?: boolean;
  cacheWarming?: boolean;
}

export class AnalyticsJob {
  private analyticsService: AnalyticsService;
  private isRunning = false;

  constructor(private prisma: PrismaClient) {
    this.analyticsService = new AnalyticsService(prisma);
  }

  /**
   * Run analytics jobs based on configuration
   */
  async run(config: AnalyticsJobConfig = {}): Promise<void> {
    if (this.isRunning) {
      console.log('Analytics job already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('Starting analytics job...', new Date().toISOString());

    try {
      // Get users to process
      const users = config.userId
        ? [{ id: config.userId }]
        : await this.prisma.user.findMany({
            where: {
              subscriptions: {
                some: { isActive: true },
              },
            },
            select: { id: true },
          });

      console.log(`Processing analytics for ${users.length} users`);

      // Process each user
      for (const user of users) {
        try {
          await this.processUserAnalytics(user.id, config);
        } catch (error) {
          console.error(
            `Error processing analytics for user ${user.id}:`,
            error
          );
        }
      }

      console.log('Analytics job completed', new Date().toISOString());
    } catch (error) {
      console.error('Analytics job failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process analytics for a single user
   */
  private async processUserAnalytics(
    userId: string,
    config: AnalyticsJobConfig
  ): Promise<void> {
    console.log(`Processing analytics for user: ${userId}`);

    // Warm up caches
    if (config.cacheWarming !== false) {
      await this.warmUserCaches(userId);
    }

    // Detect anomalies
    if (config.detectAnomalies !== false) {
      await this.detectAndNotifyAnomalies(userId);
    }

    // Update predictions
    if (config.updatePredictions !== false) {
      await this.updateUserPredictions(userId);
    }

    // Generate daily report if configured
    if (config.generateDailyReports) {
      await this.generateDailyReport(userId);
    }
  }

  /**
   * Warm up analytics caches for better performance
   */
  private async warmUserCaches(userId: string): Promise<void> {
    console.log(`Warming caches for user: ${userId}`);

    try {
      // Pre-calculate common time ranges
      const now = new Date();
      const ranges = [
        { start: addDays(now, -7), end: now, groupBy: 'day' as const },
        { start: addDays(now, -30), end: now, groupBy: 'week' as const },
        { start: addDays(now, -90), end: now, groupBy: 'month' as const },
      ];

      for (const range of ranges) {
        await this.analyticsService.generateTimeSeriesData(
          userId,
          range.start,
          range.end,
          range.groupBy
        );
      }

      // Pre-calculate category spending
      await this.analyticsService.analyzeCategorySpending(userId, 'month');

      // Pre-calculate predictions
      await this.analyticsService.predictFutureSpending(userId, 1);
      await this.analyticsService.predictFutureSpending(userId, 3);
    } catch (error) {
      console.error(`Cache warming failed for user ${userId}:`, error);
    }
  }

  /**
   * Detect anomalies and create notifications
   */
  private async detectAndNotifyAnomalies(userId: string): Promise<void> {
    console.log(`Detecting anomalies for user: ${userId}`);

    try {
      const anomalies = await this.analyticsService.detectAnomalies(userId);

      if (anomalies.length === 0) {
        return;
      }

      // Check if we've already notified about these anomalies today
      const today = startOfDay(new Date());
      const existingNotifications = await this.prisma.notification.findMany({
        where: {
          userId,
          type: 'anomaly_detected',
          createdAt: { gte: today },
        },
      });

      // Create notifications for new anomalies
      for (const anomaly of anomalies) {
        const notificationData = JSON.stringify({
          type: anomaly.type,
          severity: anomaly.severity,
          subscription: anomaly.subscription,
        });

        // Skip if already notified
        if (existingNotifications.some(n => n.data === notificationData)) {
          continue;
        }

        await this.prisma.notification.create({
          data: {
            userId,
            type: 'anomaly_detected',
            title: `${anomaly.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Detected`,
            message: anomaly.description,
            severity:
              anomaly.severity === 'high'
                ? 'error'
                : anomaly.severity === 'medium'
                  ? 'warning'
                  : 'info',
            data: notificationData,
            scheduledFor: new Date(),
          },
        });

        console.log(
          `Created anomaly notification for user ${userId}: ${anomaly.type}`
        );
      }
    } catch (error) {
      console.error(`Anomaly detection failed for user ${userId}:`, error);
    }
  }

  /**
   * Update spending predictions
   */
  private async updateUserPredictions(userId: string): Promise<void> {
    console.log(`Updating predictions for user: ${userId}`);

    try {
      const predictions = await this.analyticsService.predictFutureSpending(
        userId,
        1
      );

      // Store predictions for quick access (you might want to add a predictions table)
      // For now, we'll just log them
      console.log(
        `User ${userId} predicted spending: $${predictions.predictedValue.toFixed(2)} (${predictions.confidence * 100}% confidence)`
      );

      // Create notification if spending is predicted to increase significantly
      if (predictions.trend === 'increasing' && predictions.confidence > 0.7) {
        const increase =
          predictions.predictedValue -
          (await this.getCurrentMonthlySpending(userId));

        if (increase > 50) {
          // More than $50 increase
          await this.prisma.notification.create({
            data: {
              userId,
              type: 'spending_alert',
              title: 'Spending Increase Predicted',
              message: `Your subscription spending is predicted to increase by $${increase.toFixed(2)} next month.`,
              severity: 'warning',
              scheduledFor: new Date(),
            },
          });
        }
      }
    } catch (error) {
      console.error(`Prediction update failed for user ${userId}:`, error);
    }
  }

  /**
   * Generate daily analytics report
   */
  private async generateDailyReport(userId: string): Promise<void> {
    console.log(`Generating daily report for user: ${userId}`);

    try {
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(addDays(endDate, -30));

      const report = await this.analyticsService.generateReport(
        userId,
        startDate,
        endDate
      );

      // Store report or send via email
      // For now, we'll create a notification
      if (report.optimizations.length > 0) {
        const totalSavings = report.optimizations.reduce(
          (sum, opt) => sum + opt.potentialSavings,
          0
        );

        await this.prisma.notification.create({
          data: {
            userId,
            type: 'report_ready',
            title: 'Your Monthly Analytics Report is Ready',
            message: `We found ${report.optimizations.length} ways to save $${totalSavings.toFixed(2)}/month on your subscriptions.`,
            severity: 'info',
            data: JSON.stringify({ reportId: `report-${Date.now()}` }),
            scheduledFor: new Date(),
          },
        });
      }
    } catch (error) {
      console.error(
        `Daily report generation failed for user ${userId}:`,
        error
      );
    }
  }

  /**
   * Get current monthly spending for a user
   */
  private async getCurrentMonthlySpending(userId: string): Promise<number> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    return subscriptions.reduce((total, sub) => {
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

      return total + monthlyAmount;
    }, 0);
  }

  /**
   * Schedule the job to run periodically
   */
  static schedule(prisma: PrismaClient, intervalMs = 3600000): NodeJS.Timer {
    const job = new AnalyticsJob(prisma);

    // Run immediately
    job.run().catch(console.error);

    // Then run periodically
    return setInterval(() => {
      job.run().catch(console.error);
    }, intervalMs);
  }
}
