# Vercel Multi-Origin Authentication Solution

## Overview

This document describes the permanent solution implemented to handle authentication across multiple Vercel deployment URLs while maintaining OAuth configuration for the stable production domain (https://subpilot.app).

## Problem Statement

1. **OAuth Configuration**: OAuth providers (Google, GitHub) are configured with callbacks to the production domain (https://subpilot.app)
2. **Dynamic URLs**: Vercel creates new deployment URLs for each deployment (e.g., `subpilot-8h826s2h1-doublegate-projects.vercel.app`)
3. **Redirect Loops**: When AUTH_URL/NEXTAUTH_URL is set to the production domain but the app is accessed via a Vercel URL, Auth.js sees this as a security violation and causes redirect loops

## Solution Architecture

### 1. Authentication Utilities (`src/server/lib/auth-utils.ts`)

Created a centralized utility module that handles:

- **Trusted Origins Management**: Maintains a list of trusted origins including production domain, Vercel deployments, and localhost
- **Origin Validation**: Validates whether a given origin is trusted, including pattern matching for Vercel preview URLs
- **Canonical URL**: Always returns the production domain for OAuth callbacks
- **Environment Detection**: Detects Vercel deployment context

Key functions:
- `getTrustedOrigins()`: Returns array of all trusted origins
- `isTrustedOrigin(origin)`: Validates if an origin is trusted
- `getCanonicalAuthUrl()`: Returns production URL for OAuth
- `isVercelDeployment()`: Detects if running on Vercel

### 2. Vercel-Specific Configuration (`src/server/auth-vercel.config.ts`)

Extends the base Auth.js configuration with Vercel-specific handling:

- **Trust Host**: Always enabled for Vercel deployments
- **Cookie Configuration**: Optimized for cross-domain support
- **Redirect Handling**: Custom logic to accept redirects from trusted origins
- **Debug Logging**: Comprehensive logging of Vercel environment

### 3. Updated Auth Configuration (`src/server/auth-v5-fix.config.ts`)

- Uses the canonical production URL for OAuth callbacks
- Implements custom redirect callback to handle multiple origins
- Applies Vercel-specific configuration when detected
- Maintains backward compatibility with non-Vercel deployments

### 4. Enhanced Middleware (`src/middleware.ts`)

- **CSRF Protection**: Updated to validate against trusted origins
- **Security Headers**: Maintained while allowing multi-origin access
- **Debug Logging**: Enhanced logging for troubleshooting

### 5. Edge Runtime Compatibility (`src/server/auth-edge.ts`)

- Handles token validation with dynamic URLs
- Supports Vercel deployment context
- Maintains edge runtime constraints

## How It Works

1. **OAuth Flow**:
   - User clicks login on Vercel preview URL
   - OAuth redirect uses production domain (https://subpilot.app)
   - After OAuth callback, user is redirected back to original Vercel URL
   - Session works across both domains

2. **CSRF Protection**:
   - Validates origin/referer against trusted origins list
   - Allows Vercel preview URLs matching the project pattern
   - Maintains security while being flexible

3. **Cookie Handling**:
   - Cookies are configured without domain restriction
   - Allows cookies to work on different subdomains
   - Maintains secure and httpOnly flags

## Security Considerations

1. **Origin Validation**: Only specific Vercel preview URL patterns are allowed
2. **CSRF Protection**: Still enforced but with multi-origin support
3. **OAuth Security**: OAuth callbacks always go through production domain
4. **Cookie Security**: Secure, httpOnly, and SameSite=lax maintained

## Testing

Use the debug endpoint to verify the configuration:
```
GET /api/auth/debug-multi-origin
```

This endpoint returns:
- Current deployment context
- Trusted origins list
- Authentication status
- Cookie presence
- Environment configuration

## Environment Variables

Required environment variables remain the same:
- `AUTH_SECRET` or `NEXTAUTH_SECRET`
- `AUTH_URL` or `NEXTAUTH_URL` (should be set to https://subpilot.app)
- OAuth provider credentials

Vercel automatically provides:
- `VERCEL`: Set to "1" when on Vercel
- `VERCEL_ENV`: "production", "preview", or "development"
- `VERCEL_URL`: The deployment URL

## Deployment Scenarios

### Production Deployment
- Uses https://subpilot.app
- OAuth callbacks work normally
- No special handling needed

### Preview Deployments
- Automatically detected via VERCEL_ENV
- Accepts authentication from preview URLs
- OAuth still goes through production domain
- Sessions work seamlessly

### Local Development
- Automatically includes localhost:3000
- Works with development credentials
- No manual configuration needed

## Troubleshooting

1. **Check Trusted Origins**: Use the debug endpoint to see which origins are trusted
2. **Verify Environment**: Ensure VERCEL environment variables are set
3. **Cookie Issues**: Check if cookies are being set with correct options
4. **OAuth Failures**: Verify OAuth providers are configured with production callback URLs

## Benefits

1. **Zero Configuration**: Works automatically with any Vercel deployment
2. **Security Maintained**: CSRF and origin validation still enforced
3. **OAuth Compatibility**: No changes needed to OAuth provider configuration
4. **Developer Experience**: No manual URL updates for preview deployments
5. **Production Safe**: No impact on production deployment behavior