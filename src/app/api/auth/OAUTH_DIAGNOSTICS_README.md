# OAuth Configuration Diagnostics

## Issue Description
OAuth buttons appear in the UI but clicking them results in "Configuration error" even though environment variables are set in Vercel.

## Root Cause
The most likely cause is that OAuth environment variables are set to **empty strings** in Vercel. Due to the `emptyStringAsUndefined: true` setting in `env.js`, empty strings are treated as undefined, causing the OAuth providers to not be included in the configuration.

## Diagnostic Endpoints

### 1. 🚨 **Full OAuth Diagnostic** (RUN THIS FIRST)
**URL:** `/api/auth/full-oauth-diagnostic`

This comprehensive diagnostic will:
- Check raw environment variables
- Check parsed environment variables
- Verify provider configuration
- Identify critical issues
- Provide clear action items

### 2. Debug OAuth Configuration
**URL:** `/api/auth/debug-oauth`

Shows:
- Raw vs parsed environment variables
- Empty string checks
- Provider inclusion logic

### 3. Debug Providers
**URL:** `/api/auth/debug-providers`

Shows:
- Currently configured providers
- Provider details and structure
- NextAuth configuration status

### 4. Test OAuth Flow
**URL:** `/api/auth/test-oauth-flow`

Tests:
- CSRF token configuration
- Common Auth.js errors
- URL configuration

### 5. Diagnose Configuration Error
**URL:** `/api/auth/diagnose-config-error`

Provides:
- Deep provider analysis
- Configuration error scenarios
- Specific recommendations

### 6. Check Sentry Errors
**URL:** `/api/auth/check-sentry-errors`

Checks if Sentry is capturing OAuth-related errors.

## Quick Solution

If the diagnostics show empty string issues:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find these variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
3. **DELETE** any OAuth variables you're not using (don't leave them empty)
4. For OAuth providers you want to use, ensure they have proper values
5. Redeploy your application

## Enhanced Logging

The following components have been updated with debug logging:
- `/src/server/auth.config.ts` - Logs provider configuration on startup
- `/src/components/auth/oauth-button.tsx` - Logs button clicks and signin attempts

Check your Vercel Function Logs to see these debug messages.

## Testing After Fix

After fixing the environment variables:
1. Redeploy your application
2. Check `/api/auth/full-oauth-diagnostic` - should show no critical issues
3. Test OAuth login - should redirect to provider instead of showing "Configuration error"