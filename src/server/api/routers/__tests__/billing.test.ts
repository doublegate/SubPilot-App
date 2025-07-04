import { expect, describe, it, vi, beforeEach } from 'vitest';
import { billingRouter } from '../billing';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { BillingService } from '@/server/services/billing.service';
import { SubscriptionManagerService } from '@/server/services/subscription-manager.service';
import type { Session } from 'next-auth';

// Mock the services
vi.mock('@/server/services/billing.service');
vi.mock('@/server/services/subscription-manager.service');

// Mock Prisma client
vi.mock('@/server/db', () => ({
  db: {
    // Add any specific mocks as needed
  },
}));

const mockSession: Session = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

describe('Billing Router', () => {
  let ctx: ReturnType<typeof createInnerTRPCContext>;
  let caller: ReturnType<typeof billingRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock environment variable
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');

    ctx = createInnerTRPCContext({ session: mockSession });
    caller = billingRouter.createCaller(ctx);
  });

  describe('getSubscription', () => {
    it('should get user subscription status', async () => {
      const mockSubscription = {
        id: 'sub-123',
        planId: 'plan-premium',
        status: 'active',
        currentPeriodEnd: new Date(),
      };

      const mockGetUserSubscription = vi
        .fn()
        .mockResolvedValue(mockSubscription);
      vi.mocked(SubscriptionManagerService).mockImplementation(
        () =>
          ({
            getUserSubscription: mockGetUserSubscription,
          }) as any
      );

      const result = await caller.getSubscription();

      expect(mockGetUserSubscription).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('getPlans', () => {
    it('should get available pricing plans', async () => {
      const mockPlans = [
        {
          id: 'plan-free',
          name: 'Free',
          price: 0,
          features: ['basic_features'],
        },
        {
          id: 'plan-premium',
          name: 'Premium',
          price: 999,
          features: ['basic_features', 'premium_features'],
        },
      ];

      const mockGetAvailablePlans = vi.fn().mockResolvedValue(mockPlans);
      vi.mocked(SubscriptionManagerService).mockImplementation(
        () =>
          ({
            getAvailablePlans: mockGetAvailablePlans,
          }) as any
      );

      const result = await caller.getPlans();

      expect(mockGetAvailablePlans).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockPlans);
    });
  });

  describe('hasFeature', () => {
    it('should check if user has specific feature access', async () => {
      const mockHasFeature = vi.fn().mockResolvedValue(true);
      vi.mocked(SubscriptionManagerService).mockImplementation(
        () =>
          ({
            hasFeature: mockHasFeature,
          }) as any
      );

      const result = await caller.hasFeature({ feature: 'ai_assistant' });

      expect(mockHasFeature).toHaveBeenCalledWith('user-123', 'ai_assistant');
      expect(result).toBe(true);
    });

    it('should return false for feature not available', async () => {
      const mockHasFeature = vi.fn().mockResolvedValue(false);
      vi.mocked(SubscriptionManagerService).mockImplementation(
        () =>
          ({
            hasFeature: mockHasFeature,
          }) as any
      );

      const result = await caller.hasFeature({ feature: 'premium_export' });

      expect(mockHasFeature).toHaveBeenCalledWith('user-123', 'premium_export');
      expect(result).toBe(false);
    });
  });

  describe('getUsageLimits', () => {
    it('should get user usage limits', async () => {
      const mockUsageLimits = {
        bankAccounts: { used: 2, limit: 5 },
        exportRequests: { used: 1, limit: 10 },
        aiQueries: { used: 50, limit: 100 },
      };

      const mockCheckUsageLimits = vi.fn().mockResolvedValue(mockUsageLimits);
      vi.mocked(SubscriptionManagerService).mockImplementation(
        () =>
          ({
            checkUsageLimits: mockCheckUsageLimits,
          }) as any
      );

      const result = await caller.getUsageLimits();

      expect(mockCheckUsageLimits).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUsageLimits);
    });
  });

  describe('getStats', () => {
    it('should get subscription statistics', async () => {
      const mockStats = {
        totalSubscriptions: 15,
        totalSpending: 29999,
        averageMonthlySpend: 1999,
        topCategories: ['streaming', 'software', 'fitness'],
      };

      const mockGetSubscriptionStats = vi.fn().mockResolvedValue(mockStats);
      vi.mocked(SubscriptionManagerService).mockImplementation(
        () =>
          ({
            getSubscriptionStats: mockGetSubscriptionStats,
          }) as any
      );

      const result = await caller.getStats();

      expect(mockGetSubscriptionStats).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockStats);
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session for plan upgrade', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      const mockCreateCheckoutSession = vi.fn().mockResolvedValue(mockSession);
      vi.mocked(BillingService).mockImplementation(
        () =>
          ({
            createCheckoutSession: mockCreateCheckoutSession,
          }) as any
      );

      const result = await caller.createCheckoutSession({
        planId: 'plan-premium',
      });

      expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
        userId: 'user-123',
        planId: 'plan-premium',
        successUrl: 'http://localhost:3000/dashboard?upgrade=success',
        cancelUrl: 'http://localhost:3000/dashboard/settings/billing',
      });
      expect(result).toEqual({
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });
    });

    it('should use environment app URL for checkout URLs', async () => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.subpilot.com');

      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      const mockCreateCheckoutSession = vi.fn().mockResolvedValue(mockSession);
      vi.mocked(BillingService).mockImplementation(
        () =>
          ({
            createCheckoutSession: mockCreateCheckoutSession,
          }) as any
      );

      await caller.createCheckoutSession({ planId: 'plan-premium' });

      expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
        userId: 'user-123',
        planId: 'plan-premium',
        successUrl: 'https://app.subpilot.com/dashboard?upgrade=success',
        cancelUrl: 'https://app.subpilot.com/dashboard/settings/billing',
      });
    });
  });

  describe('createPortalSession', () => {
    it('should create billing portal session', async () => {
      const mockSession = {
        id: 'bps_test_123',
        url: 'https://billing.stripe.com/p/session/bps_test_123',
      };

      const mockCreatePortalSession = vi.fn().mockResolvedValue(mockSession);
      vi.mocked(BillingService).mockImplementation(
        () =>
          ({
            createPortalSession: mockCreatePortalSession,
          }) as any
      );

      const result = await caller.createPortalSession();

      expect(mockCreatePortalSession).toHaveBeenCalledWith({
        userId: 'user-123',
        returnUrl: 'http://localhost:3000/dashboard/settings/billing',
      });
      expect(result).toEqual({
        url: 'https://billing.stripe.com/p/session/bps_test_123',
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel user subscription', async () => {
      const mockCancelSubscription = vi.fn().mockResolvedValue(undefined);
      vi.mocked(BillingService).mockImplementation(
        () =>
          ({
            cancelSubscription: mockCancelSubscription,
          }) as any
      );

      const result = await caller.cancelSubscription();

      expect(mockCancelSubscription).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ success: true });
    });

    it('should handle cancellation errors', async () => {
      const mockCancelSubscription = vi
        .fn()
        .mockRejectedValue(new Error('Cancellation failed'));
      vi.mocked(BillingService).mockImplementation(
        () =>
          ({
            cancelSubscription: mockCancelSubscription,
          }) as any
      );

      await expect(caller.cancelSubscription()).rejects.toThrow(
        'Cancellation failed'
      );
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate cancelled subscription', async () => {
      const mockReactivateSubscription = vi.fn().mockResolvedValue(undefined);
      vi.mocked(BillingService).mockImplementation(
        () =>
          ({
            reactivateSubscription: mockReactivateSubscription,
          }) as any
      );

      const result = await caller.reactivateSubscription();

      expect(mockReactivateSubscription).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ success: true });
    });

    it('should handle reactivation errors', async () => {
      const mockReactivateSubscription = vi
        .fn()
        .mockRejectedValue(new Error('Reactivation failed'));
      vi.mocked(BillingService).mockImplementation(
        () =>
          ({
            reactivateSubscription: mockReactivateSubscription,
          }) as any
      );

      await expect(caller.reactivateSubscription()).rejects.toThrow(
        'Reactivation failed'
      );
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription to new plan', async () => {
      const mockUpdateSubscription = vi.fn().mockResolvedValue(undefined);
      vi.mocked(BillingService).mockImplementation(
        () =>
          ({
            updateSubscription: mockUpdateSubscription,
          }) as any
      );

      const result = await caller.updateSubscription({
        planId: 'plan-enterprise',
      });

      expect(mockUpdateSubscription).toHaveBeenCalledWith({
        userId: 'user-123',
        newPlanId: 'plan-enterprise',
      });
      expect(result).toEqual({ success: true });
    });

    it('should handle update errors', async () => {
      const mockUpdateSubscription = vi
        .fn()
        .mockRejectedValue(new Error('Update failed'));
      vi.mocked(BillingService).mockImplementation(
        () =>
          ({
            updateSubscription: mockUpdateSubscription,
          }) as any
      );

      await expect(
        caller.updateSubscription({ planId: 'plan-enterprise' })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('getInvoices', () => {
    it('should get user invoices with formatting', async () => {
      const mockInvoices = [
        {
          id: 'in_123',
          number: 'INV-001',
          status: 'paid',
          amount_paid: 999,
          currency: 'usd',
          status_transitions: {
            paid_at: 1640995200, // 2022-01-01 00:00:00 UTC
          },
          invoice_pdf: 'https://files.stripe.com/invoice.pdf',
          hosted_invoice_url: 'https://invoice.stripe.com/i/inv_123',
        },
        {
          id: 'in_456',
          number: 'INV-002',
          status: 'open',
          amount_paid: 0,
          currency: 'usd',
          status_transitions: {
            paid_at: null,
          },
          invoice_pdf: null,
          hosted_invoice_url: 'https://invoice.stripe.com/i/inv_456',
        },
      ];

      const mockGetInvoices = vi.fn().mockResolvedValue(mockInvoices);
      vi.mocked(BillingService).mockImplementation(
        () =>
          ({
            getInvoices: mockGetInvoices,
          }) as any
      );

      const result = await caller.getInvoices({ limit: 10 });

      expect(mockGetInvoices).toHaveBeenCalledWith('user-123', 10);
      expect(result).toEqual([
        {
          id: 'in_123',
          number: 'INV-001',
          status: 'paid',
          amount: 9.99,
          currency: 'usd',
          paidAt: new Date('2022-01-01T00:00:00.000Z'),
          invoicePdf: 'https://files.stripe.com/invoice.pdf',
          hostedInvoiceUrl: 'https://invoice.stripe.com/i/inv_123',
        },
        {
          id: 'in_456',
          number: 'INV-002',
          status: 'open',
          amount: 0,
          currency: 'usd',
          paidAt: null,
          invoicePdf: null,
          hostedInvoiceUrl: 'https://invoice.stripe.com/i/inv_456',
        },
      ]);
    });

    it('should use default limit when not specified', async () => {
      const mockGetInvoices = vi.fn().mockResolvedValue([]);
      vi.mocked(BillingService).mockImplementation(
        () =>
          ({
            getInvoices: mockGetInvoices,
          }) as any
      );

      await caller.getInvoices({});

      expect(mockGetInvoices).toHaveBeenCalledWith('user-123', 10);
    });

    it('should handle invoice errors', async () => {
      const mockGetInvoices = vi
        .fn()
        .mockRejectedValue(new Error('Invoice fetch failed'));
      vi.mocked(BillingService).mockImplementation(
        () =>
          ({
            getInvoices: mockGetInvoices,
          }) as any
      );

      await expect(caller.getInvoices({ limit: 5 })).rejects.toThrow(
        'Invoice fetch failed'
      );
    });
  });

  describe('canPerformAction', () => {
    it('should check if user can add bank account', async () => {
      const mockCanPerformAction = vi.fn().mockResolvedValue(true);
      vi.mocked(SubscriptionManagerService).mockImplementation(
        () =>
          ({
            canPerformAction: mockCanPerformAction,
          }) as any
      );

      const result = await caller.canPerformAction({
        action: 'add_bank_account',
      });

      expect(mockCanPerformAction).toHaveBeenCalledWith(
        'user-123',
        'add_bank_account'
      );
      expect(result).toBe(true);
    });

    it('should check if user can invite team members', async () => {
      const mockCanPerformAction = vi.fn().mockResolvedValue(false);
      vi.mocked(SubscriptionManagerService).mockImplementation(
        () =>
          ({
            canPerformAction: mockCanPerformAction,
          }) as any
      );

      const result = await caller.canPerformAction({
        action: 'invite_team_member',
      });

      expect(mockCanPerformAction).toHaveBeenCalledWith(
        'user-123',
        'invite_team_member'
      );
      expect(result).toBe(false);
    });

    it('should check if user can use AI assistant', async () => {
      const mockCanPerformAction = vi.fn().mockResolvedValue(true);
      vi.mocked(SubscriptionManagerService).mockImplementation(
        () =>
          ({
            canPerformAction: mockCanPerformAction,
          }) as any
      );

      const result = await caller.canPerformAction({
        action: 'use_ai_assistant',
      });

      expect(mockCanPerformAction).toHaveBeenCalledWith(
        'user-123',
        'use_ai_assistant'
      );
      expect(result).toBe(true);
    });

    it('should check if user can export data', async () => {
      const mockCanPerformAction = vi.fn().mockResolvedValue(true);
      vi.mocked(SubscriptionManagerService).mockImplementation(
        () =>
          ({
            canPerformAction: mockCanPerformAction,
          }) as any
      );

      const result = await caller.canPerformAction({ action: 'export_data' });

      expect(mockCanPerformAction).toHaveBeenCalledWith(
        'user-123',
        'export_data'
      );
      expect(result).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should validate planId input for createCheckoutSession', async () => {
      await expect(
        caller.createCheckoutSession({ planId: '' })
      ).rejects.toThrow();
    });

    it('should validate planId input for updateSubscription', async () => {
      await expect(caller.updateSubscription({ planId: '' })).rejects.toThrow();
    });

    it('should validate feature input for hasFeature', async () => {
      await expect(caller.hasFeature({ feature: '' })).rejects.toThrow();
    });

    it('should validate action input for canPerformAction', async () => {
      await expect(
        caller.canPerformAction({ action: 'invalid_action' as any })
      ).rejects.toThrow();
    });

    it('should validate limit bounds for getInvoices', async () => {
      await expect(caller.getInvoices({ limit: 0 })).rejects.toThrow();
      await expect(caller.getInvoices({ limit: 101 })).rejects.toThrow();
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      const unauthenticatedCtx = createInnerTRPCContext({ session: null });
      const unauthenticatedCaller =
        billingRouter.createCaller(unauthenticatedCtx);

      // Test a few endpoints to ensure they all require authentication
      await expect(unauthenticatedCaller.getSubscription()).rejects.toThrow();
      await expect(unauthenticatedCaller.getPlans()).rejects.toThrow();
      await expect(
        unauthenticatedCaller.createCheckoutSession({ planId: 'plan-premium' })
      ).rejects.toThrow();
    });
  });
});
