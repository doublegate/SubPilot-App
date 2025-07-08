import { NextRequest } from 'next/server';
import { getAuthForEdge as getBaseAuthForEdge } from './auth-edge';

/**
 * Enhanced auth validation for Vercel edge runtime with proxy header support
 */
export async function getAuthForEdge(req: NextRequest) {
  // Clone the request and add trusted proxy headers
  const headers = new Headers(req.headers);

  // Ensure protocol is correctly interpreted from forwarded headers
  const forwardedProto = headers.get('x-forwarded-proto');
  const forwardedHost = headers.get('x-forwarded-host');

  if (forwardedProto && forwardedHost) {
    // Construct the correct URL from forwarded headers
    const correctUrl = `${forwardedProto}://${forwardedHost}${req.nextUrl.pathname}${req.nextUrl.search}`;

    // Create a new request with the correct URL
    const proxiedRequest = new NextRequest(correctUrl, {
      headers: headers,
      method: req.method,
      body: req.body,
    });

    // Add a custom header to indicate this is a trusted proxy request
    proxiedRequest.headers.set('x-vercel-proxy-trust', 'true');

    return getBaseAuthForEdge(proxiedRequest);
  }

  // Fallback to original request if no forwarded headers
  return getBaseAuthForEdge(req);
}

/**
 * Verify if the request is from a trusted Vercel proxy
 */
export function isVercelProxyRequest(req: NextRequest): boolean {
  return !!(
    process.env.VERCEL &&
    req.headers.get('x-forwarded-proto') &&
    req.headers.get('x-forwarded-host')
  );
}
