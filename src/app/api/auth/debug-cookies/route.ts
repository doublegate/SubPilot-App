import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthForEdge } from '@/server/auth-edge';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Get auth status
  const { auth } = await getAuthForEdge(request);

  // Check for specific auth cookies
  const sessionToken = allCookies.find(
    c =>
      c.name === 'authjs.session-token' ||
      c.name === 'next-auth.session-token' ||
      c.name === '__Secure-authjs.session-token' ||
      c.name === '__Secure-next-auth.session-token'
  );

  const csrfToken = allCookies.find(
    c =>
      c.name === 'authjs.csrf-token' ||
      c.name === 'next-auth.csrf-token' ||
      c.name === '__Host-authjs.csrf-token' ||
      c.name === '__Host-next-auth.csrf-token'
  );

  const callbackUrl = allCookies.find(
    c => c.name === 'authjs.callback-url' || c.name === 'next-auth.callback-url'
  );

  // Analyze cookie security
  const cookieAnalysis = {
    sessionToken: sessionToken
      ? {
          name: sessionToken.name,
          hasValue: !!sessionToken.value,
          isSecure: sessionToken.name.includes('__Secure-'),
          isHostOnly: sessionToken.name.includes('__Host-'),
        }
      : null,
    csrfToken: csrfToken
      ? {
          name: csrfToken.name,
          hasValue: !!csrfToken.value,
          isSecure: csrfToken.name.includes('__Secure-'),
          isHostOnly: csrfToken.name.includes('__Host-'),
        }
      : null,
    callbackUrl: callbackUrl
      ? {
          name: callbackUrl.name,
          hasValue: !!callbackUrl.value,
        }
      : null,
  };

  const debugInfo = {
    timestamp,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      authUrl: process.env.AUTH_URL,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    },
    request: {
      url: request.url,
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      forwardedHost: request.headers.get('x-forwarded-host'),
      forwardedProto: request.headers.get('x-forwarded-proto'),
    },
    cookies: {
      total: allCookies.length,
      authCookies: allCookies
        .filter(c => c.name.includes('auth'))
        .map(c => ({
          name: c.name,
          hasValue: !!c.value,
          valueLength: c.value?.length ?? 0,
        })),
      analysis: cookieAnalysis,
    },
    authentication: {
      isAuthenticated: !!auth,
      userId: auth?.user?.id,
      userEmail: auth?.user?.email,
    },
    recommendations: [] as string[],
  };

  // Add recommendations based on the analysis
  if (!sessionToken) {
    debugInfo.recommendations.push(
      'No session token found - user needs to sign in'
    );
  } else if (
    !sessionToken.name.includes('__Secure-') &&
    process.env.NODE_ENV === 'production'
  ) {
    debugInfo.recommendations.push(
      'Session token is not using secure prefix in production'
    );
  }

  if (
    process.env.VERCEL_ENV === 'preview' &&
    cookieAnalysis.sessionToken?.isSecure
  ) {
    debugInfo.recommendations.push(
      'Preview deployment with secure cookies - may cause cross-origin issues. ' +
        'Consider using sameSite: "none" for preview deployments.'
    );
  }

  if (!auth && sessionToken) {
    debugInfo.recommendations.push(
      'Session token exists but authentication failed - possible cookie domain mismatch'
    );
  }

  return NextResponse.json(debugInfo, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
