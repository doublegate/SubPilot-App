# OAuth Debugging Guide

## Diagnostic Endpoints Created

1. **Full Diagnostic**: `/api/auth/full-diagnostic`
   - Comprehensive check of all OAuth-related configuration
   - Provides recommendations based on findings

2. **Environment Validation**: `/api/auth/diagnose-env-validation`
   - Checks if env validation is stripping out OAuth credentials
   - Compares raw process.env vs validated env

3. **OAuth Flow Check**: `/api/auth/check-oauth-flow`
   - Tests NextAuth endpoints
   - Checks provider configuration

4. **Direct Provider Test**: `/api/auth/test-providers`
   - Tests creating providers without env validation
   - Checks if NextAuth can be instantiated

5. **Raw OAuth Test**: `/api/auth/test-raw-oauth`
   - Completely bypasses env validation
   - Direct provider creation test

## Changes Made

1. **Updated `src/lib/auth-providers.ts`**:
   - Added fallback to process.env if validated env is empty
   - Added console logging for debugging
   - Added trim() checks for empty strings

2. **Updated `src/server/auth.config.ts`**:
   - Added fallback to process.env for OAuth providers
   - Enhanced debug logging to show both env and process.env values

## Common Issues & Solutions

### Issue 1: Empty String Environment Variables
The env validation has `emptyStringAsUndefined: true`, which means empty strings are converted to undefined.

**Solution**: Check if your Vercel environment variables are set to empty strings instead of being properly populated.

### Issue 2: Environment Validation Blocking
The t3-env validation might be too strict or misconfigured.

**Solution**: The code now falls back to process.env if the validated env is empty.

### Issue 3: NextAuth Configuration
NextAuth might not be properly initialized with the providers.

**Solution**: Check the `/api/auth/providers` endpoint to see if providers are registered.

## Next Steps

1. **Deploy these changes** to Vercel
2. **Visit `/api/auth/full-diagnostic`** to get a comprehensive report
3. **Check Vercel Environment Variables**:
   - Make sure they're not empty strings
   - Ensure no trailing/leading whitespace
   - Verify the values match your OAuth app settings

4. **If OAuth still doesn't work**, check:
   - OAuth app redirect URIs (should include `https://your-domain.vercel.app/api/auth/callback/google`)
   - OAuth app is not in test mode (for Google)
   - OAuth app has proper permissions

5. **Check the logs** in Vercel Functions tab for any server-side errors

## Temporary Workaround

If you need OAuth working immediately, you can:
1. Set `SKIP_ENV_VALIDATION=true` in Vercel environment variables
2. This will bypass the env validation entirely

## Testing OAuth Directly

Visit `/api/auth/test-direct-oauth/signin` to test OAuth with a minimal configuration that bypasses all validation.