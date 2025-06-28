import type { NextRequest } from 'next/server';
import { db } from '~/server/db';
import { verifyPlaidWebhook } from '~/server/plaid-client';

interface PlaidWebhookData {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  removed_transactions?: string[];
  error?: {
    error_type?: string;
    error_code?: string;
    error_message?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    // Verify webhook signature
    const isValid = await verifyPlaidWebhook(body, headers);
    if (!isValid) {
      return new Response('Invalid webhook signature', { status: 401 });
    }

    const webhookData = JSON.parse(body) as PlaidWebhookData;
    const { webhook_type, webhook_code, item_id } = webhookData;

    console.log(`Received Plaid webhook: ${webhook_type} - ${webhook_code}`);

    // Handle different webhook types
    switch (webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionWebhook(webhook_code, item_id, webhookData);
        break;

      case 'ITEM':
        await handleItemWebhook(webhook_code, item_id, webhookData);
        break;

      case 'HOLDINGS':
      case 'INVESTMENT_TRANSACTIONS':
        // We don't handle investment accounts yet
        console.log(`Ignoring ${webhook_type} webhook`);
        break;

      default:
        console.warn(`Unknown webhook type: ${webhook_type}`);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

async function handleTransactionWebhook(
  code: string,
  itemId: string,
  data: PlaidWebhookData
) {
  switch (code) {
    case 'SYNC_UPDATES_AVAILABLE':
    case 'DEFAULT_UPDATE':
    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE':
      // Mark the item for sync
      await db.plaidItem.update({
        where: { plaidItemId: itemId },
        data: {
          needsSync: true,
          lastWebhook: new Date(),
        },
      });

      // Background sync is handled via the needsSync flag in the database
      // The sync will be triggered on next user interaction or scheduled job
      console.log(`Transactions available for sync: ${itemId}`);
      break;

    case 'TRANSACTIONS_REMOVED':
      // Handle removed transactions
      const removedTransactionIds = data.removed_transactions ?? [];
      if (removedTransactionIds.length > 0) {
        await db.transaction.deleteMany({
          where: {
            plaidTransactionId: { in: removedTransactionIds },
          },
        });
      }
      break;
  }
}

async function handleItemWebhook(
  code: string,
  itemId: string,
  data: PlaidWebhookData
) {
  switch (code) {
    case 'ERROR':
      // Update item status to error
      await db.plaidItem.update({
        where: { plaidItemId: itemId },
        data: {
          status: 'error',
          errorCode: data.error?.error_code,
          errorMessage: data.error?.error_message,
        },
      });
      break;

    case 'PENDING_EXPIRATION':
      // Item access token will expire soon
      await db.plaidItem.update({
        where: { plaidItemId: itemId },
        data: {
          status: 'pending_expiration',
        },
      });
      // User notification for re-authentication is handled by the notifications system
      // This will trigger an email or in-app notification to the user
      break;

    case 'USER_PERMISSION_REVOKED':
      // User revoked permissions at the bank
      await db.plaidItem.update({
        where: { plaidItemId: itemId },
        data: {
          status: 'inactive',
          isActive: false,
        },
      });

      // Deactivate all bank accounts
      await db.bankAccount.updateMany({
        where: {
          plaidItem: { plaidItemId: itemId },
        },
        data: { isActive: false },
      });
      break;

    case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
      // Webhook URL was updated successfully
      console.log(`Webhook URL updated for item: ${itemId}`);
      break;
  }
}
