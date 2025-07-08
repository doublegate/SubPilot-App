import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthForEdge } from '@/server/auth-edge';
import {
  isTrustedOrigin,
  getCurrentUrl,
  isVercelDeployment,
} from '@/server/lib/auth-utils';

export async function middleware(req: NextRequest) {
  const timestamp = new Date().toISOString();
  const { pathname, searchParams } = req.nextUrl;

  console.log(`[Middleware Debug ${timestamp}]`, {
    url: req.url,
    pathname,
    method: req.method,
    hasAuthCookie:
      req.cookies.has('authjs.session-token') ||
      req.cookies.has('__Secure-authjs.session-token'),
    cookies: req.cookies.getAll().map(c => c.name),
    origin: req.headers.get('origin'),
    referer: req.headers.get('referer'),
    searchParams: Object.fromEntries(searchParams.entries()),
    isVercel: isVercelDeployment(),
    vercelUrl: process.env.VERCEL_URL,
    currentUrl: getCurrentUrl(req.headers),
  });

  // Apply basic security checks (Edge Runtime compatible)
  const securityResponse = await applyBasicSecurity(req);
  if (securityResponse) {
    console.log(
      `[Middleware Debug ${timestamp}] Security check failed, returning security response`
    );
    return securityResponse;
  }

  // Re-enabled auth checks now that login is working
  const { auth } = await getAuthForEdge(req);
  const isLoggedIn = !!auth;

  console.log(`[Middleware Debug ${timestamp}] Auth check result:`, {
    isLoggedIn,
    userId: auth?.user?.id,
    userEmail: auth?.user?.email,
  });

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/profile', '/settings'];
  const authRoutes = ['/login', '/signup', '/verify-request', '/auth-error'];

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  console.log(`[Middleware Debug ${timestamp}] Route check:`, {
    isProtectedRoute,
    isAuthRoute,
    pathname,
  });

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', pathname);
    console.log(`[Middleware Debug ${timestamp}] Redirecting to login:`, {
      from: pathname,
      to: url.pathname,
      reason: 'Protected route without auth',
    });
    return NextResponse.redirect(url);
  }

  // Redirect to dashboard if accessing auth routes while logged in
  if (isAuthRoute && isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    console.log(`[Middleware Debug ${timestamp}] Redirecting to dashboard:`, {
      from: pathname,
      to: url.pathname,
      reason: 'Auth route while logged in',
    });
    return NextResponse.redirect(url);
  }

  // Apply security headers to the response
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

/**
 * Basic security checks compatible with Edge Runtime
 */
async function applyBasicSecurity(
  request: NextRequest
): Promise<NextResponse | null> {
  // Basic CSRF protection for mutations
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');

    if (origin) {
      // Check if the origin is trusted
      if (!isTrustedOrigin(origin)) {
        console.log(
          `[Middleware Security] Blocked untrusted origin: ${origin}`
        );
        return new NextResponse(
          JSON.stringify({
            error: 'CSRF_VALIDATION_FAILED',
            message:
              'Invalid request origin. Please refresh the page and try again.',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      // No origin header for same-origin requests is acceptable
      // But we should still validate the referer for additional security
      const referer = request.headers.get('referer');
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          if (!isTrustedOrigin(refererUrl.origin)) {
            console.log(
              `[Middleware Security] Blocked untrusted referer: ${referer}`
            );
            return new NextResponse(
              JSON.stringify({
                error: 'CSRF_VALIDATION_FAILED',
                message:
                  'Invalid request origin. Please refresh the page and try again.',
              }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
        } catch {
          // Invalid referer URL, block the request
          return new NextResponse(
            JSON.stringify({
              error: 'CSRF_VALIDATION_FAILED',
              message:
                'Invalid request origin. Please refresh the page and try again.',
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }
  }

  return null;
}

/**
 * Apply security headers to response (Edge Runtime compatible)
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  // X-XSS-Protection is deprecated and can cause vulnerabilities
  // Modern browsers use CSP instead, so we don't set this header

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Enable strict transport security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  // Content Security Policy
  // Note: Next.js requires 'unsafe-inline' for styles and limited inline scripts
  // In production, consider implementing nonce-based CSP for better security
  const cspDirectives = [
    "default-src 'self'",
    // In development, React needs 'unsafe-eval' for hot reloading
    process.env.NODE_ENV === 'development'
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://cdn.plaid.com https://plaid.com https://va.vercel-scripts.com https://cdnjs.cloudflare.com"
      : "script-src 'self' 'unsafe-inline' https://vercel.live https://cdn.plaid.com https://plaid.com https://va.vercel-scripts.com https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    // Add Sentry domains and Vercel Analytics to connect-src
    "connect-src 'self' https://api.plaid.com wss://ws-us3.pusher.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://vercel.live https://vitals.vercel-insights.com https://region1.google-analytics.com https://www.google-analytics.com",
    "frame-src 'self' https://cdn.plaid.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Add worker-src directive to allow blob: workers for Sentry
    "worker-src 'self' blob:",
    'upgrade-insecure-requests',
  ];

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // Referrer Policy - Use 'no-referrer' for maximum privacy
  response.headers.set('Referrer-Policy', 'no-referrer');

  // Permissions Policy - Remove unrecognized browsing-topics feature
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self)'
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints need to be accessible)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$).*)',
  ],
};
