import type { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { EmailService } from '../email.service';
import { emitCancellationEvent } from '@/server/lib/event-bus';
import type { Job, JobResult } from '@/server/lib/job-queue';
import { AuditLogger } from '@/server/lib/audit-logger';
import type { User } from '@prisma/client';

// Notification data types
type NotificationData = {
  subscriptionId?: string;
  subscriptionName?: string;
  cancellationId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount?: number;
  webhookId?: string;
  workflowId?: string;
  progress?: number;
  metadata?: Record<string, unknown>;
};

// User notification preferences type
type NotificationPreferences = {
  email?: boolean;
  push?: boolean;
  in_app?: boolean;
  types?: Record<string, boolean>;
};

// Channel send result type
type ChannelSendResult = {
  channel: string;
  success: boolean;
  messageId?: string;
  error?: string;
};

// User with email context
type UserWithEmail = Pick<User, 'id' | 'email' | 'name'>;

// Notification content type
type NotificationContent = {
  title: string;
  message: string;
  htmlMessage?: string;
};

export interface NotificationJobData {
  userId: string;
  notificationType:
    | 'cancellation_success'
    | 'cancellation_manual'
    | 'cancellation_error'
    | 'cancellation_retry'
    | 'webhook_received'
    | 'status_update'
    | 'workflow_progress';
  title?: string;
  message?: string;
  data?: NotificationData;
  priority?: 'low' | 'normal' | 'high';
  channels?: ('email' | 'push' | 'in_app')[];
  scheduledFor?: Date;
  [key: string]: unknown;
}

/**
 * Job processor for notification tasks
 */
export class NotificationJobProcessor {
  private emailService: EmailService;

  constructor(private db: PrismaClient) {
    this.emailService = new EmailService();
  }

  /**
   * Process notification sending job
   */
  async processNotificationSend(job: Job): Promise<JobResult> {
    const {
      userId,
      notificationType,
      title,
      message,
      data = {},
      priority = 'normal',
      channels = ['email', 'in_app'],
      scheduledFor,
    } = job.data as unknown as NotificationJobData;

    try {
      // Get user data and preferences
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          notificationPreferences: true,
        },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          retry: false,
        };
      }

      // Parse notification preferences
      const preferences =
        user.notificationPreferences as NotificationPreferences;
      const userChannels = this.filterChannelsByPreferences(
        channels,
        preferences
      );

      if (userChannels.length === 0) {
        return {
          success: true,
          data: { skipped: true, reason: 'User disabled all notifications' },
        };
      }

      // Check if notification should be delayed
      if (scheduledFor && new Date() < scheduledFor) {
        return {
          success: false,
          error: 'Notification scheduled for future',
          retry: { delay: scheduledFor.getTime() - Date.now() },
        };
      }

      // Generate notification content
      const notificationContent = await this.generateNotificationContent(
        notificationType,
        user,
        data,
        title,
        message
      );

      const results: ChannelSendResult[] = [];
      let hasError = false;

      // Send through each enabled channel
      for (const channel of userChannels) {
        try {
          const result = await this.sendThroughChannel(
            channel,
            user,
            notificationContent,
            data
          );
          results.push({ channel, ...result });
        } catch (error) {
          hasError = true;
          results.push({
            channel,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Create in-app notification record
      if (userChannels.includes('in_app')) {
        await this.createInAppNotification(
          userId,
          notificationContent,
          data,
          priority
        );
      }

      // Log notification activity
      await AuditLogger.log({
        userId,
        action: 'notification.sent',
        resource: `notification_${notificationType}`,
        result: hasError ? 'failure' : 'success',
        error: hasError ? 'Some channels failed' : undefined,
        metadata: {
          notificationType,
          channels: userChannels,
          results,
          jobId: job.id,
          partialSuccess: hasError,
        },
      });

      // Emit analytics event
      emitCancellationEvent('analytics.track', {
        userId,
        event: 'notification.sent',
        properties: {
          type: notificationType,
          channels: userChannels,
          success: !hasError,
          jobId: job.id,
        },
        timestamp: new Date(),
      });

      return {
        success: !hasError,
        data: {
          notificationType,
          channels: userChannels,
          results,
        },
        error: hasError ? 'Some channels failed' : undefined,
        retry: hasError ? { delay: 30000 } : false,
      };
    } catch (error) {
      console.error(
        '[NotificationProcessor] Error sending notification:',
        error
      );

      await AuditLogger.log({
        userId: job.data.userId,
        action: 'notification.error',
        resource: `notification_${String(job.data.notificationType)}`,
        result: 'failure',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { jobId: job.id },
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Notification processing failed',
        retry: { delay: 60000 }, // 1 minute
      };
    }
  }

  /**
   * Filter channels based on user preferences
   */
  private filterChannelsByPreferences(
    channels: string[],
    preferences: NotificationPreferences
  ): string[] {
    const filtered: string[] = [];

    for (const channel of channels) {
      switch (channel) {
        case 'email':
          if (preferences?.email !== false) {
            filtered.push(channel);
          }
          break;
        case 'push':
          if (preferences?.push !== false) {
            filtered.push(channel);
          }
          break;
        case 'in_app':
          // In-app notifications are always enabled unless explicitly disabled
          if (preferences?.in_app !== false) {
            filtered.push(channel);
          }
          break;
        default:
          // Unknown channel, include by default
          filtered.push(channel);
      }
    }

    return filtered;
  }

  /**
   * Generate notification content based on type
   */
  private async generateNotificationContent(
    type: string,
    user: UserWithEmail,
    data: NotificationData,
    customTitle?: string,
    customMessage?: string
  ): Promise<{
    title: string;
    message: string;
    htmlMessage?: string;
  }> {
    // Type guard for metadata access - Note: used for type checking but not directly referenced
    // const safeMetadata = data.metadata as Record<string, unknown> | undefined;

    if (customTitle && customMessage) {
      return {
        title: customTitle,
        message: customMessage,
        htmlMessage: this.formatHtmlMessage(customMessage, data),
      };
    }

    const templates = {
      cancellation_success: {
        title: 'Subscription Cancelled Successfully',
        message: `Great news! Your ${data.subscriptionName ?? 'subscription'} has been cancelled successfully.`,
        htmlMessage: `
          <h2>Subscription Cancelled Successfully! 🎉</h2>
          <p>Great news! Your <strong>${data.subscriptionName ?? 'subscription'}</strong> has been cancelled successfully.</p>
          ${data.metadata?.confirmationCode ? `<p><strong>Confirmation Code:</strong> ${typeof data.metadata.confirmationCode === 'string' || typeof data.metadata.confirmationCode === 'number' ? String(data.metadata.confirmationCode) : 'N/A'}</p>` : ''}
          ${data.metadata?.effectiveDate ? `<p><strong>Effective Date:</strong> ${new Date(data.metadata.effectiveDate as string).toLocaleDateString()}</p>` : ''}
          ${data.metadata?.refundAmount ? `<p><strong>Refund Amount:</strong> $${typeof data.metadata.refundAmount === 'string' || typeof data.metadata.refundAmount === 'number' ? String(data.metadata.refundAmount) : '0.00'}</p>` : ''}
          <p>You will no longer be charged for this subscription.</p>
        `,
      },
      cancellation_manual: {
        title: 'Manual Cancellation Required',
        message: `We've prepared instructions to cancel your ${data.subscriptionName ?? 'subscription'}. Please follow the steps in your dashboard.`,
        htmlMessage: `
          <h2>Manual Cancellation Instructions Ready</h2>
          <p>We've prepared step-by-step instructions to cancel your <strong>${data.subscriptionName ?? 'subscription'}</strong>.</p>
          <p>Please check your SubPilot dashboard for detailed instructions.</p>
          ${data.metadata?.estimatedTime ? `<p><strong>Estimated Time:</strong> ${typeof data.metadata.estimatedTime === 'string' || typeof data.metadata.estimatedTime === 'number' ? String(data.metadata.estimatedTime) : 'Unknown'}</p>` : ''}
          <p>Once you've completed the cancellation, please confirm it in your dashboard.</p>
        `,
      },
      cancellation_error: {
        title: 'Cancellation Issue',
        message: `We encountered an issue cancelling your ${data.subscriptionName ?? 'subscription'}. We're working to resolve this.`,
        htmlMessage: `
          <h2>Cancellation Issue</h2>
          <p>We encountered an issue cancelling your <strong>${data.subscriptionName ?? 'subscription'}</strong>.</p>
          <p>Our team is working to resolve this. You can also try manual cancellation instructions in your dashboard.</p>
          ${data.errorMessage ? `<p><strong>Issue:</strong> ${data.errorMessage}</p>` : ''}
          <p>We'll keep you updated on the progress.</p>
        `,
      },
      cancellation_retry: {
        title: 'Retrying Cancellation',
        message: `We're retrying the cancellation of your ${data.subscriptionName ?? 'subscription'}.`,
        htmlMessage: `
          <h2>Retrying Cancellation</h2>
          <p>We're retrying the cancellation of your <strong>${data.subscriptionName ?? 'subscription'}</strong>.</p>
          ${data.metadata?.nextRetryAt ? `<p><strong>Next Attempt:</strong> ${new Date(data.metadata.nextRetryAt as string).toLocaleString()}</p>` : ''}
          <p>You don't need to do anything - we'll automatically try again.</p>
        `,
      },
      webhook_received: {
        title: 'Cancellation Update',
        message: `We received an update about your ${data.subscriptionName ?? 'subscription'} cancellation.`,
        htmlMessage: `
          <h2>Cancellation Update</h2>
          <p>We received an update about your <strong>${data.subscriptionName ?? 'subscription'}</strong> cancellation.</p>
          <p>Check your dashboard for the latest status.</p>
        `,
      },
      status_update: {
        title: 'Subscription Status Update',
        message: `Your ${data.subscriptionName ?? 'subscription'} status has been updated to: ${typeof data.metadata?.status === 'string' ? data.metadata.status : 'unknown'}`,
        htmlMessage: `
          <h2>Subscription Status Update</h2>
          <p>Your <strong>${data.subscriptionName ?? 'subscription'}</strong> status has been updated.</p>
          <p><strong>New Status:</strong> ${typeof data.metadata?.status === 'string' ? data.metadata.status : 'unknown'}</p>
          <p>Check your dashboard for more details.</p>
        `,
      },
      workflow_progress: {
        title: 'Cancellation Progress Update',
        message: `Your cancellation request is progressing: ${typeof data.metadata?.currentStep === 'string' ? data.metadata.currentStep : 'processing'}`,
        htmlMessage: `
          <h2>Cancellation Progress Update</h2>
          <p>Your cancellation request is progressing through our system.</p>
          <p><strong>Current Step:</strong> ${typeof data.metadata?.currentStep === 'string' ? data.metadata.currentStep : 'processing'}</p>
          ${data.metadata?.estimatedCompletion ? `<p><strong>Estimated Completion:</strong> ${new Date(data.metadata.estimatedCompletion as string).toLocaleString()}</p>` : ''}
          <p>We'll notify you when it's complete.</p>
        `,
      },
    };

    const template = templates[type as keyof typeof templates];

    if (!template) {
      return {
        title: 'SubPilot Notification',
        message: customMessage ?? 'You have a new notification from SubPilot.',
        htmlMessage: this.formatHtmlMessage(
          customMessage ?? 'You have a new notification from SubPilot.',
          data
        ),
      };
    }

    return {
      title: template.title,
      message: template.message,
      htmlMessage: template.htmlMessage,
    };
  }

  /**
   * Send notification through specific channel
   */
  private async sendThroughChannel(
    channel: string,
    user: UserWithEmail,
    content: NotificationContent,
    data: NotificationData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    switch (channel) {
      case 'email':
        return this.sendEmailNotification(user, content, data);
      case 'push':
        return this.sendPushNotification(user, content, data);
      case 'in_app':
        // In-app notifications are handled separately
        return { success: true };
      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    user: UserWithEmail,
    content: NotificationContent,
    _data: NotificationData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Use sendEmail directly from the email module
      const sendEmail = (await import('@/lib/email')).sendEmail;
      await sendEmail({
        to: user.email,
        subject: content.title,
        html: content.htmlMessage ?? content.message,
        text: content.message,
      });

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }

  /**
   * Send push notification (placeholder for future implementation)
   */
  private async sendPushNotification(
    user: UserWithEmail,
    content: NotificationContent,
    _data: NotificationData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // TODO: Implement push notification service
    console.log(
      '[NotificationProcessor] Push notification (not implemented):',
      {
        user: user.id,
        title: content.title,
        message: content.message,
      }
    );

    return {
      success: true,
      messageId: `push_${Date.now()}`,
    };
  }

  /**
   * Create in-app notification record
   */
  private async createInAppNotification(
    userId: string,
    content: NotificationContent,
    data: NotificationData,
    priority: string
  ): Promise<void> {
    await this.db.notification.create({
      data: {
        userId,
        type:
          (data as NotificationData & { notificationType?: string })
            .notificationType ?? 'general',
        title: content.title,
        message: content.message,
        severity: this.mapPriorityToSeverity(priority),
        data: JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue,
        scheduledFor: new Date(),
        read: false,
      },
    });
  }

  /**
   * Map priority to severity
   */
  private mapPriorityToSeverity(priority: string): string {
    switch (priority) {
      case 'low':
        return 'info';
      case 'high':
        return 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Format HTML message with basic styling
   */
  private formatHtmlMessage(message: string, _data: NotificationData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #06B6D4, #9333EA); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">SubPilot</h1>
        </div>
        <div style="padding: 20px; background: white; border-radius: 0 0 8px 8px; border: 1px solid #e5e5e5;">
          ${message}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e5e5;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated message from SubPilot. 
            <a href="${process.env.NEXTAUTH_URL ?? 'https://subpilot.app'}" style="color: #06B6D4;">
              Visit your dashboard
            </a> for more details.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Process bulk notification job (for mass notifications)
   */
  async processBulkNotification(job: Job): Promise<JobResult> {
    const { userIds, notificationType, title, message, data = {} } = job.data;

    if (!Array.isArray(userIds)) {
      return {
        success: false,
        error: 'userIds must be an array',
        retry: false,
      };
    }

    try {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      // Process in batches to avoid overwhelming the system
      const batchSize = 50;

      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);

        const batchPromises = batch.map(async (userId: string) => {
          try {
            // Create individual notification job
            const individualJob: Job = {
              ...job,
              id: `${job.id}_${userId}`,
              data: {
                userId,
                notificationType,
                title,
                message,
                data,
              },
            };

            const result = await this.processNotificationSend(individualJob);

            if (result.success) {
              successCount++;
            } else {
              errorCount++;
            }

            return { userId, success: result.success, error: result.error };
          } catch (error) {
            errorCount++;
            return {
              userId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches
        if (i + batchSize < userIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(
        `[NotificationProcessor] Bulk notification completed: ${successCount} success, ${errorCount} errors`
      );

      return {
        success: errorCount === 0,
        data: {
          totalUsers: userIds.length,
          successCount,
          errorCount,
          results,
        },
        error:
          errorCount > 0 ? `${errorCount} notifications failed` : undefined,
      };
    } catch (error) {
      console.error('[NotificationProcessor] Bulk notification error:', error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Bulk notification failed',
        retry: { delay: 120000 }, // 2 minutes
      };
    }
  }
}
