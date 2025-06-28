/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

// Mock email module
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

// Mock database
vi.mock('@/server/db', () => ({
  db: {
    notification: {
      create: vi.fn(),
    },
  },
}));

// Import mocked modules
import { sendEmail } from '@/lib/email';
import { db } from '@/server/db';

// Mock email templates module
vi.mock('@/server/email-templates', () => ({
  welcomeEmailTemplate: vi.fn(() => ({
    html: 'Welcome HTML',
    text: 'Welcome Text',
  })),
  newSubscriptionTemplate: vi.fn(() => ({
    html: 'New Sub HTML',
    text: 'New Sub Text',
  })),
  priceChangeTemplate: vi.fn(() => ({
    html: 'Price Change HTML',
    text: 'Price Change Text',
  })),
  monthlySpendingTemplate: vi.fn(() => ({
    html: 'Monthly HTML',
    text: 'Monthly Text',
  })),
  cancellationConfirmationTemplate: vi.fn(() => ({
    html: 'Cancellation HTML',
    text: 'Cancellation Text',
  })),
  renewalReminderTemplate: vi.fn(() => ({
    html: 'Renewal HTML',
    text: 'Renewal Text',
  })),
  trialEndingTemplate: vi.fn(() => ({
    html: 'Trial HTML',
    text: 'Trial Text',
  })),
  paymentFailedTemplate: vi.fn(() => ({
    html: 'Payment Failed HTML',
    text: 'Payment Failed Text',
  })),
}));

// Import the service after mocks
import { emailNotificationService } from '../email.service';

describe('EmailNotificationService', () => {
  const mockNotificationCreate = vi.fn();

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
    provider: unknown; // JsonValue
    cancellationInfo: unknown; // JsonValue
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
    // Set up the mock for notification.create
    (db.notification.create as ReturnType<typeof vi.fn>) =
      mockNotificationCreate;
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email and create notification', async () => {
      // Setup mocks
      vi.mocked(sendEmail).mockResolvedValueOnce(undefined);

      mockNotificationCreate.mockResolvedValueOnce({} as never);

      await emailNotificationService.sendWelcomeEmail({
        user: mockUser,
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Welcome to SubPilot! 🎉',
        html: 'Welcome HTML',
        text: 'Welcome Text',
      });

      expect(mockNotificationCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: 'general',
          title: 'Welcome email sent',
          message: 'Your welcome email has been sent successfully.',
          data: {},
          scheduledFor: expect.any(Date) as Date,
        },
      });
    });
  });

  describe('sendNewSubscriptionEmail', () => {
    it('should send new subscription email', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce(undefined);
      mockNotificationCreate.mockResolvedValueOnce({} as never);

      await emailNotificationService.sendNewSubscriptionEmail({
        user: mockUser,
        subscription: mockSubscription as any,
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'New subscription detected: Netflix',
        html: 'New Sub HTML',
        text: 'New Sub Text',
      });

      expect(mockNotificationCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          subscriptionId: 'sub-123',
          type: 'new_subscription',
          title: 'New subscription detected',
          message: 'We detected a new subscription for Netflix',
          data: {},
          scheduledFor: expect.any(Date) as Date,
        },
      });
    });
  });

  describe('sendPriceChangeEmail', () => {
    it('should send price change email', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce(undefined);
      mockNotificationCreate.mockResolvedValueOnce({} as never);

      await emailNotificationService.sendPriceChangeEmail({
        user: mockUser,
        subscription: mockSubscription as any,
        oldAmount: 12.99,
        newAmount: 15.99,
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Price increase alert: Netflix',
        html: 'Price Change HTML',
        text: 'Price Change Text',
      });
    });
  });

  describe('sendRenewalReminderEmail', () => {
    it('should send renewal reminder email', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce(undefined);
      mockNotificationCreate.mockResolvedValueOnce({} as never);

      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 3);

      await emailNotificationService.sendRenewalReminderEmail({
        user: mockUser,
        subscription: mockSubscription as any,
        renewalDate: renewalDate,
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Renewal reminder: Netflix renews in 3 days',
        html: 'Renewal HTML',
        text: 'Renewal Text',
      });
    });
  });

  describe('sendCancellationEmail', () => {
    it('should send cancellation confirmation email', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce(undefined);
      mockNotificationCreate.mockResolvedValueOnce({} as never);

      await emailNotificationService.sendCancellationEmail({
        user: mockUser,
        subscription: mockSubscription as any,
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Subscription cancelled: Netflix',
        html: 'Cancellation HTML',
        text: 'Cancellation Text',
      });
    });
  });

  describe('sendMonthlySpendingEmail', () => {
    it('should send monthly spending email', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce(undefined);
      mockNotificationCreate.mockResolvedValueOnce({} as never);

      await emailNotificationService.sendMonthlySpendingEmail({
        user: mockUser,
        spendingData: {
          totalSpent: 150.5,
          subscriptionCount: 5,
          topCategories: [{ category: 'Entertainment', amount: 50 }],
          monthlyChange: 10,
        },
      });

      const currentMonth = new Date().toLocaleString('default', {
        month: 'long',
      });
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: `Your ${currentMonth} spending summary`,
        html: 'Monthly HTML',
        text: 'Monthly Text',
      });
    });
  });

  describe('sendPaymentFailedEmail', () => {
    it('should send payment failed email', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce(undefined);
      mockNotificationCreate.mockResolvedValueOnce({} as never);

      await emailNotificationService.sendPaymentFailedEmail({
        user: mockUser,
        subscription: mockSubscription as any,
        errorMessage: 'Insufficient funds',
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Payment failed: Netflix',
        html: 'Payment Failed HTML',
        text: 'Payment Failed Text',
      });
    });
  });

  describe('sendTrialEndingEmail', () => {
    it('should send trial ending email', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce(undefined);
      mockNotificationCreate.mockResolvedValueOnce({} as never);

      const trialEndDate = new Date('2024-02-01');

      await emailNotificationService.sendTrialEndingEmail({
        user: mockUser,
        subscription: mockSubscription as any,
        trialEndDate: trialEndDate,
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Trial ending soon: Netflix',
        html: 'Trial HTML',
        text: 'Trial Text',
      });
    });
  });
});
