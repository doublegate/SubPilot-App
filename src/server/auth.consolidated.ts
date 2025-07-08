/**
 * Consolidated Authentication Configuration for SubPilot
 * 
 * This is the single, production-ready auth configuration that consolidates
 * all working features from multiple auth config files.
 */

import NextAuth, { type NextAuthConfig } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';

import { env } from '@/env';
import { db } from '@/server/db';
import { sendVerificationRequest } from '@/lib/email';
import {
  trackFailedAuth,
  isAccountLocked,
  clearFailedAuth,
} from '@/server/lib/rate-limiter';
import { AuditLogger } from '@/server/lib/audit-logger';

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://authjs.dev/getting-started/typescript#module-augmentation
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
}

// Get the correct secret (v5 uses AUTH_SECRET, v4 uses NEXTAUTH_SECRET)
const secret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  env.NEXTAUTH_SECRET ??
  env.AUTH_SECRET;

// For OAuth callbacks, use the correct URL
const authUrl = 
  process.env.AUTH_URL ?? 
  process.env.NEXTAUTH_URL ?? 
  'https://subpilot-app.vercel.app';

/**
 * Consolidated NextAuth.js configuration with all working features
 */
export const authConfig: NextAuthConfig = {
  secret,
  trustHost: true,
  ...(authUrl && { basePath: '/api/auth' }),
  useSecureCookies: process.env.NODE_ENV === 'production',
  session: {
    strategy: env.NODE_ENV === 'development' ? 'jwt' : 'database',
  },
  adapter: PrismaAdapter(db),
  providers: [
    // OAuth Providers with environment variable fallbacks
    GoogleProvider({
      clientId: 
        process.env.GOOGLE_CLIENT_ID || 
        process.env.AUTH_GOOGLE_ID || 
        env.GOOGLE_CLIENT_ID,
      clientSecret: 
        process.env.GOOGLE_CLIENT_SECRET || 
        process.env.AUTH_GOOGLE_SECRET || 
        env.GOOGLE_CLIENT_SECRET,
    }),
    GitHubProvider({
      clientId: 
        process.env.GITHUB_CLIENT_ID || 
        process.env.AUTH_GITHUB_ID || 
        env.GITHUB_CLIENT_ID,
      clientSecret: 
        process.env.GITHUB_CLIENT_SECRET || 
        process.env.AUTH_GITHUB_SECRET || 
        env.GITHUB_CLIENT_SECRET,
    }),
    // Email provider for magic links (only if SMTP is configured)
    ...(env.SMTP_HOST ? [EmailProvider({
      server: {
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT || '587'),
        auth: {
          user: env.SMTP_USER || '',
          pass: env.SMTP_PASS || '',
        },
      },
      from: env.FROM_EMAIL || 'noreply@subpilot.app',
    })] : []),
    // Credentials provider for email/password
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        
        if (!email || !password) {
          return null;
        }

        // Check if account is locked
        if (await isAccountLocked(email)) {
          try {
            await AuditLogger.log({
              action: 'auth.failed',
              resource: email,
              result: 'failure',
              error: 'Account locked',
            });
          } catch (error) {
            console.error('Failed to log audit event:', error);
          }
          return null;
        }

        try {
          const user = await db.user.findUnique({
            where: { email },
          });

          if (!user || !user.password) {
            await trackFailedAuth(email);
            try {
              await AuditLogger.log({
                action: 'auth.failed',
                resource: email,
                result: 'failure',
                error: 'Invalid credentials',
              });
            } catch (error) {
              console.error('Failed to log audit event:', error);
            }
            return null;
          }

          const isPasswordValid = await compare(password, user.password);

          if (!isPasswordValid) {
            await trackFailedAuth(email);
            try {
              await AuditLogger.log({
                userId: user.id,
                action: 'auth.failed',
                resource: email,
                result: 'failure',
                error: 'Invalid password',
              });
            } catch (error) {
              console.error('Failed to log audit event:', error);
            }
            return null;
          }

          // Clear failed auth attempts on successful login
          await clearFailedAuth(email);
          try {
            await AuditLogger.log({
              userId: user.id,
              action: 'user.login',
              resource: 'credentials',
              result: 'success',
            });
          } catch (error) {
            console.error('Failed to log audit event:', error);
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Handle redirects for multiple origins (Vercel previews)
      if (url.startsWith('/')) {
        return url;
      }

      try {
        const targetUrl = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        
        // Allow same origin redirects
        if (targetUrl.origin === baseUrlObj.origin) {
          return url;
        }
        
        // Allow Vercel app URLs
        if (targetUrl.hostname.endsWith('.vercel.app')) {
          return url;
        }
      } catch {
        // Invalid URL, fall back to base URL
      }

      return baseUrl;
    },
    async signIn({ account, profile, user }) {
      // OAuth account linking - automatically link accounts with same email
      if (account && profile?.email && account.type === 'oauth') {
        try {
          const existingUser = await db.user.findUnique({
            where: { email: profile.email },
            include: { accounts: true },
          });

          if (existingUser) {
            // Check if this provider is already linked
            const existingAccount = existingUser.accounts.find(
              acc => acc.provider === account.provider
            );

            if (!existingAccount) {
              // Link the new OAuth account to existing user
              await db.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state as string | undefined,
                  refresh_token_expires_in: account.refresh_token_expires_in as number | undefined,
                },
              });

              try {
                await AuditLogger.log({
                  userId: existingUser.id,
                  action: 'bank.connected',
                  resource: account.provider,
                  result: 'success',
                  metadata: { accountLinked: true },
                });
              } catch (error) {
                console.error('Failed to log audit event:', error);
              }
              
              // Redirect to profile with success message
              return `/profile?linked=${account.provider}`;
            }

            try {
              await AuditLogger.log({
                userId: existingUser.id,
                action: 'user.login',
                resource: account.provider,
                result: 'success',
              });
            } catch (error) {
              console.error('Failed to log audit event:', error);
            }
          }
        } catch (error) {
          console.error('OAuth account linking error:', error);
          // Continue with normal flow even if linking fails
        }
      }

      return true;
    },
    async session({ session, token, user }) {
      if (session.user) {
        if (token) {
          // JWT session
          session.user.id = token.sub!;
        } else if (user) {
          // Database session
          session.user.id = user.id;
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  events: {
    async signIn({ user, account, profile }) {
      if (user.id && account) {
        try {
          await AuditLogger.log({
            userId: user.id,
            action: 'user.login',
            resource: account.provider,
            result: 'success',
          });
        } catch (error) {
          console.error('Failed to log audit event:', error);
        }
      }
    },
    async signOut(data) {
      // Handle both session-based and token-based signOut events
      const userId = 'token' in data ? data.token?.sub : 
                    'session' in data ? data.session?.userId : undefined;
      if (userId) {
        try {
          await AuditLogger.log({
            userId,
            action: 'user.logout',
            result: 'success',
          });
        } catch (error) {
          console.error('Failed to log audit event:', error);
        }
      }
    },
  },
};

// Create the auth instance
export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

// Re-export auth as getServerAuthSession for backward compatibility
export const getServerAuthSession = auth;