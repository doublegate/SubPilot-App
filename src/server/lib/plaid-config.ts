/**
 * Plaid configuration utilities for managing production vs sandbox settings
 */

export interface PlaidConfig {
  clientId: string;
  secret: string;
  environment: 'sandbox' | 'development' | 'production';
  products: string[];
  countryCodes: string[];
  webhookUrl?: string;
  redirectUri?: string;
}

/**
 * Get the current Plaid configuration
 */
export const getPlaidConfig = (): PlaidConfig => {
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    throw new Error('Plaid credentials not configured');
  }

  return {
    clientId: process.env.PLAID_CLIENT_ID,
    secret: process.env.PLAID_SECRET,
    environment: (process.env.PLAID_ENV ?? 'sandbox') as
      | 'sandbox'
      | 'development'
      | 'production',
    products: process.env.PLAID_PRODUCTS?.split(',') ?? [
      'transactions',
      'accounts',
    ],
    countryCodes: process.env.PLAID_COUNTRY_CODES?.split(',') ?? ['US'],
    webhookUrl: process.env.PLAID_WEBHOOK_URL,
    redirectUri: process.env.PLAID_REDIRECT_URI,
  };
};

/**
 * Check if we're in production mode
 */
export const isProductionMode = (): boolean => {
  return process.env.PLAID_ENV === 'production';
};

/**
 * Check if we're in sandbox mode
 */
export const isSandboxMode = (): boolean => {
  return process.env.PLAID_ENV === 'sandbox';
};

/**
 * Check if we're in development mode
 */
export const isDevelopmentMode = (): boolean => {
  return process.env.PLAID_ENV === 'development';
};

/**
 * Get the appropriate error handling strategy based on environment
 */
export const getErrorHandlingStrategy = () => {
  if (isProductionMode()) {
    return {
      logLevel: 'error' as const,
      exposeDetails: false,
      retryCount: 3,
      timeoutMs: 10000,
    };
  }

  if (isDevelopmentMode()) {
    return {
      logLevel: 'warn' as const,
      exposeDetails: true,
      retryCount: 2,
      timeoutMs: 15000,
    };
  }

  // Sandbox
  return {
    logLevel: 'info' as const,
    exposeDetails: true,
    retryCount: 1,
    timeoutMs: 20000,
  };
};

/**
 * Get transaction sync configuration based on environment
 */
export const getSyncConfig = () => {
  if (isProductionMode()) {
    return {
      // Production: More frequent syncs for real-time data
      syncIntervalMinutes: 15,
      batchSize: 500,
      maxDaysToSync: 30,
      enableWebhooks: true,
    };
  }

  if (isDevelopmentMode()) {
    return {
      // Development: Moderate frequency for testing
      syncIntervalMinutes: 60,
      batchSize: 200,
      maxDaysToSync: 90,
      enableWebhooks: true,
    };
  }

  // Sandbox: Less frequent for development/testing
  return {
    syncIntervalMinutes: 120,
    batchSize: 100,
    maxDaysToSync: 180,
    enableWebhooks: false, // Webhooks may not work reliably in sandbox
  };
};

/**
 * Get rate limiting configuration
 */
export const getRateLimitConfig = () => {
  if (isProductionMode()) {
    return {
      // Production: Conservative rate limits
      requestsPerMinute: 60,
      burstLimit: 10,
      backoffMultiplier: 2,
      maxBackoffMs: 30000,
    };
  }

  if (isDevelopmentMode()) {
    return {
      // Development: Moderate rate limits
      requestsPerMinute: 100,
      burstLimit: 20,
      backoffMultiplier: 1.5,
      maxBackoffMs: 15000,
    };
  }

  // Sandbox: More lenient for testing
  return {
    requestsPerMinute: 200,
    burstLimit: 50,
    backoffMultiplier: 1.2,
    maxBackoffMs: 10000,
  };
};

/**
 * Validate Plaid configuration
 */
export const validatePlaidConfig = (): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!process.env.PLAID_CLIENT_ID) {
    errors.push('PLAID_CLIENT_ID is required');
  }

  if (!process.env.PLAID_SECRET) {
    errors.push('PLAID_SECRET is required');
  }

  if (
    !['sandbox', 'development', 'production'].includes(
      process.env.PLAID_ENV ?? 'sandbox'
    )
  ) {
    errors.push('PLAID_ENV must be sandbox, development, or production');
  }

  // Production-specific validations
  if (isProductionMode()) {
    if (!process.env.PLAID_WEBHOOK_URL) {
      errors.push('PLAID_WEBHOOK_URL is required in production');
    }

    if (
      process.env.PLAID_WEBHOOK_URL &&
      !process.env.PLAID_WEBHOOK_URL.startsWith('https://')
    ) {
      errors.push('PLAID_WEBHOOK_URL must use HTTPS in production');
    }

    if (
      !process.env.NEXTAUTH_SECRET ||
      process.env.NEXTAUTH_SECRET.length < 32
    ) {
      errors.push(
        'NEXTAUTH_SECRET must be at least 32 characters in production'
      );
    }
  }

  // Validate products
  const validProducts = [
    'transactions',
    'accounts',
    'identity',
    'assets',
    'liabilities',
    'investments',
  ];
  const products = process.env.PLAID_PRODUCTS?.split(',') ?? [];
  const invalidProducts = products.filter(
    (p: string) => !validProducts.includes(p.trim())
  );

  if (invalidProducts.length > 0) {
    errors.push(`Invalid products: ${invalidProducts.join(', ')}`);
  }

  // Validate country codes
  const validCountries = ['US', 'CA', 'GB', 'FR', 'ES', 'NL', 'IE'];
  const countries = process.env.PLAID_COUNTRY_CODES?.split(',') ?? [];
  const invalidCountries = countries.filter(
    (c: string) => !validCountries.includes(c.trim())
  );

  if (invalidCountries.length > 0) {
    errors.push(`Invalid country codes: ${invalidCountries.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Log configuration on startup
 */
export const logPlaidConfig = () => {
  const config = getPlaidConfig();
  const validation = validatePlaidConfig();

  console.log('Plaid Configuration:', {
    environment: config.environment,
    products: config.products,
    countryCodes: config.countryCodes,
    webhookConfigured: !!config.webhookUrl,
    redirectConfigured: !!config.redirectUri,
    isValid: validation.isValid,
  });

  if (!validation.isValid) {
    console.error('Plaid Configuration Errors:', validation.errors);
  }

  if (isSandboxMode()) {
    console.warn(
      '⚠️  Running in Plaid SANDBOX mode - use test credentials only'
    );
  } else if (isDevelopmentMode()) {
    console.warn('🔧 Running in Plaid DEVELOPMENT mode');
  } else {
    console.info('🚀 Running in Plaid PRODUCTION mode');
  }
};
