import { z } from 'zod';

/**
 * Comprehensive validation schemas for SubPilot application
 * Provides strong input validation to prevent security vulnerabilities
 */

// ============================================================================
// COMMON VALIDATION PATTERNS
// ============================================================================

// ID validation - UUIDs or similar secure identifiers
export const idSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{8,}$/, 'Invalid ID format')
  .min(8)
  .max(50);

// Email validation
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254) // RFC 5321 limit
  .toLowerCase();

// Password validation - enforce strong passwords
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(100, 'Password too long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number, and special character'
  );

// Text fields with XSS protection
export const textFieldSchema = (maxLength = 255) =>
  z
    .string()
    .trim()
    .min(1, 'Field cannot be empty')
    .max(maxLength, `Text too long (max ${maxLength} characters)`)
    .regex(/^[^<>'"&]*$/, 'Invalid characters detected');

// Name validation (user names, institution names, etc.)
export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .regex(/^[a-zA-Z0-9\s.\-_]+$/, 'Invalid characters in name')
  .refine(name => {
    // Additional security checks for SQL injection patterns
    const sqlPatterns = [
      /('|")/i, // quotes
      /(--|#|\/\*|\*\/)/i, // SQL comments
      /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i, // SQL keywords
      /(\||&|;|=)/i, // SQL operators and statement terminators
    ];
    return !sqlPatterns.some(pattern => pattern.test(name));
  }, 'Invalid characters in name');

// Amount validation (monetary amounts)
export const amountSchema = z
  .number()
  .or(z.string().transform(Number))
  .refine(val => !isNaN(val) && val >= 0, 'Invalid amount')
  .refine(val => val <= 1000000, 'Amount too large')
  .transform(val => Number(val));

// Date validation
export const dateSchema = z
  .string()
  .or(z.date())
  .transform(val => (typeof val === 'string' ? new Date(val) : val))
  .refine(
    date => date instanceof Date && !isNaN(date.getTime()),
    'Invalid date'
  )
  .refine(
    date => date >= new Date('2000-01-01') && date <= new Date('2100-01-01'),
    'Date out of valid range'
  );

// URL validation
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long')
  .refine(
    url => ['http:', 'https:'].includes(new URL(url).protocol),
    'Only HTTP/HTTPS URLs allowed'
  );

// Phone number validation
export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-()]{10,20}$/, 'Invalid phone number format')
  .transform(val => val.replace(/\s/g, ''));

// ============================================================================
// BUSINESS LOGIC VALIDATION
// ============================================================================

// Subscription status
export const subscriptionStatusSchema = z.enum([
  'active',
  'cancelled',
  'expired',
  'paused',
  'trial',
]);

// Billing frequency
export const billingFrequencySchema = z.enum([
  'weekly',
  'monthly',
  'quarterly',
  'semi_annually',
  'annually',
]);

// Currency codes (ISO 4217)
export const currencySchema = z
  .string()
  .length(3, 'Currency code must be 3 characters')
  .regex(/^[A-Z]{3}$/, 'Invalid currency code format');

// Transaction categories
export const transactionCategorySchema = z.enum([
  'subscription',
  'entertainment',
  'utilities',
  'groceries',
  'transportation',
  'healthcare',
  'education',
  'shopping',
  'dining',
  'travel',
  'business',
  'other',
]);

// ============================================================================
// PLAID-SPECIFIC VALIDATION
// ============================================================================

export const plaidItemSchema = z.object({
  plaidItemId: z.string().min(1, 'Plaid item ID required'),
  institutionId: z.string().min(1, 'Institution ID required'),
  institutionName: nameSchema,
  publicToken: z.string().min(1, 'Public token required').optional(),
  accessToken: z.string().min(1, 'Access token required').optional(),
});

export const plaidAccountSchema = z.object({
  plaidAccountId: z.string().min(1, 'Plaid account ID required'),
  name: nameSchema,
  type: z.enum(['depository', 'credit', 'loan', 'investment', 'other']),
  subtype: z
    .string()
    .min(1, 'Account subtype required')
    .max(50, 'Subtype too long'),
  mask: z
    .string()
    .regex(/^\d{2,4}$/, 'Invalid account mask')
    .optional(),
});

export const plaidTransactionSchema = z.object({
  plaidTransactionId: z.string().min(1, 'Plaid transaction ID required'),
  amount: amountSchema,
  date: dateSchema,
  merchantName: nameSchema.optional(),
  category: z.array(z.string()).max(5, 'Too many categories'),
  pending: z.boolean().default(false),
});

// ============================================================================
// API REQUEST/RESPONSE VALIDATION
// ============================================================================

// Pagination
export const paginationSchema = z.object({
  page: z.number().int().min(1).max(1000).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Search parameters
export const searchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, 'Search query required')
    .max(100, 'Search query too long')
    .regex(/^[a-zA-Z0-9\s.\-_']+$/, 'Invalid search characters'),
  filters: z.record(z.string(), z.any()).optional(),
});

// Bulk operations
export const bulkIdsSchema = z
  .array(idSchema)
  .min(1, 'At least one ID required')
  .max(100, 'Too many items for bulk operation');

// ============================================================================
// SUBSCRIPTION MANAGEMENT VALIDATION
// ============================================================================

export const subscriptionCreateSchema = z.object({
  name: nameSchema,
  provider: nameSchema,
  amount: amountSchema,
  currency: currencySchema.default('USD'),
  billingFrequency: billingFrequencySchema,
  nextBillingDate: dateSchema,
  description: textFieldSchema(500).optional(),
  category: transactionCategorySchema.default('subscription'),
  isActive: z.boolean().default(true),
});

export const subscriptionUpdateSchema = subscriptionCreateSchema
  .partial()
  .extend({
    id: idSchema,
  });

// ============================================================================
// CANCELLATION REQUEST VALIDATION
// ============================================================================

export const cancellationMethodSchema = z.enum([
  'auto',
  'api',
  'automation',
  'manual',
]);

export const cancellationPrioritySchema = z.enum(['low', 'normal', 'high']);

export const cancellationRequestSchema = z.object({
  subscriptionId: idSchema,
  reason: textFieldSchema(500).optional(),
  method: cancellationMethodSchema.optional(),
  priority: cancellationPrioritySchema.default('normal'),
  userPreference: z
    .object({
      preferredMethod: cancellationMethodSchema.optional(),
      allowFallback: z.boolean().default(true),
      notificationPreferences: z
        .object({
          realTime: z.boolean().default(true),
          email: z.boolean().default(true),
          sms: z.boolean().default(false),
        })
        .optional(),
    })
    .optional(),
});

// Enhanced cancellation request schema for unified orchestrator
export const enhancedCancellationRequestSchema = z
  .object({
    subscriptionId: idSchema,
    reason: textFieldSchema(500).optional(),
    priority: cancellationPrioritySchema.default('normal'),
    preferredMethod: z
      .enum(['auto', 'api', 'automation', 'manual'])
      .default('auto'),
    userPreferences: z
      .object({
        allowFallback: z.boolean().default(true),
        maxRetries: z.number().int().min(1).max(5).default(3),
        timeoutMinutes: z.number().int().min(5).max(60).default(30),
        notificationPreferences: z
          .object({
            realTime: z.boolean().default(true),
            email: z.boolean().default(true),
            sms: z.boolean().default(false),
          })
          .optional(),
      })
      .optional(),
    scheduling: z
      .object({
        scheduleFor: dateSchema
          .refine(
            date => date > new Date(),
            'Scheduled time must be in the future'
          )
          .optional(),
        timezone: z
          .string()
          .regex(/^[A-Za-z_]+\/[A-Za-z_]+$/, 'Invalid timezone format')
          .optional(),
      })
      .optional(),
  })
  .strict()
  .refine(
    data => {
      if (data.scheduling && !data.scheduling.scheduleFor) {
        return false;
      }
      return true;
    },
    {
      message: 'scheduleFor is required when scheduling is provided',
      path: ['scheduling', 'scheduleFor'],
    }
  );

// Provider capability validation schema
export const providerCapabilitySchema = z
  .object({
    providerId: z.string().optional(),
    providerName: nameSchema,
    supportsApi: z.boolean(),
    supportsAutomation: z.boolean(),
    supportsManual: z.boolean(),
    apiSuccessRate: z.number().min(0).max(1),
    automationSuccessRate: z.number().min(0).max(1),
    manualSuccessRate: z.number().min(0).max(1),
    apiEstimatedTime: z.number().int().min(0),
    automationEstimatedTime: z.number().int().min(0),
    manualEstimatedTime: z.number().int().min(0),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    requires2FA: z.boolean(),
    hasRetentionOffers: z.boolean(),
    requiresHumanIntervention: z.boolean(),
    lastAssessed: dateSchema,
    dataSource: z.enum(['database', 'heuristic', 'default']),
  })
  .strict();

// Analytics query validation schema
export const analyticsQuerySchema = z
  .object({
    timeframe: z
      .enum(['day', 'week', 'month', 'quarter', 'year'])
      .default('month'),
    includeProviderBreakdown: z.boolean().default(true),
    includeTrends: z.boolean().default(true),
    userId: idSchema,
  })
  .strict();

// ============================================================================
// BILLING/STRIPE VALIDATION
// ============================================================================

export const stripePriceIdSchema = z
  .string()
  .regex(/^price_[a-zA-Z0-9]+$/, 'Invalid Stripe price ID format');

export const stripeCustomerIdSchema = z
  .string()
  .regex(/^cus_[a-zA-Z0-9]+$/, 'Invalid Stripe customer ID format');

export const billingPlanSchema = z.enum(['basic', 'pro', 'team', 'enterprise']);

export const billingPeriodSchema = z.enum(['monthly', 'yearly']);

export const billingSubscriptionSchema = z.object({
  planId: billingPlanSchema,
  billingPeriod: billingPeriodSchema,
  priceId: stripePriceIdSchema.optional(),
  customerId: stripeCustomerIdSchema.optional(),
});

// ============================================================================
// NOTIFICATION VALIDATION
// ============================================================================

export const notificationTypeSchema = z.enum([
  'subscription_detected',
  'subscription_cancelled',
  'payment_upcoming',
  'payment_failed',
  'account_connected',
  'account_disconnected',
  'threshold_reached',
  'cancellation_failed',
]);

export const notificationSeveritySchema = z.enum(['info', 'warning', 'error']);

export const notificationSchema = z.object({
  type: notificationTypeSchema,
  title: textFieldSchema(100),
  message: textFieldSchema(500),
  severity: notificationSeveritySchema.default('info'),
  data: z.record(z.string(), z.any()).optional(),
  scheduledFor: dateSchema.optional(),
});

// ============================================================================
// RATE LIMITING VALIDATION
// ============================================================================

export const rateLimitWindowSchema = z.enum(['1m', '5m', '15m', '1h', '24h']);

export const rateLimitConfigSchema = z.object({
  window: rateLimitWindowSchema,
  max: z.number().int().min(1).max(10000),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false),
});

// ============================================================================
// AUDIT LOG VALIDATION
// ============================================================================

export const auditActionSchema = z
  .string()
  .min(1, 'Audit action required')
  .max(100, 'Audit action too long')
  .regex(/^[a-z_.]+$/, 'Invalid audit action format');

export const auditResultSchema = z.enum(['success', 'failure', 'error']);

export const auditLogSchema = z.object({
  userId: idSchema.optional(),
  action: auditActionSchema,
  resource: idSchema.optional(),
  result: auditResultSchema,
  error: textFieldSchema(1000).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  ip: z.string().ip().optional(),
  userAgent: textFieldSchema(500).optional(),
});

// ============================================================================
// ADMIN VALIDATION
// ============================================================================

export const adminActionSchema = z.enum([
  'user_suspend',
  'user_activate',
  'user_delete',
  'system_maintenance',
  'feature_flag_toggle',
  'bulk_notification',
  'data_export',
]);

export const adminRequestSchema = z.object({
  action: adminActionSchema,
  targetId: idSchema.optional(),
  reason: textFieldSchema(500),
  confirmPassword: z.string().min(1, 'Password confirmation required'),
});

// ============================================================================
// EXPORT FUNCTIONS FOR EASY IMPORTING
// ============================================================================

export const commonSchemas = {
  id: idSchema,
  email: emailSchema,
  password: passwordSchema,
  textField: textFieldSchema,
  name: nameSchema,
  amount: amountSchema,
  date: dateSchema,
  url: urlSchema,
  phone: phoneSchema,
};

export const businessSchemas = {
  subscriptionStatus: subscriptionStatusSchema,
  billingFrequency: billingFrequencySchema,
  currency: currencySchema,
  transactionCategory: transactionCategorySchema,
};

export const apiSchemas = {
  pagination: paginationSchema,
  search: searchSchema,
  bulkIds: bulkIdsSchema,
};

// ============================================================================
// ADVANCED GENERIC UTILITIES FOR TYPE-SAFE VALIDATION
// ============================================================================

// Template Literal Types for Schema Keys (used in validation utilities)
// type SchemaKey<T extends string> = `${T}Schema`;
// type ValidationKey<T extends string> = `validate${Capitalize<T>}`;

// Generic Validation Result with Discriminated Union
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

// Advanced Schema Factory with Generic Constraints
export const createEntitySchema = <T extends Record<string, unknown>>(fields: {
  [K in keyof T]: z.ZodType<T[K]>;
}) => z.object(fields);

// Conditional Schema Builder for Update Operations
export const createUpdateSchema = <T extends z.ZodObject<z.ZodRawShape>>(
  baseSchema: T,
  requiredFields: (keyof T['shape'])[] = []
) => {
  const shape = baseSchema.shape;
  const updateShape: Record<string, z.ZodTypeAny> = {};

  for (const [key, schema] of Object.entries(shape)) {
    updateShape[key] = requiredFields.includes(key)
      ? schema
      : schema.optional();
  }

  return z.object(updateShape);
};

// Type-safe Environment Variable Schema Builder
export const createEnvSchema = <T extends Record<string, z.ZodTypeAny>>(
  serverSchema: T,
  clientSchema: Record<string, z.ZodTypeAny> = {}
) => ({
  server: z.object(serverSchema),
  client: z.object(clientSchema),
  runtimeEnv: {} as { [K in keyof T]: T[K]['_output'] },
});

export const validationUtils = {
  /**
   * Generic request size validator with type safety
   */
  validateRequestSize: <T>(data: T, maxSizeKB = 100): ValidationResult<T> => {
    try {
      const size = JSON.stringify(data).length;
      if (size <= maxSizeKB * 1024) {
        return { success: true, data };
      }
      return {
        success: false,
        errors: [`Request too large (max ${maxSizeKB}KB)`],
      };
    } catch {
      return { success: false, errors: ['Invalid data format'] };
    }
  },

  /**
   * Type-safe string sanitizer with template literal validation
   */
  sanitizeString: <T extends string>(
    str: T,
    options: {
      maxLength?: number;
      allowedChars?: RegExp;
      preserveCase?: boolean;
    } = {}
  ): string => {
    const {
      maxLength = 1000,
      allowedChars = /^[a-zA-Z0-9\s.\-_']+$/,
      preserveCase = true,
    } = options;

    let sanitized = str.trim();

    if (!preserveCase) {
      sanitized = sanitized.toLowerCase();
    }

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>'"&]/g, '');

    // Apply character whitelist if provided
    if (!allowedChars.test(sanitized)) {
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s.\-_']/g, '');
    }

    return sanitized.substring(0, maxLength);
  },

  /**
   * Advanced file upload validator with type constraints
   */
  validateFileUpload: <T extends { size: number; type: string; name: string }>(
    file: T,
    options: {
      maxSizeKB?: number;
      allowedTypes?: readonly string[];
      allowedExtensions?: readonly string[];
      customValidators?: Array<(file: T) => ValidationResult<T>>;
    } = {}
  ): ValidationResult<T> => {
    const {
      maxSizeKB = 1024,
      allowedTypes = [],
      allowedExtensions = [],
      customValidators = [],
    } = options;

    const errors: string[] = [];

    // Size validation
    if (file.size > maxSizeKB * 1024) {
      errors.push(`File too large (max ${maxSizeKB}KB)`);
    }

    // Type validation
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push('type not allowed');
    }

    // Extension validation
    if (allowedExtensions.length > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !allowedExtensions.includes(ext)) {
        errors.push('extension not allowed');
      }
    }

    // Custom validation
    for (const validator of customValidators) {
      const result = validator(file);
      if (!result.success) {
        errors.push(...result.errors);
      }
    }

    return errors.length > 0
      ? { success: false, errors }
      : { success: true, data: file };
  },

  /**
   * Type-safe pagination validator with generic constraints
   */
  validatePagination: <
    T extends { page?: number; limit?: number; sortBy?: string },
  >(
    params: T
  ): ValidationResult<
    Required<Pick<T, 'page' | 'limit'>> & Omit<T, 'page' | 'limit'>
  > => {
    const errors: string[] = [];

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    if (page < 1 || page > 1000) {
      errors.push('Page must be between 1 and 1000');
    }

    if (limit < 1 || limit > 100) {
      errors.push('Limit must be between 1 and 100');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: { ...params, page, limit } as Required<Pick<T, 'page' | 'limit'>> &
        Omit<T, 'page' | 'limit'>,
    };
  },

  /**
   * Conditional field validator based on context
   */
  validateConditionalFields: <T extends Record<string, unknown>>(
    data: T,
    conditions: Array<{
      condition: (data: T) => boolean;
      requiredFields: (keyof T)[];
      message?: string;
    }>
  ): ValidationResult<T> => {
    const errors: string[] = [];

    for (const { condition, requiredFields, message } of conditions) {
      if (condition(data)) {
        const missing = requiredFields.filter(
          field =>
            data[field] === undefined ||
            data[field] === null ||
            data[field] === ''
        );

        if (missing.length > 0) {
          errors.push(
            message ??
              `Required fields when condition met: ${missing.join(', ')}`
          );
        }
      }
    }

    return errors.length > 0
      ? { success: false, errors }
      : { success: true, data };
  },
};
