import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { getCurrentUrl, isVercelDeployment } from '@/server/lib/auth-utils';

/**
 * Edge-compatible auth check function
 * This only checks if a user is authenticated without importing heavy dependencies
 */
export async function getAuthForEdge(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';

  try {
    // In production, we use database sessions, so we need to check for the session cookie
    if (isProduction) {
      // Check for database session cookie
      const sessionToken =
        req.cookies.get('__Secure-authjs.session-token')?.value ??
        req.cookies.get('authjs.session-token')?.value ??
        req.cookies.get('__Host-authjs.session-token')?.value;

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
      return { auth: null };
    }

    // For Vercel deployments, we need to handle the URL properly
    const tokenOptions: Parameters<typeof getToken>[0] = {
      req,
      secret,
    };

    // For Vercel deployments, handle proxy headers properly
    if (isVercelDeployment()) {
      const currentUrl = getCurrentUrl(req.headers);
      if (currentUrl) {
        // Create a new URL based on the forwarded headers
        const url = new URL(req.url);
        const forwardedUrl = new URL(currentUrl);
        url.protocol = forwardedUrl.protocol;
        url.host = forwardedUrl.host;
        (tokenOptions as { url?: string }).url = url.toString();
      }
    }

    const token = await getToken(tokenOptions);

    return {
      auth:
        token && typeof token === 'object'
          ? {
              user: {
                id: token.sub ?? '',
                email: (token.email as string | undefined) ?? '',
              },
            }
          : null,
    };
  } catch (error) {
    console.error('Auth edge error:', error);
    return { auth: null };
  }
}
