import { createTRPCRouter } from '@/server/api/trpc';
import { exampleRouter } from '@/server/api/routers/example';
import { authRouter } from '@/server/api/routers/auth';
import { plaidRouter } from '@/server/api/routers/plaid';
import { subscriptionsRouter } from '@/server/api/routers/subscriptions';
import { transactionsRouter } from '@/server/api/routers/transactions';
import { notificationsRouter } from '@/server/api/routers/notifications';
import { analyticsRouter } from '@/server/api/routers/analytics';
import { categorizationRouter } from '@/server/api/routers/categorization';
import { exportRouter } from '@/server/api/routers/export';
import { cancellationRouter } from '@/server/api/routers/cancellation';
import { lightweightCancellationRouter } from '@/server/api/routers/lightweight-cancellation';
import { assistantRouter } from '@/server/api/routers/assistant';
import { billingRouter } from '@/server/api/routers/billing';
import { accountRouter } from '@/server/api/routers/account';
import { systemMonitoringRouter } from '@/server/api/routers/system-monitoring';
import { unifiedCancellationRouter } from '@/server/api/routers/unified-cancellation';
import { unifiedCancellationEnhancedRouter } from '@/server/api/routers/unified-cancellation-enhanced';
import { adminRouter } from '@/server/api/routers/admin';
import { oauthAccountsRouter } from '@/server/api/routers/oauth-accounts';
import { twoFactorRouter } from '@/server/api/routers/two-factor';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  auth: authRouter,
  plaid: plaidRouter,
  subscriptions: subscriptionsRouter,
  transactions: transactionsRouter,
  notifications: notificationsRouter,
  analytics: analyticsRouter,
  categorization: categorizationRouter,
  export: exportRouter,
  cancellation: cancellationRouter,
  lightweightCancellation: lightweightCancellationRouter,
  assistant: assistantRouter,
  billing: billingRouter,
  account: accountRouter,
  systemMonitoring: systemMonitoringRouter,
  unifiedCancellation: unifiedCancellationRouter,
  unifiedCancellationEnhanced: unifiedCancellationEnhancedRouter,
  admin: adminRouter,
  oauthAccounts: oauthAccountsRouter,
  twoFactor: twoFactorRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
