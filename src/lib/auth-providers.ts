import 'server-only';
import { env } from '@/env';

export type AuthProvider = 'google' | 'github' | 'email' | 'credentials';

export function getAvailableProviders(): AuthProvider[] {
  const providers: AuthProvider[] = [];

  // Check for Google OAuth - use process.env directly as fallback
  const googleId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const googleSecret =
    env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (
    googleId &&
    googleSecret &&
    googleId.trim() !== '' &&
    googleSecret.trim() !== ''
  ) {
    providers.push('google');
    console.log('[auth-providers] Google OAuth available');
  }

  // Check for GitHub OAuth - use process.env directly as fallback
  const githubId = env.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID;
  const githubSecret =
    env.GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET;
  if (
    githubId &&
    githubSecret &&
    githubId.trim() !== '' &&
    githubSecret.trim() !== ''
  ) {
    providers.push('github');
    console.log('[auth-providers] GitHub OAuth available');
  }

  // Email provider is always available
  providers.push('email');

  // Credentials provider only in development
  if (env.NODE_ENV === 'development') {
    providers.push('credentials');
  }

  console.log('[auth-providers] Available providers:', providers);
  return providers;
}
