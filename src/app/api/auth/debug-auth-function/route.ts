import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    // Get the session using the auth() function
    console.log('[Debug Auth Function] Starting auth check...');
    const session = await auth();
    console.log('[Debug Auth Function] Auth result:', session);

    // Get headers for debugging
    const headersList = await headers();
    const cookieHeader = headersList.get('cookie');

    // Parse cookies
    const cookies =
      cookieHeader?.split('; ').reduce(
        (acc, cookie) => {
          const [key, value] = cookie.split('=');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, string>
      ) ?? {};

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      authCheck: {
        hasSession: !!session,
        sessionExists: session !== null,
        sessionData: session
          ? {
              user: session.user,
              expires: session.expires,
            }
          : null,
      },
      cookies: {
        raw: cookieHeader,
        parsed: cookies,
        hasSessionToken:
          !!cookies['__Secure-authjs.session-token'] ||
          !!cookies['authjs.session-token'],
        sessionTokenName: cookies['__Secure-authjs.session-token']
          ? '__Secure-authjs.session-token'
          : cookies['authjs.session-token']
            ? 'authjs.session-token'
            : 'none',
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV,
        authUrl: process.env.AUTH_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      },
      debug: {
        authImportPath: '@/server/auth',
        configUsed: 'auth-v5-fix.config',
      },
    });
  } catch (error) {
    console.error('[Debug Auth Function] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check auth',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
