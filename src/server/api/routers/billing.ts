import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { BillingService } from '@/server/services/billing.service';
import { SubscriptionManagerService } from '@/server/services/subscription-manager.service';

// Direct environment variable access for linting compatibility
const getAppUrl = (): string => {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
};

type Feature =
  | 'analytics_advanced'
  | 'cancellation_automation'
  | 'ai_assistant'
  | 'multi_accounts'
  | 'priority_support';

export const billingRouter = createTRPCRouter({
  /**
   * Get current subscription status
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscriptionManager = new SubscriptionManagerService(ctx.db);
    return subscriptionManager.getUserSubscription(ctx.session.user.id);
  }),

  /**
   * Get available pricing plans
   */
  getPlans: protectedProcedure.query(async ({ ctx }) => {
    const subscriptionManager = new SubscriptionManagerService(ctx.db);
    return subscriptionManager.getAvailablePlans(ctx.session.user.id);
  }),

  /**
   * Check feature access
   */
  hasFeature: protectedProcedure
    .input(
      z.object({
        feature: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const subscriptionManager = new SubscriptionManagerService(ctx.db);
      return subscriptionManager.hasFeature(
        ctx.session.user.id,
        input.feature as Feature
      );
    }),

  /**
   * Get usage limits
   */
  getUsageLimits: protectedProcedure.query(async ({ ctx }) => {
    const subscriptionManager = new SubscriptionManagerService(ctx.db);
    return subscriptionManager.checkUsageLimits(ctx.session.user.id);
  }),

  /**
   * Get subscription statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const subscriptionManager = new SubscriptionManagerService(ctx.db);
    return subscriptionManager.getSubscriptionStats(ctx.session.user.id);
  }),

  /**
   * Create checkout session for upgrading
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const billingService = new BillingService(ctx.db);

      const baseUrl = getAppUrl();
      const successUrl = `${baseUrl}/dashboard?upgrade=success`;
      const cancelUrl = `${baseUrl}/dashboard/settings/billing`;

      const session = await billingService.createCheckoutSession({
        userId: ctx.session.user.id,
        planId: input.planId,
        successUrl,
        cancelUrl,
      });

      return { url: session.url };
    }),

  /**
   * Create billing portal session
   */
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const billingService = new BillingService(ctx.db);

    const baseUrl = getAppUrl();
    const returnUrl = `${baseUrl}/dashboard/settings/billing`;

    const session = await billingService.createPortalSession({
      userId: ctx.session.user.id,
      returnUrl,
    });

    return { url: session.url };
  }),

  /**
   * Cancel subscription
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const billingService = new BillingService(ctx.db);
    await billingService.cancelSubscription(ctx.session.user.id);
    return { success: true };
  }),

  /**
   * Reactivate cancelled subscription
   */
  reactivateSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const billingService = new BillingService(ctx.db);
    await billingService.reactivateSubscription(ctx.session.user.id);
    return { success: true };
  }),

  /**
   * Update subscription (upgrade/downgrade)
   */
  updateSubscription: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const billingService = new BillingService(ctx.db);
      await billingService.updateSubscription({
        userId: ctx.session.user.id,
        newPlanId: input.planId,
      });
      return { success: true };
    }),

  /**
   * Get invoices
   */
  getInvoices: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const billingService = new BillingService(ctx.db);
      const invoices = await billingService.getInvoices(
        ctx.session.user.id,
        input.limit
      );

      // Format invoices for frontend
      return invoices.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        paidAt: invoice.status_transitions.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : null,
        invoicePdf: invoice.invoice_pdf,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      }));
    }),

  /**
   * Check if user can perform action
   */
  canPerformAction: protectedProcedure
    .input(
      z.object({
        action: z.enum([
          'add_bank_account',
          'invite_team_member',
          'use_ai_assistant',
          'export_data',
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      const subscriptionManager = new SubscriptionManagerService(ctx.db);
      return subscriptionManager.canPerformAction(
        ctx.session.user.id,
        input.action
      );
    }),
});
