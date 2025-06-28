-- Add security fields to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

-- Create AuditLog table
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "result" TEXT NOT NULL,
    "metadata" JSONB,
    "error" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes for AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_action_timestamp_idx" ON "AuditLog"("userId", "action", "timestamp");

-- Add foreign key constraint
ALTER TABLE "AuditLog" 
ADD CONSTRAINT "AuditLog_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;