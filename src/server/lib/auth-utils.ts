/**
 * Authentication utilities for handling multiple origins and Vercel deployments
 */

/**
 * Get list of trusted origins for authentication
 * Includes production domain and current Vercel deployment URL
 */
export function getTrustedOrigins(): string[] {
  const origins: string[] = [];

  // Always trust the production domain
  origins.push('https://subpilot.app');
  origins.push('https://www.subpilot.app');

  // Add the configured URL if different
  const configuredUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      origins.push(url.origin);
    } catch {
      // Invalid URL, skip
    }
  }

  // Add Vercel deployment URL
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  // Add localhost for development
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000');
    origins.push('http://localhost:3001');
  }

  // Remove duplicates
  return [...new Set(origins)];
}

/**
 * Check if an origin is trusted
 */
export function isTrustedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  const trustedOrigins = getTrustedOrigins();

  // Check exact match
  if (trustedOrigins.includes(origin)) {
    return true;
  }

  // Check if it's a Vercel preview deployment
  try {
    const url = new URL(origin);
    if (url.hostname.endsWith('.vercel.app')) {
      // Additional check: ensure it matches our project pattern
      const projectPattern =
        /^subpilot-[a-z0-9]+-doublegate-projects\.vercel\.app$/;
      return projectPattern.test(url.hostname);
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Get the canonical auth URL for OAuth callbacks
 * This should always be the production domain for OAuth providers
 */
export function getCanonicalAuthUrl(): string {
  // For OAuth callbacks, always use the production domain
  // This ensures OAuth providers redirect to the correct URL
  return 'https://subpilot.app';
}

/**
 * Get the current request URL, handling Vercel deployments
 */
export function getCurrentUrl(headers: Headers): string {
  // Check for Vercel deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Check for forwarded host (common in proxies)
  const forwardedHost = headers.get('x-forwarded-host');
  const forwardedProto = headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Check for host header
  const host = headers.get('host');
  if (host) {
    // In production, assume HTTPS
    const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    return `${proto}://${host}`;
  }

  // Fallback to configured URL
  return (
    process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  );
}

/**
 * Check if we're running on a Vercel deployment
 */
export function isVercelDeployment(): boolean {
  return !!process.env.VERCEL;
}

/**
 * Check if we're running on a Vercel preview deployment
 */
export function isVercelPreview(): boolean {
  return process.env.VERCEL_ENV === 'preview';
}

/**
 * Check if we're running on Vercel production
 */
export function isVercelProduction(): boolean {
  return process.env.VERCEL_ENV === 'production';
}
