import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

/**
 * Edge-compatible auth check function
 * This only checks if a user is authenticated without importing heavy dependencies
 */
export async function getAuthForEdge(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    return {
      auth: token ? { user: { id: token.sub, email: token.email as string } } : null,
    };
  } catch (error) {
    console.error("Error checking auth in edge:", error);
    return { auth: null };
  }
}