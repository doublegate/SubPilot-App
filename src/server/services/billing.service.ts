import { type PrismaClient } from '@prisma/client';
import type Stripe from 'stripe';
import { TRPCError } from '@trpc/server';
import { getStripe, formatAmountForStripe, STRIPE_WEBHOOK_EVENTS } from '../lib/stripe';
import { env } from '~/env.js';

export class BillingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create or retrieve a Stripe customer for a user
   */
  async getOrCreateStripeCustomer(userId: string): Promise<Stripe.Customer> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userSubscription: true },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // If user already has a Stripe customer ID, retrieve it
    if (user.userSubscription?.stripeCustomerId) {
      try {
        const customer = await getStripe().customers.retrieve(user.userSubscription.stripeCustomerId);
        if (customer.deleted) {
          throw new Error('Customer was deleted');
        }
        return customer as Stripe.Customer;
      } catch {
        // Customer doesn't exist, we'll create a new one
      }
    }

    // Create new Stripe customer
    const customer = await getStripe().customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: {
        userId: user.id,
      },
    });

    return customer;
  }

  /**
   * Create a checkout session for upgrading to a paid plan
   */
  async createCheckoutSession({
    userId,
    planId,
    successUrl,
    cancelUrl,
  }: {
    userId: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session> {
    const plan = await this.prisma.pricingPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.stripePriceId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invalid pricing plan',
      });
    }

    const customer = await this.getOrCreateStripeCustomer(userId);

    const session = await getStripe().checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planId,
      },
      subscription_data: {
        trial_period_days: 14, // 14-day free trial
        metadata: {
          userId,
          planId,
        },
      },
    });

    return session;
  }

  /**
   * Create a billing portal session for managing subscription
   */
  async createPortalSession({
    userId,
    returnUrl,
  }: {
    userId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    const userSubscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!userSubscription?.stripeCustomerId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No active subscription found',
      });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: userSubscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return session;
  }

  /**
   * Cancel a subscription at the end of the billing period
   */
  async cancelSubscription(userId: string): Promise<void> {
    const userSubscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!userSubscription?.stripeSubscriptionId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No active subscription found',
      });
    }

    // Cancel at period end (user keeps access until end of billing period)
    await getStripe().subscriptions.update(userSubscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update local database
    await this.prisma.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(userId: string): Promise<void> {
    const userSubscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!userSubscription?.stripeSubscriptionId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No subscription found',
      });
    }

    // Reactivate the subscription
    await getStripe().subscriptions.update(userSubscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update local database
    await this.prisma.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
    });
  }

  /**
   * Update subscription (upgrade/downgrade)
   */
  async updateSubscription({
    userId,
    newPlanId,
  }: {
    userId: string;
    newPlanId: string;
  }): Promise<void> {
    const userSubscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!userSubscription?.stripeSubscriptionId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No active subscription found',
      });
    }

    const newPlan = await this.prisma.pricingPlan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan || !newPlan.stripePriceId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invalid pricing plan',
      });
    }

    const subscription = await getStripe().subscriptions.retrieve(userSubscription.stripeSubscriptionId);
    
    // Update the subscription with the new price
    await getStripe().subscriptions.update(userSubscription.stripeSubscriptionId, {
      items: [
        {
          id: subscription.items.data[0]?.id,
          price: newPlan.stripePriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });

    // Update local database
    await this.prisma.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        planId: newPlanId,
        stripePriceId: newPlan.stripePriceId,
      },
    });
  }

  /**
   * Get invoices for a user
   */
  async getInvoices(userId: string, limit = 10): Promise<Stripe.Invoice[]> {
    const userSubscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!userSubscription?.stripeCustomerId) {
      return [];
    }

    const invoices = await getStripe().invoices.list({
      customer: userSubscription.stripeCustomerId,
      limit,
    });

    return invoices.data;
  }

  /**
   * Handle successful checkout session
   */
  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    
    if (!userId || !planId || !session.subscription || !session.customer) {
      throw new Error('Invalid session metadata');
    }

    const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
    
    // Create or update user subscription
    await this.prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        trialStart: (subscription as any).trial_start ? new Date((subscription as any).trial_start * 1000) : null,
        trialEnd: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null,
      },
      update: {
        planId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        trialStart: (subscription as any).trial_start ? new Date((subscription as any).trial_start * 1000) : null,
        trialEnd: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null,
      },
    });

    // Record billing event
    await this.prisma.billingEvent.create({
      data: {
        userId,
        type: STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_COMPLETED,
        amount: subscription.items.data[0]?.price.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : 0,
        currency: subscription.currency,
        status: 'completed',
        metadata: {
          sessionId: session.id,
          subscriptionId: subscription.id,
        },
      },
    });
  }

  /**
   * Handle subscription updated
   */
  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userSubscription = await this.prisma.userSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!userSubscription) {
      console.error(`No user subscription found for Stripe subscription ${subscription.id}`);
      return;
    }

    // Update subscription status
    await this.prisma.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    });

    // Record billing event
    await this.prisma.billingEvent.create({
      data: {
        userId: userSubscription.userId,
        userSubscriptionId: userSubscription.id,
        type: STRIPE_WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_UPDATED,
        status: 'completed',
        metadata: {
          subscriptionId: subscription.id,
          status: subscription.status,
        },
      },
    });
  }

  /**
   * Handle subscription deleted
   */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userSubscription = await this.prisma.userSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!userSubscription) {
      console.error(`No user subscription found for Stripe subscription ${subscription.id}`);
      return;
    }

    // Get the free plan
    const freePlan = await this.prisma.pricingPlan.findUnique({
      where: { name: 'free' },
    });

    if (!freePlan) {
      throw new Error('Free plan not found');
    }

    // Downgrade to free plan
    await this.prisma.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        planId: freePlan.id,
        status: 'canceled',
        stripeSubscriptionId: null,
        stripePriceId: null,
        canceledAt: new Date(),
      },
    });

    // Record billing event
    await this.prisma.billingEvent.create({
      data: {
        userId: userSubscription.userId,
        userSubscriptionId: userSubscription.id,
        type: STRIPE_WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_DELETED,
        status: 'completed',
        metadata: {
          subscriptionId: subscription.id,
        },
      },
    });
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    if (!(invoice as any).subscription || !invoice.customer) {
      return;
    }

    const userSubscription = await this.prisma.userSubscription.findUnique({
      where: { stripeCustomerId: invoice.customer as string },
    });

    if (!userSubscription) {
      console.error(`No user subscription found for customer ${invoice.customer}`);
      return;
    }

    // Record billing event
    await this.prisma.billingEvent.create({
      data: {
        userId: userSubscription.userId,
        userSubscriptionId: userSubscription.id,
        type: STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_SUCCEEDED,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: (invoice as any).payment_intent as string | undefined,
        status: 'completed',
        metadata: {
          invoiceNumber: invoice.number,
          billingPeriod: {
            start: invoice.period_start,
            end: invoice.period_end,
          },
        },
      },
    });
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!(invoice as any).subscription || !invoice.customer) {
      return;
    }

    const userSubscription = await this.prisma.userSubscription.findUnique({
      where: { stripeCustomerId: invoice.customer as string },
    });

    if (!userSubscription) {
      console.error(`No user subscription found for customer ${invoice.customer}`);
      return;
    }

    // Update subscription status if needed
    if ((invoice as any).subscription) {
      const subscription = await getStripe().subscriptions.retrieve((invoice as any).subscription as string);
      await this.prisma.userSubscription.update({
        where: { id: userSubscription.id },
        data: {
          status: subscription.status,
        },
      });
    }

    // Record billing event
    await this.prisma.billingEvent.create({
      data: {
        userId: userSubscription.userId,
        userSubscriptionId: userSubscription.id,
        type: STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED,
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        stripeInvoiceId: invoice.id,
        status: 'failed',
        metadata: {
          invoiceNumber: invoice.number,
          attemptCount: invoice.attempt_count,
          nextPaymentAttempt: invoice.next_payment_attempt,
        },
      },
    });
  }
}