import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

/**
 * Edge-compatible auth check function
 * This only checks if a user is authenticated without importing heavy dependencies
 */
export async function getAuthForEdge(req: NextRequest) {
  try {
    // Get the correct secret (v5 uses AUTH_SECRET, v4 uses NEXTAUTH_SECRET)
    const secret =
      process.env.AUTH_SECRET ??
      process.env.NEXTAUTH_SECRET;

    const token = await getToken({
      req,
      secret,
    });

    return {
      auth: token ? { user: { id: token.sub, email: token.email! } } : null,
    };
  } catch (error) {
    console.error('Error checking auth in edge:', error);
    return { auth: null };
  }
}
