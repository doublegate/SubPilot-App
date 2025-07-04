/**
 * Type definitions for Stripe API responses
 * These types provide type safety for external API integration
 */

import type Stripe from 'stripe';

// Stripe Webhook Event Types
export interface StripeWebhookEvent {
  id: string;
  object: 'event';
  api_version: string;
  created: number;
  data: {
    object: Stripe.Event.Data.Object;
    previous_attributes?: Record<string, unknown>;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  } | null;
  type: string;
}

// Stripe Customer Types
export interface StripeCustomer {
  id: string;
  object: 'customer';
  email: string | null;
  name: string | null;
  metadata: Record<string, string>;
  created: number;
  subscriptions?: {
    data: StripeSubscription[];
  };
}

// Stripe Subscription Types
export interface StripeSubscription {
  id: string;
  object: 'subscription';
  customer: string;
  status:
    | 'active'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
    | 'past_due'
    | 'trialing'
    | 'unpaid';
  current_period_end: number;
  current_period_start: number;
  items: {
    data: StripeSubscriptionItem[];
  };
  metadata: Record<string, string>;
}

export interface StripeSubscriptionItem {
  id: string;
  object: 'subscription_item';
  price: StripePrice;
  quantity: number;
}

// Stripe Price Types
export interface StripePrice {
  id: string;
  object: 'price';
  active: boolean;
  currency: string;
  metadata: Record<string, string>;
  nickname: string | null;
  product: string;
  recurring: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count: number;
  } | null;
  type: 'one_time' | 'recurring';
  unit_amount: number | null;
  unit_amount_decimal: string | null;
}

// Stripe Product Types
export interface StripeProduct {
  id: string;
  object: 'product';
  active: boolean;
  name: string;
  description: string | null;
  metadata: Record<string, string>;
}

// Stripe Payment Intent Types
export interface StripePaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number;
  currency: string;
  status:
    | 'requires_payment_method'
    | 'requires_confirmation'
    | 'requires_action'
    | 'processing'
    | 'requires_capture'
    | 'canceled'
    | 'succeeded';
  client_secret: string;
  metadata: Record<string, string>;
}

// Stripe Invoice Types
export interface StripeInvoice {
  id: string;
  object: 'invoice';
  customer: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  total: number;
  currency: string;
  lines: {
    data: StripeInvoiceLineItem[];
  };
  metadata: Record<string, string>;
}

export interface StripeInvoiceLineItem {
  id: string;
  object: 'line_item';
  amount: number;
  currency: string;
  description: string | null;
  price: StripePrice;
}

// Type guards for Stripe objects
export function isStripeCustomer(obj: unknown): obj is StripeCustomer {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'object' in obj &&
    obj.object === 'customer'
  );
}

export function isStripeSubscription(obj: unknown): obj is StripeSubscription {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'object' in obj &&
    obj.object === 'subscription'
  );
}

export function isStripeInvoice(obj: unknown): obj is StripeInvoice {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'object' in obj &&
    obj.object === 'invoice'
  );
}

// Stripe webhook signature verification types
export interface StripeWebhookSignature {
  timestamp: number;
  signatures: string[];
}

// Stripe error types
export interface StripeErrorResponse {
  error: {
    type: string;
    code?: string;
    message: string;
    param?: string;
  };
}

export function isStripeError(obj: unknown): obj is StripeErrorResponse {
  return typeof obj === 'object' && obj !== null && 'error' in obj;
}
