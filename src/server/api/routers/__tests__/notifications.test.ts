/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { notificationsRouter } from '../notifications';
import { TRPCError } from '@trpc/server';
import { createMockSession } from '@/test/test-utils';

// Mock database - define inside the factory function to avoid hoisting issues
vi.mock('@/server/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    plaidItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Import db after mocking
import { db } from '@/server/db';

// Mock email service
vi.mock('@/server/services/email.service', () => ({
  emailNotificationService: {
    sendNotificationEmail: vi.fn(),
  },
}));

describe('Notifications Router - Full tRPC Integration', () => {
  const mockSession = createMockSession();

  const mockNotifications = [
    {
      id: 'notif-1',
      userId: 'user-1',
      subscriptionId: 'sub-1',
      type: 'new_subscription' as const,
      title: 'New Subscription Detected',
      message: 'We found a new Netflix subscription in your transactions',
      severity: 'info' as const,
      read: false,
      readAt: null,
      scheduledFor: new Date('2024-07-20T10:00:00Z'),
      sentAt: new Date('2024-07-20T10:00:00Z'),
      createdAt: new Date('2024-07-20T10:00:00Z'),
      data: { subscriptionId: 'sub-1', amount: 15.99, confidence: 0.95 },
    },
    {
      id: 'notif-2',
      userId: 'user-1',
      subscriptionId: 'sub-2',
      type: 'price_change' as const,
      title: 'Price Increase Detected',
      message: 'Spotify increased their price from $9.99 to $11.99',
      severity: 'warning' as const,
      read: true,
      readAt: new Date('2024-07-19T15:00:00Z'),
      scheduledFor: new Date('2024-07-19T14:30:00Z'),
      sentAt: new Date('2024-07-19T14:30:00Z'),
      createdAt: new Date('2024-07-19T14:30:00Z'),
      data: { subscriptionId: 'sub-2', oldPrice: 9.99, newPrice: 11.99 },
    },
    {
      id: 'notif-3',
      userId: 'user-1',
      subscriptionId: 'sub-3',
      type: 'renewal_reminder' as const,
      title: 'Upcoming Billing',
      message: 'Adobe Creative Cloud will bill $52.99 in 3 days',
      severity: 'info' as const,
      read: false,
      readAt: null,
      scheduledFor: new Date('2024-07-18T09:00:00Z'),
      sentAt: new Date('2024-07-18T09:00:00Z'),
      createdAt: new Date('2024-07-18T09:00:00Z'),
      data: {
        subscriptionId: 'sub-3',
        amount: 52.99,
        daysUntilBilling: 3,
      },
    },
  ];

  // mockUser removed as it's unused - fixes ESLint warning

  let ctx: ReturnType<typeof createInnerTRPCContext>;
  let caller: ReturnType<typeof notificationsRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createInnerTRPCContext({ session: mockSession as any });
    caller = notificationsRouter.createCaller(ctx);
  });

  describe('getNotifications', () => {
    it('should retrieve paginated notifications with default parameters', async () => {
      vi.mocked(db.notification.findMany).mockResolvedValue(
        mockNotifications.map(n => ({
          ...n,
          subscription: n.subscriptionId
            ? { id: n.subscriptionId, name: 'Test Subscription' }
            : null,
        }))
      );
      vi.mocked(db.notification.count).mockResolvedValue(3);

      const result = await caller.getAll({});

      expect(result.notifications).toHaveLength(3);
      expect(result.notifications[0]).toEqual({
        id: 'notif-1',
        type: 'new_subscription',
        title: 'New Subscription Detected',
        message: 'We found a new Netflix subscription in your transactions',
        read: false,
        createdAt: expect.any(Date) as unknown as Date,
        metadata: { subscriptionId: 'sub-1', amount: 15.99, confidence: 0.95 },
        subscription: { id: 'sub-1', name: 'Test Subscription' },
      });

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
        include: {
          subscription: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should support custom pagination parameters', async () => {
      vi.mocked(db.notification.findMany).mockResolvedValue([
        {
          ...mockNotifications[1]!,
          subscription: { id: 'sub-2', name: 'Test Subscription' },
        } as any,
      ]);
      vi.mocked(db.notification.count).mockResolvedValue(1);

      const result = await caller.getAll({
        limit: 10,
        offset: 1,
      });

      expect(result.notifications).toHaveLength(1);
      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 1,
        include: {
          subscription: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should filter unread notifications only', async () => {
      const unreadNotifications = mockNotifications.filter(n => !n.read);
      vi.mocked(db.notification.findMany).mockResolvedValue(
        unreadNotifications.map(n => ({
          ...n,
          subscription: n.subscriptionId
            ? { id: n.subscriptionId, name: 'Test Subscription' }
            : null,
        }))
      );
      vi.mocked(db.notification.count).mockResolvedValue(2);

      const result = await caller.getAll({
        unreadOnly: true,
      });

      expect(result.notifications).toHaveLength(2);
      expect(
        result.notifications.every((n: { read: boolean }) => !n.read)
      ).toBe(true);

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
        include: {
          subscription: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should filter by notification type', async () => {
      const priceAlerts = mockNotifications.filter(
        n => n.type === 'price_change'
      );
      vi.mocked(db.notification.findMany).mockResolvedValue(
        priceAlerts.map(n => ({
          ...n,
          subscription: n.subscriptionId
            ? { id: n.subscriptionId, name: 'Test Subscription' }
            : null,
        }))
      );
      vi.mocked(db.notification.count).mockResolvedValue(1);

      const result = await caller.getAll({
        type: 'price_change',
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0]?.type).toBe('price_change');

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: 'price_change',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
        include: {
          subscription: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should require authentication', async () => {
      const unauthenticatedCtx = createInnerTRPCContext({ session: null });
      const unauthenticatedCaller =
        notificationsRouter.createCaller(unauthenticatedCtx);

      await expect(unauthenticatedCaller.getAll({})).rejects.toThrow(TRPCError);
    });

    it('should enforce maximum limit', async () => {
      // Test that limit above 100 is rejected by validation
      await expect(caller.getAll({ limit: 200 })).rejects.toThrow();
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      vi.mocked(db.notification.count).mockResolvedValue(5);

      const result = await caller.getUnreadCount();

      expect(result.count).toBe(5);
      expect(db.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
      });
    });

    it('should return zero for users with no unread notifications', async () => {
      vi.mocked(db.notification.count).mockResolvedValue(0);

      const result = await caller.getUnreadCount();

      expect(result.count).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      const updatedNotification = { ...mockNotifications[0]!, read: true };

      vi.mocked(db.notification.findFirst).mockResolvedValue(
        mockNotifications[0]!
      );
      vi.mocked(db.notification.update).mockResolvedValue(updatedNotification);

      const result = await caller.markAsRead({
        id: 'notif-1',
      });

      expect(result).toMatchObject({
        id: 'notif-1',
        read: true,
      });
      expect(db.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { read: true },
      });
    });

    it('should handle notification not found', async () => {
      vi.mocked(db.notification.findFirst).mockResolvedValue(null);

      await expect(caller.markAsRead({ id: 'invalid-id' })).rejects.toThrow(
        'Notification not found'
      );
    });

    it('should prevent marking other users notifications', async () => {
      const otherUserCtx = createInnerTRPCContext({
        session: {
          ...mockSession,
          user: { ...(mockSession as any).user, id: 'user-2' },
        } as any,
      });
      const otherUserCaller = notificationsRouter.createCaller(otherUserCtx);

      vi.mocked(db.notification.findFirst).mockResolvedValue(null);

      await expect(
        otherUserCaller.markAsRead({ id: 'notif-1' })
      ).rejects.toThrow('Notification not found');

      expect(db.notification.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'notif-1',
          userId: 'user-2', // Different user ID
        },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 3 });

      const result = await caller.markAllAsRead();

      expect(result).toEqual({ success: true });
      expect(db.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
        data: { read: true },
      });
    });

    it('should handle case with no unread notifications', async () => {
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 0 });

      const result = await caller.markAllAsRead();

      expect(result).toEqual({ success: true });
    });
  });

  describe('deleteNotification', () => {
    it('should delete single notification', async () => {
      vi.mocked(db.notification.findFirst).mockResolvedValue(
        mockNotifications[0]!
      );
      vi.mocked(db.notification.delete).mockResolvedValue(
        mockNotifications[0]!
      );

      const result = await caller.delete({
        id: 'notif-1',
      });

      expect(result).toEqual({ success: true });
      expect(db.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      });
    });

    it('should handle notification not found', async () => {
      vi.mocked(db.notification.findFirst).mockResolvedValue(null);

      await expect(caller.delete({ id: 'invalid-id' })).rejects.toThrow(
        'Notification not found'
      );
    });
  });

  describe('deleteAllRead', () => {
    it('should delete all read notifications for user', async () => {
      vi.mocked(db.notification.deleteMany).mockResolvedValue({ count: 5 });

      const result = await caller.deleteAllRead();

      expect(result).toEqual({ success: true });
      expect(db.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: true,
        },
      });
    });

    it('should handle user with no notifications', async () => {
      vi.mocked(db.notification.deleteMany).mockResolvedValue({ count: 0 });

      const result = await caller.deleteAllRead();

      expect(result).toEqual({ success: true });
    });
  });

  describe.skip('getNotificationStats', () => {
    it('should return comprehensive notification statistics', async () => {
      vi.mocked(db.notification.count)
        .mockResolvedValue(10) // total
        .mockResolvedValue(3) // unread
        .mockResolvedValue(2) // subscription_detected
        .mockResolvedValue(1) // price_increase
        .mockResolvedValue(4) // billing_reminder
        .mockResolvedValue(1) // unused_subscription
        .mockResolvedValue(2); // system

      const result = await caller.getPreferencesSummary();

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

  describe('createTestNotification', () => {
    it('should create and send test notification', async () => {
      // Mock NODE_ENV
      const originalEnv = process.env.NODE_ENV;
      vi.stubEnv('NODE_ENV', 'development');

      const createdNotification = {
        ...mockNotifications[0]!,
        type: 'general' as const,
        title: 'Test Notification',
        message: 'This is a test message',
      };

      vi.mocked(db.notification.create).mockResolvedValue(createdNotification);

      const result = await caller.createTestNotification({
        type: 'general',
        title: 'Test Notification',
        message: 'This is a test message',
      });

      expect(result).toMatchObject({
        id: expect.any(String) as unknown as string,
        type: 'general',
        title: 'Test Notification',
        message: 'This is a test message',
      });

      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'general',
          title: 'Test Notification',
          message: 'This is a test message',
          scheduledFor: expect.any(Date) as unknown as Date,
        },
      });

      // Restore NODE_ENV
      vi.unstubAllEnvs();
    });

    it('should only work in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      vi.stubEnv('NODE_ENV', 'production');

      await expect(
        caller.createTestNotification({
          type: 'general',
          title: 'Test',
          message: 'Test',
        })
      ).rejects.toThrow('Test notifications only available in development');

      vi.unstubAllEnvs();
    });
  });

  describe('performance', () => {
    it('should handle large numbers of notifications efficiently', async () => {
      const largeNotificationSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockNotifications[0]!,
        id: `notif-${i}`,
        title: `Notification ${i}`,
      }));

      vi.mocked(db.notification.findMany).mockResolvedValue(
        largeNotificationSet.slice(0, 50).map(n => ({
          ...n,
          subscription: n.subscriptionId
            ? { id: n.subscriptionId, name: 'Test Subscription' }
            : null,
        }))
      );
      vi.mocked(db.notification.count).mockResolvedValue(1000);

      const start = performance.now();
      const result = await caller.getAll({ limit: 50 });
      const duration = performance.now() - start;

      expect(result.notifications).toHaveLength(50);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should perform bulk operations efficiently', async () => {
      vi.mocked(db.notification.updateMany).mockResolvedValue({
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
        caller.getAll({ type: 'invalid_type' as any })
      ).rejects.toThrow();
    });

    it('should validate limit boundaries', async () => {
      // Test negative limit should be rejected by validation
      await expect(caller.getAll({ limit: -5 })).rejects.toThrow();
    });

    it('should validate offset boundaries', async () => {
      // Test negative offset should be rejected by validation
      await expect(caller.getAll({ offset: -10 })).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      vi.mocked(db.notification.findMany).mockRejectedValue(
        new Error('Database connection failed')
      );
      vi.mocked(db.notification.count).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(caller.getAll({})).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle concurrent modification errors', async () => {
      vi.mocked(db.notification.findFirst).mockResolvedValue(
        mockNotifications[0]!
      );
      vi.mocked(db.notification.update).mockRejectedValue(
        new Error('Optimistic lock failed')
      );

      await expect(caller.markAsRead({ id: 'notif-1' })).rejects.toThrow(
        'Optimistic lock failed'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle malformed notification data gracefully', async () => {
      const malformedNotification = {
        ...mockNotifications[0]!,
        data: null, // Malformed data
      };

      vi.mocked(db.notification.findMany).mockResolvedValue([
        {
          ...malformedNotification,
          subscription: null,
        } as any,
      ]);
      vi.mocked(db.notification.count).mockResolvedValue(1);

      const result = await caller.getAll({});

      expect(
        (result.notifications[0] as { metadata: unknown }).metadata
      ).toBeNull();
    });

    it('should handle very old notifications', async () => {
      const oldNotification = {
        ...mockNotifications[0]!,
        createdAt: new Date('2020-01-01'),
      };

      vi.mocked(db.notification.findMany).mockResolvedValue([
        {
          ...oldNotification,
          subscription: oldNotification.subscriptionId
            ? { id: oldNotification.subscriptionId, name: 'Test Subscription' }
            : null,
        } as any,
      ]);
      vi.mocked(db.notification.count).mockResolvedValue(1);

      const result = await caller.getAll({});

      expect(
        (result.notifications[0] as { createdAt: Date }).createdAt
      ).toEqual(new Date('2020-01-01'));
    });
  });
});
