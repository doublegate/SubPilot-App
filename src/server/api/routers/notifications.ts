import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { Prisma } from '@prisma/client';
import { emailNotificationService } from '@/server/services/email.service';

const notificationTypeEnum = z.enum([
  'renewal_reminder',
  'price_change',
  'new_subscription',
  'cancelled_service',
  'payment_failed',
  'weekly_report',
  'trial_ending',
  'general',
]);

export const notificationsRouter = createTRPCRouter({
  /**
   * Get all notifications for user
   */
  getAll: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().optional().default(false),
        type: notificationTypeEnum.optional(),
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.NotificationWhereInput = {
        userId: ctx.session.user.id,
      };

      if (input.unreadOnly) {
        where.read = false;
      }

      if (input.type) {
        where.type = input.type;
      }

      const [notifications, total] = await Promise.all([
        ctx.db.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
          include: {
            subscription: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        ctx.db.notification.count({ where }),
      ]);

      return {
        notifications: notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          read: n.read,
          createdAt: n.createdAt,
          metadata: n.data,
          subscription: n.subscription
            ? {
                id: n.subscription.id,
                name: n.subscription.name,
              }
            : null,
        })),
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Mark notification as read
   */
  markAsRead: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.db.notification.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }

      const updated = await ctx.db.notification.update({
        where: { id: input.id },
        data: { read: true },
      });

      return updated;
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.notification.updateMany({
      where: {
        userId: ctx.session.user.id,
        read: false,
      },
      data: { read: true },
    });

    return { success: true };
  }),

  /**
   * Get unread notification count
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.notification.count({
      where: {
        userId: ctx.session.user.id,
        read: false,
      },
    });

    return { count };
  }),

  /**
   * Delete a notification
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.db.notification.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }

      await ctx.db.notification.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Delete all read notifications
   */
  deleteAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.notification.deleteMany({
      where: {
        userId: ctx.session.user.id,
        read: true,
      },
    });

    return { success: true };
  }),

  /**
   * Create a test notification (dev only)
   */
  createTestNotification: protectedProcedure
    .input(
      z.object({
        type: notificationTypeEnum,
        title: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow in development
      if (process.env.NODE_ENV !== 'development') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Test notifications only available in development',
        });
      }

      const notification = await ctx.db.notification.create({
        data: {
          userId: ctx.session.user.id,
          type: input.type,
          title: input.title,
          message: input.message,
          scheduledFor: new Date(),
        },
      });

      return notification;
    }),

  /**
   * Get notification preferences summary
   */
  getPreferencesSummary: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { notificationPreferences: true },
    });

    const preferences = user?.notificationPreferences as {
      emailAlerts?: boolean;
      pushNotifications?: boolean;
      renewalReminders?: boolean;
      priceChangeAlerts?: boolean;
      cancelledServiceAlerts?: boolean;
      weeklyReports?: boolean;
    } | null;

    return {
      emailEnabled: preferences?.emailAlerts ?? true,
      pushEnabled: preferences?.pushNotifications ?? false,
      types: {
        renewal_reminder: preferences?.renewalReminders ?? true,
        price_change: preferences?.priceChangeAlerts ?? true,
        new_subscription: true, // Always notify for new subscriptions
        cancelled_service: preferences?.cancelledServiceAlerts ?? true,
        payment_failed: true, // Always notify for payment failures
        weekly_report: preferences?.weeklyReports ?? true,
        trial_ending: true, // Always notify for trial endings
      },
    };
  }),

  /**
   * Send test email notification
   */
  sendTestEmail: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          'welcome',
          'new_subscription',
          'price_change',
          'monthly_spending',
          'cancellation_confirmation',
          'renewal_reminder',
          'trial_ending',
          'payment_failed',
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow in development
      if (process.env.NODE_ENV !== 'development') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Test emails only available in development',
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Create test data based on type
      const testData = {
        user: { id: user.id, email: user.email, name: user.name },
      };

      switch (input.type) {
        case 'welcome':
          await emailNotificationService.sendWelcomeEmail(testData);
          break;

        case 'new_subscription':
          await emailNotificationService.sendNewSubscriptionEmail({
            ...testData,
            subscription: {
              id: 'test-sub-1',
              name: 'Netflix Premium',
              amount: new Prisma.Decimal(19.99),
              currency: 'USD',
              frequency: 'monthly',
              category: 'Entertainment',
              status: 'active',
              isActive: true,
              detectionConfidence: new Prisma.Decimal(0.95),
              detectedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              userId: user.id,
              description: 'Test subscription',
              nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              lastBilling: new Date(),
              provider: {},
              cancellationInfo: {},
              notes: null,
            },
          });
          break;

        case 'price_change':
          await emailNotificationService.sendPriceChangeEmail({
            ...testData,
            subscription: {
              id: 'test-sub-2',
              name: 'Spotify Family',
              amount: new Prisma.Decimal(15.99),
              currency: 'USD',
              frequency: 'monthly',
              category: 'Music',
              status: 'active',
              isActive: true,
              detectionConfidence: new Prisma.Decimal(0.9),
              detectedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              userId: user.id,
              description: 'Test subscription',
              nextBilling: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
              lastBilling: new Date(),
              provider: {},
              cancellationInfo: {},
              notes: null,
            },
            oldAmount: 14.99,
            newAmount: 15.99,
          });
          break;

        case 'monthly_spending':
          await emailNotificationService.sendMonthlySpendingEmail({
            ...testData,
            spendingData: {
              totalSpent: 247.93,
              subscriptionCount: 12,
              topCategories: [
                { category: 'Entertainment', amount: 89.97 },
                { category: 'Productivity', amount: 59.96 },
                { category: 'Music', amount: 29.98 },
              ],
              monthlyChange: -5.3,
            },
          });
          break;

        case 'cancellation_confirmation':
          await emailNotificationService.sendCancellationEmail({
            ...testData,
            subscription: {
              id: 'test-sub-3',
              name: 'Adobe Creative Cloud',
              amount: new Prisma.Decimal(52.99),
              currency: 'USD',
              frequency: 'monthly',
              category: 'Productivity',
              status: 'cancelled',
              isActive: false,
              detectionConfidence: new Prisma.Decimal(0.85),
              detectedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              userId: user.id,
              description: 'Test subscription',
              nextBilling: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
              lastBilling: new Date(),
              provider: {},
              cancellationInfo: {},
              notes: null,
            },
          });
          break;

        case 'renewal_reminder':
          await emailNotificationService.sendRenewalReminderEmail({
            ...testData,
            subscription: {
              id: 'test-sub-4',
              name: 'Disney+',
              amount: new Prisma.Decimal(13.99),
              currency: 'USD',
              frequency: 'monthly',
              category: 'Entertainment',
              status: 'active',
              isActive: true,
              detectionConfidence: new Prisma.Decimal(0.92),
              detectedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              userId: user.id,
              description: 'Test subscription',
              nextBilling: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
              lastBilling: new Date(),
              provider: {},
              cancellationInfo: {},
              notes: null,
            },
            renewalDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          });
          break;

        case 'trial_ending':
          await emailNotificationService.sendTrialEndingEmail({
            ...testData,
            subscription: {
              id: 'test-sub-5',
              name: 'Apple TV+',
              amount: new Prisma.Decimal(9.99),
              currency: 'USD',
              frequency: 'monthly',
              category: 'Entertainment',
              status: 'active',
              isActive: true,
              detectionConfidence: new Prisma.Decimal(0.88),
              detectedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              userId: user.id,
              description: 'Test subscription',
              nextBilling: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              lastBilling: null,
              provider: {},
              cancellationInfo: {},
              notes: null,
            },
            trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          });
          break;

        case 'payment_failed':
          await emailNotificationService.sendPaymentFailedEmail({
            ...testData,
            subscription: {
              id: 'test-sub-6',
              name: 'Hulu',
              amount: new Prisma.Decimal(17.99),
              currency: 'USD',
              frequency: 'monthly',
              category: 'Entertainment',
              status: 'active',
              isActive: true,
              detectionConfidence: new Prisma.Decimal(0.91),
              detectedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              userId: user.id,
              description: 'Test subscription',
              nextBilling: new Date(),
              lastBilling: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              provider: {},
              cancellationInfo: {},
              notes: null,
            },
            errorMessage: 'Card declined - insufficient funds',
          });
          break;
      }

      return {
        success: true,
        message: `Test ${input.type} email sent to ${user.email}`,
      };
    }),

  /**
   * Process scheduled email notifications
   */
  processScheduledEmails: protectedProcedure.mutation(async ({ ctx }) => {
    // This would typically be called by a cron job or background worker
    // For now, manual trigger for testing
    if (process.env.NODE_ENV !== 'development') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Manual processing only available in development',
      });
    }

    await emailNotificationService.processScheduledNotifications();
    return { success: true };
  }),
});
