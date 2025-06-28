import {
  type User,
  type Subscription,
  type Transaction,
  type Prisma,
} from '@prisma/client';
import { sendEmail } from '@/lib/email';
import { db } from '@/server/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  welcomeEmailTemplate,
  newSubscriptionTemplate,
  priceChangeTemplate,
  monthlySpendingTemplate,
  cancellationConfirmationTemplate,
  renewalReminderTemplate,
  trialEndingTemplate,
  paymentFailedTemplate,
} from '@/server/email-templates';

export interface EmailNotificationData {
  user: Pick<User, 'id' | 'email'> & { name: string | null };
  subscription?: Subscription;
  oldAmount?: number;
  newAmount?: number;
  transactions?: Transaction[];
  spendingData?: {
    totalSpent: number;
    subscriptionCount: number;
    topCategories: Array<{ category: string; amount: number }>;
    monthlyChange: number;
  };
  renewalDate?: Date;
  trialEndDate?: Date;
  errorMessage?: string;
}

export class EmailNotificationService {
  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(data: EmailNotificationData): Promise<void> {
    const { html, text } = welcomeEmailTemplate({
      userName: data.user.name ?? 'there',
    });

    await sendEmail({
      to: data.user.email,
      subject: 'Welcome to SubPilot! 🎉',
      html,
      text,
    });

    // Track email sent in notifications
    await this.createNotificationRecord({
      userId: data.user.id,
      type: 'general',
      title: 'Welcome email sent',
      message: 'Your welcome email has been sent successfully.',
    });
  }

  /**
   * Send notification for newly detected subscription
   */
  async sendNewSubscriptionEmail(data: EmailNotificationData): Promise<void> {
    if (!data.subscription) {
      throw new Error('Subscription data is required');
    }

    const { html, text } = newSubscriptionTemplate({
      userName: data.user.name ?? 'there',
      subscription: {
        name: data.subscription.name,
        amount: formatCurrency(Number(data.subscription.amount)),
        frequency: data.subscription.frequency,
        category: data.subscription.category ?? 'Uncategorized',
      },
    });

    await sendEmail({
      to: data.user.email,
      subject: `New subscription detected: ${data.subscription.name}`,
      html,
      text,
    });

    await this.createNotificationRecord({
      userId: data.user.id,
      subscriptionId: data.subscription.id,
      type: 'new_subscription',
      title: 'New subscription detected',
      message: `We detected a new subscription for ${data.subscription.name}`,
    });
  }

  /**
   * Send price change alert
   */
  async sendPriceChangeEmail(data: EmailNotificationData): Promise<void> {
    if (
      !data.subscription ||
      data.oldAmount === undefined ||
      data.newAmount === undefined
    ) {
      throw new Error('Subscription and price data are required');
    }

    const percentageChange =
      ((data.newAmount - data.oldAmount) / data.oldAmount) * 100;
    const isIncrease = data.newAmount > data.oldAmount;

    const { html, text } = priceChangeTemplate({
      userName: data.user.name ?? 'there',
      subscription: {
        name: data.subscription.name,
        oldAmount: formatCurrency(data.oldAmount),
        newAmount: formatCurrency(data.newAmount),
        percentageChange: Math.abs(percentageChange).toFixed(1),
        isIncrease,
      },
    });

    await sendEmail({
      to: data.user.email,
      subject: `Price ${isIncrease ? 'increase' : 'decrease'} alert: ${data.subscription.name}`,
      html,
      text,
    });

    await this.createNotificationRecord({
      userId: data.user.id,
      subscriptionId: data.subscription.id,
      type: 'price_change',
      title: `Price ${isIncrease ? 'increased' : 'decreased'} for ${data.subscription.name}`,
      message: `The price changed from ${formatCurrency(data.oldAmount)} to ${formatCurrency(data.newAmount)}`,
      data: {
        oldAmount: data.oldAmount,
        newAmount: data.newAmount,
        percentageChange,
      },
    });
  }

  /**
   * Send monthly spending summary
   */
  async sendMonthlySpendingEmail(data: EmailNotificationData): Promise<void> {
    if (!data.spendingData) {
      throw new Error('Spending data is required');
    }

    const { html, text } = monthlySpendingTemplate({
      userName: data.user.name ?? 'there',
      month: new Date().toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      }),
      totalSpent: formatCurrency(data.spendingData.totalSpent),
      subscriptionCount: data.spendingData.subscriptionCount,
      topCategories: data.spendingData.topCategories.map(cat => ({
        ...cat,
        amount: formatCurrency(cat.amount),
      })),
      monthlyChange: data.spendingData.monthlyChange,
      changeDirection:
        data.spendingData.monthlyChange > 0 ? 'increased' : 'decreased',
    });

    await sendEmail({
      to: data.user.email,
      subject: `Your ${new Date().toLocaleString('default', { month: 'long' })} spending summary`,
      html,
      text,
    });

    await this.createNotificationRecord({
      userId: data.user.id,
      type: 'weekly_report',
      title: 'Monthly spending summary',
      message: `You spent ${formatCurrency(data.spendingData.totalSpent)} on ${data.spendingData.subscriptionCount} subscriptions`,
      data: data.spendingData,
    });
  }

  /**
   * Send cancellation confirmation
   */
  async sendCancellationEmail(data: EmailNotificationData): Promise<void> {
    if (!data.subscription) {
      throw new Error('Subscription data is required');
    }

    const { html, text } = cancellationConfirmationTemplate({
      userName: data.user.name ?? 'there',
      subscription: {
        name: data.subscription.name,
        amount: formatCurrency(Number(data.subscription.amount)),
        endDate: formatDate(data.subscription.nextBilling ?? new Date()),
      },
    });

    await sendEmail({
      to: data.user.email,
      subject: `Subscription cancelled: ${data.subscription.name}`,
      html,
      text,
    });

    await this.createNotificationRecord({
      userId: data.user.id,
      subscriptionId: data.subscription.id,
      type: 'cancelled_service',
      title: 'Subscription cancelled',
      message: `Your ${data.subscription.name} subscription has been cancelled`,
    });
  }

  /**
   * Send renewal reminder
   */
  async sendRenewalReminderEmail(data: EmailNotificationData): Promise<void> {
    if (!data.subscription || !data.renewalDate) {
      throw new Error('Subscription and renewal date are required');
    }

    const daysUntilRenewal = Math.ceil(
      (data.renewalDate.getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const { html, text } = renewalReminderTemplate({
      userName: data.user.name ?? 'there',
      subscription: {
        name: data.subscription.name,
        amount: formatCurrency(Number(data.subscription.amount)),
        renewalDate: formatDate(data.renewalDate),
        daysUntilRenewal,
      },
    });

    await sendEmail({
      to: data.user.email,
      subject: `Renewal reminder: ${data.subscription.name} renews in ${daysUntilRenewal} days`,
      html,
      text,
    });

    await this.createNotificationRecord({
      userId: data.user.id,
      subscriptionId: data.subscription.id,
      type: 'renewal_reminder',
      title: 'Subscription renewal reminder',
      message: `${data.subscription.name} will renew in ${daysUntilRenewal} days`,
      scheduledFor: data.renewalDate,
    });
  }

  /**
   * Send trial ending notification
   */
  async sendTrialEndingEmail(data: EmailNotificationData): Promise<void> {
    if (!data.subscription || !data.trialEndDate) {
      throw new Error('Subscription and trial end date are required');
    }

    const daysUntilEnd = Math.ceil(
      (data.trialEndDate.getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const { html, text } = trialEndingTemplate({
      userName: data.user.name ?? 'there',
      subscription: {
        name: data.subscription.name,
        trialEndDate: formatDate(data.trialEndDate),
        daysUntilEnd,
        amount: formatCurrency(Number(data.subscription.amount)),
      },
    });

    await sendEmail({
      to: data.user.email,
      subject: `Trial ending soon: ${data.subscription.name}`,
      html,
      text,
    });

    await this.createNotificationRecord({
      userId: data.user.id,
      subscriptionId: data.subscription.id,
      type: 'trial_ending',
      title: 'Trial ending soon',
      message: `Your ${data.subscription.name} trial ends in ${daysUntilEnd} days`,
    });
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailedEmail(data: EmailNotificationData): Promise<void> {
    if (!data.subscription) {
      throw new Error('Subscription data is required');
    }

    const { html, text } = paymentFailedTemplate({
      userName: data.user.name ?? 'there',
      subscription: {
        name: data.subscription.name,
        amount: formatCurrency(Number(data.subscription.amount)),
        errorMessage: data.errorMessage ?? 'Payment processing failed',
      },
    });

    await sendEmail({
      to: data.user.email,
      subject: `Payment failed: ${data.subscription.name}`,
      html,
      text,
    });

    await this.createNotificationRecord({
      userId: data.user.id,
      subscriptionId: data.subscription.id,
      type: 'payment_failed',
      title: 'Payment failed',
      message: `Payment failed for ${data.subscription.name}`,
      data: { errorMessage: data.errorMessage },
    });
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<void> {
    const now = new Date();

    // Get all unprocessed notifications scheduled for now or earlier
    const notifications = await db.notification.findMany({
      where: {
        scheduledFor: { lte: now },
        sentAt: null,
      },
      include: {
        user: true,
        subscription: true,
      },
    });

    for (const notification of notifications) {
      try {
        // Check user's email preferences
        const preferences = notification.user.notificationPreferences as Record<
          string,
          boolean
        >;
        if (!preferences.emailAlerts) {
          continue;
        }

        // Process based on notification type
        switch (notification.type) {
          case 'renewal_reminder':
            if (
              notification.subscription &&
              preferences.renewalReminders !== false
            ) {
              await this.sendRenewalReminderEmail({
                user: notification.user,
                subscription: notification.subscription,
                renewalDate: notification.subscription.nextBilling ?? undefined,
              });
            }
            break;

          case 'price_change':
            if (
              notification.subscription &&
              preferences.priceChangeAlerts !== false
            ) {
              const data = notification.data as {
                oldAmount?: number;
                newAmount?: number;
              };
              await this.sendPriceChangeEmail({
                user: notification.user,
                subscription: notification.subscription,
                oldAmount: data.oldAmount,
                newAmount: data.newAmount,
              });
            }
            break;

          case 'trial_ending':
            if (notification.subscription) {
              const trialData = notification.data as { trialEndDate?: string };
              await this.sendTrialEndingEmail({
                user: notification.user,
                subscription: notification.subscription,
                trialEndDate: trialData.trialEndDate
                  ? new Date(trialData.trialEndDate)
                  : undefined,
              });
            }
            break;

          default:
            console.log(`Unhandled notification type: ${notification.type}`);
        }

        // Mark notification as sent
        await db.notification.update({
          where: { id: notification.id },
          data: { sentAt: now },
        });
      } catch (error) {
        console.error(`Failed to send notification ${notification.id}:`, error);
      }
    }
  }

  /**
   * Create notification record in database
   */
  private async createNotificationRecord(data: {
    userId: string;
    subscriptionId?: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    scheduledFor?: Date;
  }): Promise<void> {
    await db.notification.create({
      data: {
        userId: data.userId,
        subscriptionId: data.subscriptionId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: (data.data ?? {}) as Prisma.JsonObject,
        scheduledFor: data.scheduledFor ?? new Date(),
      },
    });
  }
}

// Export singleton instance
export const emailNotificationService = new EmailNotificationService();

// Export class for type checking and testing
export { EmailNotificationService as EmailService };
