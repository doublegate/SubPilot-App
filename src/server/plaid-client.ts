import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { env } from '@/env';

// NOTE: The Plaid SDK (v36.0.0) generates Node.js deprecation warnings for url.parse()
// This is a known issue in the Plaid SDK itself and cannot be fixed in our codebase.
// See docs/TROUBLESHOOTING.md for more details.

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RETRY_MULTIPLIER = 2;

/**
 * Plaid client configuration
 * This client is used for all server-side Plaid API calls
 */
export const getPlaidClient = () => {
  // Check if Plaid credentials are configured
  if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
    console.warn(
      'Plaid credentials not configured. Plaid features will be disabled.'
    );
    return null;
  }

  const configuration = new Configuration({
    basePath:
      PlaidEnvironments[env.PLAID_ENV as keyof typeof PlaidEnvironments],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
        'PLAID-SECRET': env.PLAID_SECRET,
      },
    },
  });

  return new PlaidApi(configuration);
};

// Singleton instance
let plaidClient: PlaidApi | null = null;

export const plaid = () => {
  plaidClient ??= getPlaidClient();
  return plaidClient;
};

/**
 * Execute Plaid API call with retry logic
 */
export const plaidWithRetry = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  let lastError: unknown;
  let delay = RETRY_DELAY_MS;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const plaidError = error as PlaidErrorResponse;

      // Don't retry on certain error types
      const nonRetryableErrors = [
        'INVALID_CREDENTIALS',
        'INVALID_ACCESS_TOKEN',
        'ITEM_LOGIN_REQUIRED',
        'INSUFFICIENT_CREDENTIALS',
        'USER_SETUP_REQUIRED',
      ];

      if (
        plaidError.response?.data?.error_code &&
        nonRetryableErrors.includes(plaidError.response.data.error_code)
      ) {
        throw error;
      }

      // Log retry attempt
      console.warn(
        `Plaid API call failed (attempt ${attempt}/${MAX_RETRIES}) for ${operationName}:`,
        plaidError.response?.data?.error_message ?? 'Unknown error'
      );

      // Don't retry on the last attempt
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= RETRY_MULTIPLIER;
      }
    }
  }

  throw lastError;
};

/**
 * Helper to check if Plaid is configured
 */
export const isPlaidConfigured = () => {
  return !!(env.PLAID_CLIENT_ID && env.PLAID_SECRET);
};

/**
 * Plaid webhook verification
 * Verifies the JWT signature from Plaid webhooks using official Plaid SDK
 */
export const verifyPlaidWebhook = async (
  body: string,
  headers: Record<string, string | string[] | undefined>
): Promise<boolean> => {
  try {
    const client = plaid();
    if (!client) {
      console.error('Plaid client not configured');
      return false;
    }

    // Extract the JWT token from the request body
    // Plaid sends webhooks as raw JWT tokens in the body
    const jwt = body.trim();

    // Get the webhook verification key from headers
    const keyId = headers['plaid-verification-key-id'];
    if (!keyId || Array.isArray(keyId)) {
      // In sandbox environment, verification may be optional
      if (env.PLAID_ENV === 'sandbox') {
        console.warn('⚠️  Plaid webhook verification skipped in sandbox mode');
        return true;
      }
      console.error('Missing or invalid Plaid verification key ID');
      return false;
    }

    try {
      // Get the verification key from Plaid
      const verificationResponse = await plaidWithRetry(
        () => client.webhookVerificationKeyGet({ key_id: keyId }),
        'webhookVerificationKeyGet'
      );

      const { key } = verificationResponse.data;

      // Verify the JWT signature using jsonwebtoken
      const { verify } = await import('jsonwebtoken');
      // Verify the JWT signature (payload verification only, content not used)
      verify(jwt, key as unknown as string, {
        algorithms: ['ES256'],
      });

      console.log('✅ Plaid webhook verified successfully');
      return true;
    } catch (verificationError) {
      // If verification fails in sandbox, log but allow for development
      if (env.PLAID_ENV === 'sandbox') {
        console.warn(
          '⚠️  Plaid webhook verification failed in sandbox - allowing for development:',
          verificationError
        );
        return true;
      }

      console.error('Plaid webhook verification failed:', verificationError);
      return false;
    }
  } catch (error) {
    // General error handling
    console.error('Error during Plaid webhook verification:', error);

    // In sandbox mode, be more permissive for development
    if (env.PLAID_ENV === 'sandbox') {
      console.warn('⚠️  Allowing unverified webhook in sandbox mode');
      return true;
    }

    return false;
  }
};

/**
 * Error handler for Plaid API errors
 */
interface PlaidErrorResponse {
  response?: {
    data?: {
      error_type?: string;
      error_code?: string;
      error_message?: string;
      display_message?: string;
      request_id?: string;
    };
  };
}

export const handlePlaidError = (error: unknown) => {
  const plaidError = error as PlaidErrorResponse;
  if (plaidError.response?.data) {
    const errorData = plaidError.response.data;
    console.error('Plaid API Error:', {
      error_type: errorData.error_type,
      error_code: errorData.error_code,
      error_message: errorData.error_message,
      display_message: errorData.display_message,
      request_id: errorData.request_id,
    });

    // Return user-friendly error message
    return {
      message:
        errorData.display_message ??
        'An error occurred connecting to your bank',
      code: errorData.error_code,
      type: errorData.error_type,
    };
  }

  console.error('Unknown Plaid Error:', error);
  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    type: 'API_ERROR',
  };
};
