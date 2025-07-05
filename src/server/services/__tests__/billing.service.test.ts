import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { BillingService } from '../billing.service';
import type { PrismaClient } from '@prisma/client';
import type Stripe from 'stripe';

// Mock Stripe functions
const mockStripeCustomersCreate = vi.fn();
const mockStripeCustomersRetrieve = vi.fn();
const mockStripeSubscriptionsRetrieve = vi.fn();
const mockStripeSubscriptionsUpdate = vi.fn();
const mockStripeCheckoutSessionsCreate = vi.fn();
const mockStripeBillingPortalSessionsCreate = vi.fn();
const mockStripeInvoicesList = vi.fn();

// Mock Prisma functions
const mockUserFindUnique = vi.fn();
const mockPricingPlanFindUnique = vi.fn();
const mockUserSubscriptionFindUnique = vi.fn();
const mockUserSubscriptionUpdate = vi.fn();
const mockBillingEventCreate = vi.fn();

// Mock dependencies
const mockDb = {
  user: {
    findUnique: mockUserFindUnique,
    update: vi.fn(),
  },
  pricingPlan: {
    findMany: vi.fn(),
    findUnique: mockPricingPlanFindUnique,
  },
  userSubscription: {
    findUnique: mockUserSubscriptionFindUnique,
    create: vi.fn(),
    update: mockUserSubscriptionUpdate,
    upsert: vi.fn(),
    count: vi.fn(),
  },
  billingEvent: {
    create: mockBillingEventCreate,
  },
  $transaction: vi.fn(),
} as unknown as PrismaClient;

const mockStripe = {
  customers: {
    create: mockStripeCustomersCreate,
    retrieve: mockStripeCustomersRetrieve,
    update: vi.fn(),
  },
  subscriptions: {
    create: vi.fn(),
    retrieve: mockStripeSubscriptionsRetrieve,
    update: mockStripeSubscriptionsUpdate,
    cancel: vi.fn(),
    list: vi.fn(),
  },
  paymentIntents: {
    create: vi.fn(),
  },
  checkout: {
    sessions: {
      create: mockStripeCheckoutSessionsCreate,
    },
  },
  billingPortal: {
    sessions: {
      create: mockStripeBillingPortalSessionsCreate,
    },
  },
  invoices: {
    list: mockStripeInvoicesList,
  },
} as unknown as Stripe;

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

vi.mock('@/server/lib/stripe', () => ({
  getStripe: vi.fn(() => mockStripe),
  STRIPE_WEBHOOK_EVENTS: {
    CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
    CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
    CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
    INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
    INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  },
}));

describe('BillingService', () => {
  let billingService: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    billingService = new BillingService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreateStripeCustomer', () => {
    it('returns existing customer when stripeCustomerId exists', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        name: 'Test User',
        userSubscription: {
          stripeCustomerId: 'cus_123',
        },
      };
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
        deleted: false,
      };

      mockUserFindUnique.mockResolvedValue(mockUser);
      mockStripeCustomersRetrieve.mockResolvedValue(mockCustomer);

      const result = await billingService.getOrCreateStripeCustomer('user1');

      expect(result).toEqual(mockCustomer);
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        include: { userSubscription: true },
      });
    });

    it('creates new customer when none exists', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        name: 'Test User',
        userSubscription: null,
      };
      const mockCustomer = {
        id: 'cus_new123',
        email: 'test@example.com',
      };

      mockUserFindUnique.mockResolvedValue(mockUser);
      mockStripeCustomersCreate.mockResolvedValue(mockCustomer);

      const result = await billingService.getOrCreateStripeCustomer('user1');

      expect(result).toEqual(mockCustomer);
      expect(mockStripeCustomersCreate).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          userId: 'user1',
        },
      });
    });

    it('throws error when user not found', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      await expect(
        billingService.getOrCreateStripeCustomer('nonexistent')
      ).rejects.toThrow('User not found');
    });
  });

  describe('getInvoices', () => {
    it('returns invoices for user with subscription', async () => {
      const mockUserSubscription = {
        stripeCustomerId: 'cus_123',
      };
      const mockInvoices = {
        data: [
          {
            id: 'in_123',
            number: 'INV-001',
            status: 'paid',
            amount_paid: 999,
            currency: 'usd',
          },
        ],
      };

      mockUserSubscriptionFindUnique.mockResolvedValue(mockUserSubscription);
      mockStripeInvoicesList.mockResolvedValue(mockInvoices);

      const result = await billingService.getInvoices('user1');

      expect(result).toEqual(mockInvoices.data);
      expect(mockUserSubscriptionFindUnique).toHaveBeenCalledWith({
        where: { userId: 'user1' },
      });
      expect(mockStripeInvoicesList).toHaveBeenCalledWith({
        customer: 'cus_123',
        limit: 10,
      });
    });

    it('returns empty array when no subscription found', async () => {
      mockUserSubscriptionFindUnique.mockResolvedValue(null);

      const result = await billingService.getInvoices('user1');

      expect(result).toEqual([]);
    });
  });

  describe('createPortalSession', () => {
    it('creates a billing portal session', async () => {
      const mockUserSubscription = {
        stripeCustomerId: 'cus_123',
      };
      const mockSession = {
        id: 'bps_123',
        url: 'https://billing.stripe.com/session/123',
      };

      mockUserSubscriptionFindUnique.mockResolvedValue(mockUserSubscription);
      mockStripeBillingPortalSessionsCreate.mockResolvedValue(mockSession);

      const result = await billingService.createPortalSession({
        userId: 'user1',
        returnUrl: 'https://app.com/billing',
      });

      expect(result).toEqual(mockSession);
      expect(mockStripeBillingPortalSessionsCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://app.com/billing',
      });
    });

    it('throws error when no subscription found', async () => {
      mockUserSubscriptionFindUnique.mockResolvedValue(null);

      await expect(
        billingService.createPortalSession({
          userId: 'user1',
          returnUrl: 'https://app.com/billing',
        })
      ).rejects.toThrow('No active subscription found');
    });
  });

  describe('updateSubscription', () => {
    it('updates subscription to new plan', async () => {
      const mockUserSubscription = {
        id: 'sub_local_123',
        stripeSubscriptionId: 'sub_stripe_123',
      };
      const mockPlan = {
        id: 'premium',
        stripePriceId: 'price_123',
      };
      const mockSubscription = {
        id: 'sub_stripe_123',
        items: {
          data: [{ id: 'si_123' }],
        },
      };

      mockUserSubscriptionFindUnique.mockResolvedValue(mockUserSubscription);
      mockPricingPlanFindUnique.mockResolvedValue(mockPlan);
      mockStripeSubscriptionsRetrieve.mockResolvedValue(mockSubscription);
      mockStripeSubscriptionsUpdate.mockResolvedValue({});
      mockUserSubscriptionUpdate.mockResolvedValue({});

      await billingService.updateSubscription({
        userId: 'user1',
        newPlanId: 'premium',
      });

      expect(mockStripeSubscriptionsUpdate).toHaveBeenCalledWith(
        'sub_stripe_123',
        {
          items: [
            {
              id: 'si_123',
              price: 'price_123',
            },
          ],
          proration_behavior: 'create_prorations',
        }
      );
      expect(mockUserSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: 'sub_local_123' },
        data: {
          planId: 'premium',
          stripePriceId: 'price_123',
        },
      });
    });

    it('throws error when no subscription found', async () => {
      mockUserSubscriptionFindUnique.mockResolvedValue(null);

      await expect(
        billingService.updateSubscription({
          userId: 'user1',
          newPlanId: 'premium',
        })
      ).rejects.toThrow('No active subscription found');
    });
  });

  describe('createCheckoutSession', () => {
    it('creates a Stripe checkout session', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        name: 'Test User',
        userSubscription: null,
      };
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
      };
      const mockPlan = {
        id: 'premium',
        stripePriceId: 'price_123',
        name: 'Premium',
      };
      const mockSession = {
        id: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      };

      mockUserFindUnique.mockResolvedValue(mockUser);
      mockPricingPlanFindUnique.mockResolvedValue(mockPlan);
      mockStripeCustomersCreate.mockResolvedValue(mockCustomer);
      mockStripeCheckoutSessionsCreate.mockResolvedValue(mockSession);

      const result = await billingService.createCheckoutSession({
        userId: 'user1',
        planId: 'premium',
        successUrl: 'https://success.com',
        cancelUrl: 'https://cancel.com',
      });

      expect(result).toEqual(mockSession);
      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        payment_method_types: ['card'],
        mode: 'subscription',
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        line_items: [
          {
            price: 'price_123',
            quantity: 1,
          },
        ],
        success_url: 'https://success.com',
        cancel_url: 'https://cancel.com',
        metadata: {
          userId: 'user1',
          planId: 'premium',
        },
        subscription_data: {
          trial_period_days: 14,
          metadata: {
            userId: 'user1',
            planId: 'premium',
          },
        },
      });
    });

    it('throws error when plan not found', async () => {
      mockPricingPlanFindUnique.mockResolvedValue(null);

      await expect(
        billingService.createCheckoutSession({
          userId: 'user1',
          planId: 'nonexistent',
          successUrl: 'https://success.com',
          cancelUrl: 'https://cancel.com',
        })
      ).rejects.toThrow('Invalid pricing plan');
    });
  });

  describe('reactivateSubscription', () => {
    it('reactivates cancelled subscription', async () => {
      const mockUserSubscription = {
        id: 'sub_local_123',
        stripeSubscriptionId: 'sub_stripe_123',
      };

      mockUserSubscriptionFindUnique.mockResolvedValue(mockUserSubscription);
      mockStripeSubscriptionsUpdate.mockResolvedValue({});
      mockUserSubscriptionUpdate.mockResolvedValue({});

      await billingService.reactivateSubscription('user1');

      expect(mockStripeSubscriptionsUpdate).toHaveBeenCalledWith(
        'sub_stripe_123',
        {
          cancel_at_period_end: false,
        }
      );
      expect(mockUserSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: 'sub_local_123' },
        data: {
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      });
    });

    it('throws error when no subscription found', async () => {
      mockUserSubscriptionFindUnique.mockResolvedValue(null);

      await expect(
        billingService.reactivateSubscription('user1')
      ).rejects.toThrow('No subscription found');
    });
  });

  describe('cancelSubscription', () => {
    it('cancels user subscription at period end', async () => {
      const mockUserSubscription = {
        id: 'sub_local_123',
        stripeSubscriptionId: 'sub_stripe_123',
      };

      mockUserSubscriptionFindUnique.mockResolvedValue(mockUserSubscription);
      mockStripeSubscriptionsUpdate.mockResolvedValue({});
      mockUserSubscriptionUpdate.mockResolvedValue({});

      await billingService.cancelSubscription('user1');

      expect(mockStripeSubscriptionsUpdate).toHaveBeenCalledWith(
        'sub_stripe_123',
        {
          cancel_at_period_end: true,
        }
      );
      expect(mockUserSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: 'sub_local_123' },
        data: {
          cancelAtPeriodEnd: true,
          canceledAt: expect.any(Date),
        },
      });
    });

    it('throws error when no subscription found', async () => {
      mockUserSubscriptionFindUnique.mockResolvedValue(null);

      await expect(billingService.cancelSubscription('user1')).rejects.toThrow(
        'No active subscription found'
      );
    });
  });
});
