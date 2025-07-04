import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        str => !str.includes('YOUR_MYSQL_URL_HERE'),
        'You forgot to change the default URL'
      ),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === 'production'
        ? z.string()
        : z.string().optional(),
    NEXTAUTH_URL: z.preprocess(
      // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
      // Since NextAuth.js automatically uses the VERCEL_URL if present.
      str => process.env.VERCEL_URL ?? str,
      // VERCEL_URL doesn't include `https` so it cant be validated as a URL
      process.env.VERCEL ? z.string() : z.string().url()
    ),
    // OAuth Providers
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    // Plaid Configuration
    PLAID_CLIENT_ID: z.string().optional(),
    PLAID_SECRET: z.string().optional(),
    PLAID_ENV: z
      .enum(['sandbox', 'development', 'production'])
      .default('sandbox'),
    PLAID_PRODUCTS: z.string().default('transactions,accounts,identity'),
    PLAID_COUNTRY_CODES: z.string().default('US,CA'),
    PLAID_REDIRECT_URI: z.string().url().optional(),
    PLAID_WEBHOOK_URL: z.string().url().optional(),
    // Email Configuration
    SENDGRID_API_KEY: z.string().optional(),
    FROM_EMAIL: z.string().email().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    // External APIs
    OPENAI_API_KEY: z.string().optional(),
    // Monitoring
    SENTRY_DSN: z.string().url().optional(),
    // Redis
    REDIS_URL: z.string().url().optional(),
    // Security
    ENCRYPTION_KEY: z.string().min(32).optional(),
    API_SECRET: z.string().min(32).optional(),
    PLAID_WEBHOOK_SECRET: z.string().optional(),
    // Stripe
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
    STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
    STRIPE_PRICE_TEAM_MONTHLY: z.string().optional(),
    STRIPE_PRICE_TEAM_YEARLY: z.string().optional(),
    STRIPE_PRICE_ENTERPRISE_MONTHLY: z.string().optional(),
    STRIPE_PRICE_ENTERPRISE_YEARLY: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    // OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    // Plaid
    PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID,
    PLAID_SECRET: process.env.PLAID_SECRET,
    PLAID_ENV: process.env.PLAID_ENV,
    PLAID_PRODUCTS: process.env.PLAID_PRODUCTS,
    PLAID_COUNTRY_CODES: process.env.PLAID_COUNTRY_CODES,
    PLAID_REDIRECT_URI: process.env.PLAID_REDIRECT_URI,
    PLAID_WEBHOOK_URL: process.env.PLAID_WEBHOOK_URL,
    // Email
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    FROM_EMAIL: process.env.FROM_EMAIL,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    // External APIs
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    // Monitoring
    SENTRY_DSN: process.env.SENTRY_DSN,
    // Redis
    REDIS_URL: process.env.REDIS_URL,
    // Security
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    API_SECRET: process.env.API_SECRET,
    PLAID_WEBHOOK_SECRET: process.env.PLAID_WEBHOOK_SECRET,
    // Stripe
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
    STRIPE_PRICE_PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY,
    STRIPE_PRICE_TEAM_MONTHLY: process.env.STRIPE_PRICE_TEAM_MONTHLY,
    STRIPE_PRICE_TEAM_YEARLY: process.env.STRIPE_PRICE_TEAM_YEARLY,
    STRIPE_PRICE_ENTERPRISE_MONTHLY:
      process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    STRIPE_PRICE_ENTERPRISE_YEARLY: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
    // Client
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
}) as {
  // Type the environment object explicitly to avoid 'error' type issues
  NODE_ENV: 'development' | 'test' | 'production';
  DATABASE_URL: string;
  NEXTAUTH_SECRET?: string;
  NEXTAUTH_URL?: string;
  // OAuth Providers
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  // Plaid Configuration
  PLAID_CLIENT_ID?: string;
  PLAID_SECRET?: string;
  PLAID_ENV: 'sandbox' | 'development' | 'production';
  PLAID_PRODUCTS: string;
  PLAID_COUNTRY_CODES: string;
  PLAID_REDIRECT_URI?: string;
  PLAID_WEBHOOK_URL?: string;
  // Email Configuration
  SENDGRID_API_KEY?: string;
  FROM_EMAIL?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  // External APIs
  OPENAI_API_KEY?: string;
  // Monitoring
  SENTRY_DSN?: string;
  // Redis
  REDIS_URL?: string;
  // Security
  ENCRYPTION_KEY?: string;
  API_SECRET?: string;
  PLAID_WEBHOOK_SECRET?: string;
  // Stripe
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO_MONTHLY?: string;
  STRIPE_PRICE_PRO_YEARLY?: string;
  STRIPE_PRICE_TEAM_MONTHLY?: string;
  STRIPE_PRICE_TEAM_YEARLY?: string;
  STRIPE_PRICE_ENTERPRISE_MONTHLY?: string;
  STRIPE_PRICE_ENTERPRISE_YEARLY?: string;
  // Client variables
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
};

// Export the type for external use
export type EnvConfig = typeof env;
