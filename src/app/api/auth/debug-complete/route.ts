import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { cookies, headers } from 'next/headers';
import { getTrustedOrigins, isVercelDeployment } from '@/server/lib/auth-utils';

export async function GET() {
  try {
    const [session, cookieStore, headersList] = await Promise.all([
      auth(),
      cookies(),
      headers(),
    ]);

    const allCookies = cookieStore.getAll();

    // Analyze cookie configuration
    const cookieAnalysis = {
      sessionToken: {
        regular: allCookies.find(c => c.name === 'authjs.session-token'),
        secure: allCookies.find(
          c => c.name === '__Secure-authjs.session-token'
        ),
        hasValue: allCookies.some(
          c =>
            (c.name === 'authjs.session-token' ||
              c.name === '__Secure-authjs.session-token') &&
            !!c.value
        ),
      },
      callbackUrl: {
        regular: allCookies.find(c => c.name === 'authjs.callback-url'),
        secure: allCookies.find(c => c.name === '__Secure-authjs.callback-url'),
      },
      csrfToken: {
        regular: allCookies.find(c => c.name === 'authjs.csrf-token'),
        host: allCookies.find(c => c.name === '__Host-authjs.csrf-token'),
      },
    };

    // Header analysis
    const headerAnalysis = {
      // Standard headers
      host: headersList.get('host'),
      origin: headersList.get('origin'),
      referer: headersList.get('referer'),
      cookie: headersList.get('cookie'),

      // Forwarded headers
      xForwardedHost: headersList.get('x-forwarded-host'),
      xForwardedProto: headersList.get('x-forwarded-proto'),
      xForwardedFor: headersList.get('x-forwarded-for'),

      // Vercel specific
      xVercelId: headersList.get('x-vercel-id'),
      xVercelForwardedFor: headersList.get('x-vercel-forwarded-for'),
      xRealIp: headersList.get('x-real-ip'),
    };

    // Environment analysis
    const envAnalysis = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
      VERCEL_REGION: process.env.VERCEL_REGION,

      // Auth URLs
      AUTH_URL: process.env.AUTH_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,

      // Auth secrets
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    };

    // URL construction analysis
    const urlAnalysis = {
      // What the browser thinks
      browserUrl: headersList.get('referer') ?? 'Unknown',

      // What Next.js middleware sees
      middlewareHost: headersList.get('host'),

      // What Vercel forwarded
      forwardedUrl: headerAnalysis.xForwardedHost
        ? `${headerAnalysis.xForwardedProto ?? 'https'}://${headerAnalysis.xForwardedHost}`
        : null,

      // What we expect for auth
      expectedAuthUrl: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL,

      // Trusted origins
      trustedOrigins: getTrustedOrigins(),
    };

    // Problem identification
    const problems = [];

    // Check for host mismatch
    if (headerAnalysis.host !== headerAnalysis.xForwardedHost) {
      problems.push({
        issue: 'Host header mismatch',
        details: `Host: ${headerAnalysis.host}, X-Forwarded-Host: ${headerAnalysis.xForwardedHost}`,
        impact: 'CSRF validation may fail',
      });
    }

    // Check for missing secure cookie
    if (
      !cookieAnalysis.sessionToken.secure &&
      process.env.NODE_ENV === 'production'
    ) {
      problems.push({
        issue: 'Missing secure session token',
        details: 'Only non-secure session token found',
        impact: 'Cookie may not be sent over HTTPS',
      });
    }

    // Check for origin/referer issues
    if (!headerAnalysis.origin && !headerAnalysis.referer) {
      problems.push({
        issue: 'Missing origin and referer headers',
        details: 'Both headers are null',
        impact: 'CSRF protection may block requests',
      });
    }

    // Check for auth URL mismatch
    if (
      urlAnalysis.middlewareHost !==
      new URL(urlAnalysis.expectedAuthUrl ?? 'http://localhost').hostname
    ) {
      problems.push({
        issue: 'Auth URL mismatch',
        details: `Expected: ${urlAnalysis.expectedAuthUrl}, Got: ${urlAnalysis.middlewareHost}`,
        impact: 'OAuth callbacks may fail',
      });
    }

    // Recommendations
    const recommendations = [
      'Ensure AUTH_URL/NEXTAUTH_URL matches your production domain',
      'Check that OAuth providers are configured with correct callback URLs',
      'Verify Vercel is forwarding headers correctly',
      'Consider using the debug endpoints to trace the auth flow',
    ];

    if (problems.some(p => p.issue === 'Host header mismatch')) {
      recommendations.push(
        'The middleware CSRF fix should handle forwarded headers'
      );
    }

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),

        session: {
          exists: !!session,
          user: session?.user,
        },

        cookies: cookieAnalysis,
        headers: headerAnalysis,
        environment: envAnalysis,
        urls: urlAnalysis,

        problems,
        recommendations,

        debugging: {
          isVercel: isVercelDeployment(),
          cookieDebugEndpoint: '/api/auth/debug-cookies',
          headerDebugEndpoint: '/api/auth/debug-vercel-headers',
          multiOriginDebugEndpoint: '/api/auth/debug-multi-origin',
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to generate debug report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
