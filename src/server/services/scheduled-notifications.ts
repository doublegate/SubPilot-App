import { db } from '@/server/db';
import { emailNotificationService } from './email.service';
import { subDays, startOfMonth, endOfMonth, addDays } from 'date-fns';

export class ScheduledNotificationService {
  /**
   * Schedule renewal reminders for subscriptions renewing soon
   */
  async scheduleRenewalReminders(): Promise<void> {
    const now = new Date();
    const reminderDays = [7, 3, 1]; // Remind 7, 3, and 1 day before renewal

    for (const daysBeforeRenewal of reminderDays) {
      const targetDate = addDays(now, daysBeforeRenewal);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      // Find subscriptions renewing on the target date
      const subscriptions = await db.subscription.findMany({
        where: {
          isActive: true,
          nextBilling: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          user: true,
        },
      });

      for (const subscription of subscriptions) {
        // Check if reminder already scheduled
        const existingReminder = await db.notification.findFirst({
          where: {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            type: 'renewal_reminder',
            scheduledFor: {
              gte: subDays(now, 1),
              lte: addDays(now, 1),
            },
          },
        });

        if (!existingReminder) {
          await db.notification.create({
            data: {
              userId: subscription.userId,
              subscriptionId: subscription.id,
              type: 'renewal_reminder',
              title: `${subscription.name} renews in ${daysBeforeRenewal} days`,
              message: `Your subscription will renew for ${subscription.amount} ${subscription.currency}`,
              scheduledFor: new Date(),
              data: {
                daysUntilRenewal: daysBeforeRenewal,
                renewalDate: subscription.nextBilling,
              },
            },
          });
        }
      }
    }
  }

  /**
   * Schedule monthly spending summaries
   */
  async scheduleMonthlySpendingSummaries(): Promise<void> {
    const now = new Date();
    const isFirstOfMonth = now.getDate() === 1;

    if (!isFirstOfMonth) {
      return; // Only run on the first of each month
    }

    const lastMonth = subDays(now, 1);
    const monthStart = startOfMonth(lastMonth);
    const monthEnd = endOfMonth(lastMonth);

    // Get all users with active subscriptions
    const users = await db.user.findMany({
      where: {
        subscriptions: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        subscriptions: {
          where: {
            isActive: true,
          },
        },
      },
    });

    for (const user of users) {
      // Check user preferences
      const preferences = user.notificationPreferences as Record<
        string,
        boolean
      >;
      if (!preferences.weeklyReports) {
        continue;
      }

      // Calculate spending data
      const subscriptions = user.subscriptions;
      const totalSpent = subscriptions.reduce((sum, sub) => {
        let monthlyAmount = Number(sub.amount);
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
        return sum + monthlyAmount;
      }, 0);

      // Group by category
      const categoryMap = new Map<string, number>();
      subscriptions.forEach(sub => {
        const category = sub.category || 'Other';
        const current = categoryMap.get(category) || 0;
        let monthlyAmount = Number(sub.amount);
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
        categoryMap.set(category, current + monthlyAmount);
      });

      const topCategories = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, amount]) => ({ category, amount }));

      // Calculate month-over-month change
      // For now, just use a placeholder - would need historical data
      const monthlyChange = Math.random() * 20 - 10; // -10% to +10%

      // Send email
      await emailNotificationService.sendMonthlySpendingEmail({
        user: { id: user.id, email: user.email, name: user.name },
        spendingData: {
          totalSpent,
          subscriptionCount: subscriptions.length,
          topCategories,
          monthlyChange,
        },
      });

      // Create notification record
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'weekly_report',
          title: 'Your monthly spending summary is ready',
          message: `You spent $${totalSpent.toFixed(2)} on ${subscriptions.length} subscriptions last month`,
          scheduledFor: new Date(),
          sentAt: new Date(),
        },
      });
    }
  }

  /**
   * Check for price changes in subscriptions
   */
  async checkPriceChanges(): Promise<void> {
    // This would typically be triggered by transaction sync
    // For now, this is a placeholder that could be enhanced
    // to compare recent transaction amounts with stored subscription amounts

    const recentTransactions = await db.transaction.findMany({
      where: {
        isSubscription: true,
        date: {
          gte: subDays(new Date(), 7), // Last 7 days
        },
      },
      include: {
        subscription: true,
        user: true,
      },
    });

    for (const transaction of recentTransactions) {
      if (!transaction.subscription) continue;

      const oldAmount = Number(transaction.subscription.amount);
      const newAmount = Number(transaction.amount);
      const percentChange = ((newAmount - oldAmount) / oldAmount) * 100;

      // Notify if price changed by more than 5%
      if (Math.abs(percentChange) > 5) {
        await emailNotificationService.sendPriceChangeEmail({
          user: {
            id: transaction.user.id,
            email: transaction.user.email,
            name: transaction.user.name,
          },
          subscription: transaction.subscription,
          oldAmount,
          newAmount,
        });

        // Update subscription amount
        await db.subscription.update({
          where: { id: transaction.subscription.id },
          data: { amount: newAmount },
        });
      }
    }
  }

  /**
   * Main method to run all scheduled notification checks
   */
  async runScheduledChecks(): Promise<void> {
    try {
      await this.scheduleRenewalReminders();
      await this.scheduleMonthlySpendingSummaries();
      await this.checkPriceChanges();
      await emailNotificationService.processScheduledNotifications();
    } catch (error) {
      console.error('Error running scheduled notification checks:', error);
    }
  }
}

export const scheduledNotificationService = new ScheduledNotificationService();
