# Plaid Integration Guide

## Overview

SubPilot uses Plaid to securely connect to users' bank accounts and retrieve transaction data. This guide covers the implementation details and setup process.

## Current Status (June 21, 2025)

✅ **Completed**:
- Plaid SDK installed and configured
- Plaid client singleton with error handling
- Complete API router implementation
- Link token creation endpoint
- Public token exchange flow
- Account and transaction storage
- Transaction sync functionality
- Bank account disconnection
- Webhook handler for real-time updates
- UI components (PlaidLinkButton, BankAccountsList)
- Database schema updates

🚧 **In Progress**:
- Plaid developer account setup (sandbox credentials needed)
- Subscription detection algorithm
- Transaction categorization enhancement

## Architecture

### Backend Components

1. **Plaid Client** (`src/server/plaid-client.ts`)
   - Singleton Plaid API client
   - Environment-based configuration
   - Error handling utilities
   - Webhook verification (placeholder)

2. **Plaid Router** (`src/server/api/routers/plaid.ts`)
   - `createLinkToken`: Generates Link tokens for Plaid Link
   - `exchangePublicToken`: Exchanges public tokens for access tokens
   - `getAccounts`: Retrieves connected bank accounts
   - `syncTransactions`: Syncs new transactions
   - `disconnectAccount`: Removes bank connections
   - `getSyncStatus`: Gets sync status for accounts

3. **Webhook Handler** (`src/app/api/webhooks/plaid/route.ts`)
   - Handles transaction updates
   - Manages item status changes
   - Processes error notifications

### Frontend Components

1. **PlaidLinkButton** (`src/components/plaid-link-button.tsx`)
   - Integrates with react-plaid-link
   - Handles Link flow and token exchange
   - Shows loading states and errors

2. **BankAccountsList** (`src/components/bank-accounts-list.tsx`)
   - Displays connected accounts
   - Uses AccountList component
   - Shows empty state for new users

3. **Accounts Page** (`src/app/(dashboard)/accounts/page.tsx`)
   - Bank account management interface
   - Connect new accounts
   - View existing connections

## Database Schema

### PlaidItem Model
```prisma
model PlaidItem {
  id                String   @id @default(cuid())
  userId            String
  plaidItemId       String   @unique
  accessToken       String   // Should be encrypted in production
  institutionId     String
  institutionName   String
  status            String   @default("good")
  needsSync         Boolean  @default(false)
  isActive          Boolean  @default(true)
  errorCode         String?
  errorMessage      String?
  lastWebhook       DateTime?
  accounts          Account[]
}
```

### Account Model
```prisma
model Account {
  id                String  @id @default(cuid())
  plaidAccountId    String  @unique
  plaidItemId       String
  name              String
  mask              String  // Last 4 digits
  type              String  // depository, credit, loan, investment
  subtype           String  // checking, savings, credit card, etc.
  currentBalance    Decimal
  availableBalance  Decimal?
  isActive          Boolean @default(true)
  lastSync          DateTime @default(now())
  transactions      Transaction[]
}
```

### Transaction Model
```prisma
model Transaction {
  id                    String   @id @default(cuid())
  plaidTransactionId    String   @unique
  accountId             String
  amount                Decimal
  isoCurrencyCode       String   @default("USD")
  description           String
  merchantName          String?
  category              Json     @default("[]")
  transactionType       String   @default("other")
  date                  DateTime
  pending               Boolean  @default(false)
  isSubscription        Boolean  @default(false)
}
```

## Setup Instructions

### 1. Create Plaid Developer Account

1. Go to [Plaid Dashboard](https://dashboard.plaid.com/signup)
2. Sign up for a free developer account
3. Navigate to Team Settings > Keys
4. Copy your Sandbox credentials

### 2. Configure Environment Variables

Add to `.env.local`:
```env
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-sandbox-secret"
PLAID_ENV="sandbox"
PLAID_PRODUCTS="transactions,accounts,identity"
PLAID_COUNTRY_CODES="US,CA"
PLAID_REDIRECT_URI="http://localhost:3000/dashboard"
PLAID_WEBHOOK_URL="http://localhost:3000/api/webhooks/plaid"
```

### 3. Test Sandbox Credentials

Plaid provides test credentials for sandbox:
- Username: `user_good`
- Password: `pass_good`
- Bank: Any bank in the list

## Security Considerations

1. **Access Token Storage**: Currently stored in plain text. In production:
   - Encrypt access tokens before storing
   - Use a key management service (AWS KMS, etc.)
   - Implement token rotation

2. **Webhook Verification**: Currently placeholder implementation
   - Implement proper JWT verification
   - Validate webhook signatures
   - Use webhook verification keys

3. **Data Privacy**:
   - Only store necessary transaction data
   - Implement data retention policies
   - Allow users to delete their data

## Next Steps

1. **Subscription Detection Algorithm**:
   - Implement pattern matching for merchant names
   - Detect recurring amounts and frequencies
   - Calculate confidence scores
   - Create subscription records

2. **Enhanced Transaction Sync**:
   - Use Plaid's `/transactions/sync` endpoint
   - Implement cursor-based pagination
   - Handle removed/modified transactions
   - Add background job processing

3. **Institution Logos**:
   - Fetch logos from Plaid
   - Cache logos locally
   - Display in UI components

4. **Error Handling**:
   - Implement retry logic for failed syncs
   - User notifications for connection errors
   - Graceful degradation for API failures

## Testing

### Manual Testing Flow

1. Start development server: `npm run dev`
2. Login to the application
3. Navigate to Dashboard or Accounts page
4. Click "Connect Bank Account"
5. Use sandbox credentials to connect
6. Verify accounts appear in the list
7. Check database for stored data

### API Testing

```bash
# Get link token
curl -X GET http://localhost:3000/api/trpc/plaid.createLinkToken \
  -H "Cookie: [your-session-cookie]"

# Get accounts
curl -X GET http://localhost:3000/api/trpc/plaid.getAccounts \
  -H "Cookie: [your-session-cookie]"
```

## Troubleshooting

### Common Issues

1. **"Plaid is not configured" error**:
   - Check environment variables
   - Restart dev server after adding env vars
   - Verify credentials are correct

2. **Link token creation fails**:
   - Check Plaid API status
   - Verify products are enabled
   - Check country codes match account

3. **Transactions not syncing**:
   - Check webhook configuration
   - Verify account permissions
   - Look for sync errors in logs

### Debug Mode

Enable debug logging:
```typescript
// In plaid-client.ts
console.log("Plaid Config:", {
  clientId: env.PLAID_CLIENT_ID ? "Set" : "Missing",
  secret: env.PLAID_SECRET ? "Set" : "Missing",
  env: env.PLAID_ENV,
})
```

## References

- [Plaid Documentation](https://plaid.com/docs/)
- [Plaid API Reference](https://plaid.com/docs/api/)
- [react-plaid-link](https://github.com/plaid/react-plaid-link)
- [Plaid Quickstart](https://github.com/plaid/quickstart)