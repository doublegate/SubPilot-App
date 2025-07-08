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
  });

  try {
    // Get the correct secret (v5 uses AUTH_SECRET, v4 uses NEXTAUTH_SECRET)
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

    if (!secret) {
      console.error(
        `[Auth-Edge Debug ${timestamp}] NO SECRET FOUND - AUTH WILL FAIL`
      );
      return { auth: null };
    }

    console.log(`[Auth-Edge Debug ${timestamp}] Calling getToken with secret`);

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
