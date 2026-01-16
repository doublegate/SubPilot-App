import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthForEdge } from '@/server/auth-edge';
import { isTrustedOrigin, isVercelDeployment } from '@/server/lib/auth-utils';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Apply basic security checks (Edge Runtime compatible)
  const securityResponse = await applyBasicSecurity(req);
  if (securityResponse) {
    return securityResponse;
  }

  // Authentication check
  const { auth } = await getAuthForEdge(req);
  const isLoggedIn = !!auth;

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/profile', '/settings'];
  const authRoutes = ['/login', '/signup', '/verify-request', '/auth-error'];

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect to dashboard if accessing auth routes while logged in
  if (isAuthRoute && isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Apply security headers to the response
  const response = NextResponse.next();

  return applySecurityHeaders(response, req);
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
    const referer = request.headers.get('referer');

    // For Vercel deployments, construct origin from forwarded headers
    let effectiveOrigin = origin;
    if (!effectiveOrigin && isVercelDeployment()) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const forwardedProto =
        request.headers.get('x-forwarded-proto') ?? 'https';

      if (forwardedHost) {
        effectiveOrigin = `${forwardedProto}://${forwardedHost}`;
        console.log(
          `[Middleware Security] Constructed origin from forwarded headers: ${effectiveOrigin}`
        );
      }
    }

    // Check origin if present
    if (effectiveOrigin) {
      if (!isTrustedOrigin(effectiveOrigin)) {
        console.log(
          `[Middleware Security] Blocked untrusted origin: ${effectiveOrigin}`
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
    } else if (referer) {
      // Fall back to referer validation
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
    } else if (!isVercelDeployment()) {
      // If we're not on Vercel and have no origin or referer, it's suspicious
      console.log(
        '[Middleware Security] Blocked request with no origin or referer (non-Vercel environment)'
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
  }

  return null;
}

/**
 * Apply security headers to response (Edge Runtime compatible)
 */
function applySecurityHeaders(
  response: NextResponse,
  request?: NextRequest
): NextResponse {
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

  // Content Security Policy configuration
  // Note: Next.js with App Router and Tailwind CSS requires 'unsafe-inline' for styles
  // For scripts, we remove 'unsafe-inline' in production but keep necessary domains
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Detect if we're behind Cloudflare by checking for CF headers
  const isCloudflare =
    request &&
    (request.headers.get('cf-ray') !== null ||
      request.headers.get('cf-connecting-ip') !== null);

  // Determine script-src based on environment and Cloudflare presence
  let scriptSrc;
  if (isDevelopment) {
    scriptSrc =
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://cdn.plaid.com https://plaid.com https://va.vercel-scripts.com https://cdnjs.cloudflare.com https://static.cloudflareinsights.com https://ajax.cloudflare.com";
  } else if (isCloudflare) {
    // Production with Cloudflare: Must allow unsafe-inline for Rocket Loader
    console.warn(
      '[CSP] Cloudflare detected - enabling unsafe-inline for Rocket Loader compatibility'
    );
    scriptSrc =
      "script-src 'self' 'unsafe-inline' https://vercel.live https://cdn.plaid.com https://plaid.com https://va.vercel-scripts.com https://cdnjs.cloudflare.com https://static.cloudflareinsights.com https://ajax.cloudflare.com https://js.stripe.com https://checkout.stripe.com";
  } else {
    // Production without Cloudflare: Next.js 15+ requires 'unsafe-inline' for hydration scripts
    // See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
    scriptSrc =
      "script-src 'self' 'unsafe-inline' https://vercel.live https://cdn.plaid.com https://plaid.com https://va.vercel-scripts.com https://cdnjs.cloudflare.com https://static.cloudflareinsights.com https://ajax.cloudflare.com https://js.stripe.com https://checkout.stripe.com";
  }

  const cspDirectives = [
    "default-src 'self'",
    scriptSrc,
    // Style sources - Next.js/Tailwind requires 'unsafe-inline' for CSS-in-JS
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Font sources
    "font-src 'self' https://fonts.gstatic.com data:",
    // Image sources
    "img-src 'self' data: https: blob:",
    // Connect sources - comprehensive list of all external services
    "connect-src 'self' " +
      'https://api.plaid.com ' +
      'wss://ws-us3.pusher.com ' +
      'https://*.ingest.sentry.io ' +
      'https://*.ingest.us.sentry.io ' +
      'https://vercel.live ' +
      'https://vitals.vercel-insights.com ' +
      'https://region1.google-analytics.com ' +
      'https://www.google-analytics.com ' +
      'https://api.stripe.com ' +
      'https://r.stripe.com ' +
      'https://api.sendgrid.com ' +
      'https://cdn.plaid.com ' +
      'wss://cdn.plaid.com ' +
      'https://sentry.io ' +
      'https://*.sentry.io ' +
      'https://clerk.com ' +
      'https://*.clerk.com ' +
      'https://api.openai.com ' +
      'https://static.cloudflareinsights.com ' +
      'https://cloudflareinsights.com',
    // Frame sources
    "frame-src 'self' https://cdn.plaid.com https://js.stripe.com https://hooks.stripe.com",
    // Object sources
    "object-src 'none'",
    // Base URI
    "base-uri 'self'",
    // Form action
    "form-action 'self'",
    // Frame ancestors
    "frame-ancestors 'none'",
    // Worker sources for Sentry and service workers
    "worker-src 'self' blob:",
    // Manifest source
    "manifest-src 'self'",
    // Media sources
    "media-src 'self'",
  ];

  // Only add upgrade-insecure-requests in production
  if (process.env.NODE_ENV === 'production') {
    cspDirectives.push('upgrade-insecure-requests');
  }

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // Referrer Policy - Use 'strict-origin-when-cross-origin' for better compatibility
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
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
