/**
 * Vercel-aware cookie configuration for Auth.js
 * Handles cross-domain authentication for custom domains and preview deployments
 */

import type { NextAuthConfig } from 'next-auth';

type CookiesOptions = NonNullable<NextAuthConfig['cookies']>;

/**
 * Get dynamic cookie configuration based on deployment environment
 */
export function getAuthCookieConfig(): Partial<CookiesOptions> {
  const isVercel = !!process.env.VERCEL;
  const isProduction = process.env.NODE_ENV === 'production';
  const vercelEnv = process.env.VERCEL_ENV;

  // Base cookie configuration
  const baseConfig: Partial<CookiesOptions> = {
    sessionToken: {
      name: `${isProduction ? '__Secure-' : ''}authjs.session-token`,
      options: {
        httpOnly: true,
        secure: isProduction,
        path: '/',
      },
    },
  };

  // Vercel-specific adjustments
  if (isVercel) {
    // For production with custom domain
    if (vercelEnv === 'production') {
      baseConfig.sessionToken!.options = {
        ...baseConfig.sessionToken!.options,
        sameSite: 'lax',
        // Don't set domain to allow cookie to work on both
        // subpilot.app and *.vercel.app
      };
    }
    // For preview deployments
    else if (vercelEnv === 'preview') {
      baseConfig.sessionToken!.options = {
        ...baseConfig.sessionToken!.options,
        sameSite: 'none', // Required for cross-domain
        secure: true, // Required when sameSite is 'none'
      };
    }
  }

  return baseConfig;
}

/**
 * Verify if cookies should be trusted based on request headers
 */
export function shouldTrustCookies(headers: Headers): boolean {
  const forwardedProto = headers.get('x-forwarded-proto');
  const isVercel = !!process.env.VERCEL;

  // Trust cookies if:
  // 1. We're on Vercel and the forwarded protocol is HTTPS
  // 2. We're not on Vercel (local dev)
  return (isVercel && forwardedProto === 'https') || !isVercel;
}
