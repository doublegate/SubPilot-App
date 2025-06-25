import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
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

// Import after mocks to ensure proper mocking
import { emailNotificationService } from '../email.service';

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
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email and create notification', async () => {
      (sendEmail as Mock).mockResolvedValueOnce(undefined);
      (db.notification.create as Mock).mockResolvedValueOnce({});

      await emailNotificationService.sendWelcomeEmail({
        user: mockUser,
        type: 'welcome',
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Welcome to SubPilot! 🎉',
        html: expect.stringContaining('Welcome to SubPilot, Test User'),
        text: expect.stringContaining('Welcome to SubPilot, Test User'),
      });

      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
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
      (sendEmail as Mock).mockResolvedValueOnce(undefined);
      (db.notification.create as Mock).mockResolvedValueOnce({});

      await emailNotificationService.sendNewSubscriptionEmail({
        user: mockUser,
        subscription: mockSubscription,
        type: 'subscription_detected',
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'New Subscription Detected: Netflix',
        html: expect.stringContaining('Netflix'),
        text: expect.stringContaining('Netflix'),
      });
    });

    it('should throw error if subscription is missing', async () => {
      await expect(
        emailNotificationService.sendNewSubscriptionEmail({
          user: mockUser,
          type: 'subscription_detected',
        })
      ).rejects.toThrow('Subscription data is required');
    });
  });

  describe('sendPriceChangeEmail', () => {
    it('should send price increase email', async () => {
      (sendEmail as Mock).mockResolvedValueOnce(undefined);
      (db.notification.create as Mock).mockResolvedValueOnce({});

      await emailNotificationService.sendPriceChangeEmail({
        user: mockUser,
        subscription: mockSubscription,
        type: 'price_change',
        oldAmount: 12.99,
        newAmount: 15.99,
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Price Increase Alert: Netflix',
        html: expect.stringContaining('Netflix'),
        text: expect.stringContaining('Netflix'),
      });
    });

    it('should send price decrease email', async () => {
      (sendEmail as Mock).mockResolvedValueOnce(undefined);
      (db.notification.create as Mock).mockResolvedValueOnce({});

      await emailNotificationService.sendPriceChangeEmail({
        user: mockUser,
        subscription: mockSubscription,
        type: 'price_change',
        oldAmount: 15.99,
        newAmount: 12.99,
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Great News: Netflix Price Decreased!',
        html: expect.stringContaining('Netflix'),
        text: expect.stringContaining('Netflix'),
      });
    });
  });

  describe('sendMonthlySpendingEmail', () => {
    it('should send monthly spending summary', async () => {
      (sendEmail as Mock).mockResolvedValueOnce(undefined);
      (db.notification.create as Mock).mockResolvedValueOnce({});

      await emailNotificationService.sendMonthlySpendingEmail({
        user: mockUser,
        type: 'monthly_summary',
        spendingData: {
          totalSpent: 150.5,
          subscriptionCount: 8,
          topCategories: ['Entertainment', 'Software'],
        },
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Your Monthly Subscription Summary',
        html: expect.stringContaining('$150.50'),
        text: expect.stringContaining('$150.50'),
      });
    });
  });

  describe('sendRenewalReminderEmail', () => {
    it('should send renewal reminder with urgency for 3 days', async () => {
      (sendEmail as Mock).mockResolvedValueOnce(undefined);
      (db.notification.create as Mock).mockResolvedValueOnce({});

      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 3);

      await emailNotificationService.sendRenewalReminderEmail({
        user: mockUser,
        subscription: { ...mockSubscription, nextBilling: renewalDate },
        type: 'renewal_reminder',
        daysUntilRenewal: 3,
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Renewal Reminder: Netflix renews in 3 days',
        html: expect.stringContaining('Netflix'),
        text: expect.stringContaining('Netflix'),
      });
    });
  });

  describe('processScheduledNotifications', () => {
    it('should process and send scheduled notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-123',
          type: 'renewal_reminder',
          title: 'Test Notification',
          message: 'Test message',
          data: { subscriptionId: 'sub-123' },
          scheduledFor: new Date(),
        },
      ];

      (db.notification.findMany as Mock).mockResolvedValueOnce(
        mockNotifications
      );
      (db.user.findUnique as Mock).mockResolvedValueOnce({
        ...mockUser,
        notificationPreferences: { emailAlerts: true },
      });
      (sendEmail as Mock).mockResolvedValueOnce(undefined);
      (db.notification.update as Mock).mockResolvedValueOnce({});

      await emailNotificationService.processScheduledNotifications();

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test Notification',
        html: expect.stringContaining('Test message'),
        text: expect.stringContaining('Test message'),
      });
    });

    it('should skip notifications if email alerts are disabled', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-123',
          type: 'renewal_reminder',
          title: 'Test Notification',
          message: 'Test message',
          data: {},
          scheduledFor: new Date(),
        },
      ];

      (db.notification.findMany as Mock).mockResolvedValueOnce(
        mockNotifications
      );
      (db.user.findUnique as Mock).mockResolvedValueOnce({
        ...mockUser,
        notificationPreferences: { emailAlerts: false },
      });

      await emailNotificationService.processScheduledNotifications();

      expect(sendEmail).not.toHaveBeenCalled();
    });
  });
});
