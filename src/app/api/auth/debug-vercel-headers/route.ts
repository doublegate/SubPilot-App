import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  getAuthCookieConfig,
  shouldTrustCookies,
} from '@/server/auth-cookie-config';

export async function GET(req: NextRequest) {
  const headersList = await headers();
  const allHeaders: Record<string, string> = {};

  headersList.forEach((value, key) => {
    allHeaders[key] = value;
  });

  // Analyze proxy headers
  const proxyAnalysis = {
    hasForwardedProto: !!allHeaders['x-forwarded-proto'],
    forwardedProto: allHeaders['x-forwarded-proto'] || null,
    hasForwardedHost: !!allHeaders['x-forwarded-host'],
    forwardedHost: allHeaders['x-forwarded-host'] || null,
    hasForwardedFor: !!allHeaders['x-forwarded-for'],
    forwardedFor: allHeaders['x-forwarded-for'] || null,

    // Check if protocol matches
    protocolMismatch:
      allHeaders['x-forwarded-proto'] !== req.nextUrl.protocol.replace(':', ''),

    // Vercel specific
    isVercelDeployment: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV || null,
    vercelUrl: process.env.VERCEL_URL || null,
  };

  // Cookie configuration
  const cookieConfig = getAuthCookieConfig();
  const trustCookies = shouldTrustCookies(headersList);

  // URL construction
  const constructedUrls = {
    fromRequest: req.url,
    fromNextUrl: req.nextUrl.toString(),
    fromForwardedHeaders:
      allHeaders['x-forwarded-proto'] && allHeaders['x-forwarded-host']
        ? `${allHeaders['x-forwarded-proto']}://${allHeaders['x-forwarded-host']}${req.nextUrl.pathname}${req.nextUrl.search}`
        : null,
  };

  // Session cookie analysis
  const sessionCookieName =
    cookieConfig.sessionToken?.name || 'authjs.session-token';
  const secureCookieName = `__Secure-${sessionCookieName}`;

  const cookieAnalysis = {
    expectedCookieName: sessionCookieName,
    hasSessionCookie: req.cookies.has(sessionCookieName),
    hasSecureCookie: req.cookies.has(secureCookieName),
    cookieConfig: cookieConfig.sessionToken?.options || {},
    shouldTrustCookies: trustCookies,
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),

    // Headers
    headers: allHeaders,

    // Proxy analysis
    proxyAnalysis,

    // URL analysis
    urlAnalysis: {
      requestUrl: req.url,
      nextUrlProtocol: req.nextUrl.protocol,
      nextUrlHost: req.nextUrl.host,
      nextUrlPathname: req.nextUrl.pathname,
      constructedUrls,
    },

    // Cookie analysis
    cookieAnalysis,

    // Environment
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      AUTH_URL: process.env.AUTH_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    },

    // Recommendations
    recommendations: {
      needsProxyTrust:
        proxyAnalysis.hasForwardedProto && proxyAnalysis.protocolMismatch,
      cookieIssue:
        proxyAnalysis.hasForwardedProto && !cookieAnalysis.shouldTrustCookies,
      urlMismatch:
        constructedUrls.fromRequest !== constructedUrls.fromForwardedHeaders,
    },
  });
}
