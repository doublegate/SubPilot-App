-- CreateIndex for analytics performance
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("bankAccountId", "date");
CREATE INDEX "Transaction_isSubscription_idx" ON "Transaction"("isSubscription");
CREATE INDEX "Transaction_amount_idx" ON "Transaction"("amount");

-- Composite index for subscription analytics
CREATE INDEX "Subscription_userId_isActive_idx" ON "Subscription"("userId", "isActive");
CREATE INDEX "Subscription_userId_category_idx" ON "Subscription"("userId", "category");
CREATE INDEX "Subscription_nextBilling_idx" ON "Subscription"("nextBilling");

-- Index for bank account lookups
CREATE INDEX "BankAccount_userId_idx" ON "BankAccount"("userId");