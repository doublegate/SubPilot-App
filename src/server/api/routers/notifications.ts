import { z } from "zod"
import { TRPCError } from "@trpc/server"
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc"
import { type Prisma } from "@prisma/client"

const notificationTypeEnum = z.enum([
  "renewal_reminder",
  "price_change",
  "new_subscription",
  "cancelled_service",
  "payment_failed",
  "weekly_report",
  "trial_ending",
  "general",
])

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
      }

      if (input.unreadOnly) {
        where.read = false
      }

      if (input.type) {
        where.type = input.type
      }

      const [notifications, total] = await Promise.all([
        ctx.db.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
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
      ])

      return {
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          isRead: n.read,
          createdAt: n.createdAt,
          subscription: n.subscription
            ? {
                id: n.subscription.id,
                name: n.subscription.name,
              }
            : null,
        })),
        total,
        hasMore: input.offset + input.limit < total,
      }
    }),

  /**
   * Mark notification as read
   */
  markAsRead: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.db.notification.findFirst({
        where: {
          id: input.notificationId,
          userId: ctx.session.user.id,
        },
      })

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        })
      }

      const updated = await ctx.db.notification.update({
        where: { id: input.notificationId },
        data: { read: true },
      })

      return updated
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
    })

    return { success: true }
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
    })

    return { count }
  }),

  /**
   * Delete a notification
   */
  delete: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.db.notification.findFirst({
        where: {
          id: input.notificationId,
          userId: ctx.session.user.id,
        },
      })

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        })
      }

      await ctx.db.notification.delete({
        where: { id: input.notificationId },
      })

      return { success: true }
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
    })

    return { success: true }
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
      if (process.env.NODE_ENV !== "development") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Test notifications only available in development",
        })
      }

      const notification = await ctx.db.notification.create({
        data: {
          userId: ctx.session.user.id,
          type: input.type,
          title: input.title,
          message: input.message,
          scheduledFor: new Date(),
        },
      })

      return notification
    }),

  /**
   * Get notification preferences summary
   */
  getPreferencesSummary: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { notificationPreferences: true },
    })

    const preferences = user?.notificationPreferences as {
      emailAlerts?: boolean
      pushNotifications?: boolean
      renewalReminders?: boolean
      priceChangeAlerts?: boolean
      cancelledServiceAlerts?: boolean
      weeklyReports?: boolean
    } | null

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
    }
  }),
})