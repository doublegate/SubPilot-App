# Complete Vercel Authentication Fix Documentation

## Problem Summary

Authentication redirect loops occurred when accessing the app via Vercel preview URLs (e.g., `subpilot-cf0u28a0q-doublegate-projects.vercel.app`) while OAuth was configured for the production domain (`https://subpilot.app`).

## Root Causes Identified

1. **Header Rewriting**: Vercel's proxy rewrites the `host` header to the production domain
2. **Cookie Domain Mismatch**: Cookies set on one domain cannot be read from another
3. **CSRF Validation Failure**: Middleware doesn't handle forwarded headers properly
4. **Missing Secure Cookie Prefixes**: Production cookies need `__Secure-` prefix

## Fixes Applied

### 1. Middleware CSRF Validation (Already Applied)
- File: `src/middleware.ts`
- Uses forwarded headers (`x-forwarded-host`, `x-forwarded-proto`) on Vercel
- Constructs proper origin for CSRF validation
- Only trusts forwarded headers when verified on Vercel platform

### 2. Cookie Configuration Updates
- File: `src/server/auth-vercel.config.ts`
- Added secure cookie prefixes for production (`__Secure-`, `__Host-`)
- Dynamic `sameSite` attribute based on deployment type
- Removed domain restriction to work across origins

### 3. Vercel Edge Handler (Already Applied)
- File: `src/server/auth-edge-vercel.ts`
- Handles proxy header interpretation
- Constructs correct URLs from forwarded headers
- Adds trust indicators for downstream processing

### 4. Infrastructure Configuration (Already Applied)
- File: `vercel.json` - Has header forwarding configuration
- File: `next.config.js` - Has `trustHostHeader: true`
- Dynamic cookie configuration based on environment

### 5. Debug Endpoints Created
- `/api/auth/debug-complete` - Comprehensive debugging (NEW)
- `/api/auth/debug-multi-origin` - Multi-origin analysis
- `/api/auth/debug-redirect-loop` - Redirect loop debugging
- `/api/auth/debug-cookies` - Cookie analysis
- `/api/auth/debug-vercel-headers` - Header analysis

## How It Works

1. **Request Flow**:
   ```
   Browser → Vercel Proxy → Next.js Middleware → Auth Handler
   ```

2. **Header Transformation**:
   - Browser sends: `Host: subpilot-xxx.vercel.app`
   - Vercel forwards: `X-Forwarded-Host: subpilot-xxx.vercel.app`
   - Vercel rewrites: `Host: subpilot.app`

3. **Cookie Handling**:
   - Production uses secure prefixes
   - Preview deployments use `sameSite: none` for cross-domain
   - No domain restriction allows cookies on all subdomains

4. **CSRF Protection**:
   - Constructs origin from forwarded headers on Vercel
   - Validates against trusted origins list
   - Falls back to standard validation for non-Vercel

## Testing the Fix

1. Deploy to Vercel
2. Visit `/api/auth/debug-complete` for comprehensive analysis
3. Check for:
   - No "problems" in the response
   - Correct cookie configuration
   - Proper header forwarding

## Security Considerations

- Only trusts forwarded headers on verified Vercel deployments
- Maintains CSRF protection with multi-origin validation
- Secure cookie attributes maintained
- OAuth callbacks always use production domain

## Rollback Plan

If issues persist, you can:

1. **Disable Auth Temporarily**:
   ```typescript
   // In middleware.ts, change line 37:
   if (false) { // Instead of if (true)
   ```

2. **Revert Cookie Config**:
   ```typescript
   // Remove secure prefixes in auth-vercel.config.ts
   name: 'authjs.session-token', // Remove __Secure- prefix
   ```

3. **Check Debug Endpoints**:
   - `/api/auth/debug-complete` - Full analysis
   - `/api/auth/debug-multi-origin` - Origin issues
   - `/api/auth/debug-cookies` - Cookie problems

## Expected Behavior

After deployment:
1. Users can access the app via Vercel preview URLs
2. OAuth login works without redirect loops
3. Sessions persist across page refreshes
4. CSRF protection remains active

## Monitoring

Watch for:
- `problems` array in debug endpoints
- Vercel Function logs for auth errors
- Browser console for redirect chains
- Network tab for cookie headers