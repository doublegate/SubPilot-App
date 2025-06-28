import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthForEdge } from '@/server/auth-edge';

export async function middleware(req: NextRequest) {
  // Apply basic security checks (Edge Runtime compatible)
  const securityResponse = await applyBasicSecurity(req);
  if (securityResponse) {
    return securityResponse;
  }

  const { auth } = await getAuthForEdge(req);
  const isLoggedIn = !!auth;
  const { pathname } = req.nextUrl;

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
    const host = request.headers.get('host');

    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        const expectedOrigin = process.env.NEXTAUTH_URL ?? `https://${host}`;
        const expectedUrl = new URL(expectedOrigin);

        if (originUrl.host !== expectedUrl.host) {
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

  return null;
}

/**
 * Apply security headers to response (Edge Runtime compatible)
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  // Prevent XSS attacks
  response.headers.set('X-XSS-Protection', '1; mode=block');

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
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://cdn.plaid.com https://plaid.com https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.plaid.com wss://ws-us3.pusher.com",
    "frame-src 'self' https://cdn.plaid.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ];

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self)'
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.png$).*)',
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
  ],
};
