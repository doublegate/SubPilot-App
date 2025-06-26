/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { sendEmail } from '@/lib/email';
import { db } from '@/server/db';
import { Decimal } from '@prisma/client/runtime/library';

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

  interface MockSubscription {
    id: string;
    name: string;
    amount: Decimal;
    currency: string;
    frequency: string;
    category: string;
    status: string;
    isActive: boolean;
    detectionConfidence: Decimal;
    detectedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    description: string | null;
    nextBilling: Date | null;
    lastBilling: Date | null;
    notes: string | null;
    provider: any; // JsonValue is complex, use any for test simplicity
    cancellationInfo: any; // JsonValue is complex, use any for test simplicity
  }

  const mockSubscription: MockSubscription = {
    id: 'sub-123',
    name: 'Netflix',
    amount: new Decimal(15.99),
    currency: 'USD',
    frequency: 'monthly',
    category: 'Entertainment',
    status: 'active',
    isActive: true,
    detectionConfidence: new Decimal(0.95),
    detectedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: mockUser.id,
    description: 'Streaming service',
    nextBilling: new Date(),
    lastBilling: new Date(),
    notes: null,
    provider: {},
    cancellationInfo: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email and create notification', async () => {
      const mockSendEmail = sendEmail as Mock;
      const mockCreateNotification = db.notification.create as Mock;

      mockSendEmail.mockResolvedValueOnce(undefined);
      mockCreateNotification.mockResolvedValueOnce({});

      await emailNotificationService.sendWelcomeEmail({
        user: mockUser,
      });

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Welcome to SubPilot! 🎉',
        html: expect.stringContaining('Welcome to SubPilot, Test User'),
        text: expect.stringContaining('Welcome to SubPilot, Test User'),
      });

      expect(mockCreateNotification).toHaveBeenCalledWith({
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
      const mockSendEmail = sendEmail as Mock;
      const mockCreateNotification = db.notification.create as Mock;

      mockSendEmail.mockResolvedValueOnce(undefined);
      mockCreateNotification.mockResolvedValueOnce({});

      await emailNotificationService.sendNewSubscriptionEmail({
        user: mockUser,
        subscription: mockSubscription,
      });

      expect(mockSendEmail).toHaveBeenCalledWith({
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
        })
      ).rejects.toThrow('Subscription data is required');
    });
  });

  describe('sendPriceChangeEmail', () => {
    it('should send price increase email', async () => {
      const mockSendEmail = sendEmail as Mock;
      const mockCreateNotification = db.notification.create as Mock;

      mockSendEmail.mockResolvedValueOnce(undefined);
      mockCreateNotification.mockResolvedValueOnce({});

      await emailNotificationService.sendPriceChangeEmail({
        user: mockUser,
        subscription: mockSubscription,
        oldAmount: 12.99,
        newAmount: 15.99,
      });

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Price Increase Alert: Netflix',
        html: expect.stringContaining('Netflix'),
        text: expect.stringContaining('Netflix'),
      });
    });

    it('should send price decrease email', async () => {
      const mockSendEmail = sendEmail as Mock;
      const mockCreateNotification = db.notification.create as Mock;

      mockSendEmail.mockResolvedValueOnce(undefined);
      mockCreateNotification.mockResolvedValueOnce({});

      await emailNotificationService.sendPriceChangeEmail({
        user: mockUser,
        subscription: mockSubscription,
        oldAmount: 15.99,
        newAmount: 12.99,
      });

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Great News: Netflix Price Decreased!',
        html: expect.stringContaining('Netflix'),
        text: expect.stringContaining('Netflix'),
      });
    });
  });

  describe('sendMonthlySpendingEmail', () => {
    it('should send monthly spending summary', async () => {
      const mockSendEmail = sendEmail as Mock;
      const mockCreateNotification = db.notification.create as Mock;

      mockSendEmail.mockResolvedValueOnce(undefined);
      mockCreateNotification.mockResolvedValueOnce({});

      await emailNotificationService.sendMonthlySpendingEmail({
        user: mockUser,
        spendingData: {
          totalSpent: 150.5,
          subscriptionCount: 8,
          topCategories: [
            { category: 'Entertainment', amount: 50.0 },
            { category: 'Software', amount: 30.0 },
          ],
          monthlyChange: 10.5,
        },
      });

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Your Monthly Subscription Summary',
        html: expect.stringContaining('$150.50'),
        text: expect.stringContaining('$150.50'),
      });
    });
  });

  describe('sendRenewalReminderEmail', () => {
    it('should send renewal reminder with urgency for 3 days', async () => {
      const mockSendEmail = sendEmail as Mock;
      const mockCreateNotification = db.notification.create as Mock;

      mockSendEmail.mockResolvedValueOnce(undefined);
      mockCreateNotification.mockResolvedValueOnce({});

      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 3);

      await emailNotificationService.sendRenewalReminderEmail({
        user: mockUser,
        subscription: { ...mockSubscription, nextBilling: renewalDate },
      });

      expect(mockSendEmail).toHaveBeenCalledWith({
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

      const mockFindManyNotifications = db.notification.findMany as Mock;
      const mockFindUniqueUser = db.user.findUnique as Mock;
      const mockSendEmail = sendEmail as Mock;
      const mockUpdateNotification = db.notification.update as Mock;

      mockFindManyNotifications.mockResolvedValueOnce(mockNotifications);
      mockFindUniqueUser.mockResolvedValueOnce({
        ...mockUser,
        notificationPreferences: { emailAlerts: true },
      });
      mockSendEmail.mockResolvedValueOnce(undefined);
      mockUpdateNotification.mockResolvedValueOnce({});

      await emailNotificationService.processScheduledNotifications();

      expect(mockSendEmail).toHaveBeenCalledWith({
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

      const mockFindManyNotifications = db.notification.findMany as Mock;
      const mockFindUniqueUser = db.user.findUnique as Mock;
      const mockSendEmail = sendEmail as Mock;

      mockFindManyNotifications.mockResolvedValueOnce(mockNotifications);
      mockFindUniqueUser.mockResolvedValueOnce({
        ...mockUser,
        notificationPreferences: { emailAlerts: false },
      });

      await emailNotificationService.processScheduledNotifications();

      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });
});
