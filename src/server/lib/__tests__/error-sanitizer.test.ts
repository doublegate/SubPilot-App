import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { ErrorSanitizer } from '../error-sanitizer';

// Mock environment
vi.mock('@/env.js', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

// Mock AuditLogger
vi.mock('../audit-logger', () => ({
  AuditLogger: {
    log: vi.fn(),
  },
}));

describe('ErrorSanitizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default test environment
    vi.mocked(require('@/env.js').env).NODE_ENV = 'test';
  });

  describe('sanitizeError', () => {
    it('should sanitize TRPCError with sensitive information', () => {
      const sensitiveError = new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Database error: postgresql://user:password@localhost:5432/db failed',
      });

      const sanitized = ErrorSanitizer.sanitizeError(sensitiveError);

      expect(sanitized.message).toContain('[REDACTED]');
      expect(sanitized.message).not.toContain('password');
      expect(sanitized.code).toBe('BAD_REQUEST');
    });

    it('should sanitize generic Error objects', () => {
      const error = new Error('Connection failed to postgresql://admin:secret@db.example.com/app');

      const sanitized = ErrorSanitizer.sanitizeError(error);

      expect(sanitized).toBeInstanceOf(TRPCError);
      expect(sanitized.message).toContain('[REDACTED]');
      expect(sanitized.message).not.toContain('secret');
    });

    it('should handle unknown error types', () => {
      const unknownError = { weird: 'error object' };

      const sanitized = ErrorSanitizer.sanitizeError(unknownError);

      expect(sanitized).toBeInstanceOf(TRPCError);
      expect(sanitized.code).toBe('INTERNAL_SERVER_ERROR');
      expect(sanitized.message).toBe('Internal server error');
    });

    it('should use generic messages in production', () => {
      vi.mocked(require('@/env.js').env).NODE_ENV = 'production';

      const internalError = new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Detailed database error with connection info',
      });

      const sanitized = ErrorSanitizer.sanitizeError(internalError);

      expect(sanitized.message).toBe('Internal server error');
      expect(sanitized.message).not.toContain('database');
    });

    it('should preserve safe error codes in production', () => {
      vi.mocked(require('@/env.js').env).NODE_ENV = 'production';

      const safeError = new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid email format',
      });

      const sanitized = ErrorSanitizer.sanitizeError(safeError);

      expect(sanitized.code).toBe('BAD_REQUEST');
      expect(sanitized.message).toBe('Invalid email format');
    });
  });

  describe('Sensitive pattern detection', () => {
    const testCases = [
      {
        name: 'Database connection strings',
        input: 'Error connecting to postgresql://user:pass@localhost:5432/db',
        shouldRedact: 'postgresql://user:pass@localhost:5432/db',
      },
      {
        name: 'API keys',
        input: 'Stripe error with key sk_test_1234567890abcdef',
        shouldRedact: 'sk_test_1234567890abcdef',
      },
      {
        name: 'JWT tokens',
        input: 'Invalid token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        shouldRedact: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      },
      {
        name: 'Email addresses',
        input: 'User admin@company.com not found',
        shouldRedact: 'admin@company.com',
      },
      {
        name: 'File paths',
        input: 'Failed to read /home/user/.env file',
        shouldRedact: '/home/user/.env',
      },
      {
        name: 'Internal IP addresses',
        input: 'Connection to 192.168.1.100 failed',
        shouldRedact: '192.168.1.100',
      },
    ];

    testCases.forEach(({ name, input, shouldRedact }) => {
      it(`should redact ${name}`, () => {
        const error = new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: input,
        });

        const sanitized = ErrorSanitizer.sanitizeError(error);

        expect(sanitized.message).not.toContain(shouldRedact);
        expect(sanitized.message).toContain('[REDACTED]');
      });
    });
  });

  describe('createUserFriendlyMessage', () => {
    const testCases = [
      {
        code: 'BAD_REQUEST' as const,
        expected: 'Please check your input and try again.',
      },
      {
        code: 'UNAUTHORIZED' as const,
        expected: 'Please sign in to continue.',
      },
      {
        code: 'FORBIDDEN' as const,
        expected: 'You do not have permission to perform this action.',
      },
      {
        code: 'NOT_FOUND' as const,
        expected: 'The requested resource could not be found.',
      },
      {
        code: 'TOO_MANY_REQUESTS' as const,
        expected: 'Too many requests. Please wait a moment before trying again.',
      },
    ];

    testCases.forEach(({ code, expected }) => {
      it(`should create friendly message for ${code}`, () => {
        const error = new TRPCError({ code, message: 'Technical error' });
        const friendly = ErrorSanitizer.createUserFriendlyMessage(error);
        expect(friendly).toBe(expected);
      });
    });

    it('should provide generic message for unknown error codes', () => {
      const error = new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Server error',
      });
      const friendly = ErrorSanitizer.createUserFriendlyMessage(error);
      expect(friendly).toContain('unexpected error occurred');
    });
  });

  describe('shouldAlertSecurity', () => {
    it('should alert on security-related errors', () => {
      const securityErrors = [
        new Error('SQL injection attempt detected'),
        new Error('XSS payload found in input'),
        new Error('Unauthorized access attempt'),
        new Error('CSRF token validation failed'),
      ];

      securityErrors.forEach((error) => {
        expect(ErrorSanitizer.shouldAlertSecurity(error)).toBe(true);
      });
    });

    it('should alert on sensitive procedures', () => {
      const error = new Error('Some error');
      const sensitiveProcedures = [
        'admin.deleteUser',
        'user.delete',
        'billing.charge',
        'auth.login',
        'plaid.exchange',
      ];

      sensitiveProcedures.forEach((procedure) => {
        expect(
          ErrorSanitizer.shouldAlertSecurity(error, { procedure })
        ).toBe(true);
      });
    });

    it('should not alert on normal errors', () => {
      const normalError = new Error('Network timeout');
      expect(ErrorSanitizer.shouldAlertSecurity(normalError)).toBe(false);
    });

    it('should not alert on non-Error objects', () => {
      const notAnError = 'string error';
      expect(ErrorSanitizer.shouldAlertSecurity(notAnError)).toBe(false);
    });
  });

  describe('Message length limits', () => {
    it('should truncate very long error messages', () => {
      const longMessage = 'Error: ' + 'x'.repeat(300);
      const error = new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: longMessage,
      });

      const sanitized = ErrorSanitizer.sanitizeError(error);

      expect(sanitized.message.length).toBeLessThanOrEqual(203); // 200 + '...'
      expect(sanitized.message).toEndWith('...');
    });
  });

  describe('Stack trace sanitization', () => {
    it('should remove stack trace information', () => {
      const errorWithStack = new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error at Object.handler (/app/src/server.ts:123:45)',
      });

      const sanitized = ErrorSanitizer.sanitizeError(errorWithStack);

      expect(sanitized.message).not.toContain('at Object.handler');
      expect(sanitized.message).not.toContain('/app/src/server.ts');
      expect(sanitized.message).not.toContain(':123:45');
    });
  });

  describe('Development vs Production behavior', () => {
    it('should be more permissive in development', () => {
      vi.mocked(require('@/env.js').env).NODE_ENV = 'development';

      const error = new Error('Detailed development error with /path/to/file.ts:123');

      const sanitized = ErrorSanitizer.sanitizeError(error);

      // Should still sanitize sensitive patterns but preserve more context
      expect(sanitized.message).toContain('Detailed development error');
      expect(sanitized.message).not.toContain('/path/to/file.ts:123');
    });

    it('should be more restrictive in production', () => {
      vi.mocked(require('@/env.js').env).NODE_ENV = 'production';

      const error = new Error('Detailed error that might help attackers');

      const sanitized = ErrorSanitizer.sanitizeError(error);

      expect(sanitized.code).toBe('INTERNAL_SERVER_ERROR');
      expect(sanitized.message).toBe('Internal server error');
    });
  });

  describe('Context logging', () => {
    it('should log errors with context information', () => {
      const error = new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Test error',
      });

      const context = {
        userId: 'user-123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        procedure: 'user.update',
        input: { name: 'test' },
      };

      ErrorSanitizer.sanitizeError(error, context);

      // Should have called AuditLogger.log
      expect(require('../audit-logger').AuditLogger.log).toHaveBeenCalled();
    });
  });
});