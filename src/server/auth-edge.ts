import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

/**
 * Edge-compatible auth check function
 * This only checks if a user is authenticated without importing heavy dependencies
 */
export async function getAuthForEdge(req: NextRequest) {
  const timestamp = new Date().toISOString();
  
  console.log(`[Auth-Edge Debug ${timestamp}] Starting auth check`, {
    url: req.url,
    cookies: req.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value })),
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    authUrl: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'NOT SET',
  });

  try {
    // Get the correct secret (v5 uses AUTH_SECRET, v4 uses NEXTAUTH_SECRET)
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

    if (!secret) {
      console.error(`[Auth-Edge Debug ${timestamp}] NO SECRET FOUND - AUTH WILL FAIL`);
      return { auth: null };
    }

    console.log(`[Auth-Edge Debug ${timestamp}] Calling getToken with secret`);
    
    const token = await getToken({
      req,
      secret,
    });

    console.log(`[Auth-Edge Debug ${timestamp}] Token result:`, {
      hasToken: !!token,
      tokenSub: token?.sub,
      tokenEmail: token?.email,
      tokenExp: token?.exp,
      tokenIat: token?.iat,
    });

    return {
      auth: token ? { user: { id: token.sub, email: token.email! } } : null,
    };
  } catch (error) {
    console.error(`[Auth-Edge Debug ${timestamp}] Error checking auth in edge:`, error);
    return { auth: null };
  }
}
