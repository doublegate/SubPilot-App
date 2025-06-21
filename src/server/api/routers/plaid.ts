import { z } from "zod"
import { TRPCError } from "@trpc/server"
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc"
import { env } from "@/env.js"

// Note: Plaid client will be initialized when Plaid integration is implemented
// For now, we'll create placeholder endpoints that can be filled in Week 2

export const plaidRouter = createTRPCRouter({
  /**
   * Create a Link token for Plaid Link flow
   */
  createLinkToken: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Implement Plaid Link token creation in Week 2
    // This will use the Plaid client to generate a link token
    
    // For now, return a mock response
    if (env.NODE_ENV === "development") {
      return {
        linkToken: "link-development-mock-token",
        expiration: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      }
    }

    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Plaid integration pending implementation",
    })
  }),

  /**
   * Exchange public token for access token
   */
  exchangePublicToken: protectedProcedure
    .input(
      z.object({
        publicToken: z.string(),
        metadata: z.object({
          institution: z.object({
            name: z.string(),
            institution_id: z.string(),
          }),
          accounts: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              type: z.string(),
              subtype: z.string(),
            })
          ),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement public token exchange in Week 2
      // This will:
      // 1. Exchange public token for access token via Plaid
      // 2. Store encrypted access token in database
      // 3. Create PlaidItem and Account records
      
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Plaid token exchange pending implementation",
      })
    }),

  /**
   * Get all connected accounts
   */
  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    const plaidItems = await ctx.db.plaidItem.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        accounts: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    })

    // Flatten accounts with institution info
    const accounts = plaidItems.flatMap((item) =>
      item.accounts.map((account) => ({
        id: account.id,
        plaidAccountId: account.plaidAccountId,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        balance: account.currentBalance?.toNumber() || 0,
        currency: account.isoCurrencyCode || "USD",
        institution: {
          name: item.institutionName,
          logo: null, // TODO: Add institution logos
        },
        isActive: account.isActive,
        lastSync: account.lastSync,
        createdAt: account.createdAt,
      }))
    )

    return accounts
  }),

  /**
   * Sync transactions for accounts
   */
  syncTransactions: protectedProcedure
    .input(
      z.object({
        accountId: z.string().optional(),
        force: z.boolean().optional().default(false),
      })
    )
    .mutation(async () => {
      // TODO: Implement transaction sync in Week 2
      // This will:
      // 1. Call Plaid transactions/sync endpoint
      // 2. Store new transactions in database
      // 3. Run subscription detection algorithm
      // 4. Return sync statistics
      
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Transaction sync pending implementation",
      })
    }),

  /**
   * Disconnect a bank account
   */
  disconnectAccount: protectedProcedure
    .input(
      z.object({
        plaidItemId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const plaidItem = await ctx.db.plaidItem.findFirst({
        where: {
          id: input.plaidItemId,
          userId: ctx.session.user.id,
        },
      })

      if (!plaidItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank connection not found",
        })
      }

      // Mark as inactive instead of deleting to preserve history
      await ctx.db.plaidItem.update({
        where: { id: input.plaidItemId },
        data: { status: "inactive" },
      })

      // Mark all accounts as inactive
      await ctx.db.account.updateMany({
        where: { plaidItemId: input.plaidItemId },
        data: { isActive: false },
      })

      return { success: true }
    }),

  /**
   * Get sync status for accounts
   */
  getSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const plaidItems = await ctx.db.plaidItem.findMany({
      where: {
        userId: ctx.session.user.id,
        status: "good",
      },
      include: {
        accounts: {
          where: { isActive: true },
          select: {
            id: true,
            lastSync: true,
          },
        },
      },
    })

    return plaidItems.map((item) => ({
      id: item.id,
      institutionName: item.institutionName,
      lastSync: item.accounts[0]?.lastSync ?? null,
      status: item.status,
      error: null,
      accountCount: item.accounts.length,
    }))
  }),
})