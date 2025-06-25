import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emailNotificationService } from '../email.service';
import { sendEmail } from '@/lib/email';
import { db } from '@/server/db';

// Mock dependencies
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/server/db', () => ({
  db: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('EmailNotificationService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockSubscription = {
    id: 'sub-123',
    name: 'Netflix',
    amount: 15.99,
    currency: 'USD',
    frequency: 'monthly',
    category: 'Entertainment',
    status: 'active',
    isActive: true,
    detectionConfidence: 0.95,
    detectedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: mockUser.id,
    description: 'Streaming service',
    nextBilling: new Date(),
    lastBilling: new Date(),
    provider: {},
    cancellationInfo: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email and create notification', async () => {
      const data = { user: mockUser };

      await emailNotificationService.sendWelcomeEmail(data);

      expect(sendEmail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject: 'Welcome to SubPilot! 🎉',
        html: expect.stringContaining('Welcome to SubPilot'),
        text: expect.any(String),
      });

      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          type: 'general',
          title: 'Welcome email sent',
          message: 'Your welcome email has been sent successfully.',
          data: {},
          scheduledFor: expect.any(Date),
        },
      });
    });
  });

  describe('sendNewSubscriptionEmail', () => {
    it('should send new subscription email', async () => {
      const data = {
        user: mockUser,
        subscription: mockSubscription,
      };

      await emailNotificationService.sendNewSubscriptionEmail(data);

      expect(sendEmail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject: 'New subscription detected: Netflix',
        html: expect.stringContaining('Netflix'),
        text: expect.any(String),
      });

      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          subscriptionId: mockSubscription.id,
          type: 'new_subscription',
          title: 'New subscription detected',
          message: 'We detected a new subscription for Netflix',
          data: {},
          scheduledFor: expect.any(Date),
        },
      });
    });

    it('should throw error if subscription is missing', async () => {
      const data = { user: mockUser };

      await expect(
        emailNotificationService.sendNewSubscriptionEmail(data)
      ).rejects.toThrow('Subscription data is required');
    });
  });

  describe('sendPriceChangeEmail', () => {
    it('should send price increase email', async () => {
      const data = {
        user: mockUser,
        subscription: mockSubscription,
        oldAmount: 12.99,
        newAmount: 15.99,
      };

      await emailNotificationService.sendPriceChangeEmail(data);

      expect(sendEmail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject: 'Price increase alert: Netflix',
        html: expect.stringContaining('23.1%'),
        text: expect.any(String),
      });
    });

    it('should send price decrease email', async () => {
      const data = {
        user: mockUser,
        subscription: mockSubscription,
        oldAmount: 19.99,
        newAmount: 15.99,
      };

      await emailNotificationService.sendPriceChangeEmail(data);

      expect(sendEmail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject: 'Price decrease alert: Netflix',
        html: expect.stringContaining('20.0%'),
        text: expect.any(String),
      });
    });
  });

  describe('sendMonthlySpendingEmail', () => {
    it('should send monthly spending summary', async () => {
      const data = {
        user: mockUser,
        spendingData: {
          totalSpent: 247.93,
          subscriptionCount: 12,
          topCategories: [
            { category: 'Entertainment', amount: 89.97 },
            { category: 'Productivity', amount: 59.96 },
          ],
          monthlyChange: -5.3,
        },
      };

      await emailNotificationService.sendMonthlySpendingEmail(data);

      expect(sendEmail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject: expect.stringContaining('spending summary'),
        html: expect.stringContaining('$247.93'),
        text: expect.any(String),
      });
    });
  });

  describe('sendRenewalReminderEmail', () => {
    it('should send renewal reminder with urgency for 3 days', async () => {
      const renewalDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const data = {
        user: mockUser,
        subscription: mockSubscription,
        renewalDate,
      };

      await emailNotificationService.sendRenewalReminderEmail(data);

      expect(sendEmail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject: 'Renewal reminder: Netflix renews in 3 days',
        html: expect.stringContaining('Time is running out'),
        text: expect.any(String),
      });
    });
  });

  describe('processScheduledNotifications', () => {
    it('should process and send scheduled notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'renewal_reminder',
          user: { ...mockUser, notificationPreferences: { emailAlerts: true } },
          subscription: { ...mockSubscription, nextBilling: new Date() },
          data: {},
        },
      ];

      vi.mocked(db.notification.findMany).mockResolvedValue(mockNotifications);
      vi.mocked(db.notification.update).mockResolvedValue({} as any);

      await emailNotificationService.processScheduledNotifications();

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: {
          scheduledFor: { lte: expect.any(Date) },
          sentAt: null,
        },
        include: {
          user: true,
          subscription: true,
        },
      });

      expect(sendEmail).toHaveBeenCalled();
      expect(db.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { sentAt: expect.any(Date) },
      });
    });

    it('should skip notifications if email alerts are disabled', async () => {
      const mockNotifications = [
        {
          id: 'notif-2',
          type: 'renewal_reminder',
          user: {
            ...mockUser,
            notificationPreferences: { emailAlerts: false },
          },
          subscription: mockSubscription,
          data: {},
        },
      ];

      vi.mocked(db.notification.findMany).mockResolvedValue(mockNotifications);

      await emailNotificationService.processScheduledNotifications();

      expect(sendEmail).not.toHaveBeenCalled();
      expect(db.notification.update).not.toHaveBeenCalled();
    });
  });
});
