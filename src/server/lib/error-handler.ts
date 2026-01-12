import { TRPCError } from '@trpc/server';
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server/rpc';
import { ZodError } from 'zod';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Error codes for consistent error handling
 */
export const ErrorCodes = {
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_LOCKED: 'AUTH_LOCKED',

  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // External service errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  PLAID_ERROR: 'PLAID_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const;

/**
 * User-friendly error messages
 */
const UserFriendlyMessages: Record<string, string> = {
  [ErrorCodes.AUTH_REQUIRED]: 'Please sign in to continue',
  [ErrorCodes.AUTH_INVALID]: 'Invalid credentials',
  [ErrorCodes.AUTH_EXPIRED]: 'Your session has expired. Please sign in again',
  [ErrorCodes.AUTH_LOCKED]:
    'Account temporarily locked due to multiple failed attempts',
  [ErrorCodes.FORBIDDEN]: 'You do not have permission to perform this action',
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'Additional permissions required',
  [ErrorCodes.VALIDATION_FAILED]: 'Please check your input and try again',
  [ErrorCodes.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCodes.NOT_FOUND]: 'The requested resource was not found',
  [ErrorCodes.ALREADY_EXISTS]: 'This resource already exists',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later',
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]:
    'External service temporarily unavailable',
  [ErrorCodes.PLAID_ERROR]: 'Bank connection service temporarily unavailable',
  [ErrorCodes.EMAIL_SERVICE_ERROR]: 'Email service temporarily unavailable',
  [ErrorCodes.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again',
  [ErrorCodes.DATABASE_ERROR]: 'Database operation failed. Please try again',
  [ErrorCodes.CONFIGURATION_ERROR]:
    'Service configuration error. Please contact support',
};

/**
 * Map TRPC error codes to our error codes
 */
const TRPCErrorCodeMap: Record<TRPC_ERROR_CODE_KEY, string> = {
  UNAUTHORIZED: ErrorCodes.AUTH_REQUIRED,
  FORBIDDEN: ErrorCodes.FORBIDDEN,
  NOT_FOUND: ErrorCodes.NOT_FOUND,
  CONFLICT: ErrorCodes.ALREADY_EXISTS,
  PRECONDITION_FAILED: ErrorCodes.VALIDATION_FAILED,
  PRECONDITION_REQUIRED: ErrorCodes.VALIDATION_FAILED,
  BAD_REQUEST: ErrorCodes.INVALID_INPUT,
  INTERNAL_SERVER_ERROR: ErrorCodes.INTERNAL_ERROR,
  PARSE_ERROR: ErrorCodes.INVALID_INPUT,
  TOO_MANY_REQUESTS: ErrorCodes.RATE_LIMIT_EXCEEDED,
  TIMEOUT: ErrorCodes.EXTERNAL_SERVICE_ERROR,
  CLIENT_CLOSED_REQUEST: ErrorCodes.INTERNAL_ERROR,
  PAYLOAD_TOO_LARGE: ErrorCodes.INVALID_INPUT,
  METHOD_NOT_SUPPORTED: ErrorCodes.INVALID_INPUT,
  UNPROCESSABLE_CONTENT: ErrorCodes.VALIDATION_FAILED,
  UNSUPPORTED_MEDIA_TYPE: ErrorCodes.INVALID_INPUT,
  NOT_IMPLEMENTED: ErrorCodes.INTERNAL_ERROR,
  BAD_GATEWAY: ErrorCodes.EXTERNAL_SERVICE_ERROR,
  SERVICE_UNAVAILABLE: ErrorCodes.EXTERNAL_SERVICE_ERROR,
  GATEWAY_TIMEOUT: ErrorCodes.EXTERNAL_SERVICE_ERROR,
  PAYMENT_REQUIRED: ErrorCodes.FORBIDDEN,
};

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  requestId?: string
): ErrorResponse {
  // Handle TRPCError
  if (error instanceof TRPCError) {
    const code = TRPCErrorCodeMap[error.code] ?? ErrorCodes.INTERNAL_ERROR;
    return {
      error: {
        code,
        message: getUserFriendlyMessage(code, error.message),
        details: error.cause,
        timestamp: new Date().toISOString(),
        requestId,
      },
    };
  }

  // Handle ZodError
  if (error instanceof ZodError) {
    return {
      error: {
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Validation failed',
        details: error.flatten(),
        timestamp: new Date().toISOString(),
        requestId,
      },
    };
  }

  // Handle generic Error
  if (error instanceof Error) {
    return {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: getUserFriendlyMessage(
          ErrorCodes.INTERNAL_ERROR,
          error.message
        ),
        timestamp: new Date().toISOString(),
        requestId,
      },
    };
  }

  // Unknown error
  return {
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message:
        UserFriendlyMessages[ErrorCodes.INTERNAL_ERROR] ?? 'An error occurred',
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(
  code: string,
  originalMessage?: string
): string {
  // In development, include original message
  if (process.env.NODE_ENV === 'development' && originalMessage) {
    return `${UserFriendlyMessages[code] ?? originalMessage} (${originalMessage})`;
  }

  // In production, use safe messages
  return UserFriendlyMessages[code] ?? 'An error occurred';
}

/**
 * Log error with appropriate severity
 */
export function logError(
  error: unknown,
  context: {
    userId?: string;
    action?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    ...context,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
  };

  // Determine severity
  if (error instanceof TRPCError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
      case 'NOT_FOUND':
      case 'BAD_REQUEST':
        console.warn('[ERROR]', errorInfo);
        break;
      default:
        console.error('[ERROR]', errorInfo);
    }
  } else {
    console.error('[ERROR]', errorInfo);
  }

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to Sentry, DataDog, etc.
  }
}

/**
 * Create a safe error for client consumption
 */
export function sanitizeError(error: unknown): TRPCError {
  // Already a TRPCError
  if (error instanceof TRPCError) {
    // Remove sensitive information
    if (process.env.NODE_ENV === 'production') {
      return new TRPCError({
        code: error.code,
        message: getUserFriendlyMessage(
          TRPCErrorCodeMap[error.code] ?? ErrorCodes.INTERNAL_ERROR
        ),
      });
    }
    return error;
  }

  // Validation error
  if (error instanceof ZodError) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Validation failed',
      cause: error.flatten(),
    });
  }

  // Generic error
  if (error instanceof Error) {
    logError(error, { action: 'sanitizeError' });
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: getUserFriendlyMessage(ErrorCodes.INTERNAL_ERROR),
    });
  }

  // Unknown error
  logError(error, { action: 'sanitizeError' });
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: getUserFriendlyMessage(ErrorCodes.INTERNAL_ERROR),
  });
}
