import { db } from '@/server/db';
import type { Prisma } from '@prisma/client';

export type SecurityAction =
  | 'user.login'
  | 'user.logout'
  | 'user.signup'
  | 'user.delete'
  | 'user.update'
  | 'auth.failed'
  | 'auth.locked'
  | 'bank.connected'
  | 'bank.disconnected'
  | 'bank.sync'
  | 'subscription.created'
  | 'subscription.cancelled'
  | 'api.rate_limit'
  | 'security.csrf_failed'
  | 'security.suspicious_activity'
  | 'cancellation.initiated'
  | 'cancellation.manual_confirmed'
  | 'webhook.signature_verification_failed'
  | 'webhook.cancellation_request_not_found'
  | 'webhook.cancellation_confirmed'
  | 'webhook.cancellation_error'
  | 'webhook.configuration_error'
  | 'realtime.sse_connected'
  | 'analytics.cancellation_completed'
  | 'analytics.cancellation_failed'
  | 'analytics.notification_sent'
  | 'analytics.aggregation_completed'
  | 'webhook.processed'
  | 'job.processed'
  | 'job.error'
  | 'job_processors.started'
  | 'job_processors.stopped'
  | 'notification.sent'
  | 'notification.error'
  | 'cancellation.confirmed'
  | 'cancellation.orchestration_failed'
  | 'create'
  | 'error.server_error'
  | 'error.client_error'
  | 'rate_limit.violation'
  | 'rate_limit.system_error'
  | 'rate_limit.auth.success'
  | 'rate_limit.api.success'
  | 'rate_limit.ai.success'
  | 'rate_limit.export.success'
  | 'rate_limit.admin.success'
  | 'rate_limit.billing.success'
  | 'rate_limit.banking.success'
  | 'rate_limit.auth.error'
  | 'rate_limit.api.error'
  | 'rate_limit.ai.error'
  | 'rate_limit.export.error'
  | 'rate_limit.admin.error'
  | 'rate_limit.billing.error'
  | 'rate_limit.banking.error'
  | 'session.created'
  | 'session.expired'
  | 'session.revoked'
  | 'session.suspicious_activity'
  | 'session.concurrent_limit'
  | 'session.bulk_revoke';

export interface SecurityEvent {
  userId?: string;
  action: SecurityAction;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  result: 'success' | 'failure';
  metadata?: Record<string, unknown>;
  error?: string;
}

/**
 * Audit logger for security-relevant events
 * Stores immutable logs for compliance and security monitoring
 */
export class AuditLogger {
  /**
   * Log a security event
   * These logs should never be deleted and are immutable
   */
  static async log(event: SecurityEvent): Promise<void> {
    try {
      // Create audit log entry
      await db.$executeRaw`
        INSERT INTO "AuditLog" (
          "userId",
          "action",
          "resource",
          "ipAddress",
          "userAgent",
          "result",
          "metadata",
          "error",
          "timestamp"
        ) VALUES (
          ${event.userId ?? null},
          ${event.action},
          ${event.resource ?? null},
          ${event.ipAddress ?? null},
          ${event.userAgent ?? null},
          ${event.result},
          ${JSON.stringify(event.metadata ?? {})},
          ${event.error ?? null},
          NOW()
        )
      `;
    } catch (error) {
      // Critical: Log to console if database logging fails
      console.error('[AUDIT] Failed to write audit log:', {
        event,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // In production, also send to external logging service
      if (process.env.NODE_ENV === 'production') {
        // TODO: Send to CloudWatch, Datadog, etc.
      }
    }
  }

  /**
   * Log a successful authentication
   */
  static async logAuth(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'user.login',
      ipAddress,
      userAgent,
      result: 'success',
    });
  }

  /**
   * Log a failed authentication attempt
   */
  static async logAuthFailure(
    email: string,
    ipAddress?: string,
    userAgent?: string,
    reason?: string
  ): Promise<void> {
    await this.log({
      action: 'auth.failed',
      resource: email,
      ipAddress,
      userAgent,
      result: 'failure',
      error: reason,
    });
  }

  /**
   * Log account lockout
   */
  static async logAccountLockout(
    userId: string,
    reason: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'auth.locked',
      result: 'failure',
      error: reason,
    });
  }

  /**
   * Log bank account connection
   */
  static async logBankConnection(
    userId: string,
    institutionName: string,
    success: boolean
  ): Promise<void> {
    await this.log({
      userId,
      action: 'bank.connected',
      resource: institutionName,
      result: success ? 'success' : 'failure',
    });
  }

  /**
   * Log subscription management actions
   */
  static async logSubscriptionAction(
    userId: string,
    subscriptionId: string,
    action: 'created' | 'cancelled',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      userId,
      action: `subscription.${action}`,
      resource: subscriptionId,
      result: 'success',
      metadata,
    });
  }

  /**
   * Log rate limit violations
   */
  static async logRateLimit(
    ipAddress: string,
    endpoint: string
  ): Promise<void> {
    await this.log({
      action: 'api.rate_limit',
      resource: endpoint,
      ipAddress,
      result: 'failure',
    });
  }

  /**
   * Log CSRF failures
   */
  static async logCSRFFailure(
    ipAddress: string,
    endpoint: string,
    origin?: string
  ): Promise<void> {
    await this.log({
      action: 'security.csrf_failed',
      resource: endpoint,
      ipAddress,
      result: 'failure',
      metadata: { origin },
    });
  }

  /**
   * Query audit logs (for admin dashboard)
   * Note: This should be heavily restricted and only accessible to admins
   */
  static async query(filters: {
    userId?: string;
    action?: SecurityAction;
    startDate?: Date;
    endDate?: Date;
    result?: 'success' | 'failure';
    limit?: number;
  }): Promise<
    Array<{
      id: string;
      userId: string | null;
      action: string;
      resource: string | null;
      ipAddress: string | null;
      userAgent: string | null;
      result: string;
      metadata: Prisma.JsonValue;
      error: string | null;
      timestamp: Date;
    }>
  > {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.result) where.result = filters.result;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    return await db.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit ?? 100,
    });
  }
}
