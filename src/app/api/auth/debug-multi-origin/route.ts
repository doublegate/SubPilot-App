import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import {
  getTrustedOrigins,
  getCanonicalAuthUrl,
  isVercelDeployment,
  getCurrentUrl,
} from '@/server/lib/auth-utils';
import { headers } from 'next/headers';

export async function GET() {
  const session = await auth();
  const headersList = await headers();

  // Get various URL-related headers
  const host = headersList.get('host');
  const origin = headersList.get('origin');
  const referer = headersList.get('referer');
  const forwardedHost = headersList.get('x-forwarded-host');
  const forwardedProto = headersList.get('x-forwarded-proto');

  const debugInfo = {
    timestamp: new Date().toISOString(),
    deployment: {
      isVercel: isVercelDeployment(),
      vercelEnv: process.env.VERCEL_ENV ?? 'not-vercel',
      vercelUrl: process.env.VERCEL_URL ?? 'not-set',
      vercelBranchUrl: process.env.VERCEL_BRANCH_URL ?? 'not-set',
      vercelRegion: process.env.VERCEL_REGION ?? 'not-set',
      vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF ?? 'not-set',
    },
    urls: {
      canonicalAuthUrl: getCanonicalAuthUrl(),
      currentUrl: getCurrentUrl(headersList),
      trustedOrigins: getTrustedOrigins(),
    },
    headers: {
      host,
      origin,
      referer,
      forwardedHost,
      forwardedProto,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      authUrl: process.env.AUTH_URL ?? 'not-set',
      nextAuthUrl: process.env.NEXTAUTH_URL ?? 'not-set',
    },
    auth: {
      hasSession: !!session,
      sessionUser: session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          }
        : null,
    },
    cookies: {
      hasSessionToken:
        headersList.get('cookie')?.includes('authjs.session-token') ?? false,
      hasSecureSessionToken:
        headersList.get('cookie')?.includes('__Secure-authjs.session-token') ??
        false,
      hasCsrfToken:
        headersList.get('cookie')?.includes('authjs.csrf-token') ?? false,
    },
  };

  return NextResponse.json(debugInfo, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
