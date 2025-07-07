import 'server-only';

export type AuthProvider = 'google' | 'github' | 'email' | 'credentials';

export function getAvailableProviders(): AuthProvider[] {
  const providers: AuthProvider[] = [];

  // Check for Google OAuth
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push('google');
  }

  // Check for GitHub OAuth
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push('github');
  }

  // Email provider is always available
  providers.push('email');

  // Credentials provider only in development
  if (process.env.NODE_ENV === 'development') {
    providers.push('credentials');
  }

  return providers;
}
