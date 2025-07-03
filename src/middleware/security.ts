import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  checkRateLimit,
  applyRateLimitHeaders,
} from '@/server/lib/rate-limiter';
import { AuditLogger } from '@/server/lib/audit-logger';

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  // Use the first available IP or fallback to a default
  const ip =
    forwarded?.split(',')[0] ?? realIp ?? cfConnectingIp ?? 'anonymous';

  return ip;
}

/**
 * Apply rate limiting to a request
 */
export async function applyRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  // Skip rate limiting in development unless explicitly enabled
  if (
    process.env.NODE_ENV === 'development' &&
    !process.env.ENABLE_RATE_LIMIT
  ) {
    return null;
  }

  const clientId = getClientId(request);
  const endpoint = request.nextUrl.pathname;

  try {
    const rateLimitInfo = await checkRateLimit(clientId, {
      type: 'api',
      endpoint: endpoint,
      ip: clientId,
    });

    if (!rateLimitInfo.allowed) {
      // Log rate limit violation
      await AuditLogger.logRateLimit(clientId, endpoint);

      const response = new NextResponse(
        JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitInfo.reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      applyRateLimitHeaders(response.headers, rateLimitInfo);
      return response;
    }

    return null;
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open - allow request if rate limiting fails
    return null;
  }
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
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
    "script-src 'self' 'unsafe-inline' https://vercel.live https://cdn.plaid.com https://plaid.com https://va.vercel-scripts.com",
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

  // Permissions Policy (formerly Feature Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self)'
  );

  return response;
}

/**
 * Validate CSRF token (for mutation endpoints)
 */
export async function validateCSRFToken(
  request: NextRequest
): Promise<boolean> {
  // Skip CSRF check for GET/HEAD requests
  if (request.method === 'GET' || request.method === 'HEAD') {
    return true;
  }

  const contentType = request.headers.get('content-type');
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const clientId = getClientId(request);
  const endpoint = request.nextUrl.pathname;

  // Check if request is from same origin
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      const expectedOrigin = process.env.NEXTAUTH_URL ?? `https://${host}`;
      const expectedUrl = new URL(expectedOrigin);

      const isValid = originUrl.host === expectedUrl.host;

      if (!isValid) {
        // Log CSRF failure
        await AuditLogger.logCSRFFailure(clientId, endpoint, origin);
      }

      return isValid;
    } catch {
      await AuditLogger.logCSRFFailure(clientId, endpoint, origin ?? 'unknown');
      return false;
    }
  }

  // For API routes, check content type
  if (request.url.includes('/api/')) {
    const isValid = contentType?.includes('application/json') ?? false;

    if (!isValid) {
      await AuditLogger.logCSRFFailure(
        clientId,
        endpoint,
        'invalid-content-type'
      );
    }

    return isValid;
  }

  return true;
}

/**
 * Main security middleware
 */
export async function securityMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Validate CSRF token for mutations
  const isCSRFValid = await validateCSRFToken(request);
  if (!isCSRFValid) {
    return new NextResponse(
      JSON.stringify({
        error: 'CSRF_VALIDATION_FAILED',
        message:
          'Invalid request origin. Please refresh the page and try again.',
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return null;
}
