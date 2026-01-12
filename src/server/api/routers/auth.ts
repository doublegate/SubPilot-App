import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
// Types for session detection (unused but kept for future reference)
// interface _SessionWithCurrent {
//   id: string;
//   sessionToken: string;
//   expires: Date;
//   createdAt: Date;
//   isCurrent: boolean;
// }

export const authRouter = createTRPCRouter({
  /**
   * Get current authenticated user with all fields
   */
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        notificationPreferences: true,
        isAdmin: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }),

  /**
   * Get current authenticated user
   */
  getUser: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        notificationPreferences: true,
        isAdmin: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }),

  /**
   * Update user profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        notificationPreferences: z
          .object({
            emailAlerts: z.boolean(),
            pushNotifications: z.boolean(),
            weeklyReports: z.boolean(),
            renewalReminders: z.boolean(),
            priceChangeAlerts: z.boolean(),
            cancelledServiceAlerts: z.boolean(),
            digestFrequency: z.enum(['daily', 'weekly', 'monthly']),
            quietHoursStart: z.string().nullable(),
            quietHoursEnd: z.string().nullable(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { notificationPreferences, ...profileData } = input;

      // Update user profile
      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          ...profileData,
          updatedAt: new Date(),
        },
      });

      // Update notification preferences if provided
      if (notificationPreferences) {
        await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: {
            notificationPreferences: notificationPreferences,
          },
        });
      }

      return updatedUser;
    }),

  /**
   * Get user's notification preferences
   */
  getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { notificationPreferences: true },
    });

    // Return defaults if not set
    type NotificationPreferences = {
      emailAlerts: boolean;
      pushNotifications: boolean;
      weeklyReports: boolean;
      renewalReminders: boolean;
      priceChangeAlerts: boolean;
      cancelledServiceAlerts: boolean;
      digestFrequency: string;
      quietHoursStart: string | null;
      quietHoursEnd: string | null;
    };

    const defaultPreferences: NotificationPreferences = {
      emailAlerts: true,
      pushNotifications: false,
      weeklyReports: true,
      renewalReminders: true,
      priceChangeAlerts: true,
      cancelledServiceAlerts: true,
      digestFrequency: 'weekly',
      quietHoursStart: null,
      quietHoursEnd: null,
    };

    if (
      user?.notificationPreferences &&
      typeof user.notificationPreferences === 'object'
    ) {
      return user.notificationPreferences as NotificationPreferences;
    }

    return defaultPreferences;
  }),

  /**
   * Get user's active sessions
   */
  getSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await ctx.db.session.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { expires: 'desc' },
      select: {
        id: true,
        sessionToken: true,
        expires: true,
        createdAt: true,
      },
    });

    // Mark current session
    // Note: Cannot reliably identify current session without sessionToken in ctx.session
    return sessions.map(session => ({
      ...session,
      isCurrent: false, // Unable to determine current session
    }));
  }),

  /**
   * Revoke a specific session
   */
  revokeSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent revoking current session
      const session = await ctx.db.session.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      // Note: Cannot reliably prevent revoking current session without sessionToken in ctx.session
      // This is a limitation of the current auth setup

      // Delete the session
      await ctx.db.session.delete({
        where: {
          id: input.sessionId,
          userId: ctx.session.user.id, // Ensure user owns the session
        },
      });

      return { success: true };
    }),

  /**
   * Delete user account
   */
  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirmationEmail: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify email matches
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (user?.email !== input.confirmationEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Email confirmation does not match',
        });
      }

      // Delete user and all related data (cascade)
      await ctx.db.user.delete({
        where: { id: ctx.session.user.id },
      });

      return { success: true };
    }),
});
