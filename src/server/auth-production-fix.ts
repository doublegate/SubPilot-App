/**
 * Production authentication fix for SubPilot
 *
 * This module addresses the authentication redirect loop issue where users
 * have valid sessions but are being redirected to login.
 *
 * Root causes:
 * 1. Multiple auth configurations causing conflicts
 * 2. Edge runtime placeholder auth not matching server auth
 * 3. Cookie configuration mismatches
 * 4. Auth URL inconsistencies
 */

import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { getVercelAuthConfig } from './auth-vercel.config';

// Log the auth configuration being used
console.log('[Auth Production Fix] Initializing with:', {
  hasAuthConfig: !!authConfig,
  providersCount: authConfig.providers.length,
  sessionStrategy: authConfig.session?.strategy,
  trustHost: authConfig.trustHost,
  authUrl: process.env.AUTH_URL,
  nextAuthUrl: process.env.NEXTAUTH_URL,
  nodeEnv: process.env.NODE_ENV,
  vercel: !!process.env.VERCEL,
  vercelEnv: process.env.VERCEL_ENV,
});

// Apply Vercel-specific configuration
const finalConfig = getVercelAuthConfig(authConfig);

// Override to ensure consistent behavior
const productionConfig = {
  ...finalConfig,
  // Always trust the host in production
  trustHost: true,
  // Ensure the URL is set correctly
  url:
    process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'https://subpilot.app',
  // Add debug logging to callbacks
  callbacks: {
    ...finalConfig.callbacks,
    async session(params: any) {
      console.log('[Auth Production Fix] Session callback:', {
        hasToken: !!params.token,
        hasUser: !!params.user,
        userId: params.user?.id,
        userEmail: params.user?.email,
      });

      // Call the original session callback
      if (finalConfig.callbacks?.session) {
        return finalConfig.callbacks.session(params);
      }

      // Default behavior
      if (params.token) {
        return {
          ...params.session,
          user: {
            ...params.session.user,
            id: params.token.sub!,
          },
        };
      }
      return {
        ...params.session,
        user: {
          ...params.session.user,
          id: params.user.id,
        },
      };
    },
  },
};

// Create the auth instance
export const { auth, handlers, signIn, signOut } = NextAuth(productionConfig);

// Add debug wrapper around auth
export async function debugAuth() {
  console.log('[Auth Production Fix] Calling auth()...');
  try {
    const session = await auth();
    console.log('[Auth Production Fix] Auth result:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      expires: session?.expires,
    });
    return session;
  } catch (error) {
    console.error('[Auth Production Fix] Auth error:', error);
    throw error;
  }
}
