import Stripe from 'stripe';
import { env } from '@/env.js';

// Lazy initialize Stripe to avoid build-time errors
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    // During build, skip initialization if SKIP_ENV_VALIDATION is set
    if (process.env.SKIP_ENV_VALIDATION === 'true' && !env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe cannot be used during build time');
    }

    // During runtime, env vars must be available
    if (!env.STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
      throw new Error('STRIPE_SECRET_KEY is required in production');
    }

    stripeInstance = new Stripe(env.STRIPE_SECRET_KEY ?? 'sk_test_dummy', {
      apiVersion: '2025-05-28.basil',
      typescript: true,
      appInfo: {
        name: 'SubPilot',
        version: '1.3.0',
      },
    });
  }
  return stripeInstance;
}

// Remove the problematic Proxy export and just export the getter
export { getStripe as stripe };

// Stripe webhook event types we handle
export const STRIPE_WEBHOOK_EVENTS = {
  // Checkout
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
  CHECKOUT_SESSION_EXPIRED: 'checkout.session.expired',

  // Subscriptions
  CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
  CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END: 'customer.subscription.trial_will_end',

  // Payments
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',

  // Customer
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
} as const;

export type StripeWebhookEvent =
  (typeof STRIPE_WEBHOOK_EVENTS)[keyof typeof STRIPE_WEBHOOK_EVENTS];

// Helper function to verify webhook signatures
export async function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  // Ensure webhook secret is configured
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    throw new Error('Webhook secret not configured');
  }

  // Validate signature format
  if (!signature || !signature.includes('=')) {
    console.error('❌ Invalid Stripe signature format');
    throw new Error('Invalid signature format');
  }

  try {
    // Use Stripe's built-in verification which includes timestamp validation
    const event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    
    console.log(`✅ Stripe webhook verified: ${event.type}`);
    return event;
  } catch (err) {
    const error = err as Error;
    
    // Log specific error types for debugging
    if (error.message.includes('timestamp')) {
      console.error('❌ Stripe webhook timestamp validation failed - possible replay attack');
    } else if (error.message.includes('signature')) {
      console.error('❌ Stripe webhook signature validation failed - possible tampering');
    } else {
      console.error('❌ Stripe webhook verification failed:', error.message);
    }
    
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
}

// Format amount for Stripe (convert dollars to cents)
export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100);
}

// Format amount from Stripe (convert cents to dollars)
export function formatAmountFromStripe(amount: number): number {
  return amount / 100;
}

// Get Stripe price ID based on plan and billing period
export function getStripePriceId(
  planName: string,
  billingPeriod: 'monthly' | 'yearly' = 'monthly'
): string | null {
  // These would be configured in your Stripe dashboard and stored in env vars or database
  const priceIds: Record<string, Record<string, string>> = {
    pro: {
      monthly: env.STRIPE_PRICE_PRO_MONTHLY ?? '',
      yearly: env.STRIPE_PRICE_PRO_YEARLY ?? '',
    },
    team: {
      monthly: env.STRIPE_PRICE_TEAM_MONTHLY ?? '',
      yearly: env.STRIPE_PRICE_TEAM_YEARLY ?? '',
    },
    enterprise: {
      monthly: env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? '',
      yearly: env.STRIPE_PRICE_ENTERPRISE_YEARLY ?? '',
    },
  };

  return priceIds[planName]?.[billingPeriod] ?? null;
}
