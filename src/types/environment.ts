/**
 * Advanced TypeScript Environment Configuration
 * Provides type-safe access to environment variables with validation
 */

import type { z } from 'zod';

// Template Literal Types for Environment Variable Keys
type EnvKey<T extends string> = `${Uppercase<T>}`;
type DatabaseEnvKey = EnvKey<'database_url'>;
type AuthEnvKey = EnvKey<'nextauth_secret'> | EnvKey<'nextauth_url'>;
type PlaidEnvKey = EnvKey<`plaid_${string}`>;
type StripeEnvKey = EnvKey<`stripe_${string}`>;

// Conditional Types for Environment Values
type EnvValue<T extends string> = 
  T extends DatabaseEnvKey ? string :
  T extends AuthEnvKey ? string :
  T extends PlaidEnvKey ? string :
  T extends StripeEnvKey ? string :
  string | undefined;

// Branded Types for Configuration Values
type Brand<T, B> = T & { readonly __brand: B };
type DatabaseUrl = Brand<string, 'DatabaseUrl'>;
type SecretKey = Brand<string, 'SecretKey'>;
type PlaidEnvironment = Brand<'sandbox' | 'development' | 'production', 'PlaidEnvironment'>;

// Advanced Environment Configuration Interface
export interface TypedEnvironment {
  // Database
  DATABASE_URL: DatabaseUrl;
  
  // Authentication
  NEXTAUTH_SECRET: SecretKey;
  NEXTAUTH_URL: string;
  
  // OAuth Providers
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: SecretKey;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: SecretKey;
  
  // Plaid Configuration with Type Safety
  PLAID_CLIENT_ID?: string;
  PLAID_SECRET?: SecretKey;
  PLAID_ENV: PlaidEnvironment;
  PLAID_PRODUCTS: string;
  PLAID_COUNTRY_CODES: string;
  PLAID_REDIRECT_URI?: string;
  PLAID_WEBHOOK_URL?: string;
  PLAID_WEBHOOK_SECRET?: SecretKey;
  
  // Email Configuration
  SENDGRID_API_KEY?: SecretKey;
  FROM_EMAIL?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: SecretKey;
  
  // External APIs
  OPENAI_API_KEY?: SecretKey;
  
  // Security
  ENCRYPTION_KEY?: SecretKey;
  API_SECRET?: SecretKey;
  
  // Stripe Configuration
  STRIPE_SECRET_KEY?: SecretKey;
  STRIPE_WEBHOOK_SECRET?: SecretKey;
  STRIPE_PRICE_PRO_MONTHLY?: string;
  STRIPE_PRICE_PRO_YEARLY?: string;
  STRIPE_PRICE_TEAM_MONTHLY?: string;
  STRIPE_PRICE_TEAM_YEARLY?: string;
  STRIPE_PRICE_ENTERPRISE_MONTHLY?: string;
  STRIPE_PRICE_ENTERPRISE_YEARLY?: string;
  
  // Client-side
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
}

// Utility Types for Environment Validation
export type RequiredEnvKeys = keyof Pick<TypedEnvironment, 
  'DATABASE_URL' | 'NEXTAUTH_SECRET' | 'NEXTAUTH_URL' | 'PLAID_ENV' | 'PLAID_PRODUCTS' | 'PLAID_COUNTRY_CODES'
>;

export type OptionalEnvKeys = keyof Omit<TypedEnvironment, RequiredEnvKeys>;

// Generic Environment Accessor with Type Safety
export type EnvAccessor<T extends keyof TypedEnvironment> = {
  get<K extends T>(key: K): TypedEnvironment[K];
  has<K extends T>(key: K): boolean;
  require<K extends T>(key: K): NonNullable<TypedEnvironment[K]>;
};

// Configuration Validation Result
export type ConfigValidationResult<T> = {
  success: true;
  data: T;
  warnings?: string[];
} | {
  success: false;
  errors: string[];
  warnings?: string[];
};

// Environment-specific Configuration Types
export interface DatabaseConfig {
  url: DatabaseUrl;
  ssl: boolean;
  poolSize: number;
  maxConnections: number;
}

export interface AuthConfig {
  secret: SecretKey;
  url: string;
  providers: {
    google?: {
      clientId: string;
      clientSecret: SecretKey;
    };
    github?: {
      clientId: string;
      clientSecret: SecretKey;
    };
  };
  sessionMaxAge: number;
}

export interface PlaidConfig {
  clientId: string;
  secret: SecretKey;
  environment: PlaidEnvironment;
  products: string[];
  countryCodes: string[];
  redirectUri?: string;
  webhookUrl?: string;
  webhookSecret?: SecretKey;
}

export interface StripeConfig {
  secretKey: SecretKey;
  webhookSecret: SecretKey;
  publishableKey: string;
  prices: {
    pro: {
      monthly: string;
      yearly: string;
    };
    team: {
      monthly: string;
      yearly: string;
    };
    enterprise: {
      monthly: string;
      yearly: string;
    };
  };
}

// Mapped Type for Configuration Factories
export type ConfigFactory<T> = (env: TypedEnvironment) => ConfigValidationResult<T>;

// Advanced Configuration Builders
export const createDatabaseConfig: ConfigFactory<DatabaseConfig> = (env) => {
  if (!env.DATABASE_URL) {
    return {
      success: false,
      errors: ['DATABASE_URL is required'],
    };
  }

  try {
    const url = new URL(env.DATABASE_URL);
    return {
      success: true,
      data: {
        url: env.DATABASE_URL,
        ssl: url.protocol === 'postgres:' && !url.hostname.includes('localhost'),
        poolSize: 10,
        maxConnections: 20,
      },
    };
  } catch (error) {
    return {
      success: false,
      errors: ['Invalid DATABASE_URL format'],
    };
  }
};

export const createAuthConfig: ConfigFactory<AuthConfig> = (env) => {
  const errors: string[] = [];
  
  if (!env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required');
  }
  
  if (!env.NEXTAUTH_URL) {
    errors.push('NEXTAUTH_URL is required');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const providers: AuthConfig['providers'] = {};
  const warnings: string[] = [];

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  } else if (env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_SECRET) {
    warnings.push('Incomplete Google OAuth configuration');
  }

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  } else if (env.GITHUB_CLIENT_ID || env.GITHUB_CLIENT_SECRET) {
    warnings.push('Incomplete GitHub OAuth configuration');
  }

  return {
    success: true,
    data: {
      secret: env.NEXTAUTH_SECRET,
      url: env.NEXTAUTH_URL,
      providers,
      sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
    },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

export const createPlaidConfig: ConfigFactory<PlaidConfig> = (env) => {
  const errors: string[] = [];
  
  if (!env.PLAID_CLIENT_ID) {
    errors.push('PLAID_CLIENT_ID is required for Plaid integration');
  }
  
  if (!env.PLAID_SECRET) {
    errors.push('PLAID_SECRET is required for Plaid integration');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      clientId: env.PLAID_CLIENT_ID!,
      secret: env.PLAID_SECRET!,
      environment: env.PLAID_ENV,
      products: env.PLAID_PRODUCTS.split(','),
      countryCodes: env.PLAID_COUNTRY_CODES.split(','),
      redirectUri: env.PLAID_REDIRECT_URI,
      webhookUrl: env.PLAID_WEBHOOK_URL,
      webhookSecret: env.PLAID_WEBHOOK_SECRET,
    },
  };
};

// Type Guard Functions
export const isValidDatabaseUrl = (url: string): url is DatabaseUrl => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:';
  } catch {
    return false;
  }
};

export const isValidSecretKey = (key: string): key is SecretKey => {
  return key.length >= 32 && /^[A-Za-z0-9+/=]+$/.test(key);
};

export const isValidPlaidEnvironment = (env: string): env is PlaidEnvironment => {
  return ['sandbox', 'development', 'production'].includes(env);
};

// Environment Type Assertions
export const assertEnvironmentType = <T extends keyof TypedEnvironment>(
  key: T,
  value: unknown
): TypedEnvironment[T] => {
  if (value === undefined || value === null) {
    throw new Error(`Environment variable ${key} is required but not provided`);
  }
  
  if (typeof value !== 'string') {
    throw new Error(`Environment variable ${key} must be a string`);
  }
  
  // Additional type-specific validations
  if (key === 'DATABASE_URL' && !isValidDatabaseUrl(value)) {
    throw new Error(`Invalid DATABASE_URL format: ${value}`);
  }
  
  if (key.includes('SECRET') || key.includes('KEY')) {
    if (!isValidSecretKey(value)) {
      throw new Error(`Invalid secret key format for ${key}`);
    }
  }
  
  if (key === 'PLAID_ENV' && !isValidPlaidEnvironment(value)) {
    throw new Error(`Invalid PLAID_ENV value: ${value}`);
  }
  
  return value as TypedEnvironment[T];
};

// Export utility for creating type-safe environment accessors
export const createEnvAccessor = <T extends keyof TypedEnvironment>(
  env: Partial<Record<T, string>>
): EnvAccessor<T> => ({
  get: <K extends T>(key: K) => env[key] as TypedEnvironment[K],
  has: <K extends T>(key: K) => key in env && env[key] !== undefined,
  require: <K extends T>(key: K) => {
    const value = env[key];
    if (value === undefined) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return assertEnvironmentType(key, value);
  },
});