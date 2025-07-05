import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  STRIPE_WEBHOOK_EVENTS,
} from '@/server/lib/stripe';
import { BillingService } from '@/server/services/billing.service';
import { db } from '@/server/db';
import type Stripe from 'stripe';

// Extended Stripe interfaces for proper typing
interface StripeSubscriptionWithPeriods
  extends Omit<
    Stripe.Subscription,
    'canceled_at' | 'trial_start' | 'trial_end'
  > {
  current_period_start: number;
  current_period_end: number;
  trial_start: number | null;
  trial_end: number | null;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
}

interface StripeInvoiceWithDetails extends Stripe.Invoice {
  subscription: string | Stripe.Subscription | null;
  customer: string | Stripe.Customer | null;
  payment_intent: string | Stripe.PaymentIntent | null;
}

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature')!;

  if (!signature) {
    return NextResponse.json(
      { error: 'No stripe signature found' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = await verifyWebhookSignature(body, signature);
  } catch (err) {
    const error = err as Error;
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  const billingService = new BillingService(db);

  try {
    switch (event.type) {
      case STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_COMPLETED: {
        const session = event.data.object;
        await billingService.handleCheckoutSessionCompleted(session);
        break;
      }

      case STRIPE_WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_CREATED:
      case STRIPE_WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_UPDATED: {
        const subscription = event.data.object as StripeSubscriptionWithPeriods;
        await billingService.handleSubscriptionUpdated(subscription);
        break;
      }

      case STRIPE_WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_DELETED: {
        await billingService.handleSubscriptionDeleted(event.data.object);
        break;
      }

      case STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_SUCCEEDED: {
        const invoice = event.data.object as StripeInvoiceWithDetails;
        await billingService.handlePaymentSucceeded(invoice);
        break;
      }

      case STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED: {
        const invoice = event.data.object as StripeInvoiceWithDetails;
        await billingService.handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook: ${event.type}`, error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
