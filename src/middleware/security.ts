import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100

// In-memory store for rate limiting (in production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, value] of requestCounts.entries()) {
    if (value.resetTime < now) {
      requestCounts.delete(key)
    }
  }
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  
  // Use the first available IP or fallback to a default
  const ip = forwarded?.split(",")[0] ?? realIp ?? cfConnectingIp ?? "anonymous"
  
  return ip
}

/**
 * Apply rate limiting to a request
 */
export function applyRateLimit(request: NextRequest): NextResponse | null {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === "development") {
    return null
  }

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance on each request
    cleanupExpiredEntries()
  }

  const clientId = getClientId(request)
  const now = Date.now()
  
  const clientData = requestCounts.get(clientId)
  
  if (!clientData || clientData.resetTime < now) {
    // First request or window expired
    requestCounts.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    })
    return null
  }
  
  // Increment request count
  clientData.count++
  
  if (clientData.count > MAX_REQUESTS_PER_WINDOW) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((clientData.resetTime - now) / 1000)
    
    return new NextResponse(
      JSON.stringify({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": MAX_REQUESTS_PER_WINDOW.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": clientData.resetTime.toString(),
        },
      }
    )
  }
  
  return null
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Prevent XSS attacks
  response.headers.set("X-XSS-Protection", "1; mode=block")
  
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY")
  
  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")
  
  // Enable strict transport security (HTTPS only)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    )
  }
  
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://plaid.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.plaid.com wss://ws-us3.pusher.com",
    "frame-src 'self' https://cdn.plaid.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ]
  
  response.headers.set("Content-Security-Policy", cspDirectives.join("; "))
  
  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  
  // Permissions Policy (formerly Feature Policy)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)"
  )
  
  return response
}

/**
 * Validate CSRF token (for mutation endpoints)
 */
export function validateCSRFToken(request: NextRequest): boolean {
  // In a real implementation, this would check a CSRF token
  // For now, we'll check if the request has proper headers
  
  const contentType = request.headers.get("content-type")
  const origin = request.headers.get("origin")
  const host = request.headers.get("host")
  
  // Skip CSRF check for GET/HEAD requests
  if (request.method === "GET" || request.method === "HEAD") {
    return true
  }
  
  // Check if request is from same origin
  if (origin && host) {
    try {
      const originUrl = new URL(origin)
      const expectedOrigin = process.env.NEXTAUTH_URL ?? `https://${host}`
      const expectedUrl = new URL(expectedOrigin)
      
      return originUrl.host === expectedUrl.host
    } catch {
      return false
    }
  }
  
  // For API routes, check content type
  if (request.url.includes("/api/")) {
    return contentType?.includes("application/json") ?? false
  }
  
  return true
}

/**
 * Main security middleware
 */
export function securityMiddleware(request: NextRequest): NextResponse | null {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }
  
  // Validate CSRF token for mutations
  if (!validateCSRFToken(request)) {
    return new NextResponse(
      JSON.stringify({
        error: "CSRF validation failed",
        message: "Invalid request origin",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  }
  
  return null
}