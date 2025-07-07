import 'server-only';
import { env } from '@/env';

export type AuthProvider = 'google' | 'github' | 'email' | 'credentials';

export function getAvailableProviders(): AuthProvider[] {
  const providers: AuthProvider[] = [];

  // Check for Google OAuth using validated env object
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.push('google');
  }

  // Check for GitHub OAuth using validated env object
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.push('github');
  }

  // Email provider is always available
  providers.push('email');

  // Credentials provider only in development
  if (env.NODE_ENV === 'development') {
    providers.push('credentials');
  }

  return providers;
}
