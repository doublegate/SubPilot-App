import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    // Get session from auth
    const session = await auth();
    
    // Get headers
    const headersList = await headers();
    const cookies = headersList.get('cookie') ?? '';
    
    // Check for auth cookies
    const hasSessionToken = cookies.includes('authjs.session-token') || cookies.includes('next-auth.session-token');
    const hasCSRFToken = cookies.includes('authjs.csrf-token') || cookies.includes('next-auth.csrf-token');
    
    return NextResponse.json({
      session: session ? {
        user: session.user,
        expires: session.expires,
      } : null,
      cookies: {
        hasSessionToken,
        hasCSRFToken,
        rawCookies: process.env.NODE_ENV === 'development' ? cookies : 'Hidden in production',
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        authUrl: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'Not set',
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to debug session',
      details: String(error),
    }, { status: 500 });
  }
}