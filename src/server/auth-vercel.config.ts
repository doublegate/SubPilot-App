/**
 * Vercel-specific authentication configuration
 * This file handles the complexities of running Auth.js on Vercel with multiple deployment URLs
 */

import type { NextAuthConfig } from 'next-auth';
import {
  getTrustedOrigins,
  getCanonicalAuthUrl,
  isVercelDeployment,
} from '@/server/lib/auth-utils';

/**
 * Get Vercel-aware authentication configuration
 * This extends the base configuration with Vercel-specific handling
 */
export function getVercelAuthConfig(
  baseConfig: NextAuthConfig
): NextAuthConfig {
  // If not on Vercel, return base config as-is
  if (!isVercelDeployment()) {
    return baseConfig;
  }

  // Determine if we're on a preview deployment
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const isProduction = process.env.VERCEL_ENV === 'production';

  // For preview deployments, we need to use 'none' to allow cross-site cookies
  // This is necessary because OAuth callbacks go to production domain but
  // users access via preview URLs
  const sameSiteValue = isPreview ? 'none' : 'lax';

  console.log('[Auth Vercel Config] Cookie configuration:', {
    isPreview,
    isProduction,
    sameSiteValue,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
  });

  return {
    ...baseConfig,
    // Always trust the host on Vercel deployments
    trustHost: true,
    // Override cookies configuration for cross-domain support
    cookies: {
      sessionToken: {
        name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}authjs.session-token`,
        options: {
          httpOnly: true,
          sameSite: sameSiteValue,
          path: '/',
          secure: true,
          // Don't set domain to allow cookies on all subdomains
          domain: undefined,
        },
      },
      callbackUrl: {
        name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}authjs.callback-url`,
        options: {
          sameSite: sameSiteValue,
          path: '/',
          secure: true,
          domain: undefined,
        },
      },
      csrfToken: {
        name: `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}authjs.csrf-token`,
        options: {
          httpOnly: true,
          sameSite: sameSiteValue,
          path: '/',
          secure: true,
          domain: undefined,
        },
      },
      pkceCodeVerifier: {
        name: `authjs.pkce.code_verifier`,
        options: {
          httpOnly: true,
          sameSite: sameSiteValue,
          path: '/',
          secure: true,
          maxAge: 60 * 15, // 15 minutes
          domain: undefined,
        },
      },
      state: {
        name: `authjs.state`,
        options: {
          httpOnly: true,
          sameSite: sameSiteValue,
          path: '/',
          secure: true,
          maxAge: 60 * 15, // 15 minutes
          domain: undefined,
        },
      },
    },
    callbacks: {
      ...baseConfig.callbacks,
      // Override the redirect callback to handle multiple origins
      async redirect(params) {
        // First call the base redirect callback if it exists
        let url = params.url;
        if (baseConfig.callbacks?.redirect) {
          url = await baseConfig.callbacks.redirect(params);
        }

        // Handle redirects for multiple origins
        const trustedOrigins = getTrustedOrigins();

        // If the redirect URL is relative, use it as-is
        if (url.startsWith('/')) {
          return url;
        }

        // Check if the URL is from a trusted origin
        try {
          const targetUrl = new URL(url);
          const targetOrigin = targetUrl.origin;

          if (trustedOrigins.includes(targetOrigin)) {
            return url;
          }

          // Check if it's a Vercel preview URL
          if (targetUrl.hostname.endsWith('.vercel.app')) {
            const projectPattern =
              /^subpilot-[a-z0-9]+-doublegate-projects\.vercel\.app$/;
            if (projectPattern.test(targetUrl.hostname)) {
              return url;
            }
          }
        } catch {
          // Invalid URL, fall through to baseUrl
        }

        // Default to the baseUrl
        return params.baseUrl;
      },
    },
  };
}

/**
 * Log Vercel deployment information for debugging
 */
export function logVercelDeploymentInfo() {
  if (!isVercelDeployment()) {
    return;
  }

  console.log('=== Vercel Deployment Info ===');
  console.log('VERCEL:', process.env.VERCEL);
  console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('VERCEL_URL:', process.env.VERCEL_URL);
  console.log('VERCEL_BRANCH_URL:', process.env.VERCEL_BRANCH_URL);
  console.log('VERCEL_REGION:', process.env.VERCEL_REGION);
  console.log('VERCEL_GIT_COMMIT_REF:', process.env.VERCEL_GIT_COMMIT_REF);
  console.log('Trusted Origins:', getTrustedOrigins());
  console.log('Canonical Auth URL:', getCanonicalAuthUrl());
  console.log('==============================');
}
