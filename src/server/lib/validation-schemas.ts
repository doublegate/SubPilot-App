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
  .regex(/^[a-zA-Z0-9\s\.\-_']+$/, 'Invalid characters in name');

// Amount validation (monetary amounts)
export const amountSchema = z
  .number()
  .or(z.string().transform(Number))
  .refine((val) => !isNaN(val) && val >= 0, 'Invalid amount')
  .refine((val) => val <= 1000000, 'Amount too large')
  .transform((val) => Number(val));

// Date validation
export const dateSchema = z
  .string()
  .or(z.date())
  .transform((val) => (typeof val === 'string' ? new Date(val) : val))
  .refine((date) => date instanceof Date && !isNaN(date.getTime()), 'Invalid date')
  .refine(
    (date) => date >= new Date('2000-01-01') && date <= new Date('2100-01-01'),
    'Date out of valid range'
  );

// URL validation
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long')
  .refine(
    (url) => ['http:', 'https:'].includes(new URL(url).protocol),
    'Only HTTP/HTTPS URLs allowed'
  );

// Phone number validation
export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]{10,20}$/, 'Invalid phone number format')
  .transform((val) => val.replace(/\s/g, ''));

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
  mask: z.string().regex(/^\d{2,4}$/, 'Invalid account mask').optional(),
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
    .regex(/^[a-zA-Z0-9\s\.\-_']+$/, 'Invalid search characters'),
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

export const cancellationMethodSchema = z.enum(['auto', 'api', 'automation', 'manual']);

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
  .regex(/^[a-z_\.]+$/, 'Invalid audit action format');

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

export const validationUtils = {
  /**
   * Validate request size limit
   */
  validateRequestSize: (data: unknown, maxSizeKB = 100): boolean => {
    const size = JSON.stringify(data).length;
    return size <= maxSizeKB * 1024;
  },

  /**
   * Sanitize string for safe storage/display
   */
  sanitizeString: (str: string): string => {
    return str
      .trim()
      .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
      .substring(0, 1000); // Limit length
  },

  /**
   * Validate file upload
   */
  validateFileUpload: (
    file: { size: number; type: string; name: string },
    options: {
      maxSizeKB?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {}
  ): { valid: boolean; error?: string } => {
    const { maxSizeKB = 1024, allowedTypes = [], allowedExtensions = [] } = options;

    if (file.size > maxSizeKB * 1024) {
      return { valid: false, error: `File too large (max ${maxSizeKB}KB)` };
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }

    if (allowedExtensions.length > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !allowedExtensions.includes(ext)) {
        return { valid: false, error: 'File extension not allowed' };
      }
    }

    return { valid: true };
  },
};