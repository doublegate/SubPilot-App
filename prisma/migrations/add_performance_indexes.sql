-- Add compound indexes for performance optimization

-- Transaction indexes
CREATE INDEX IF NOT EXISTS "transactions_userId_date_isSubscription_idx" ON "transactions"("userId", "date", "isSubscription");
CREATE INDEX IF NOT EXISTS "transactions_merchantName_userId_idx" ON "transactions"("merchantName", "userId");
CREATE INDEX IF NOT EXISTS "transactions_accountId_date_idx" ON "transactions"("accountId", "date");
CREATE INDEX IF NOT EXISTS "transactions_subscriptionId_idx" ON "transactions"("subscriptionId");

-- Subscription indexes
CREATE INDEX IF NOT EXISTS "subscriptions_userId_status_isActive_idx" ON "subscriptions"("userId", "status", "isActive");
CREATE INDEX IF NOT EXISTS "subscriptions_userId_nextBilling_idx" ON "subscriptions"("userId", "nextBilling");
CREATE INDEX IF NOT EXISTS "subscriptions_userId_category_idx" ON "subscriptions"("userId", "category");

-- Bank account indexes
CREATE INDEX IF NOT EXISTS "bank_accounts_userId_isActive_idx" ON "bank_accounts"("userId", "isActive");

-- Notification indexes
CREATE INDEX IF NOT EXISTS "notifications_userId_read_scheduledFor_idx" ON "notifications"("userId", "read", "scheduledFor");

-- Note: Run this migration with:
-- npx prisma migrate dev --name add_performance_indexes