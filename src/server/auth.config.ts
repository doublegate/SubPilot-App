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

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://authjs.dev/reference/configuration/auth-config
 */
import { getAuthCookieConfig } from './auth-cookie-config';

export const authConfig: NextAuthConfig = {
  // Trust host for Vercel deployments
  trustHost: true,
  // Dynamic cookie configuration for Vercel
  cookies: getAuthCookieConfig(),
  session: {
    // Use JWT strategy in development for credentials provider
    strategy: env.NODE_ENV === 'development' ? 'jwt' : 'database',
  },
  callbacks: {
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
    // Only include OAuth providers if credentials are available
    // Use process.env directly as fallback for OAuth providers
    ...((env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID) &&
    (env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET)
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID!,
            clientSecret:
              env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    ...((env.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID) &&
    (env.GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET)
      ? [
          GitHubProvider({
            clientId: env.GITHUB_CLIENT_ID ?? process.env.GITHUB_CLIENT_ID!,
            clientSecret:
              env.GITHUB_CLIENT_SECRET ?? process.env.GITHUB_CLIENT_SECRET!,
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
  console.log('=== Auth Config Debug (Production) ===');
  console.log('OAuth Environment Variables:');
  console.log('- GOOGLE_CLIENT_ID (env):', !!env.GOOGLE_CLIENT_ID);
  console.log(
    '- GOOGLE_CLIENT_ID (process.env):',
    !!process.env.GOOGLE_CLIENT_ID
  );
  console.log('- GOOGLE_CLIENT_SECRET (env):', !!env.GOOGLE_CLIENT_SECRET);
  console.log(
    '- GOOGLE_CLIENT_SECRET (process.env):',
    !!process.env.GOOGLE_CLIENT_SECRET
  );
  console.log('- GITHUB_CLIENT_ID (env):', !!env.GITHUB_CLIENT_ID);
  console.log(
    '- GITHUB_CLIENT_ID (process.env):',
    !!process.env.GITHUB_CLIENT_ID
  );
  console.log('- GITHUB_CLIENT_SECRET (env):', !!env.GITHUB_CLIENT_SECRET);
  console.log(
    '- GITHUB_CLIENT_SECRET (process.env):',
    !!process.env.GITHUB_CLIENT_SECRET
  );
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
  console.log('=====================================');
}

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
