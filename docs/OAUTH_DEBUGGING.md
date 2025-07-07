# OAuth Configuration Debugging Guide

## Issue
OAuth authentication shows "Configuration" error even after environment variables are set in Vercel.

## Root Cause Analysis

The issue occurs when environment variables are set in Vercel but not properly loaded by the application. This can happen due to:

1. **Empty String Values**: The env.js configuration has `emptyStringAsUndefined: true`, which means empty string values are treated as undefined
2. **Direct process.env Access**: Some parts of the code were using `process.env` directly instead of the validated `env` object
3. **Build vs Runtime**: Environment variables need to be available at both build time and runtime

## Solutions Applied

### 1. Use Validated Environment Object

Updated `auth-providers.ts` and `auth.config.ts` to use the validated `env` object instead of `process.env`:

```typescript
// Before
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push('google');
}

// After
import { env } from '@/env';
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push('google');
}
```

### 2. Debug Endpoint

Created `/api/debug-env` endpoint to check which environment variables are actually available in production.

## Vercel Configuration Checklist

1. **Environment Variables Format**:
   - Ensure NO quotes around values in Vercel dashboard
   - Ensure NO trailing spaces
   - Example: `GOOGLE_CLIENT_ID` should be `123456789.apps.googleusercontent.com` not `"123456789.apps.googleusercontent.com"`

2. **Required Variables**:
   ```
   GOOGLE_CLIENT_ID=your-actual-client-id
   GOOGLE_CLIENT_SECRET=your-actual-secret
   GITHUB_CLIENT_ID=your-actual-client-id
   GITHUB_CLIENT_SECRET=your-actual-secret
   NEXTAUTH_URL=https://subpilot.app
   NEXTAUTH_SECRET=your-generated-secret
   ```

3. **Deployment**:
   - After adding/updating environment variables, you MUST redeploy
   - Go to Vercel Dashboard → Deployments → Redeploy

4. **Verification Steps**:
   - Visit `/api/debug-env` to check if variables are loaded
   - Check if OAuth buttons appear on `/login`
   - Test OAuth flow

## Common Issues

### Issue: Variables show as empty or undefined
- **Solution**: Check for trailing spaces or quotes in Vercel dashboard
- **Solution**: Ensure variables are set for the correct environment (Production/Preview/Development)

### Issue: NEXTAUTH_URL mismatch
- **Solution**: Must match your production URL exactly: `https://subpilot.app`
- **Solution**: No trailing slash

### Issue: OAuth redirect URI mismatch
- **Solution**: Update OAuth provider settings:
  - Google: Add `https://subpilot.app/api/auth/callback/google`
  - GitHub: Set callback URL to `https://subpilot.app/api/auth/callback/github`

## Testing

1. Deploy the updated code
2. Visit `/api/debug-env` (when logged out) to verify environment variables
3. Check `/login` page - OAuth buttons should appear
4. Test OAuth login flow

## Additional Notes

- The `env.js` validation ensures type safety but can cause issues if values are empty strings
- Using the validated `env` object ensures consistency across the application
- Environment variables in Vercel are encrypted and only available at runtime