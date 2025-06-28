import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { AccountService } from '~/server/services/account.service';
import { TRPCError } from '@trpc/server';

export const accountRouter = createTRPCRouter({
  /**
   * Create a new team account
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: z.enum(['personal', 'family', 'team']).default('personal'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const accountService = new AccountService(ctx.db);
      return accountService.createAccount({
        userId: ctx.session.user.id,
        name: input.name,
        type: input.type,
      });
    }),

  /**
   * Get all accounts for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const accountService = new AccountService(ctx.db);
    return accountService.getUserAccounts(ctx.session.user.id);
  }),

  /**
   * Get a specific account
   */
  get: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const accountService = new AccountService(ctx.db);
      return accountService.getAccount(input.accountId, ctx.session.user.id);
    }),

  /**
   * Invite a member to an account
   */
  inviteMember: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        email: z.string().email(),
        role: z.enum(['admin', 'member']).default('member'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const accountService = new AccountService(ctx.db);
      return accountService.inviteMember({
        accountId: input.accountId,
        invitedByUserId: ctx.session.user.id,
        email: input.email,
        role: input.role,
      });
    }),

  /**
   * Accept an invitation
   */
  acceptInvitation: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const accountService = new AccountService(ctx.db);
      await accountService.acceptInvitation(
        input.accountId,
        ctx.session.user.id
      );
      return { success: true };
    }),

  /**
   * Remove a member from an account
   */
  removeMember: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const accountService = new AccountService(ctx.db);
      await accountService.removeMember({
        accountId: input.accountId,
        userId: input.userId,
        removedByUserId: ctx.session.user.id,
      });
      return { success: true };
    }),

  /**
   * Update member role
   */
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        userId: z.string(),
        role: z.enum(['admin', 'member']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const accountService = new AccountService(ctx.db);
      await accountService.updateMemberRole({
        accountId: input.accountId,
        userId: input.userId,
        newRole: input.role,
        updatedByUserId: ctx.session.user.id,
      });
      return { success: true };
    }),

  /**
   * Get shared subscriptions for an account
   */
  getSharedSubscriptions: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const accountService = new AccountService(ctx.db);
      return accountService.getSharedSubscriptions(
        input.accountId,
        ctx.session.user.id
      );
    }),

  /**
   * Get account analytics
   */
  getAnalytics: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const accountService = new AccountService(ctx.db);
      return accountService.getAccountAnalytics(
        input.accountId,
        ctx.session.user.id
      );
    }),

  /**
   * Switch active account (for UI context)
   */
  switchAccount: protectedProcedure
    .input(
      z.object({
        accountId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // This would typically update a session or user preference
      // For now, we'll just verify the user has access
      if (input.accountId) {
        const accountService = new AccountService(ctx.db);
        await accountService.getAccount(input.accountId, ctx.session.user.id);
      }
      
      // TODO: Store active account in session or user preferences
      
      return { success: true, activeAccountId: input.accountId };
    }),
});