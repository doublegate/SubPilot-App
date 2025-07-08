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
import {
  getCanonicalAuthUrl,
  isVercelDeployment,
  getTrustedOrigins,
} from '@/server/lib/auth-utils';
import {
  getVercelAuthConfig,
  logVercelDeploymentInfo,
} from '@/server/auth-vercel.config';
import { getAuthCookieConfig } from '@/server/auth-cookie-config';

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

// For OAuth callbacks, we need to use the canonical production URL
// But the application can be accessed from multiple origins (Vercel previews)
const authUrl = getCanonicalAuthUrl();

// Log configuration for debugging
console.log('[AUTH V5 FIX] Configuration:', {
  hasSecret: !!secret,
  canonicalUrl: authUrl,
  trustedOrigins: getTrustedOrigins(),
  isVercel: isVercelDeployment(),
  vercelUrl: process.env.VERCEL_URL,
  nodeEnv: process.env.NODE_ENV,
});

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://authjs.dev/reference/configuration/auth-config
 */
export const authConfig: NextAuthConfig = {
  secret,
  // Trust host for Vercel deployments
  trustHost: true,
  // Use the canonical URL for OAuth callbacks
  ...(authUrl && { url: authUrl }),
  // For preview deployments, we need to handle secure cookies differently
  useSecureCookies:
    process.env.NODE_ENV === 'production' &&
    process.env.VERCEL_ENV !== 'preview',
  session: {
    // Use JWT strategy in development for credentials provider
    strategy: env.NODE_ENV === 'development' ? 'jwt' : 'database',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
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
      return baseUrl;
    },
    async signIn({ account, profile }) {
      // Log sign-in attempts for debugging
      console.log('[Auth Sign-In] Processing sign-in:', {
        provider: account?.provider,
        email: profile?.email,
        timestamp: new Date().toISOString(),
      });

      // Allow all sign-ins
      return true;
    },
    session: ({ session, token, user }) => {
      // Handle both JWT (dev) and database (prod) sessions
      if (token) {
        // JWT session (development with credentials)
        return {
          ...session,
          user: {
            ...session.user,
            id: token.sub!,
          },
        };
      }
      // Database session (production with OAuth)
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
      };
    },
    jwt: ({ token, user }) => {
      // Add user ID to JWT token
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  adapter: PrismaAdapter(db),
  providers: [
    // Credentials provider for development/testing
    ...(env.NODE_ENV === 'development'
      ? [
          CredentialsProvider({
            name: 'credentials',
            credentials: {
              email: { label: 'Email', type: 'email' },
              password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials, req) {
              if (!credentials?.email || !credentials?.password) {
                return null;
              }

              const email = credentials.email as string;
              const ipAddress =
                req?.headers?.get('x-forwarded-for') ??
                req?.headers?.get('x-real-ip') ??
                'unknown';
              const userAgent = req?.headers?.get('user-agent') ?? 'unknown';

              // Check if account is locked
              const lockStatus = await isAccountLocked(email);
              if (lockStatus.locked) {
                await AuditLogger.logAuthFailure(
                  email,
                  ipAddress,
                  userAgent,
                  'Account locked'
                );
                throw new Error(
                  `Account locked until ${lockStatus.until?.toLocaleTimeString()}`
                );
              }

              const user = await db.user.findUnique({
                where: { email },
              });

              if (!user?.password) {
                await trackFailedAuth(email);
                await AuditLogger.logAuthFailure(
                  email,
                  ipAddress,
                  userAgent,
                  'User not found'
                );
                return null;
              }

              const isPasswordValid = await compare(
                credentials.password as string,
                user.password
              );

              if (!isPasswordValid) {
                const { locked, lockUntil } = await trackFailedAuth(email);
                await AuditLogger.logAuthFailure(
                  email,
                  ipAddress,
                  userAgent,
                  'Invalid password'
                );

                if (locked) {
                  await AuditLogger.logAccountLockout(
                    user.id,
                    'Too many failed attempts'
                  );
                  throw new Error(
                    `Account locked until ${lockUntil?.toLocaleTimeString()}`
                  );
                }

                return null;
              }

              // Clear failed attempts on successful login
              await clearFailedAuth(email);
              await AuditLogger.logAuth(user.id, ipAddress, userAgent);

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
              };
            },
          }),
        ]
      : []),
    // OAuth providers with multiple fallbacks for maximum compatibility
    ...((env.GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      process.env.AUTH_GOOGLE_ID) &&
    (env.GOOGLE_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      process.env.AUTH_GOOGLE_SECRET)
      ? [
          GoogleProvider({
            clientId:
              env.GOOGLE_CLIENT_ID ??
              process.env.GOOGLE_CLIENT_ID ??
              process.env.AUTH_GOOGLE_ID ??
              '',
            clientSecret:
              env.GOOGLE_CLIENT_SECRET ??
              process.env.GOOGLE_CLIENT_SECRET ??
              process.env.AUTH_GOOGLE_SECRET ??
              '',
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    ...((env.GITHUB_CLIENT_ID ||
      process.env.GITHUB_CLIENT_ID ||
      process.env.AUTH_GITHUB_ID) &&
    (env.GITHUB_CLIENT_SECRET ||
      process.env.GITHUB_CLIENT_SECRET ||
      process.env.AUTH_GITHUB_SECRET)
      ? [
          GitHubProvider({
            clientId:
              env.GITHUB_CLIENT_ID ??
              process.env.GITHUB_CLIENT_ID ??
              process.env.AUTH_GITHUB_ID ??
              '',
            clientSecret:
              env.GITHUB_CLIENT_SECRET ??
              process.env.GITHUB_CLIENT_SECRET ??
              process.env.AUTH_GITHUB_SECRET ??
              '',
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    EmailProvider({
      server: {
        host: env.SMTP_HOST ?? 'localhost',
        port: parseInt(env.SMTP_PORT ?? '1025'),
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              }
            : undefined,
      },
      from: env.FROM_EMAIL ?? 'noreply@subpilot.com',
      sendVerificationRequest: async params => {
        await sendVerificationRequest({
          identifier: params.identifier,
          url: params.url,
          expires: params.expires,
          provider: {
            server: {
              host: env.SMTP_HOST ?? 'smtp.sendgrid.net',
              port: parseInt(env.SMTP_PORT ?? '587'),
              auth:
                env.SMTP_USER && env.SMTP_PASS
                  ? {
                      user: env.SMTP_USER,
                      pass: env.SMTP_PASS,
                    }
                  : undefined,
            },
            from: env.FROM_EMAIL ?? 'noreply@subpilot.com',
          },
          token: params.token,
          theme: params.theme,
          request: params.request,
        });
      },
      maxAge: 24 * 60 * 60, // 24 hours
    }),
  ],
  pages: {
    signIn: '/login',
    verifyRequest: '/verify-request',
    error: '/auth-error',
  },
  events: {
    async signIn({ user, isNewUser }) {
      console.log(`User ${user.email} signed in`);

      // Track new user signup
      if (isNewUser && user.email) {
        // Create welcome notification
        if (user.id) {
          await db.notification.create({
            data: {
              userId: user.id,
              type: 'GENERAL',
              title: 'Welcome to SubPilot! 🎉',
              message: 'Get started by connecting your first bank account.',
              scheduledFor: new Date(),
            },
          });

          // Send welcome email
          try {
            const { emailNotificationService } = await import(
              '@/server/services/email.service'
            );
            await emailNotificationService.sendWelcomeEmail({
              user: { id: user.id, email: user.email, name: user.name ?? null },
            });
          } catch (error) {
            console.error('Failed to send welcome email:', error);
          }
        }
      }
    },
  },
};

// Debug logging for production OAuth issues
if (process.env.NODE_ENV === 'production') {
  console.log('=== Auth V5 Fix Config Debug (Production) ===');
  console.log('OAuth Environment Variables:');
  console.log('- GOOGLE_CLIENT_ID:', !!process.env.GOOGLE_CLIENT_ID);
  console.log('- AUTH_GOOGLE_ID:', !!process.env.AUTH_GOOGLE_ID);
  console.log('- GITHUB_CLIENT_ID:', !!process.env.GITHUB_CLIENT_ID);
  console.log('- AUTH_GITHUB_ID:', !!process.env.AUTH_GITHUB_ID);
  console.log('- AUTH_SECRET:', !!process.env.AUTH_SECRET);
  console.log('- NEXTAUTH_SECRET:', !!process.env.NEXTAUTH_SECRET);
  console.log('- AUTH_URL:', process.env.AUTH_URL ?? 'NOT SET');
  console.log('- NEXTAUTH_URL:', process.env.NEXTAUTH_URL ?? 'NOT SET');
  console.log('- Total providers configured:', authConfig.providers.length);
  console.log(
    '- Provider IDs:',
    authConfig.providers
      .map(
        p =>
          (p as { id?: string; type?: string }).id ??
          (p as { id?: string; type?: string }).type
      )
      .join(', ')
  );
  console.log('=============================================');
}

// Log Vercel deployment info if applicable
logVercelDeploymentInfo();

// Apply Vercel-specific configuration if needed
const finalAuthConfig = getVercelAuthConfig(authConfig);

export const { auth, handlers, signIn, signOut } = NextAuth(finalAuthConfig);
