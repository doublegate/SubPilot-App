import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';

export const oauthAccountsRouter = createTRPCRouter({
  /**
   * Get all connected OAuth accounts for the current user
   */
  getConnectedAccounts: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.db.account.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
      },
    });

    return accounts.map(account => ({
      id: account.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      connectedAt: new Date(), // OAuth accounts don't have a createdAt field
    }));
  }),

  /**
   * Get available OAuth providers that can be linked
   */
  getAvailableProviders: protectedProcedure.query(async ({ ctx }) => {
    // Get user's existing providers
    const existingAccounts = await ctx.db.account.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      select: {
        provider: true,
      },
    });

    const connectedProviders = existingAccounts.map(a => a.provider);

    // Define all available OAuth providers
    const allProviders = [
      {
        id: 'google',
        name: 'Google',
        connected: connectedProviders.includes('google'),
      },
      {
        id: 'github',
        name: 'GitHub',
        connected: connectedProviders.includes('github'),
      },
    ];

    return allProviders;
  }),

  /**
   * Unlink an OAuth account (only if user has multiple accounts)
   */
  unlinkAccount: protectedProcedure
    .input(
      z.object({
        provider: z.enum(['google', 'github']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has multiple accounts linked
      const accountCount = await ctx.db.account.count({
        where: {
          userId: ctx.session.user.id,
        },
      });

      if (accountCount <= 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot unlink your only sign-in method',
        });
      }

      // Find and delete the account
      const account = await ctx.db.account.findFirst({
        where: {
          userId: ctx.session.user.id,
          provider: input.provider,
        },
      });

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        });
      }

      await ctx.db.account.delete({
        where: {
          id: account.id,
        },
      });

      return { success: true, provider: input.provider };
    }),

  /**
   * Initiate OAuth account linking
   * This creates a pending link request and returns the OAuth URL
   */
  initiateLinking: protectedProcedure
    .input(
      z.object({
        provider: z.enum(['google', 'github']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already linked
      const existingAccount = await ctx.db.account.findFirst({
        where: {
          userId: ctx.session.user.id,
          provider: input.provider,
        },
      });

      if (existingAccount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${input.provider} account is already linked`,
        });
      }

      // For account linking, we'll redirect back to the profile page
      const callbackUrl = `/profile`;

      // Return the OAuth URL for the client to redirect to
      return {
        provider: input.provider,
        // The actual OAuth flow will be handled by NextAuth
        // The signIn callback will handle the account linking
        authUrl: `/api/auth/signin?provider=${input.provider}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
      };
    }),
});
