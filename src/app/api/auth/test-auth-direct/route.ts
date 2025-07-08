import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/server/db';

export async function GET() {
  try {
    // Get cookies directly
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get('__Secure-authjs.session-token')?.value ||
      cookieStore.get('authjs.session-token')?.value;

    console.log('[Test Auth Direct] Session token:', sessionToken);

    if (!sessionToken) {
      return NextResponse.json({
        error: 'No session token found',
        cookies: cookieStore
          .getAll()
          .map(c => ({ name: c.name, hasValue: !!c.value })),
      });
    }

    // Try to get the session from the database directly
    const session = await db.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    console.log('[Test Auth Direct] Database session result:', {
      found: !!session,
      expires: session?.expires,
      userId: session?.userId,
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      sessionToken: {
        exists: !!sessionToken,
        value: sessionToken?.substring(0, 10) + '...',
      },
      databaseSession: {
        found: !!session,
        expires: session?.expires,
        isExpired: session ? new Date(session.expires) < new Date() : null,
        user: session?.user
          ? {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name,
            }
          : null,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        authUrl: process.env.AUTH_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      },
    });
  } catch (error) {
    console.error('[Test Auth Direct] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check auth directly',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
