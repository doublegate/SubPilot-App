# Database Design Patterns for SubPilot with Prisma

## Overview

This document outlines database design patterns, schema optimization, and Prisma-specific techniques for building robust financial applications. It covers data modeling, performance optimization, security, and compliance patterns.

## Financial Data Modeling Principles

### 1. Precision and Accuracy

Financial data requires exact decimal precision to avoid rounding errors in calculations.

### 2. Immutable Records

Critical financial records should be immutable with audit trails for all changes.

### 3. Temporal Data

Track changes over time with effective dating and versioning.

### 4. Referential Integrity

Maintain strict relationships between financial entities.

## Core Schema Patterns

### Money and Currency Handling

```prisma
// Always store monetary amounts as integers (cents) to avoid floating point errors
model Transaction {
  id              String   @id @default(cuid())
  amountCents     Int      // Store as cents/smallest currency unit
  currency        String   @default("USD")
  exchangeRate    Decimal? @db.Decimal(15, 8) // High precision for rates
  
  // Convenience computed field for display
  // amount = amountCents / 100 (calculated in application)
  
  // Original amount in original currency (for multi-currency support)
  originalAmountCents Int?
  originalCurrency    String?
  
  userId          String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id])
  
  @@map("transactions")
}

// Price history for subscriptions with precise tracking
model PriceHistory {
  id               String   @id @default(cuid())
  subscriptionId   String
  oldAmountCents   Int
  newAmountCents   Int
  currency         String
  changePercentage Decimal  @db.Decimal(5, 2) // e.g., 15.50 for 15.5%
  effectiveDate    DateTime
  reason           String?
  createdAt        DateTime @default(now())
  
  subscription Subscription @relation(fields: [subscriptionId], references: [id])
  
  @@index([subscriptionId, effectiveDate])
  @@map("price_history")
}
```

### Audit Trail Pattern

```prisma
// Base audit fields for all important entities
model AuditLog {
  id          String     @id @default(cuid())
  entityType  String     // 'subscription', 'transaction', etc.
  entityId    String     // ID of the changed entity
  action      AuditAction
  oldValues   Json?      // Previous state
  newValues   Json?      // New state
  changedBy   String     // User ID who made the change
  reason      String?    // Optional reason for change
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime   @default(now())
  
  user User @relation(fields: [changedBy], references: [id])
  
  @@index([entityType, entityId])
  @@index([changedBy, createdAt])
  @@index([createdAt])
  @@map("audit_logs")
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  PAUSE
  RESUME
  CANCEL
}

// Subscription model with audit support
model Subscription {
  id               String    @id @default(cuid())
  name             String
  amountCents      Int
  currency         String    @default("USD")
  frequency        SubscriptionFrequency
  nextPayment      DateTime
  isActive         Boolean   @default(true)
  version          Int       @default(1) // Optimistic locking
  
  // Audit fields
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  createdBy        String
  lastModifiedBy   String
  
  userId           String
  
  user            User            @relation(fields: [userId], references: [id])
  creator         User            @relation("SubscriptionCreator", fields: [createdBy], references: [id])
  lastModifier    User            @relation("SubscriptionModifier", fields: [lastModifiedBy], references: [id])
  priceHistory    PriceHistory[]
  transactions    Transaction[]
  
  @@index([userId, isActive])
  @@index([nextPayment])
  @@map("subscriptions")
}
```

### Temporal Data Patterns

```prisma
// Effective dating pattern for subscriptions
model SubscriptionVersion {
  id              String   @id @default(cuid())
  subscriptionId  String
  name            String
  amountCents     Int
  currency        String
  frequency       SubscriptionFrequency
  
  // Temporal fields
  effectiveFrom   DateTime
  effectiveTo     DateTime? // NULL means currently active
  supersededBy    String?   // ID of the version that replaced this one
  
  // Metadata
  changeReason    String?
  createdAt       DateTime @default(now())
  createdBy       String
  
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
  creator         User        @relation(fields: [createdBy], references: [id])
  supersededByVersion SubscriptionVersion? @relation("VersionSupersedes", fields: [supersededBy], references: [id])
  supersedes      SubscriptionVersion[]   @relation("VersionSupersedes")
  
  @@unique([subscriptionId, effectiveFrom])
  @@index([subscriptionId, effectiveTo])
  @@map("subscription_versions")
}
```

### Financial Account Modeling

```prisma
// Account hierarchy pattern
model Account {
  id              String      @id @default(cuid())
  name            String
  type            AccountType
  subtype         String?     // Checking, Savings, Credit Card, etc.
  
  // Financial data
  balanceCents    Int?        // Current balance in cents
  availableCents  Int?        // Available balance (for credit accounts)
  currency        String      @default("USD")
  
  // Institution data
  institutionId   String?
  institutionName String?
  accountNumber   String?     @db.VarChar(255) // Encrypted
  routingNumber   String?     @db.VarChar(255) // Encrypted
  
  // Plaid integration
  plaidAccountId  String?     @unique
  plaidItemId     String?
  
  // Hierarchy for account grouping
  parentId        String?
  
  userId          String
  isActive        Boolean     @default(true)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  user            User         @relation(fields: [userId], references: [id])
  parent          Account?     @relation("AccountHierarchy", fields: [parentId], references: [id])
  children        Account[]    @relation("AccountHierarchy")
  transactions    Transaction[]
  balanceHistory  BalanceHistory[]
  
  @@index([userId, type, isActive])
  @@index([plaidAccountId])
  @@map("accounts")
}

enum AccountType {
  CHECKING
  SAVINGS
  CREDIT_CARD
  INVESTMENT
  LOAN
  MORTGAGE
  OTHER
}

// Track balance changes over time
model BalanceHistory {
  id           String   @id @default(cuid())
  accountId    String
  balanceCents Int
  currency     String
  recordedAt   DateTime @default(now())
  source       String   // 'plaid', 'manual', 'calculated'
  
  account Account @relation(fields: [accountId], references: [id])
  
  @@index([accountId, recordedAt])
  @@map("balance_history")
}
```

## Performance Optimization Patterns

### Efficient Indexing Strategies

```prisma
// Composite indexes for common query patterns
model Transaction {
  id              String   @id @default(cuid())
  userId          String
  accountId       String?
  subscriptionId  String?
  amountCents     Int
  category        String?
  type            TransactionType
  date            DateTime
  description     String?
  createdAt       DateTime @default(now())
  
  // Strategic indexes for performance
  @@index([userId, date(sort: Desc)])           // User's recent transactions
  @@index([userId, category, date(sort: Desc)]) // Category filtering
  @@index([subscriptionId, date(sort: Desc)])   // Subscription history
  @@index([accountId, date(sort: Desc)])        // Account statement
  @@index([type, date(sort: Desc)])             // Transaction type queries
  @@index([date, amountCents])                  // Date range + amount queries
  
  @@map("transactions")
}

// Partial indexes for active records only (PostgreSQL)
model Subscription {
  id         String  @id @default(cuid())
  userId     String
  isActive   Boolean @default(true)
  isPaused   Boolean @default(false)
  nextPayment DateTime
  
  // Only index active subscriptions for performance
  @@index([userId, nextPayment], name: "active_subscriptions", where: { isActive: true })
  @@index([nextPayment], name: "upcoming_payments", where: { isActive: true, isPaused: false })
  
  @@map("subscriptions")
}
```

### Materialized Views Pattern

```prisma
// Precomputed aggregations for dashboard performance
model UserFinancialSummary {
  id                    String   @id @default(cuid())
  userId                String   @unique
  
  // Monthly aggregations
  totalMonthlySpending  Int      // In cents
  subscriptionSpending  Int      // In cents
  activeSubscriptions   Int
  
  // Year-to-date aggregations
  ytdSpending          Int      // In cents
  ytdIncome            Int      // In cents
  
  // Category breakdowns (JSON for flexibility)
  monthlyByCategory    Json
  ytdByCategory        Json
  
  // Trends (last 12 months)
  spendingTrend        Json     // Array of monthly totals
  subscriptionTrend    Json     // Array of monthly subscription costs
  
  lastCalculated       DateTime @default(now())
  calculatedFor        DateTime // Which month this summary represents
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([calculatedFor])
  @@map("user_financial_summaries")
}

// Budget performance tracking
model BudgetSummary {
  id              String   @id @default(cuid())
  budgetId        String
  userId          String
  period          String   // 'YYYY-MM' format
  
  budgetAmount    Int      // In cents
  spentAmount     Int      // In cents
  remainingAmount Int      // In cents
  percentUsed     Decimal  @db.Decimal(5, 2)
  
  transactionCount Int
  lastTransaction DateTime?
  
  calculatedAt    DateTime @default(now())
  
  budget Budget @relation(fields: [budgetId], references: [id])
  user   User   @relation(fields: [userId], references: [id])
  
  @@unique([budgetId, period])
  @@map("budget_summaries")
}
```

## Data Integrity Patterns

### Constraint Validation

```prisma
// Ensure financial data integrity with database constraints
model Transaction {
  id              String          @id @default(cuid())
  amountCents     Int             // Must be positive for expenses, negative for refunds
  type            TransactionType
  userId          String
  
  // Constraint: Amount must be appropriate for transaction type
  @@check(constraint: "amount_type_check", fields: [amountCents, type])
  
  @@map("transactions")
}

// Custom check constraints (PostgreSQL example)
// CREATE TABLE transactions (
//   ...
//   CONSTRAINT amount_type_check CHECK (
//     (type = 'EXPENSE' AND amount_cents > 0) OR
//     (type = 'INCOME' AND amount_cents > 0) OR
//     (type = 'REFUND' AND amount_cents < 0)
//   )
// );

model Subscription {
  id           String              @id @default(cuid())
  amountCents  Int
  frequency    SubscriptionFrequency
  nextPayment  DateTime
  userId       String
  
  // Ensure positive amounts and future payment dates
  @@check(constraint: "positive_amount", fields: [amountCents])
  @@check(constraint: "future_payment", fields: [nextPayment])
  
  @@map("subscriptions")
}
```

### Soft Delete Pattern

```prisma
// Soft delete for financial records (never truly delete)
model Subscription {
  id          String    @id @default(cuid())
  name        String
  amountCents Int
  userId      String
  
  // Soft delete fields
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  deletedBy   String?
  deleteReason String?
  
  user        User      @relation(fields: [userId], references: [id])
  deletedByUser User?   @relation("SubscriptionDeleter", fields: [deletedBy], references: [id])
  
  // Only show non-deleted records by default
  @@index([userId, isDeleted])
  @@map("subscriptions")
}

// Custom Prisma client extension for automatic soft delete filtering
// Usage: prisma.subscription.findManyNotDeleted()
```

## Security Patterns

### Data Encryption

```prisma
// Sensitive data encryption at rest
model BankAccount {
  id                String   @id @default(cuid())
  userId            String
  institutionName   String
  
  // Encrypted fields (handled by application layer)
  accountNumberHash String   // Hash for lookup
  accountNumber     String   @db.Text // Encrypted full number
  routingNumber     String   @db.Text // Encrypted
  
  // Encryption metadata
  encryptionKeyId   String   // Which key was used
  encryptedAt       DateTime @default(now())
  
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId, accountNumberHash])
  @@map("bank_accounts")
}

// Personal Identifiable Information (PII) protection
model UserProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  
  // Non-sensitive data
  firstName       String
  displayName     String
  timezone        String   @default("UTC")
  
  // Encrypted sensitive data
  lastNameHash    String   // For search/matching
  lastName        String   @db.Text // Encrypted
  phoneHash       String?
  phone           String?  @db.Text // Encrypted
  ssnHash         String?
  ssn             String?  @db.Text // Encrypted
  
  encryptionKeyId String
  
  user User @relation(fields: [userId], references: [id])
  
  @@map("user_profiles")
}
```

### Row Level Security (RLS) Pattern

```prisma
// User isolation through consistent patterns
model Subscription {
  id     String @id @default(cuid())
  userId String // Always include userId for RLS
  name   String
  
  user User @relation(fields: [userId], references: [id])
  
  // All user-owned entities should have userId index
  @@index([userId])
  @@map("subscriptions")
}

model Transaction {
  id     String @id @default(cuid())
  userId String // Denormalized for performance and security
  
  // Even with relationships, maintain direct user ownership
  subscriptionId String?
  subscription   Subscription? @relation(fields: [subscriptionId], references: [id])
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@map("transactions")
}
```

## Advanced Query Patterns

### Efficient Aggregations

```typescript
// Optimized query patterns for financial calculations
export const getMonthlySpendingByCategory = async (
  prisma: PrismaClient,
  userId: string,
  year: number,
  month: number
) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Use aggregation at database level for performance
  const spending = await prisma.transaction.groupBy({
    by: ['category'],
    where: {
      userId,
      type: 'EXPENSE',
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      amountCents: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        amountCents: 'desc',
      },
    },
  });

  return spending.map(item => ({
    category: item.category || 'Uncategorized',
    totalCents: item._sum.amountCents || 0,
    totalFormatted: formatCurrency(item._sum.amountCents || 0),
    transactionCount: item._count.id,
  }));
};

// Subscription analytics with complex aggregations
export const getSubscriptionAnalytics = async (
  prisma: PrismaClient,
  userId: string
) => {
  const [subscriptions, recentTransactions] = await Promise.all([
    // Active subscriptions with transaction counts
    prisma.subscription.findMany({
      where: { userId, isActive: true },
      include: {
        _count: {
          select: { transactions: true },
        },
        transactions: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    }),
    
    // Recent subscription transactions
    prisma.transaction.aggregateRaw({
      pipeline: [
        { $match: { userId, subscriptionId: { $ne: null } } },
        { $sort: { date: -1 } },
        { $limit: 100 },
        {
          $group: {
            _id: '$subscriptionId',
            totalAmount: { $sum: '$amountCents' },
            transactionCount: { $sum: 1 },
            lastPayment: { $first: '$date' },
            averageAmount: { $avg: '$amountCents' },
          },
        },
      ],
    }),
  ]);

  return {
    subscriptions,
    recentTransactions,
    totalMonthlyCommitment: subscriptions.reduce((sum, sub) => {
      return sum + calculateMonthlyAmount(sub.amountCents, sub.frequency);
    }, 0),
  };
};
```

### Time-Series Queries

```typescript
// Efficient time-series data for charts and trends
export const getSpendingTrend = async (
  prisma: PrismaClient,
  userId: string,
  months: number = 12
) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - months);

  // PostgreSQL-optimized query with date truncation
  const trend = await prisma.$queryRaw<Array<{
    month: string;
    total_spending: number;
    transaction_count: number;
  }>>`
    SELECT 
      DATE_TRUNC('month', date) as month,
      SUM(amount_cents) as total_spending,
      COUNT(*) as transaction_count
    FROM transactions 
    WHERE 
      user_id = ${userId}
      AND type = 'EXPENSE'
      AND date >= ${startDate}
      AND date <= ${endDate}
    GROUP BY DATE_TRUNC('month', date)
    ORDER BY month ASC
  `;

  return trend.map(row => ({
    month: row.month,
    totalSpending: Number(row.total_spending),
    transactionCount: Number(row.transaction_count),
    averageTransaction: Number(row.total_spending) / Number(row.transaction_count),
  }));
};

// Subscription growth analysis
export const getSubscriptionGrowthTrend = async (
  prisma: PrismaClient,
  userId: string
) => {
  const growth = await prisma.$queryRaw<Array<{
    month: string;
    new_subscriptions: number;
    cancelled_subscriptions: number;
    net_growth: number;
  }>>`
    WITH monthly_changes AS (
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_subscriptions
      FROM subscriptions 
      WHERE user_id = ${userId}
      GROUP BY DATE_TRUNC('month', created_at)
    ),
    monthly_cancellations AS (
      SELECT 
        DATE_TRUNC('month', deleted_at) as month,
        COUNT(*) as cancelled_subscriptions
      FROM subscriptions 
      WHERE user_id = ${userId} AND deleted_at IS NOT NULL
      GROUP BY DATE_TRUNC('month', deleted_at)
    )
    SELECT 
      COALESCE(mc.month, mca.month) as month,
      COALESCE(mc.new_subscriptions, 0) as new_subscriptions,
      COALESCE(mca.cancelled_subscriptions, 0) as cancelled_subscriptions,
      COALESCE(mc.new_subscriptions, 0) - COALESCE(mca.cancelled_subscriptions, 0) as net_growth
    FROM monthly_changes mc
    FULL OUTER JOIN monthly_cancellations mca ON mc.month = mca.month
    ORDER BY month ASC
  `;

  return growth;
};
```

## Migration Patterns

### Schema Evolution Strategy

```prisma
// Version 1 - Initial schema
model Subscription {
  id          String @id @default(cuid())
  name        String
  amount      Float  // Initial implementation with Float
  frequency   String
  userId      String
  createdAt   DateTime @default(now())
}

// Version 2 - Migration to cents-based storage
model Subscription {
  id          String @id @default(cuid())
  name        String
  amount      Float    @ignore // Deprecated field
  amountCents Int      // New field for precise currency
  frequency   String
  userId      String
  createdAt   DateTime @default(now())
  
  // Migration flag to track conversion
  isMigrated  Boolean  @default(false)
}

// Version 3 - Remove deprecated fields
model Subscription {
  id          String @id @default(cuid())
  name        String
  amountCents Int
  frequency   SubscriptionFrequency // Enum for type safety
  userId      String
  createdAt   DateTime @default(now())
}
```

### Data Migration Scripts

```typescript
// Migration script for converting Float amounts to cents
export async function migrateAmountsToC ents() {
  const prisma = new PrismaClient();
  
  try {
    // Find all non-migrated subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: { isMigrated: false },
    });

    console.log(`Migrating ${subscriptions.length} subscriptions...`);

    for (const subscription of subscriptions) {
      const amountCents = Math.round((subscription.amount || 0) * 100);
      
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          amountCents,
          isMigrated: true,
        },
      });
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Rollback strategy
export async function rollbackAmountsMigration() {
  const prisma = new PrismaClient();
  
  try {
    await prisma.subscription.updateMany({
      data: {
        isMigrated: false,
        // Note: Can't easily rollback amountCents to amount
        // Would need custom logic to handle this
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
```

These database design patterns provide a robust foundation for handling financial data with Prisma, ensuring accuracy, security, and performance at scale.
