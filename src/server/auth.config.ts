import NextAuth, { type NextAuthConfig } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';

import { env } from '@/env.js';
import { db } from '@/server/db';
import { sendVerificationRequest } from '@/lib/email';

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
export const authConfig: NextAuthConfig = {
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
            async authorize(credentials) {
              if (!credentials?.email || !credentials?.password) {
                return null;
              }

              const user = await db.user.findUnique({
                where: { email: credentials.email as string },
              });

              if (!user?.password) {
                return null;
              }

              const isPasswordValid = await compare(
                credentials.password as string,
                user.password
              );

              if (!isPasswordValid) {
                return null;
              }

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
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID ?? '',
      clientSecret: env.GITHUB_CLIENT_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),
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
      sendVerificationRequest,
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
        }
      }
    },
  },
};

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
