import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { notificationsRouter } from '../notifications';
import { db } from '@/server/db';
import type { Session } from 'next-auth';
import { TRPCError } from '@trpc/server';

// Mock Prisma client
vi.mock('@/server/db', () => ({
  db: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock email service
vi.mock('@/server/services/email.service', () => ({
  emailNotificationService: {
    sendNotificationEmail: vi.fn(),
  },
}));

describe('Notifications Router - Full tRPC Integration', () => {
  const mockSession: Session = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockNotifications = [
    {
      id: 'notif-1',
      userId: 'user-1',
      type: 'subscription_detected',
      title: 'New Subscription Detected',
      message: 'We found a new Netflix subscription in your transactions',
      read: false,
      createdAt: new Date('2024-07-20T10:00:00Z'),
      updatedAt: new Date('2024-07-20T10:00:00Z'),
      data: { subscriptionId: 'sub-1', amount: 15.99, confidence: 0.95 },
    },
    {
      id: 'notif-2',
      userId: 'user-1',
      type: 'price_increase',
      title: 'Price Increase Detected',
      message: 'Spotify increased their price from $9.99 to $11.99',
      read: true,
      createdAt: new Date('2024-07-19T14:30:00Z'),
      updatedAt: new Date('2024-07-19T15:00:00Z'),
      data: { subscriptionId: 'sub-2', oldPrice: 9.99, newPrice: 11.99 },
    },
    {
      id: 'notif-3',
      userId: 'user-1',
      type: 'billing_reminder',
      title: 'Upcoming Billing',
      message: 'Adobe Creative Cloud will bill $52.99 in 3 days',
      read: false,
      createdAt: new Date('2024-07-18T09:00:00Z'),
      updatedAt: new Date('2024-07-18T09:00:00Z'),
      data: { subscriptionId: 'sub-3', amount: 52.99, daysUntilBilling: 3 },
    },
  ];

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
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

  let ctx: ReturnType<typeof createInnerTRPCContext>;
  let caller: ReturnType<typeof notificationsRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createInnerTRPCContext({ session: mockSession });
    caller = notificationsRouter.createCaller(ctx);
  });

  describe('getNotifications', () => {
    it('should retrieve paginated notifications with default parameters', async () => {
      (db.notification.findMany as Mock).mockResolvedValueOnce(
        mockNotifications
      );

      const result = await caller.notifications.getAll({});

      expect(result.notifications).toHaveLength(3);
      expect(result.notifications[0]).toEqual({
        id: 'notif-1',
        type: 'subscription_detected',
        title: 'New Subscription Detected',
        message: 'We found a new Netflix subscription in your transactions',
        read: false,
        createdAt: expect.any(Date),
        metadata: { subscriptionId: 'sub-1', amount: 15.99, confidence: 0.95 },
      });

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should support custom pagination parameters', async () => {
      (db.notification.findMany as Mock).mockResolvedValueOnce([
        mockNotifications[1],
      ]);

      const result = await caller.getNotifications({
        limit: 10,
        offset: 1,
      });

      expect(result).toHaveLength(1);
      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 1,
      });
    });

    it('should filter unread notifications only', async () => {
      const unreadNotifications = mockNotifications.filter(n => !n.read);
      (db.notification.findMany as Mock).mockResolvedValueOnce(
        unreadNotifications
      );

      const result = await caller.getNotifications({
        unreadOnly: true,
      });

      expect(result).toHaveLength(2);
      expect(result.every(n => !n.read)).toBe(true);

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter by notification type', async () => {
      const priceAlerts = mockNotifications.filter(
        n => n.type === 'price_increase'
      );
      (db.notification.findMany as Mock).mockResolvedValueOnce(priceAlerts);

      const result = await caller.getNotifications({
        type: 'price_increase',
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('price_increase');

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: 'price_increase',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should require authentication', async () => {
      const unauthenticatedCtx = createInnerTRPCContext({ session: null });
      const unauthenticatedCaller =
        notificationsRouter.createCaller(unauthenticatedCtx);

      await expect(unauthenticatedCaller.getNotifications({})).rejects.toThrow(
        TRPCError
      );
    });

    it('should enforce maximum limit', async () => {
      (db.notification.findMany as Mock).mockResolvedValueOnce([]);

      await caller.getNotifications({ limit: 200 });

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 100, // Should be capped at 100
        skip: 0,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      (db.notification.count as Mock).mockResolvedValueOnce(5);

      const result = await caller.getUnreadCount();

      expect(result).toBe(5);
      expect(db.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
      });
    });

    it('should return zero for users with no unread notifications', async () => {
      (db.notification.count as Mock).mockResolvedValueOnce(0);

      const result = await caller.getUnreadCount();

      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      const updatedNotification = { ...mockNotifications[0], read: true };
      (db.notification.update as Mock).mockResolvedValueOnce(
        updatedNotification
      );

      const result = await caller.markAsRead({
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
        caller.markAsRead({ notificationId: 'invalid-id' })
      ).rejects.toThrow('Record not found');
    });

    it('should prevent marking other users notifications', async () => {
      const otherUserCtx = createInnerTRPCContext({
        session: {
          ...mockSession,
          user: { ...mockSession.user, id: 'user-2' },
        },
      });
      const otherUserCaller = notificationsRouter.createCaller(otherUserCtx);

      (db.notification.update as Mock).mockRejectedValueOnce(
        new Error('Record not found')
      );

      await expect(
        otherUserCaller.markAsRead({ notificationId: 'notif-1' })
      ).rejects.toThrow('Record not found');

      expect(db.notification.update).toHaveBeenCalledWith({
        where: {
          id: 'notif-1',
          userId: 'user-2', // Different user ID
        },
        data: { read: true },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      (db.notification.updateMany as Mock).mockResolvedValueOnce({ count: 3 });

      const result = await caller.markAllAsRead();

      expect(result).toEqual({ success: true, count: 3 });
      expect(db.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
        data: { read: true },
      });
    });

    it('should handle case with no unread notifications', async () => {
      (db.notification.updateMany as Mock).mockResolvedValueOnce({ count: 0 });

      const result = await caller.markAllAsRead();

      expect(result).toEqual({ success: true, count: 0 });
    });
  });

  describe('deleteNotification', () => {
    it('should delete single notification', async () => {
      (db.notification.delete as Mock).mockResolvedValueOnce(
        mockNotifications[0]
      );

      const result = await caller.deleteNotification({
        notificationId: 'notif-1',
      });

      expect(result).toEqual({ success: true });
      expect(db.notification.delete).toHaveBeenCalledWith({
        where: {
          id: 'notif-1',
          userId: 'user-1',
        },
      });
    });

    it('should handle notification not found', async () => {
      (db.notification.delete as Mock).mockRejectedValueOnce(
        new Error('Record not found')
      );

      await expect(
        caller.deleteNotification({ notificationId: 'invalid-id' })
      ).rejects.toThrow('Record not found');
    });
  });

  describe('clearAllNotifications', () => {
    it('should delete all notifications for user', async () => {
      (db.notification.deleteMany as Mock).mockResolvedValueOnce({ count: 5 });

      const result = await caller.clearAllNotifications();

      expect(result).toEqual({ success: true, count: 5 });
      expect(db.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should handle user with no notifications', async () => {
      (db.notification.deleteMany as Mock).mockResolvedValueOnce({ count: 0 });

      const result = await caller.clearAllNotifications();

      expect(result).toEqual({ success: true, count: 0 });
    });
  });

  describe('getNotificationStats', () => {
    it('should return comprehensive notification statistics', async () => {
      (db.notification.count as Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3) // unread
        .mockResolvedValueOnce(2) // subscription_detected
        .mockResolvedValueOnce(1) // price_increase
        .mockResolvedValueOnce(4) // billing_reminder
        .mockResolvedValueOnce(1) // unused_subscription
        .mockResolvedValueOnce(2); // system

      const result = await caller.getNotificationStats();

      expect(result).toEqual({
        total: 10,
        unread: 3,
        byType: {
          subscription_detected: 2,
          price_increase: 1,
          billing_reminder: 4,
          unused_subscription: 1,
          system: 2,
        },
      });

      expect(db.notification.count).toHaveBeenCalledTimes(7);
    });
  });

  describe('testNotification', () => {
    it('should create and send test notification', async () => {
      (db.user.findUnique as Mock).mockResolvedValueOnce(mockUser);
      const createdNotification = {
        ...mockNotifications[0],
        type: 'system',
        title: 'Test Notification',
        message: 'This is a test notification to verify your settings',
      };
      (db.notification.create as Mock).mockResolvedValueOnce(
        createdNotification
      );

      const result = await caller.testNotification();

      expect(result).toEqual({ success: true });

      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'system',
          title: 'Test Notification',
          message:
            'This is a test notification to verify your settings are working correctly.',
          read: false,
          data: { test: true },
        },
      });
    });

    it('should handle user not found', async () => {
      (db.user.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(caller.testNotification()).rejects.toThrow('User not found');
    });
  });

  describe('performance', () => {
    it('should handle large numbers of notifications efficiently', async () => {
      const largeNotificationSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notif-${i}`,
        title: `Notification ${i}`,
      }));

      (db.notification.findMany as Mock).mockResolvedValueOnce(
        largeNotificationSet.slice(0, 50)
      );

      const start = performance.now();
      const result = await caller.getNotifications({ limit: 50 });
      const duration = performance.now() - start;

      expect(result).toHaveLength(50);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should perform bulk operations efficiently', async () => {
      (db.notification.updateMany as Mock).mockResolvedValueOnce({
        count: 1000,
      });

      const start = performance.now();
      await caller.markAllAsRead();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // Bulk operation should be fast
    });
  });

  describe('data validation', () => {
    it('should validate notification type filter', async () => {
      await expect(
        caller.getNotifications({ type: 'invalid_type' as any })
      ).rejects.toThrow();
    });

    it('should validate limit boundaries', async () => {
      // Test negative limit
      (db.notification.findMany as Mock).mockResolvedValueOnce([]);

      await caller.getNotifications({ limit: -5 });

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1, // Should be coerced to minimum
        })
      );
    });

    it('should validate offset boundaries', async () => {
      (db.notification.findMany as Mock).mockResolvedValueOnce([]);

      await caller.getNotifications({ offset: -10 });

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // Should be coerced to minimum
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      (db.notification.findMany as Mock).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      await expect(caller.getNotifications({})).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle concurrent modification errors', async () => {
      (db.notification.update as Mock).mockRejectedValueOnce(
        new Error('Optimistic lock failed')
      );

      await expect(
        caller.markAsRead({ notificationId: 'notif-1' })
      ).rejects.toThrow('Optimistic lock failed');
    });
  });

  describe('edge cases', () => {
    it('should handle malformed notification data gracefully', async () => {
      const malformedNotification = {
        ...mockNotifications[0],
        data: null, // Malformed data
      };

      (db.notification.findMany as Mock).mockResolvedValueOnce([
        malformedNotification,
      ]);

      const result = await caller.notifications.getAll({});

      expect(result[0].data).toBeNull();
    });

    it('should handle very old notifications', async () => {
      const oldNotification = {
        ...mockNotifications[0],
        createdAt: new Date('2020-01-01'),
      };

      (db.notification.findMany as Mock).mockResolvedValueOnce([
        oldNotification,
      ]);

      const result = await caller.notifications.getAll({});

      expect(result[0].createdAt).toEqual(new Date('2020-01-01'));
    });
  });
});
