import { createTRPCRouter } from "@/server/api/trpc"
import { exampleRouter } from "@/server/api/routers/example"
import { authRouter } from "@/server/api/routers/auth"
import { plaidRouter } from "@/server/api/routers/plaid"
import { subscriptionsRouter } from "@/server/api/routers/subscriptions"
import { transactionsRouter } from "@/server/api/routers/transactions"
import { notificationsRouter } from "@/server/api/routers/notifications"
import { analyticsRouter } from "@/server/api/routers/analytics"

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
})

// export type definition of API
export type AppRouter = typeof appRouter