import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

/**
 * Edge-compatible auth check function
 * This only checks if a user is authenticated without importing heavy dependencies
 */
export async function getAuthForEdge(req: NextRequest) {
  try {
    // Get the correct secret (v5 uses AUTH_SECRET, v4 uses NEXTAUTH_SECRET)
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

    // Debug logging
    console.log('[Auth Edge] Host:', req.headers.get('host'));
    console.log('[Auth Edge] URL:', req.url);
    console.log('[Auth Edge] Cookies:', req.cookies.toString());
    console.log('[Auth Edge] Has secret:', !!secret);

    const token = await getToken({
      req,
      secret,
    });

    console.log('[Auth Edge] Token:', token ? 'Found' : 'Not found');
    console.log('[Auth Edge] Token details:', token ? { sub: token.sub, email: token.email } : 'None');

    return {
      auth: token ? { user: { id: token.sub, email: token.email! } } : null,
    };
  } catch (error) {
    console.error('Error checking auth in edge:', error);
    return { auth: null };
  }
}
