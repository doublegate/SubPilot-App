# OAuth Fix Guide

## Issue 1: Google OAuth Error 400: redirect_uri_mismatch

### Problem
When clicking the Google OAuth button in development, you get:
```
Error 400: redirect_uri_mismatch
```

### Root Cause
The Google OAuth app is not configured with the localhost development URL as an authorized redirect URI.

### Solution

1. **Go to Google Cloud Console**
   - Navigate to: https://console.cloud.google.com/
   - Select your SubPilot project

2. **Add Development Redirect URIs**
   - Go to "APIs & Services" → "Credentials"
   - Click on your OAuth 2.0 Client ID
   - In "Authorized redirect URIs", add:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
   - Click "Save"

3. **Wait for Changes to Propagate**
   - Changes may take a few minutes to take effect
   - Try clearing your browser cache if issues persist

### Alternative: Create Development-Specific OAuth App
For better separation, create a separate OAuth app for development:

1. Create new OAuth 2.0 Client ID named "SubPilot Development"
2. Add only localhost URIs
3. Update your `.env.local` with the development client ID and secret

## Issue 2: GitHub OAuth Hydration Warning

### Problem
When clicking GitHub OAuth, you see a React hydration mismatch warning mentioning:
```
- data-new-gr-c-s-check-loaded="14.1242.0"
- data-gr-ext-installed=""
```

### Root Cause
The Grammarly browser extension injects attributes into the DOM after React hydrates, causing a mismatch between server and client HTML.

### Solutions

#### Option 1: Suppress Hydration Warning (Recommended)
The warning is already suppressed in the code with `suppressHydrationWarning={true}` on the `<html>` tag. This is cosmetic and doesn't affect functionality.

#### Option 2: Disable Grammarly on Localhost
1. Click the Grammarly extension icon
2. Click the power button to disable it for localhost:3000
3. Refresh the page

#### Option 3: Use Incognito Mode
Open the app in an incognito window where extensions are disabled.

### Note
This is NOT a bug in your code. It's a known issue with browser extensions modifying the DOM. The OAuth functionality works correctly despite the warning.

## Verification Steps

1. **Test Google OAuth**:
   - Clear browser cache
   - Navigate to http://localhost:3000/login
   - Click "Continue with Google"
   - Should redirect to Google's consent screen

2. **Test GitHub OAuth**:
   - Navigate to http://localhost:3000/login
   - Click "Continue with GitHub"
   - Should redirect to GitHub's authorization page
   - Ignore the hydration warning in console

## Environment Variables Check

Ensure your `.env.local` has:
```bash
# OAuth Providers
GOOGLE_CLIENT_ID="your-actual-google-client-id"
GOOGLE_CLIENT_SECRET="your-actual-google-client-secret"
GITHUB_CLIENT_ID="your-actual-github-client-id"
GITHUB_CLIENT_SECRET="your-actual-github-client-secret"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
```

## Still Having Issues?

1. Check that OAuth providers are enabled in your Google/GitHub apps
2. Verify client IDs and secrets are correct
3. Ensure `NEXTAUTH_URL` matches your development URL
4. Check browser console for specific error messages
5. Try in a different browser or incognito mode