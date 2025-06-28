# 📡 SubPilot API Reference

**Last Updated**: 2025-06-28 08:01 AM EDT  
**API Version**: v1.3.0  
**Status**: Production Ready with 50+ Endpoints (Phase 3 Complete)

## Overview

SubPilot uses **tRPC** for end-to-end type-safe APIs. All endpoints are automatically typed and validated using Zod schemas. The API is fully implemented and operational with comprehensive security middleware.

## Base Configuration

```typescript
// src/utils/api.ts
import { createTRPCNext } from '@trpc/next';
import type { AppRouter } from '~/server/api/root';

export const api = createTRPCNext<AppRouter>({
  config() {
    return {
      url: '/api/trpc',
    };
  },
  ssr: false,
});
```

## Authentication

All protected routes require authentication. Include session token in requests:

```typescript
// Client-side usage
const { data: user } = api.auth.getUser.useQuery();
const { mutate: logout } = api.auth.logout.useMutation();
```

## Router Structure

```ascii
api/
├── auth           # Authentication & user management
├── plaid          # Bank integration endpoints
├── subscriptions  # Subscription CRUD operations
├── transactions   # Transaction management
├── notifications  # Alert and notification system
├── analytics      # Reporting and insights
├── cancellation   # Automated cancellation system (Phase 3)
├── assistant      # AI-powered chat assistant (Phase 3)
└── billing        # Premium billing with Stripe (Phase 3)
```

---

## Auth Router (`/api/trpc/auth`)

### `auth.getUser`

Get current authenticated user information.

```typescript
// Query
const user = api.auth.getUser.useQuery();

// Response
type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### `auth.updateProfile`

Update user profile information.

```typescript
// Mutation
const updateProfile = api.auth.updateProfile.useMutation();

// Input
type UpdateProfileInput = {
  name?: string;
  email?: string;
  notificationPreferences?: {
    emailAlerts: boolean;
    pushNotifications: boolean;
    weeklyReports: boolean;
  };
}

// Usage
updateProfile.mutate({
  name: "John Doe",
  notificationPreferences: {
    emailAlerts: true,
    pushNotifications: false,
    weeklyReports: true
  }
});
```

### `auth.deleteAccount`

Permanently delete user account and all associated data.

```typescript
// Mutation
const deleteAccount = api.auth.deleteAccount.useMutation();

// Input
type DeleteAccountInput = {
  confirmationEmail: string;
}
```

---

## Plaid Router (`/api/trpc/plaid`)

### `plaid.createLinkToken`

Generate Plaid Link token for bank connection.

```typescript
// Query
const linkToken = api.plaid.createLinkToken.useQuery();

// Response
type LinkTokenResponse = {
  linkToken: string;
  expiration: Date;
}
```

### `plaid.exchangePublicToken`

Exchange public token for access token after Link flow.

```typescript
// Mutation
const exchangeToken = api.plaid.exchangePublicToken.useMutation();

// Input
type ExchangeTokenInput = {
  publicToken: string;
  metadata: {
    institution: {
      name: string;
      institution_id: string;
    };
    accounts: Array<{
      id: string;
      name: string;
      type: string;
      subtype: string;
    }>;
  };
}
```

### `plaid.getAccounts`

Fetch all connected bank accounts.

```typescript
// Query
const accounts = api.plaid.getAccounts.useQuery();

// Response
type Account = {
  id: string;
  plaidAccountId: string;
  name: string;
  type: 'depository' | 'credit' | 'investment';
  subtype: string;
  balance: number;
  currency: string;
  institution: {
    name: string;
    logo: string | null;
  };
  isActive: boolean;
  lastSync: Date;
  createdAt: Date;
}
```

### `plaid.syncTransactions`

Manually trigger transaction synchronization.

```typescript
// Mutation
const syncTransactions = api.plaid.syncTransactions.useMutation();

// Input
type SyncTransactionsInput = {
  accountId?: string; // Optional: sync specific account
  force?: boolean;    // Force resync all transactions
}

// Response
type SyncResponse = {
  synced: number;
  newTransactions: number;
  updatedTransactions: number;
  subscriptionsDetected: number;
}
```

---

## Subscriptions Router (`/api/trpc/subscriptions`)

### `subscriptions.getAll`

Get all user subscriptions with filtering and pagination.

```typescript
// Query
const subscriptions = api.subscriptions.getAll.useQuery({
  status: 'active',
  category: 'streaming',
  sortBy: 'nextBilling',
  limit: 20,
  offset: 0
});

// Input
type GetSubscriptionsInput = {
  status?: 'active' | 'cancelled' | 'pending';
  category?: string;
  sortBy?: 'name' | 'amount' | 'nextBilling' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Response
type Subscription = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  nextBilling: Date | null;
  status: 'active' | 'cancelled' | 'pending';
  isActive: boolean;
  provider: {
    name: string;
    website: string | null;
    logo: string | null;
  };
  detectedAt: Date;
  lastTransaction: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### `subscriptions.getById`

Get detailed subscription information.

```typescript
// Query
const subscription = api.subscriptions.getById.useQuery({ id: "sub_123" });

// Enhanced response includes:
type SubscriptionDetails = Subscription & {
  transactions: Transaction[];
  priceHistory: Array<{
    amount: number;
    date: Date;
  }>;
  cancellationInfo: {
    canCancel: boolean;
    cancellationUrl: string | null;
    supportInfo: string | null;
  };
}
```

### `subscriptions.update`

Update subscription information.

```typescript
// Mutation
const updateSubscription = api.subscriptions.update.useMutation();

// Input
type UpdateSubscriptionInput = {
  id: string;
  name?: string;
  category?: string;
  notes?: string;
  isActive?: boolean;
  customAmount?: number; // Override detected amount
}
```

### `subscriptions.markCancelled`

Mark subscription as cancelled by user.

```typescript
// Mutation
const markCancelled = api.subscriptions.markCancelled.useMutation();

// Input
type MarkCancelledInput = {
  id: string;
  cancellationDate: Date;
  reason?: string;
  refundAmount?: number;
}
```

### `subscriptions.getCategories`

Get available subscription categories with counts.

```typescript
// Query
const categories = api.subscriptions.getCategories.useQuery();

// Response
type Category = {
  name: string;
  count: number;
  totalAmount: number;
  icon: string;
}
```

---

## Transactions Router (`/api/trpc/transactions`)

### `transactions.getAll`

Get transactions with filtering and search.

```typescript
// Query
const transactions = api.transactions.getAll.useQuery({
  accountId: "acc_123",
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  category: "subscription",
  search: "netflix",
  limit: 50
});

// Input
type GetTransactionsInput = {
  accountId?: string;
  startDate?: Date;
  endDate?: Date;
  category?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

// Response
type Transaction = {
  id: string;
  plaidTransactionId: string;
  accountId: string;
  amount: number;
  description: string;
  merchantName: string | null;
  category: string[];
  subcategory: string | null;
  date: Date;
  pending: boolean;
  subscriptionId: string | null;
  isSubscription: boolean;
  confidence: number; // Subscription detection confidence
  createdAt: Date;
}
```

### `transactions.categorize`

Manually categorize or re-categorize transactions.

```typescript
// Mutation
const categorize = api.transactions.categorize.useMutation();

// Input
type CategorizeInput = {
  transactionIds: string[];
  category: string;
  isSubscription?: boolean;
  subscriptionId?: string;
}
```

### `transactions.export`

Export transactions to CSV/JSON.

```typescript
// Query
const exportData = api.transactions.export.useQuery({
  format: 'csv',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  includeSubscriptions: true
});

// Response
type ExportResponse = {
  downloadUrl: string;
  expiresAt: Date;
  recordCount: number;
}
```

---

## Notifications Router (`/api/trpc/notifications`)

### `notifications.getAll`

Get user notifications with pagination.

```typescript
// Query
const notifications = api.notifications.getAll.useQuery({
  unreadOnly: false,
  type: 'renewal_reminder',
  limit: 20
});

// Response
type Notification = {
  id: string;
  type: 'renewal_reminder' | 'price_change' | 'trial_ending' | 'new_subscription';
  title: string;
  message: string;
  data: Record<string, any>; // Additional notification data
  read: boolean;
  readAt: Date | null;
  scheduledFor: Date;
  sentAt: Date | null;
  createdAt: Date;
}
```

### `notifications.markAsRead`

Mark notifications as read.

```typescript
// Mutation
const markAsRead = api.notifications.markAsRead.useMutation();

// Input
type MarkAsReadInput = {
  notificationIds: string[];
}
```

### `notifications.updatePreferences`

Update notification preferences.

```typescript
// Mutation
const updatePreferences = api.notifications.updatePreferences.useMutation();

// Input
type NotificationPreferences = {
  emailAlerts: boolean;
  pushNotifications: boolean;
  weeklyReports: boolean;
  renewalReminders: {
    enabled: boolean;
    daysBefore: number[];
  };
  priceChangeAlerts: boolean;
  trialEndingAlerts: boolean;
}
```

---

## Analytics Router (`/api/trpc/analytics`)

### `analytics.getOverview`

Get dashboard overview statistics.

```typescript
// Query
const overview = api.analytics.getOverview.useQuery({
  period: 'last_30_days'
});

// Response
type AnalyticsOverview = {
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlySpending: number;
  yearlySpending: number;
  averageSubscriptionCost: number;
  topCategories: Array<{
    category: string;
    count: number;
    amount: number;
  }>;
  spendingTrend: Array<{
    date: Date;
    amount: number;
  }>;
}
```

### `analytics.getSpendingReport`

Get detailed spending analysis.

```typescript
// Query
const spendingReport = api.analytics.getSpendingReport.useQuery({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  groupBy: 'month'
});

// Response
type SpendingReport = {
  totalSpent: number;
  periodComparison: {
    previousPeriod: number;
    percentageChange: number;
  };
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    subscriptionCount: number;
  }>;
  monthlyData: Array<{
    date: Date;
    amount: number;
    subscriptionCount: number;
  }>;
}
```

### `analytics.getCostPrediction`

Get future cost predictions based on current subscriptions.

```typescript
// Query
const prediction = api.analytics.getCostPrediction.useQuery({
  months: 12
});

// Response
type CostPrediction = {
  predictions: Array<{
    month: Date;
    estimatedCost: number;
    confidence: number;
  }>;
  annualEstimate: number;
  potentialSavings: number;
  recommendations: string[];
}
```

---

## Error Handling

All tRPC endpoints use consistent error handling:

```typescript
// Error types
type TRPCError = {
  code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR';
  message: string;
  data?: {
    zodError?: ZodError; // Validation errors
    httpStatus: number;
  };
}

// Usage with error handling
const { data, error, isLoading } = api.subscriptions.getAll.useQuery();

if (error) {
  console.error('API Error:', error.message);
  // Handle specific error codes
  if (error.data?.code === 'UNAUTHORIZED') {
    // Redirect to login
  }
}
```

## Rate Limiting

API endpoints are rate limited:

- **Authentication**: 10 requests per minute
- **Plaid operations**: 5 requests per minute
- **General queries**: 100 requests per minute
- **Mutations**: 20 requests per minute

## Webhooks

### Plaid Webhooks

Handle real-time transaction updates:

```typescript
// POST /api/webhooks/plaid
type PlaidWebhook = {
  webhook_type: 'TRANSACTIONS';
  webhook_code: 'SYNC_UPDATES_AVAILABLE';
  item_id: string;
  environment: 'sandbox' | 'development' | 'production';
}
```

---

## TypeScript Usage Examples

### React Query Integration

```typescript
// Component usage
function SubscriptionsList() {
  const {
    data: subscriptions,
    isLoading,
    error
  } = api.subscriptions.getAll.useQuery({
    status: 'active',
    sortBy: 'nextBilling'
  });

  const cancelSubscription = api.subscriptions.markCancelled.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      api.useContext().subscriptions.getAll.invalidate();
    }
  });

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {subscriptions?.map(sub => (
        <SubscriptionCard
          key={sub.id}
          subscription={sub}
          onCancel={(id) => cancelSubscription.mutate({
            id,
            cancellationDate: new Date()
          })}
        />
      ))}
    </div>
  );
}
```

### Server-side Usage

```typescript
// In API routes or server components
import { appRouter } from '~/server/api/root';
import { createContext } from '~/server/api/trpc';

const ctx = await createContext({ req, res });
const caller = appRouter.createCaller(ctx);

const subscriptions = await caller.subscriptions.getAll({
  status: 'active'
});
```

---

This API reference provides complete type safety and enables rapid development of SubPilot's frontend interfaces.
