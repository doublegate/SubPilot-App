import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { env } from '@/env.js';
import {
  plaid,
  isPlaidConfigured,
  handlePlaidError,
  plaidWithRetry,
} from '@/server/plaid-client';
import { encrypt, decrypt } from '@/server/lib/crypto';
import { InstitutionService } from '@/server/services/institution.service';
import type {
  CountryCode,
  Products,
  LinkTokenCreateRequest,
  AccountsGetRequest,
  TransactionsGetRequest,
  TransactionsSyncRequest,
} from 'plaid';

export const plaidRouter = createTRPCRouter({
  /**
   * Generate mock transactions for testing
   */
  generateMockData: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if user has any bank accounts
    const accounts = await ctx.db.bankAccount.findMany({
      where: { userId: ctx.session.user.id },
      take: 1,
    });

    if (accounts.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No bank accounts found. Please connect a bank first.',
      });
    }

    const { MockDataGenerator } = await import('@/server/services/mock-data');
    const generator = new MockDataGenerator(ctx.db);

    // Clear existing transactions first
    await generator.clearUserTransactions(ctx.session.user.id);

    // Generate mock transactions
    const count = await generator.generateMockTransactions(
      ctx.session.user.id,
      accounts[0]!.id
    );

    return {
      success: true,
      transactionCount: count,
      message: `Generated ${count} mock transactions`,
    };
  }),
  /**
   * Create a Link token for Plaid Link flow
   */
  createLinkToken: protectedProcedure.query(async ({ ctx }) => {
    if (!isPlaidConfigured()) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message:
          'Plaid is not configured. Please add Plaid credentials to continue.',
      });
    }

    const plaidClient = plaid();
    if (!plaidClient) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to initialize Plaid client',
      });
    }

    try {
      const configs: LinkTokenCreateRequest = {
        user: {
          client_user_id: ctx.session.user.id,
        },
        client_name: 'SubPilot',
        products: (env.PLAID_PRODUCTS?.split(',') || [
          'transactions',
        ]) as Products[],
        country_codes: (env.PLAID_COUNTRY_CODES?.split(',') || [
          'US',
        ]) as CountryCode[],
        language: 'en',
        redirect_uri: env.PLAID_REDIRECT_URI ?? undefined,
      };

      // Add webhook URL if configured
      if (env.PLAID_WEBHOOK_URL) {
        configs.webhook = env.PLAID_WEBHOOK_URL;
      }

      const response = await plaidWithRetry(
        () => plaidClient.linkTokenCreate(configs),
        'linkTokenCreate'
      );

      return {
        linkToken: response.data.link_token,
        expiration: new Date(response.data.expiration),
      };
    } catch (error) {
      const plaidError = handlePlaidError(error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: plaidError.message,
        cause: plaidError,
      });
    }
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
              subtype: z.string().nullable(),
              mask: z.string().nullable(),
            })
          ),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isPlaidConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Plaid is not configured',
        });
      }

      const plaidClient = plaid();
      if (!plaidClient) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to initialize Plaid client',
        });
      }

      try {
        // Exchange public token for access token
        const exchangeResponse = await plaidWithRetry(
          () =>
            plaidClient.itemPublicTokenExchange({
              public_token: input.publicToken,
            }),
          'itemPublicTokenExchange'
        );

        const accessToken = exchangeResponse.data.access_token;
        const itemId = exchangeResponse.data.item_id;

        // Encrypt the access token before storing
        const encryptedAccessToken = await encrypt(accessToken);

        // Get institution details including logo
        const institutionData = await InstitutionService.getInstitution(
          input.metadata.institution.institution_id
        );

        // Store the item in database
        const plaidItem = await ctx.db.plaidItem.create({
          data: {
            userId: ctx.session.user.id,
            plaidItemId: itemId,
            accessToken: encryptedAccessToken,
            institutionId: input.metadata.institution.institution_id,
            institutionName: input.metadata.institution.name,
            institutionLogo: institutionData?.logo,
            status: 'good',
          },
        });

        // Get account details from Plaid
        const accountsRequest: AccountsGetRequest = {
          access_token: accessToken,
        };
        const accountsResponse = await plaidWithRetry(
          () => plaidClient.accountsGet(accountsRequest),
          'accountsGet'
        );

        // Store accounts in database
        const accounts = await Promise.all(
          accountsResponse.data.accounts.map(async account => {
            return await ctx.db.bankAccount.create({
              data: {
                userId: ctx.session.user.id,
                plaidItemId: plaidItem.id,
                plaidAccountId: account.account_id,
                name: account.name,
                officialName: account.official_name,
                type: account.type,
                subtype: account.subtype ?? '',
                mask: account.mask ?? '',
                currentBalance: account.balances.current ?? 0,
                availableBalance: account.balances.available ?? 0,
                isoCurrencyCode: account.balances.iso_currency_code ?? 'USD',
                isActive: true,
              },
            });
          })
        );

        // Fetch initial transactions
        const now = new Date();
        const thirtyDaysAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000
        );

        const transactionsRequest: TransactionsGetRequest = {
          access_token: accessToken,
          start_date: thirtyDaysAgo.toISOString().split('T')[0]!,
          end_date: now.toISOString().split('T')[0]!,
        };

        try {
          const transactionsResponse = await plaidWithRetry(
            () => plaidClient.transactionsGet(transactionsRequest),
            'transactionsGet'
          );

          // Store transactions
          if (transactionsResponse.data.transactions.length > 0) {
            // Filter out transactions without valid account mapping
            const validTransactions = transactionsResponse.data.transactions
              .map(txn => {
                const account = accounts.find(
                  a => a.plaidAccountId === txn.account_id
                );
                if (!account) {
                  console.warn(
                    `Skipping transaction ${txn.transaction_id}: Account ${txn.account_id} not found`
                  );
                  return null;
                }
                return {
                  userId: ctx.session.user.id,
                  accountId: account.id,
                  plaidTransactionId: txn.transaction_id,
                  amount: Math.abs(txn.amount), // Plaid returns negative for outflows
                  isoCurrencyCode: txn.iso_currency_code ?? 'USD',
                  description: txn.name,
                  date: new Date(txn.date),
                  pending: txn.pending,
                  category: txn.category ?? [],
                  subcategory: txn.category?.[1] ?? null,
                  merchantName: txn.merchant_name,
                  paymentChannel: txn.payment_channel,
                  transactionType: txn.transaction_type ?? 'other',
                  isSubscription: false, // Will be determined by detection algorithm
                };
              })
              .filter((txn): txn is NonNullable<typeof txn> => txn !== null);

            if (validTransactions.length > 0) {
              await ctx.db.transaction.createMany({
                data: validTransactions,
                skipDuplicates: true,
              });

              console.log(
                `Imported ${validTransactions.length} transactions (${transactionsResponse.data.transactions.length - validTransactions.length} skipped)`
              );
            }

            // Run subscription detection on initial transactions
            try {
              const { SubscriptionDetector } = await import(
                '@/server/services/subscription-detector'
              );
              const detector = new SubscriptionDetector(ctx.db);

              const results = await detector.detectUserSubscriptions(
                ctx.session.user.id
              );

              if (results.length > 0) {
                await detector.createSubscriptionsFromDetection(
                  ctx.session.user.id,
                  results
                );
              }
            } catch (detectError) {
              console.error('Failed to detect subscriptions:', detectError);
              // Don't fail the connection if detection fails
            }
          }
        } catch (txnError) {
          console.error('Failed to fetch initial transactions:', txnError);
          // Don't fail the entire connection if transaction fetch fails
        }

        return {
          success: true,
          itemId: plaidItem.id,
          accounts: accounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            type: acc.type,
            balance: acc.currentBalance?.toNumber() || 0,
          })),
        };
      } catch (error) {
        const plaidError = handlePlaidError(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: plaidError.message,
          cause: plaidError,
        });
      }
    }),

  /**
   * Get all connected accounts
   */
  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    const plaidItems = await ctx.db.plaidItem.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        bankAccounts: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    // Flatten accounts with institution info
    const accounts = plaidItems.flatMap(item =>
      item.bankAccounts.map(account => ({
        id: account.id,
        plaidAccountId: account.plaidAccountId,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        balance: account.currentBalance?.toNumber() || 0,
        currency: account.isoCurrencyCode || 'USD',
        institution: {
          name: item.institutionName,
          logo: item.institutionLogo,
        },
        isActive: account.isActive,
        lastSync: account.lastSync,
        createdAt: account.createdAt,
      }))
    );

    return accounts;
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
    .mutation(async ({ ctx, input }) => {
      if (!isPlaidConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Plaid is not configured',
        });
      }

      const plaidClient = plaid();
      if (!plaidClient) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to initialize Plaid client',
        });
      }

      // Get all active Plaid items for the user
      const plaidItems = await ctx.db.plaidItem.findMany({
        where: {
          userId: ctx.session.user.id,
          status: 'good',
        },
        include: {
          bankAccounts: {
            where: input.accountId
              ? { id: input.accountId }
              : { isActive: true },
          },
        },
      });

      if (plaidItems.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No bank accounts found to sync',
        });
      }

      let totalTransactionsSynced = 0;
      let totalNewTransactions = 0;

      // Sync transactions for each Plaid item
      for (const item of plaidItems) {
        try {
          // Decrypt access token for API calls
          const accessToken = await decrypt(item.accessToken);

          // Use transactions/sync endpoint for efficient incremental updates
          let cursor = item.syncCursor || '';
          let hasMore = true;
          let added: any[] = [];
          let modified: any[] = [];
          let removed: any[] = [];

          while (hasMore) {
            const syncRequest: TransactionsSyncRequest = {
              access_token: accessToken,
              cursor: cursor,
            };

            const syncResponse = await plaidWithRetry(
              () => plaidClient.transactionsSync(syncRequest),
              'transactionsSync'
            );

            added = added.concat(syncResponse.data.added);
            modified = modified.concat(syncResponse.data.modified);
            removed = removed.concat(syncResponse.data.removed);

            hasMore = syncResponse.data.has_more;
            cursor = syncResponse.data.next_cursor;
          }

          // Update sync cursor
          await ctx.db.plaidItem.update({
            where: { id: item.id },
            data: { syncCursor: cursor },
          });

          totalTransactionsSynced += added.length + modified.length;

          console.log(
            `Fetched ${added.length} new, ${modified.length} modified, ${removed.length} removed transactions from Plaid`
          );

          // Map account IDs
          const accountIdMap = new Map(
            item.bankAccounts.map(acc => [acc.plaidAccountId, acc.id])
          );

          // Handle removed transactions
          if (removed.length > 0) {
            const removedIds = removed.map(txn => txn.transaction_id);
            await ctx.db.transaction.deleteMany({
              where: {
                plaidTransactionId: { in: removedIds },
                userId: ctx.session.user.id,
              },
            });
            console.log(`Removed ${removed.length} transactions`);
          }

          // Process added transactions
          if (added.length > 0) {
            const validTransactions = added
              .map(txn => {
                const accountId = accountIdMap.get(txn.account_id);
                if (!accountId) {
                  console.warn(
                    `Skipping added transaction ${txn.transaction_id}: Account ${txn.account_id} not found`
                  );
                  return null;
                }
                return {
                  userId: ctx.session.user.id,
                  accountId,
                  plaidTransactionId: txn.transaction_id,
                  amount: Math.abs(txn.amount),
                  isoCurrencyCode: txn.iso_currency_code ?? 'USD',
                  description: txn.name,
                  date: new Date(txn.date),
                  pending: txn.pending,
                  category: txn.category ?? [],
                  subcategory: txn.category?.[1] ?? null,
                  merchantName: txn.merchant_name,
                  paymentChannel: txn.payment_channel,
                  transactionType: txn.transaction_type ?? 'other',
                  isSubscription: false, // Will be determined by detection algorithm
                };
              })
              .filter((txn): txn is NonNullable<typeof txn> => txn !== null);

            if (validTransactions.length > 0) {
              const { count } = await ctx.db.transaction.createMany({
                data: validTransactions,
                skipDuplicates: true,
              });
              totalNewTransactions += count;
              console.log(`Added ${count} new transactions`);
            }
          }

          // Process modified transactions
          if (modified.length > 0) {
            for (const txn of modified) {
              const accountId = accountIdMap.get(txn.account_id);
              if (!accountId) {
                console.warn(
                  `Skipping modified transaction ${txn.transaction_id}: Account ${txn.account_id} not found`
                );
                continue;
              }

              await ctx.db.transaction.upsert({
                where: { plaidTransactionId: txn.transaction_id },
                update: {
                  amount: Math.abs(txn.amount),
                  description: txn.name,
                  date: new Date(txn.date),
                  pending: txn.pending,
                  category: txn.category ?? [],
                  subcategory: txn.category?.[1] ?? null,
                  merchantName: txn.merchant_name,
                  paymentChannel: txn.payment_channel,
                  transactionType: txn.transaction_type ?? 'other',
                },
                create: {
                  userId: ctx.session.user.id,
                  accountId,
                  plaidTransactionId: txn.transaction_id,
                  amount: Math.abs(txn.amount),
                  isoCurrencyCode: txn.iso_currency_code ?? 'USD',
                  description: txn.name,
                  date: new Date(txn.date),
                  pending: txn.pending,
                  category: txn.category ?? [],
                  subcategory: txn.category?.[1] ?? null,
                  merchantName: txn.merchant_name,
                  paymentChannel: txn.payment_channel,
                  transactionType: txn.transaction_type ?? 'other',
                  isSubscription: false,
                },
              });
            }
            console.log(`Updated ${modified.length} modified transactions`);
          }

          // Update last sync time
          await ctx.db.bankAccount.updateMany({
            where: {
              plaidItemId: item.id,
              ...(input.accountId ? { id: input.accountId } : {}),
            },
            data: {
              lastSync: new Date(),
            },
          });

          // Update account balances
          const accountsRequest: AccountsGetRequest = {
            access_token: accessToken,
          };
          const accountsResponse = await plaidWithRetry(
            () => plaidClient.accountsGet(accountsRequest),
            'accountsGet'
          );

          for (const account of accountsResponse.data.accounts) {
            const dbAccountId = accountIdMap.get(account.account_id);
            if (dbAccountId) {
              await ctx.db.bankAccount.update({
                where: { id: dbAccountId },
                data: {
                  currentBalance: account.balances.current ?? 0,
                  availableBalance: account.balances.available ?? 0,
                },
              });
            }
          }
        } catch (error) {
          console.error(
            `Failed to sync transactions for item ${item.id}:`,
            error
          );
          // Update item status if there's an error
          await ctx.db.plaidItem.update({
            where: { id: item.id },
            data: { status: 'error' },
          });
        }
      }

      // Run subscription detection algorithm on new transactions
      if (totalNewTransactions > 0) {
        try {
          const { SubscriptionDetector } = await import(
            '@/server/services/subscription-detector'
          );
          const detector = new SubscriptionDetector(ctx.db);

          const results = await detector.detectUserSubscriptions(
            ctx.session.user.id
          );

          if (results.length > 0) {
            await detector.createSubscriptionsFromDetection(
              ctx.session.user.id,
              results
            );

            const newSubscriptionsCount = results.filter(
              r => r.isSubscription
            ).length;
            if (newSubscriptionsCount > 0) {
              await ctx.db.notification.create({
                data: {
                  userId: ctx.session.user.id,
                  type: 'new_subscription',
                  title: 'New subscriptions detected! 🔍',
                  message: `We found ${newSubscriptionsCount} recurring payment${newSubscriptionsCount > 1 ? 's' : ''} in your transactions.`,
                  scheduledFor: new Date(),
                },
              });
            }
          }
        } catch (error) {
          console.error('Failed to run subscription detection:', error);
          // Don't fail the sync if detection fails
        }
      }

      return {
        success: true,
        totalTransactionsSynced,
        totalNewTransactions,
        message: `Synced ${totalNewTransactions} new transactions`,
      };
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
      });

      if (!plaidItem) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bank connection not found',
        });
      }

      // Remove the item from Plaid (optional - keeps historical data)
      if (isPlaidConfigured() && plaidItem.accessToken) {
        const plaidClient = plaid();
        if (plaidClient) {
          try {
            const accessToken = await decrypt(plaidItem.accessToken);
            await plaidWithRetry(
              () =>
                plaidClient.itemRemove({
                  access_token: accessToken,
                }),
              'itemRemove'
            );
          } catch (error) {
            console.error('Failed to remove item from Plaid:', error);
            // Continue with local cleanup even if Plaid removal fails
          }
        }
      }

      // Mark as inactive instead of deleting to preserve history
      await ctx.db.plaidItem.update({
        where: { id: input.plaidItemId },
        data: { status: 'inactive' },
      });

      // Mark all accounts as inactive
      await ctx.db.bankAccount.updateMany({
        where: { plaidItemId: input.plaidItemId },
        data: { isActive: false },
      });

      return { success: true };
    }),

  /**
   * Get sync status for accounts
   */
  getSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const plaidItems = await ctx.db.plaidItem.findMany({
      where: {
        userId: ctx.session.user.id,
        status: 'good',
      },
      include: {
        bankAccounts: {
          where: { isActive: true },
          select: {
            id: true,
            lastSync: true,
          },
        },
      },
    });

    return plaidItems.map(item => ({
      id: item.id,
      institutionName: item.institutionName,
      lastSync: item.bankAccounts[0]?.lastSync ?? null,
      status: item.status,
      error: null,
      accountCount: item.bankAccounts.length,
    }));
  }),
});
