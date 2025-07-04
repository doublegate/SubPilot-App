import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { BillingService } from '../billing.service';

// Mock dependencies
const mockDb = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  billingPlan: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  subscription: {
    count: vi.fn(),
  },
  $transaction: vi.fn(),
};

const mockStripe = {
  customers: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
  },
  subscriptions: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    list: vi.fn(),
  },
  paymentIntents: {
    create: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
};

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

vi.mock('@/server/lib/stripe', () => ({
  stripe: mockStripe,
}));

describe('BillingService', () => {
  let billingService: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    billingService = new BillingService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserBillingInfo', () => {
    it('returns user billing information', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        stripeCustomerId: 'cus_123',
        currentPlan: 'premium',
        billingCycle: 'monthly',
      };

      mockDb.user.findUnique.mockResolvedValue(mockUser);

      const result = await billingService.getUserBillingInfo('user1');

      expect(result).toEqual(mockUser);
      expect(mockDb.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        select: {
          id: true,
          email: true,
          stripeCustomerId: true,
          currentPlan: true,
          billingCycle: true,
          planExpiresAt: true,
          createdAt: true,
        },
      });
    });

    it('returns null when user not found', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      const result = await billingService.getUserBillingInfo('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAvailablePlans', () => {
    it('returns all available billing plans', async () => {
      const mockPlans = [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          features: ['feature1'],
        },
        {
          id: 'premium',
          name: 'Premium',
          price: 999,
          features: ['feature1', 'feature2'],
        },
      ];

      mockDb.billingPlan.findMany.mockResolvedValue(mockPlans);

      const result = await billingService.getAvailablePlans();

      expect(result).toEqual(mockPlans);
      expect(mockDb.billingPlan.findMany).toHaveBeenCalledWith({
        orderBy: { price: 'asc' },
      });
    });
  });

  describe('createStripeCustomer', () => {
    it('creates a new Stripe customer', async () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
      };

      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await billingService.createStripeCustomer(
        'user1',
        'test@example.com'
      );

      expect(result).toEqual(mockCustomer);
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: {
          userId: 'user1',
        },
      });
    });
  });

  describe('canPerformAction', () => {
    it('returns true for free plan features', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        currentPlan: 'free',
      });

      const result = await billingService.canPerformAction(
        'user1',
        'basic_analytics'
      );

      expect(result).toBe(true);
    });

    it('returns false for premium features on free plan', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        currentPlan: 'free',
      });

      const result = await billingService.canPerformAction(
        'user1',
        'advanced_analytics'
      );

      expect(result).toBe(false);
    });

    it('returns true for premium features on premium plan', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        currentPlan: 'premium',
      });

      const result = await billingService.canPerformAction(
        'user1',
        'advanced_analytics'
      );

      expect(result).toBe(true);
    });

    it('checks subscription limits', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        currentPlan: 'free',
      });
      mockDb.subscription.count.mockResolvedValue(5);

      const result = await billingService.canPerformAction(
        'user1',
        'add_subscription'
      );

      expect(result).toBe(false);
    });
  });

  describe('createCheckoutSession', () => {
    it('creates a Stripe checkout session', async () => {
      const mockSession = {
        id: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);
      mockDb.billingPlan.findUnique.mockResolvedValue({
        id: 'premium',
        stripePriceId: 'price_123',
        name: 'Premium',
      });

      const result = await billingService.createCheckoutSession(
        'user1',
        'premium',
        'https://success.com',
        'https://cancel.com'
      );

      expect(result).toEqual(mockSession);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'subscription',
        payment_method_types: ['card'],
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
      });
    });

    it('throws error when plan not found', async () => {
      mockDb.billingPlan.findUnique.mockResolvedValue(null);

      await expect(
        billingService.createCheckoutSession(
          'user1',
          'nonexistent',
          'https://success.com',
          'https://cancel.com'
        )
      ).rejects.toThrow('Plan not found');
    });
  });

  describe('updateUserPlan', () => {
    it('updates user plan successfully', async () => {
      mockDb.user.update.mockResolvedValue({
        id: 'user1',
        currentPlan: 'premium',
      });

      const result = await billingService.updateUserPlan('user1', 'premium');

      expect(result).toEqual({
        id: 'user1',
        currentPlan: 'premium',
      });
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { currentPlan: 'premium' },
      });
    });
  });

  describe('cancelSubscription', () => {
    it('cancels user subscription', async () => {
      const mockUser = {
        stripeCustomerId: 'cus_123',
      };
      const mockSubscriptions = {
        data: [
          {
            id: 'sub_123',
            status: 'active',
          },
        ],
      };

      mockDb.user.findUnique.mockResolvedValue(mockUser);
      mockStripe.subscriptions.list.mockResolvedValue(mockSubscriptions);
      mockStripe.subscriptions.cancel.mockResolvedValue({
        id: 'sub_123',
        status: 'canceled',
      });

      const result = await billingService.cancelSubscription('user1');

      expect(result).toBe(true);
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
    });

    it('returns false when no active subscription found', async () => {
      const mockUser = {
        stripeCustomerId: 'cus_123',
      };
      const mockSubscriptions = {
        data: [],
      };

      mockDb.user.findUnique.mockResolvedValue(mockUser);
      mockStripe.subscriptions.list.mockResolvedValue(mockSubscriptions);

      const result = await billingService.cancelSubscription('user1');

      expect(result).toBe(false);
    });
  });
});
