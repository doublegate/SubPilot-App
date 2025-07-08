import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { getCurrentUrl, isVercelDeployment } from '@/server/lib/auth-utils';

/**
 * Edge-compatible auth check function
 * This only checks if a user is authenticated without importing heavy dependencies
 */
export async function getAuthForEdge(req: NextRequest) {
  const timestamp = new Date().toISOString();
  const currentUrl = getCurrentUrl(req.headers);
  const isProduction = process.env.NODE_ENV === 'production';

  console.log(`[Auth-Edge Debug ${timestamp}] Starting auth check`, {
    url: req.url,
    currentUrl,
    cookies: req.cookies
      .getAll()
      .map(c => ({ name: c.name, hasValue: !!c.value })),
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    authUrl: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'NOT SET',
    isVercel: isVercelDeployment(),
    vercelUrl: process.env.VERCEL_URL,
    isProduction,
  });

  try {
    // In production, we use database sessions, so we need to check for the session cookie
    if (isProduction) {
      // Check for database session cookie
      const sessionToken =
        req.cookies.get('__Secure-authjs.session-token')?.value ||
        req.cookies.get('authjs.session-token')?.value ||
        req.cookies.get('__Host-authjs.session-token')?.value;

      console.log(`[Auth-Edge Debug ${timestamp}] Production session check:`, {
        hasSessionToken: !!sessionToken,
        cookieNames: req.cookies.getAll().map(c => c.name),
      });

      if (sessionToken) {
        // In edge runtime, we can't access the database to validate the session
        // But we can trust that if the secure session cookie exists, the user is authenticated
        // The actual session validation will happen in the server components
        return {
          auth: {
            user: {
              // We don't have user details in edge runtime with database sessions
              // These will be populated by server components
              id: 'authenticated',
              email: 'authenticated',
            },
          },
        };
      }

      return { auth: null };
    }

    // In development, we use JWT strategy
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

    if (!secret) {
      console.error(
        `[Auth-Edge Debug ${timestamp}] NO SECRET FOUND - AUTH WILL FAIL`
      );
      return { auth: null };
    }

    console.log(
      `[Auth-Edge Debug ${timestamp}] Development: Calling getToken with secret`
    );

    // For Vercel deployments, we need to handle the URL properly
    const tokenOptions: Parameters<typeof getToken>[0] = {
      req,
      secret,
    };

    // If we're on a Vercel deployment, we need to ensure the URL is correct
    if (isVercelDeployment() && process.env.VERCEL_URL) {
      // Override the req URL for token validation
      const url = new URL(req.url);
      url.host = process.env.VERCEL_URL;
      (tokenOptions as any).url = url.toString();
    }

    const token = await getToken(tokenOptions);

    console.log(`[Auth-Edge Debug ${timestamp}] Token result:`, {
      hasToken: !!token,
      tokenSub: token?.sub,
      tokenEmail: token && typeof token === 'object' ? token.email : undefined,
      tokenExp: token && typeof token === 'object' ? token.exp : undefined,
      tokenIat: token && typeof token === 'object' ? token.iat : undefined,
    });

    return {
      auth:
        token && typeof token === 'object'
          ? {
              user: {
                id: token.sub ?? '',
                email: (token.email ?? '') as string,
              },
            }
          : null,
    };
  } catch (error) {
    console.error(
      `[Auth-Edge Debug ${timestamp}] Error checking auth in edge:`,
      error
    );
    return { auth: null };
  }
}
