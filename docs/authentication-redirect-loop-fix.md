# Authentication Redirect Loop Fix

## Issue Description
Users were experiencing an infinite redirect loop when trying to login using Google or GitHub OAuth buttons. Even after disabling Vercel's SSO/password protection, the issue persisted.

## Root Cause Analysis
1. **Environment Variable Mismatch**: The `NEXTAUTH_URL` was set to the production domain (`https://subpilot.app`) instead of the actual Vercel deployment URL (`https://subpilot-app.vercel.app`)
2. **NextAuth v4/v5 Compatibility**: The app needs both `AUTH_*` and `NEXTAUTH_*` environment variables for compatibility
3. **Middleware Interference**: While the middleware correctly excludes `/api/auth/*` paths, the auth check might still interfere with the OAuth flow in edge cases

## Fixes Applied

### 1. Temporarily Disabled Middleware Auth Check
- **File**: `src/middleware.ts`
- **Change**: Commented out auth check logic and added comprehensive debug logging
- **Purpose**: To isolate whether middleware is causing the redirect loop

### 2. Enhanced Debug Logging
Added detailed logging to:
- `src/middleware.ts`: Logs all requests, cookies, and routing decisions
- `src/server/auth-edge.ts`: Logs token validation process and environment variables

### 3. Created Debug Endpoint
- **Path**: `/api/auth/debug-redirect-loop`
- **Purpose**: Provides real-time debug information about:
  - Current session state
  - Environment variables (masked)
  - OAuth configuration
  - Cookie analysis
  - Redirect loop indicators
  - Recommendations for fixes

### 4. Fixed Environment Variables
Updated `.env.local`:
```env
# Added for NextAuth v5 compatibility
AUTH_SECRET="[REDACTED - Generate new secret with: openssl rand -base64 32]"
AUTH_URL="https://subpilot-app.vercel.app"

# Updated to match actual deployment URL
NEXTAUTH_URL="https://subpilot-app.vercel.app"
```

## Testing Instructions

1. **Check Debug Endpoint**: Visit `https://subpilot-app.vercel.app/api/auth/debug-redirect-loop` to see current auth state

2. **Test OAuth Flow**:
   - Open browser developer tools (Network tab)
   - Clear all cookies for the domain
   - Try logging in with Google/GitHub
   - Watch for redirect patterns in the Network tab

3. **Monitor Logs**: Check Vercel function logs for debug output from middleware and auth-edge

## Permanent Fix (After Testing)

Once login works with middleware auth disabled:

1. **Re-enable Middleware Auth**: Uncomment the auth check code in `src/middleware.ts`

2. **Update Middleware Matcher** (if needed):
```typescript
export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

3. **Consider Alternative Approaches**:
   - Move auth checks to API routes instead of middleware
   - Use a lighter session check in Edge Runtime
   - Implement auth checks only for specific protected routes

## Environment Variable Best Practices

1. **For Vercel Deployments**:
   - Use the Vercel dashboard to set environment variables
   - AUTH_URL should match the deployment URL exactly
   - Include both AUTH_* and NEXTAUTH_* variants for compatibility

2. **OAuth Provider Configuration**:
   - Ensure callback URLs in Google/GitHub match the deployment URL
   - Format: `https://your-deployment-url.vercel.app/api/auth/callback/[provider]`

## Additional Notes

- The middleware already correctly excludes `/api/auth/*` paths from processing
- The auth configuration supports multiple environment variable fallbacks
- Debug logging is comprehensive and will help identify any remaining issues

## Next Steps

1. Test the OAuth flow with the current changes
2. Monitor the debug logs to understand the redirect pattern
3. Once the issue is identified, implement the permanent fix
4. Remove debug logging and re-enable middleware auth checks
5. Update this documentation with the final solution