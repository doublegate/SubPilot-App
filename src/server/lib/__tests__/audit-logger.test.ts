import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AuditLogger,
  type SecurityEvent,
  type SecurityAction,
} from '../audit-logger';
import { db } from '@/server/db';

// Mock the database
vi.mock('@/server/db', () => ({
  db: {
    $executeRaw: vi.fn(),
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

describe('AuditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log', () => {
    it('should log a security event successfully', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      const event: SecurityEvent = {
        userId: 'user-123',
        action: 'user.login',
        resource: 'dashboard',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        result: 'success',
        metadata: { sessionId: 'session-123' },
      };

      await AuditLogger.log(event);

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object), // The SQL template literal
        'user-123',
        'user.login',
        'dashboard',
        '192.168.1.1',
        'Mozilla/5.0',
        'success',
        '{"sessionId":"session-123"}',
        null
      );
    });

    it('should handle null values correctly', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      const event: SecurityEvent = {
        action: 'auth.failed',
        result: 'failure',
      };

      await AuditLogger.log(event);

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        null, // userId
        'auth.failed',
        null, // resource
        null, // ipAddress
        null, // userAgent
        'failure',
        '{}', // empty metadata object
        null // error
      );
    });

    it('should handle database errors gracefully', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      const mockConsoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const dbError = new Error('Database connection failed');
      mockExecuteRaw.mockRejectedValue(dbError);

      const event: SecurityEvent = {
        action: 'user.login',
        result: 'success',
      };

      // Should not throw
      await expect(AuditLogger.log(event)).resolves.toBeUndefined();

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[AUDIT] Failed to write audit log:',
        {
          event,
          error: 'Database connection failed',
        }
      );
    });

    it('should handle unknown error types', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      const mockConsoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockExecuteRaw.mockRejectedValue('String error');

      const event: SecurityEvent = {
        action: 'user.login',
        result: 'success',
      };

      await AuditLogger.log(event);

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[AUDIT] Failed to write audit log:',
        {
          event,
          error: 'Unknown error',
        }
      );
    });
  });

  describe('logAuth', () => {
    it('should log successful authentication', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      await AuditLogger.logAuth('user-123', '192.168.1.1', 'Mozilla/5.0');

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        'user-123',
        'user.login',
        null,
        '192.168.1.1',
        'Mozilla/5.0',
        'success',
        '{}',
        null
      );
    });

    it('should handle optional parameters', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      await AuditLogger.logAuth('user-123');

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        'user-123',
        'user.login',
        null,
        null,
        null,
        'success',
        '{}',
        null
      );
    });
  });

  describe('logAuthFailure', () => {
    it('should log failed authentication attempt', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      await AuditLogger.logAuthFailure(
        'test@example.com',
        '192.168.1.1',
        'Mozilla/5.0',
        'Invalid password'
      );

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        null, // userId is null for failed attempts
        'auth.failed',
        'test@example.com',
        '192.168.1.1',
        'Mozilla/5.0',
        'failure',
        '{}',
        'Invalid password'
      );
    });

    it('should handle optional parameters', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      await AuditLogger.logAuthFailure('test@example.com');

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        null,
        'auth.failed',
        'test@example.com',
        null,
        null,
        'failure',
        '{}',
        null
      );
    });
  });

  describe('logAccountLockout', () => {
    it('should log account lockout event', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      await AuditLogger.logAccountLockout(
        'user-123',
        'Too many failed attempts'
      );

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        'user-123',
        'auth.locked',
        null,
        null,
        null,
        'failure',
        '{}',
        'Too many failed attempts'
      );
    });
  });

  describe('logBankConnection', () => {
    it('should log successful bank connection', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      await AuditLogger.logBankConnection('user-123', 'Chase Bank', true);

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        'user-123',
        'bank.connected',
        'Chase Bank',
        null,
        null,
        'success',
        '{}',
        null
      );
    });

    it('should log failed bank connection', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      await AuditLogger.logBankConnection('user-123', 'Chase Bank', false);

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        'user-123',
        'bank.connected',
        'Chase Bank',
        null,
        null,
        'failure',
        '{}',
        null
      );
    });
  });

  describe('logSubscriptionAction', () => {
    it('should log subscription creation', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      const metadata = { amount: 9.99, currency: 'USD' };

      await AuditLogger.logSubscriptionAction(
        'user-123',
        'sub-456',
        'created',
        metadata
      );

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        'user-123',
        'subscription.created',
        'sub-456',
        null,
        null,
        'success',
        '{"amount":9.99,"currency":"USD"}',
        null
      );
    });

    it('should log subscription cancellation', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      await AuditLogger.logSubscriptionAction(
        'user-123',
        'sub-456',
        'cancelled'
      );

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        'user-123',
        'subscription.cancelled',
        'sub-456',
        null,
        null,
        'success',
        '{}',
        null
      );
    });
  });

  describe('logRateLimit', () => {
    it('should log rate limit violation', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      await AuditLogger.logRateLimit('192.168.1.1', '/api/subscriptions');

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        null,
        'api.rate_limit',
        '/api/subscriptions',
        '192.168.1.1',
        null,
        'failure',
        '{}',
        null
      );
    });
  });

  describe('logCSRFFailure', () => {
    it('should log CSRF failure with origin', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      await AuditLogger.logCSRFFailure(
        '192.168.1.1',
        '/api/auth/signin',
        'https://malicious-site.com'
      );

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        null,
        'security.csrf_failed',
        '/api/auth/signin',
        '192.168.1.1',
        null,
        'failure',
        '{"origin":"https://malicious-site.com"}',
        null
      );
    });

    it('should log CSRF failure without origin', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      await AuditLogger.logCSRFFailure('192.168.1.1', '/api/auth/signin');

      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        null,
        'security.csrf_failed',
        '/api/auth/signin',
        '192.168.1.1',
        null,
        'failure',
        '{}', // undefined values are filtered out during JSON.stringify
        null
      );
    });
  });

  describe('query', () => {
    it('should query audit logs with filters', async () => {
      const mockFindMany = vi.mocked(db.auditLog.findMany);
      const mockResults = [
        {
          id: 'log-123',
          userId: 'user-123',
          action: 'user.login',
          resource: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          result: 'success',
          metadata: {},
          error: null,
          timestamp: new Date(),
        },
      ];
      mockFindMany.mockResolvedValue(mockResults);

      const filters = {
        userId: 'user-123',
        action: 'user.login' as SecurityAction,
        result: 'success' as const,
        limit: 50,
      };

      const results = await AuditLogger.query(filters);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          action: 'user.login',
          result: 'success',
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });

      expect(results).toEqual(mockResults);
    });

    it('should query with date range filters', async () => {
      const mockFindMany = vi.mocked(db.auditLog.findMany);
      mockFindMany.mockResolvedValue([]);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      await AuditLogger.query({
        startDate,
        endDate,
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100, // default limit
      });
    });

    it('should query with default limit when none provided', async () => {
      const mockFindMany = vi.mocked(db.auditLog.findMany);
      mockFindMany.mockResolvedValue([]);

      await AuditLogger.query({});

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    });

    it('should handle only start date', async () => {
      const mockFindMany = vi.mocked(db.auditLog.findMany);
      mockFindMany.mockResolvedValue([]);

      const startDate = new Date('2023-01-01');

      await AuditLogger.query({ startDate });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: startDate,
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    });

    it('should handle only end date', async () => {
      const mockFindMany = vi.mocked(db.auditLog.findMany);
      mockFindMany.mockResolvedValue([]);

      const endDate = new Date('2023-12-31');

      await AuditLogger.query({ endDate });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lte: endDate,
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    });
  });

  describe('Security Event Actions', () => {
    // Test that all security actions are properly typed
    const securityActions: SecurityAction[] = [
      'user.login',
      'user.logout',
      'user.signup',
      'user.delete',
      'user.update',
      'auth.failed',
      'auth.locked',
      'bank.connected',
      'bank.disconnected',
      'bank.sync',
      'subscription.created',
      'subscription.cancelled',
      'api.rate_limit',
      'security.csrf_failed',
      'security.suspicious_activity',
      'cancellation.initiated',
      'cancellation.manual_confirmed',
      'webhook.signature_verification_failed',
      'webhook.cancellation_request_not_found',
      'webhook.cancellation_confirmed',
      'webhook.cancellation_error',
      'webhook.configuration_error',
      'realtime.sse_connected',
      'analytics.cancellation_completed',
      'analytics.cancellation_failed',
      'analytics.notification_sent',
      'analytics.aggregation_completed',
      'webhook.processed',
      'job.processed',
      'job.error',
      'job_processors.started',
      'job_processors.stopped',
      'notification.sent',
      'notification.error',
      'cancellation.confirmed',
      'cancellation.orchestration_failed',
      'create',
      'error.server_error',
      'error.client_error',
      'rate_limit.violation',
      'rate_limit.system_error',
      'rate_limit.auth.success',
      'rate_limit.api.success',
      'rate_limit.ai.success',
      'rate_limit.export.success',
      'rate_limit.admin.success',
      'rate_limit.billing.success',
      'rate_limit.banking.success',
      'rate_limit.auth.error',
      'rate_limit.api.error',
      'rate_limit.ai.error',
      'rate_limit.export.error',
      'rate_limit.admin.error',
      'rate_limit.billing.error',
      'rate_limit.banking.error',
      'session.created',
      'session.expired',
      'session.revoked',
      'session.suspicious_activity',
      'session.concurrent_limit',
      'session.bulk_revoke',
    ];

    it('should accept all defined security actions', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      // Test a few representative actions
      for (const action of securityActions.slice(0, 5)) {
        const event: SecurityEvent = {
          action,
          result: 'success',
        };

        await expect(AuditLogger.log(event)).resolves.toBeUndefined();
      }
    });
  });

  describe('Production Environment Handling', () => {
    it('should handle production environment logging failures', async () => {
      const originalEnv = process.env.NODE_ENV;
      vi.stubEnv('NODE_ENV', 'production');

      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      const mockConsoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockExecuteRaw.mockRejectedValue(new Error('Database down'));

      const event: SecurityEvent = {
        action: 'user.login',
        result: 'success',
      };

      await AuditLogger.log(event);

      expect(mockConsoleError).toHaveBeenCalled();

      // Restore original environment
      vi.unstubAllEnvs();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large metadata objects', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      const largeMetadata = {
        data: 'x'.repeat(10000),
        nested: {
          deep: {
            object: {
              with: 'many levels',
            },
          },
        },
        array: new Array(1000).fill('item'),
      };

      const event: SecurityEvent = {
        action: 'user.login',
        result: 'success',
        metadata: largeMetadata,
      };

      await expect(AuditLogger.log(event)).resolves.toBeUndefined();
      expect(mockExecuteRaw).toHaveBeenCalled();
    });

    it('should handle special characters in strings', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      const event: SecurityEvent = {
        action: 'auth.failed',
        result: 'failure',
        resource: "user'; DROP TABLE users; --",
        error: 'Password contains "quotes" and \'apostrophes\'',
        metadata: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) "Test"',
        },
      };

      await expect(AuditLogger.log(event)).resolves.toBeUndefined();
      expect(mockExecuteRaw).toHaveBeenCalled();
    });

    it('should handle null and undefined metadata values', async () => {
      const mockExecuteRaw = vi.mocked(db.$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      const event: SecurityEvent = {
        action: 'user.login',
        result: 'success',
        metadata: {
          nullValue: null,
          undefinedValue: undefined,
          emptyString: '',
          zero: 0,
          false: false,
        },
      };

      await expect(AuditLogger.log(event)).resolves.toBeUndefined();
      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.any(Object),
        null,
        'user.login',
        null,
        null,
        null,
        'success',
        '{"nullValue":null,"emptyString":"","zero":0,"false":false}',
        null
      );
    });
  });
});
