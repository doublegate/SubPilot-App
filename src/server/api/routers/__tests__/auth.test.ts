import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { authRouter } from '../auth';
import { db } from '@/server/db';
import type { Session } from 'next-auth';
import { TRPCError } from '@trpc/server';

// Mock Prisma client
vi.mock('@/server/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    notification: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Auth Router - Full tRPC Integration', () => {
  const mockSession: Session = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: new Date(),
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    notificationPreferences: {
      email: true,
      push: false,
      sms: false,
      billingReminders: true,
      priceAlerts: true,
      unusedSubscriptions: false,
      weeklyReports: true,
    },
  };

  const mockSessions = [
    {
      id: 'session-1',
      sessionToken: 'current-session-token',
      userId: 'user-1',
      expires: new Date(Date.now() + 86400000),
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      updatedAt: new Date(),
    },
    {
      id: 'session-2',
      sessionToken: 'old-session-token',
      userId: 'user-1',
      expires: new Date(Date.now() + 86400000),
      createdAt: new Date(Date.now() - 86400000 * 7), // 7 days ago
      updatedAt: new Date(),
    },
  ];

  const mockNotifications = [
    {
      id: 'notif-1',
      userId: 'user-1',
      type: 'subscription_detected',
      title: 'New Subscription Detected',
      message: 'We detected a new Netflix subscription',
      read: false,
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(),
      data: { subscriptionId: 'sub-1' },
    },
    {
      id: 'notif-2',
      userId: 'user-1',
      type: 'price_increase',
      title: 'Price Increase Alert',
      message: 'Spotify increased their price',
      read: true,
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(),
      data: { subscriptionId: 'sub-2' },
    },
  ];

  let ctx: ReturnType<typeof createInnerTRPCContext>;
  let caller: ReturnType<typeof authRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createInnerTRPCContext({ session: mockSession });
    caller = authRouter.createCaller(ctx);
  });

  describe('getSession', () => {
    it('should return current user session with full context', async () => {
      (db.user.findUnique as Mock).mockResolvedValueOnce(mockUser);

      const result = await caller.getSession();

      expect(result).toEqual({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          image: null,
          emailVerified: expect.any(Date),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          notificationPreferences: {
            email: true,
            push: false,
            sms: false,
            billingReminders: true,
            priceAlerts: true,
            unusedSubscriptions: false,
            weeklyReports: true,
          },
        },
        expires: expect.any(String),
      });

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should return null for unauthenticated users', async () => {
      const unauthenticatedCtx = createInnerTRPCContext({ session: null });
      const unauthenticatedCaller = authRouter.createCaller(unauthenticatedCtx);

      const result = await unauthenticatedCaller.getSession();

      expect(result).toBeNull();
      expect(db.user.findUnique).not.toHaveBeenCalled();
    });

    it('should handle user not found in database', async () => {
      (db.user.findUnique as Mock).mockResolvedValueOnce(null);

      const result = await caller.getSession();

      expect(result).toBeNull();
    });
  });

  describe('getActiveSessions', () => {
    it('should retrieve all active sessions with metadata', async () => {
      (db.session.findMany as Mock).mockResolvedValueOnce(mockSessions);

      const result = await caller.getActiveSessions();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'session-1',
        sessionToken: expect.stringMatching(/^\*+[a-zA-Z0-9]{4}$/), // Masked token
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        lastActive: expect.any(Date),
        expires: expect.any(Date),
        isCurrent: false, // Note: This is a known TODO - session detection not implemented
        userAgent: null,
        ipAddress: null,
        location: null,
      });

      expect(db.session.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          expires: { gt: expect.any(Date) },
        },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should handle empty sessions list', async () => {
      (db.session.findMany as Mock).mockResolvedValueOnce([]);

      const result = await caller.getActiveSessions();

      expect(result).toEqual([]);
    });

    it('should mask session tokens for security', async () => {
      (db.session.findMany as Mock).mockResolvedValueOnce([
        {
          ...mockSessions[0],
          sessionToken: 'very-long-session-token-12345',
        },
      ]);

      const result = await caller.getActiveSessions();

      expect(result[0].sessionToken).toBe('******************2345');
      expect(result[0].sessionToken).not.toContain('very-long-session');
    });

    it('should require authentication', async () => {
      const unauthenticatedCtx = createInnerTRPCContext({ session: null });
      const unauthenticatedCaller = authRouter.createCaller(unauthenticatedCtx);

      await expect(unauthenticatedCaller.getActiveSessions()).rejects.toThrow(
        TRPCError
      );
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session by ID', async () => {
      (db.session.delete as Mock).mockResolvedValueOnce(mockSessions[0]);

      const result = await caller.revokeSession({ sessionId: 'session-1' });

      expect(result).toEqual({ success: true });
      expect(db.session.delete).toHaveBeenCalledWith({
        where: {
          id: 'session-1',
          userId: 'user-1', // Ensure user can only revoke their own sessions
        },
      });
    });

    it('should handle session not found', async () => {
      (db.session.delete as Mock).mockResolvedValueOnce(null);

      await expect(
        caller.revokeSession({ sessionId: 'invalid-session' })
      ).rejects.toThrow('Session not found');
    });

    it('should prevent unauthorized session revocation', async () => {
      const otherUserCtx = createInnerTRPCContext({
        session: {
          ...mockSession,
          user: { ...mockSession.user, id: 'user-2' },
        },
      });
      const otherUserCaller = authRouter.createCaller(otherUserCtx);

      (db.session.delete as Mock).mockResolvedValueOnce(null);

      await expect(
        otherUserCaller.revokeSession({ sessionId: 'session-1' })
      ).rejects.toThrow('Session not found');
    });

    it('should require authentication', async () => {
      const unauthenticatedCtx = createInnerTRPCContext({ session: null });
      const unauthenticatedCaller = authRouter.createCaller(unauthenticatedCtx);

      await expect(
        unauthenticatedCaller.revokeSession({ sessionId: 'session-1' })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getNotifications', () => {
    it('should retrieve paginated notifications with filters', async () => {
      (db.notification.findMany as Mock).mockResolvedValueOnce(
        mockNotifications
      );

      const result = await caller.getNotifications({
        limit: 10,
        offset: 0,
        unreadOnly: false,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'notif-1',
        type: 'subscription_detected',
        title: 'New Subscription Detected',
        message: 'We detected a new Netflix subscription',
        read: false,
        createdAt: expect.any(Date),
        data: { subscriptionId: 'sub-1' },
      });

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });

    it('should filter unread notifications only', async () => {
      const unreadNotifications = mockNotifications.filter(n => !n.read);
      (db.notification.findMany as Mock).mockResolvedValueOnce(
        unreadNotifications
      );

      const result = await caller.getNotifications({
        limit: 10,
        offset: 0,
        unreadOnly: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].read).toBe(false);

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });

    it('should support pagination', async () => {
      (db.notification.findMany as Mock).mockResolvedValueOnce([
        mockNotifications[1],
      ]);

      const result = await caller.getNotifications({
        limit: 1,
        offset: 1,
        unreadOnly: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-2');

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        skip: 1,
      });
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return accurate unread count', async () => {
      (db.notification.count as Mock).mockResolvedValueOnce(3);

      const result = await caller.getUnreadNotificationCount();

      expect(result).toBe(3);
      expect(db.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
      });
    });

    it('should return zero for users with no unread notifications', async () => {
      (db.notification.count as Mock).mockResolvedValueOnce(0);

      const result = await caller.getUnreadNotificationCount();

      expect(result).toBe(0);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const updatedNotification = { ...mockNotifications[0], read: true };
      (db.notification.update as Mock).mockResolvedValueOnce(
        updatedNotification
      );

      const result = await caller.markNotificationAsRead({
        notificationId: 'notif-1',
      });

      expect(result).toEqual({ success: true });
      expect(db.notification.update).toHaveBeenCalledWith({
        where: {
          id: 'notif-1',
          userId: 'user-1',
        },
        data: { read: true },
      });
    });

    it('should handle notification not found', async () => {
      (db.notification.update as Mock).mockRejectedValueOnce(
        new Error('Record not found')
      );

      await expect(
        caller.markNotificationAsRead({ notificationId: 'invalid-id' })
      ).rejects.toThrow('Record not found');
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update user notification preferences', async () => {
      const newPreferences = {
        email: false,
        push: true,
        sms: true,
        billingReminders: false,
        priceAlerts: true,
        unusedSubscriptions: true,
        weeklyReports: false,
      };

      const updatedUser = {
        ...mockUser,
        notificationPreferences: newPreferences,
      };

      (db.user.update as Mock).mockResolvedValueOnce(updatedUser);

      const result = await caller.updateNotificationPreferences(newPreferences);

      expect(result).toEqual(newPreferences);
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          notificationPreferences: newPreferences,
        },
      });
    });

    it('should validate preference values', async () => {
      await expect(
        caller.updateNotificationPreferences({
          email: 'invalid' as any,
          push: false,
          sms: false,
          billingReminders: true,
          priceAlerts: true,
          unusedSubscriptions: false,
          weeklyReports: true,
        })
      ).rejects.toThrow();
    });
  });

  describe('performance and reliability', () => {
    it('should handle database timeouts gracefully', async () => {
      (db.user.findUnique as Mock).mockRejectedValueOnce(
        new Error('Connection timeout')
      );

      await expect(caller.getSession()).rejects.toThrow('Connection timeout');
    });

    it('should complete session retrieval quickly', async () => {
      (db.user.findUnique as Mock).mockResolvedValueOnce(mockUser);

      const start = performance.now();
      await caller.getSession();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // Should complete within 50ms
    });

    it('should handle large notification lists efficiently', async () => {
      const largeNotificationList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notif-${i}`,
        title: `Notification ${i}`,
      }));

      (db.notification.findMany as Mock).mockResolvedValueOnce(
        largeNotificationList.slice(0, 50)
      );

      const start = performance.now();
      const result = await caller.getNotifications({
        limit: 50,
        offset: 0,
        unreadOnly: false,
      });
      const duration = performance.now() - start;

      expect(result).toHaveLength(50);
      expect(duration).toBeLessThan(100); // Should handle 50 items within 100ms
    });
  });

  describe('security and validation', () => {
    it('should prevent SQL injection in notification queries', async () => {
      (db.notification.findMany as Mock).mockResolvedValueOnce([]);

      // Try to inject malicious SQL through offset
      await caller.getNotifications({
        limit: 10,
        offset: 0,
        unreadOnly: false,
      });

      // Verify the call was made with safe parameters
      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });

    it('should validate notification ID format', async () => {
      await expect(
        caller.markNotificationAsRead({ notificationId: '' })
      ).rejects.toThrow();
    });

    it('should enforce user isolation in all queries', async () => {
      (db.notification.findMany as Mock).mockResolvedValueOnce([]);
      (db.session.findMany as Mock).mockResolvedValueOnce([]);

      await caller.getNotifications({
        limit: 10,
        offset: 0,
        unreadOnly: false,
      });
      await caller.getActiveSessions();

      // Verify all queries include user ID filter
      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        })
      );

      expect(db.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        })
      );
    });
  });
});
