import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { notificationsRouter } from '@/server/api/routers/notifications';
import type { Session } from 'next-auth';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/db';

// Mock Prisma client
vi.mock('@/server/db', () => ({
  db: {
    notification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('notificationsRouter', () => {
  let ctx: Awaited<ReturnType<typeof createInnerTRPCContext>>;
  let caller: ReturnType<typeof notificationsRouter.createCaller>;

  const mockSession: Session = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockNotification = {
    id: 'notif-1',
    userId: 'test-user-id',
    type: 'subscription_renewal',
    title: 'Subscription Renewal',
    message: 'Netflix subscription will renew in 3 days',
    read: false,
    priority: 'medium',
    data: {
      subscriptionId: 'sub-1',
      amount: 15.99,
      daysUntilRenewal: 3,
    },
    createdAt: new Date('2024-07-15'),
    updatedAt: new Date('2024-07-15'),
  };

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    notificationPreferences: {
      email: true,
      push: false,
      renewalReminders: true,
      priceChanges: true,
      weeklyReports: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    ctx = createInnerTRPCContext({
      session: mockSession,
    });

    caller = notificationsRouter.createCaller(ctx);
  });

  describe('getAll', () => {
    it('returns user notifications with pagination', async () => {
      (db.notification.findMany as Mock).mockResolvedValueOnce([mockNotification]);
      (db.notification.count as Mock).mockResolvedValueOnce(1);

      const result = await caller.getAll({});

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });

      expect(result).toEqual({
        notifications: [mockNotification],
        total: 1,
        unreadCount: expect.any(Number),
        hasMore: false,
      });
    });

    it('filters by notification type', async () => {
      (db.notification.findMany as Mock).mockResolvedValueOnce([mockNotification]);
      (db.notification.count as Mock).mockResolvedValueOnce(1);

      await caller.getAll({ type: 'subscription_renewal' });

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          type: 'subscription_renewal',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('filters by read status', async () => {
      (db.notification.findMany as Mock).mockResolvedValueOnce([mockNotification]);
      (db.notification.count as Mock).mockResolvedValueOnce(1);

      await caller.getAll({ unreadOnly: true });

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          read: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('handles pagination correctly', async () => {
      (db.notification.findMany as Mock).mockResolvedValueOnce([mockNotification]);
      (db.notification.count as Mock).mockResolvedValueOnce(100);

      const result = await caller.getAll({ page: 2, limit: 25 });

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { createdAt: 'desc' },
        take: 25,
        skip: 25,
      });

      expect(result.hasMore).toBe(true);
    });

    it('calculates unread count correctly', async () => {
      (db.notification.findMany as Mock).mockResolvedValueOnce([mockNotification]);
      (db.notification.count as Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // unread

      const result = await caller.getAll({});

      expect(result.unreadCount).toBe(3);
    });
  });

  describe('markAsRead', () => {
    it('marks notification as read', async () => {
      (db.notification.findUnique as Mock).mockResolvedValueOnce(mockNotification);
      (db.notification.update as Mock).mockResolvedValueOnce({
        ...mockNotification,
        read: true,
      });

      const result = await caller.markAsRead({ id: 'notif-1' });

      expect(db.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'test-user-id' },
        data: { read: true },
      });

      expect(result.success).toBe(true);
    });

    it('throws error for non-existent notification', async () => {
      (db.notification.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(
        caller.markAsRead({ id: 'non-existent' })
      ).rejects.toThrow('Notification not found');
    });

    it('prevents marking other users notifications as read', async () => {
      (db.notification.findUnique as Mock).mockResolvedValueOnce({
        ...mockNotification,
        userId: 'other-user-id',
      });

      await expect(
        caller.markAsRead({ id: 'notif-1' })
      ).rejects.toThrow('Notification not found');
    });
  });

  describe('markAllAsRead', () => {
    it('marks all user notifications as read', async () => {
      (db.notification.updateMany as Mock).mockResolvedValueOnce({ count: 5 });

      const result = await caller.markAllAsRead();

      expect(db.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id', read: false },
        data: { read: true },
      });

      expect(result).toEqual({ success: true, updatedCount: 5 });
    });

    it('handles case with no unread notifications', async () => {
      (db.notification.updateMany as Mock).mockResolvedValueOnce({ count: 0 });

      const result = await caller.markAllAsRead();

      expect(result.updatedCount).toBe(0);
    });
  });

  describe('delete', () => {
    it('deletes notification', async () => {
      (db.notification.findUnique as Mock).mockResolvedValueOnce(mockNotification);
      (db.notification.delete as Mock).mockResolvedValueOnce(mockNotification);

      const result = await caller.delete({ id: 'notif-1' });

      expect(db.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      });

      expect(result.success).toBe(true);
    });

    it('throws error for non-existent notification', async () => {
      (db.notification.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(
        caller.delete({ id: 'non-existent' })
      ).rejects.toThrow('Notification not found');
    });
  });

  describe('create', () => {
    const createInput = {
      type: 'subscription_renewal' as const,
      title: 'Subscription Renewal',
      message: 'Netflix subscription will renew in 3 days',
      priority: 'medium' as const,
      data: {
        subscriptionId: 'sub-1',
        amount: 15.99,
      },
    };

    it('creates new notification', async () => {
      (db.notification.create as Mock).mockResolvedValueOnce(mockNotification);

      const result = await caller.create(createInput);

      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-id',
          type: 'subscription_renewal',
          title: 'Subscription Renewal',
          message: 'Netflix subscription will renew in 3 days',
          priority: 'medium',
          read: false,
          data: {
            subscriptionId: 'sub-1',
            amount: 15.99,
          },
        },
      });

      expect(result).toEqual(mockNotification);
    });

    it('validates notification type', async () => {
      await expect(
        caller.create({
          ...createInput,
          type: 'invalid_type' as any,
        })
      ).rejects.toThrow();
    });

    it('validates priority level', async () => {
      await expect(
        caller.create({
          ...createInput,
          priority: 'invalid_priority' as any,
        })
      ).rejects.toThrow();
    });
  });

  describe('getPreferences', () => {
    it('returns user notification preferences', async () => {
      (db.user.findUnique as Mock).mockResolvedValueOnce(mockUser);

      const result = await caller.getPreferences();

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        select: { notificationPreferences: true },
      });

      expect(result).toEqual({
        email: true,
        push: false,
        renewalReminders: true,
        priceChanges: true,
        weeklyReports: false,
      });
    });

    it('returns default preferences for user without preferences', async () => {
      (db.user.findUnique as Mock).mockResolvedValueOnce({
        id: 'test-user-id',
        notificationPreferences: null,
      });

      const result = await caller.getPreferences();

      expect(result).toEqual({
        email: true,
        push: true,
        renewalReminders: true,
        priceChanges: true,
        weeklyReports: true,
      });
    });
  });

  describe('updatePreferences', () => {
    const preferencesUpdate = {
      email: false,
      push: true,
      renewalReminders: false,
      priceChanges: true,
      weeklyReports: true,
    };

    it('updates user notification preferences', async () => {
      (db.user.update as Mock).mockResolvedValueOnce({
        ...mockUser,
        notificationPreferences: preferencesUpdate,
      });

      const result = await caller.updatePreferences(preferencesUpdate);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        data: {
          notificationPreferences: preferencesUpdate,
        },
        select: { notificationPreferences: true },
      });

      expect(result).toEqual(preferencesUpdate);
    });

    it('validates preference values', async () => {
      await expect(
        caller.updatePreferences({
          email: 'invalid' as any,
          push: true,
          renewalReminders: true,
          priceChanges: true,
          weeklyReports: true,
        })
      ).rejects.toThrow();
    });
  });

  describe('getStats', () => {
    it('returns notification statistics', async () => {
      (db.notification.count as Mock)
        .mockResolvedValueOnce(25) // total
        .mockResolvedValueOnce(8)  // unread
        .mockResolvedValueOnce(5)  // today
        .mockResolvedValueOnce(12); // this week

      const result = await caller.getStats();

      expect(result).toEqual({
        total: 25,
        unread: 8,
        today: 5,
        thisWeek: 12,
        byType: expect.any(Object),
        byPriority: expect.any(Object),
      });
    });

    it('includes breakdown by type and priority', async () => {
      // Mock the grouped queries
      (db.notification as any).groupBy = vi.fn()
        .mockResolvedValueOnce([ // by type
          { type: 'subscription_renewal', _count: { _all: 10 } },
          { type: 'price_change', _count: { _all: 5 } },
        ])
        .mockResolvedValueOnce([ // by priority
          { priority: 'high', _count: { _all: 3 } },
          { priority: 'medium', _count: { _all: 8 } },
          { priority: 'low', _count: { _all: 4 } },
        ]);

      (db.notification.count as Mock).mockResolvedValue(15);

      const result = await caller.getStats();

      expect(result.byType).toEqual({
        subscription_renewal: 10,
        price_change: 5,
      });

      expect(result.byPriority).toEqual({
        high: 3,
        medium: 8,
        low: 4,
      });
    });
  });

  describe('unauthorized access', () => {
    it('throws UNAUTHORIZED for all endpoints without session', async () => {
      const unauthenticatedCaller = notificationsRouter.createCaller(
        createInnerTRPCContext({ session: null })
      );

      await expect(unauthenticatedCaller.getAll({})).rejects.toThrow(TRPCError);
      await expect(unauthenticatedCaller.markAsRead({ id: 'notif-1' })).rejects.toThrow(TRPCError);
      await expect(unauthenticatedCaller.markAllAsRead()).rejects.toThrow(TRPCError);
      await expect(unauthenticatedCaller.getPreferences()).rejects.toThrow(TRPCError);
    });
  });
});