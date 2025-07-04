import { TRPCError } from '@trpc/server';
import { env } from '@/env.js';
import { AuditLogger } from './audit-logger';

/**
 * Error sanitization service to prevent information disclosure
 * Removes sensitive information from errors sent to clients
 */
export class ErrorSanitizer {
  private static readonly SAFE_ERROR_CODES = [
    'BAD_REQUEST',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'METHOD_NOT_SUPPORTED',
    'TIMEOUT',
    'CONFLICT',
    'PRECONDITION_FAILED',
    'PAYLOAD_TOO_LARGE',
    'TOO_MANY_REQUESTS',
  ] as const;

  private static readonly GENERIC_MESSAGES = {
    BAD_REQUEST: 'Invalid request data',
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Resource not found',
    METHOD_NOT_SUPPORTED: 'Method not supported',
    TIMEOUT: 'Request timeout',
    CONFLICT: 'Resource conflict',
    PRECONDITION_FAILED: 'Precondition failed',
    PAYLOAD_TOO_LARGE: 'Request too large',
    TOO_MANY_REQUESTS: 'Rate limit exceeded',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    CLIENT_CLOSED_REQUEST: 'Request cancelled',
    UNPROCESSABLE_CONTENT: 'Invalid request format',
  } as const;

  private static readonly SENSITIVE_PATTERNS = [
    // Database connection strings
    /postgresql:\/\/[^@]+@[^\/]+\/\w+/gi,
    /mysql:\/\/[^@]+@[^\/]+\/\w+/gi,
    /mongodb:\/\/[^@]+@[^\/]+\/\w+/gi,

    // API keys and tokens
    /sk_[a-zA-Z0-9_]{20,}/gi,
    /pk_[a-zA-Z0-9_]{20,}/gi,
    /xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}/gi,
    /AKIA[0-9A-Z]{16}/gi,

    // JWT tokens
    /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/gi,

    // Email addresses (in error contexts)
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,

    // File paths that might reveal system structure
    /\/(?:home|Users|var|opt|usr)\/[^\s"']+/gi,
    /[C-Z]:\\(?:Users|Program Files|Windows)[^\s"']*/gi,

    // IP addresses (internal ones)
    /\b(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)\d+\.\d+\b/gi,
    /\b127\.0\.0\.\d+\b/gi,

    // Version numbers that might help attackers
    /version\s+\d+\.\d+\.\d+/gi,

    // Stack trace file paths
    /at\s+[^\s]+\s+\([^)]+\)/gi,
  ];

  /**
   * Sanitize error for client consumption
   */
  static sanitizeError(
    error: unknown,
    context?: {
      userId?: string;
      ip?: string;
      userAgent?: string;
      procedure?: string;
      input?: unknown;
    }
  ): TRPCError {
    let sanitizedError: TRPCError;

    // Log the original error server-side for debugging
    this.logOriginalError(error, context);

    if (error instanceof TRPCError) {
      sanitizedError = this.sanitizeTRPCError(error);
    } else if (error instanceof Error) {
      sanitizedError = this.sanitizeGenericError(error);
    } else {
      sanitizedError = new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: this.GENERIC_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }

    // Log sanitized error being returned to client
    this.logSanitizedError(sanitizedError, context);

    return sanitizedError;
  }

  /**
   * Sanitize TRPC errors
   */
  private static sanitizeTRPCError(error: TRPCError): TRPCError {
    const { code, message, cause } = error;

    // In production, use generic messages for internal errors
    if (env.NODE_ENV === 'production') {
      if (
        code === 'INTERNAL_SERVER_ERROR' ||
        !this.SAFE_ERROR_CODES.includes(code as any)
      ) {
        return new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: this.GENERIC_MESSAGES.INTERNAL_SERVER_ERROR,
        });
      }
    }

    // Sanitize the message
    const sanitizedMessage = this.sanitizeMessage(message);

    return new TRPCError({
      code,
      message: sanitizedMessage,
      // Never include cause in production
      ...(env.NODE_ENV !== 'production' && { cause }),
    });
  }

  /**
   * Sanitize generic errors
   */
  private static sanitizeGenericError(error: Error): TRPCError {
    // In production, don't expose generic error messages
    if (env.NODE_ENV === 'production') {
      return new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: this.GENERIC_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }

    // In development, sanitize but preserve some info
    const sanitizedMessage = this.sanitizeMessage(error.message);

    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: sanitizedMessage,
    });
  }

  /**
   * Sanitize error message by removing sensitive information
   */
  private static sanitizeMessage(message: string): string {
    let sanitized = message;

    // Remove sensitive patterns
    this.SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Remove potential file paths in stack traces
    sanitized = sanitized.replace(/\s+at\s+.*?\([^)]+\)/g, '');

    // Remove line numbers and column numbers that might help attackers
    sanitized = sanitized.replace(/:\d+:\d+/g, '');

    // Limit message length to prevent information leakage
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200) + '...';
    }

    return sanitized;
  }

  /**
   * Log original error server-side for debugging
   */
  private static async logOriginalError(
    error: unknown,
    context?: {
      userId?: string;
      ip?: string;
      userAgent?: string;
      procedure?: string;
      input?: unknown;
    }
  ): Promise<void> {
    try {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Log to console for immediate debugging
      console.error('🔥 Original Error:', {
        message: errorMessage,
        stack: errorStack,
        context,
        timestamp: new Date().toISOString(),
      });

      // Log to audit trail for security monitoring
      await AuditLogger.log({
        userId: context?.userId,
        action: 'error.server_error',
        result: 'failure',
        error: errorMessage,
        metadata: {
          stack: errorStack,
          procedure: context?.procedure,
          ip: context?.ip,
          userAgent: context?.userAgent,
          inputType: context?.input ? typeof context.input : undefined,
          // Don't log actual input in production to prevent sensitive data leakage
          ...(env.NODE_ENV !== 'production' && {
            input: this.sanitizeInputForLogging(context?.input),
          }),
        },
      });
    } catch (loggingError) {
      // Fallback logging if audit system fails
      console.error('Failed to log original error:', loggingError);
      console.error('Original error was:', error);
    }
  }

  /**
   * Log sanitized error being returned to client
   */
  private static async logSanitizedError(
    error: TRPCError,
    context?: {
      userId?: string;
      ip?: string;
      procedure?: string;
    }
  ): Promise<void> {
    try {
      await AuditLogger.log({
        userId: context?.userId,
        action: 'error.client_error',
        result: 'failure',
        metadata: {
          code: error.code,
          message: error.message,
          procedure: context?.procedure,
          ip: context?.ip,
        },
      });
    } catch (loggingError) {
      console.error('Failed to log sanitized error:', loggingError);
    }
  }

  /**
   * Sanitize input data for logging
   */
  private static sanitizeInputForLogging(input: unknown): unknown {
    if (!input || typeof input !== 'object') {
      return input;
    }

    const sanitized = { ...input } as any;

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'accessToken',
      'refreshToken',
      'publicToken',
      'creditCard',
      'ssn',
      'socialSecurityNumber',
    ];

    const sanitizeObject = (obj: any, depth = 0): any => {
      if (depth > 3) return '[MAX_DEPTH_REACHED]'; // Prevent infinite recursion

      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, depth + 1));
      }

      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (
            sensitiveFields.some(field =>
              key.toLowerCase().includes(field.toLowerCase())
            )
          ) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitizeObject(value, depth + 1);
          }
        }
        return result;
      }

      return obj;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Create user-friendly error messages based on error type
   */
  static createUserFriendlyMessage(error: TRPCError): string {
    switch (error.code) {
      case 'BAD_REQUEST':
        return 'Please check your input and try again.';
      case 'UNAUTHORIZED':
        return 'Please sign in to continue.';
      case 'FORBIDDEN':
        return 'You do not have permission to perform this action.';
      case 'NOT_FOUND':
        return 'The requested resource could not be found.';
      case 'TIMEOUT':
        return 'The request took too long to complete. Please try again.';
      case 'TOO_MANY_REQUESTS':
        return 'Too many requests. Please wait a moment before trying again.';
      case 'PAYLOAD_TOO_LARGE':
        return 'The request is too large. Please reduce the amount of data and try again.';
      case 'CONFLICT':
        return 'This action conflicts with the current state. Please refresh and try again.';
      default:
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }
  }

  /**
   * Check if an error should trigger security alerts
   */
  static shouldAlertSecurity(
    error: unknown,
    context?: { procedure?: string; userId?: string }
  ): boolean {
    if (!(error instanceof Error)) return false;

    const securityIndicators = [
      'sql injection',
      'xss',
      'csrf',
      'path traversal',
      'unauthorized',
      'forbidden',
      'authentication',
      'permission denied',
      'access denied',
    ];

    const message = error.message.toLowerCase();
    const hasSecurityKeyword = securityIndicators.some(indicator =>
      message.includes(indicator)
    );

    // Alert on sensitive procedures
    const sensitiveProcedures = [
      'admin.',
      'user.delete',
      'billing.',
      'auth.',
      'plaid.exchange',
    ];

    const isSensitiveProcedure = sensitiveProcedures.some(proc =>
      context?.procedure?.startsWith(proc)
    );

    return hasSecurityKeyword || isSensitiveProcedure;
  }
}
