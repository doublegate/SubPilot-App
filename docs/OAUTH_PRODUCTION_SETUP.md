# OAuth Production Setup Guide

This guide explains how to properly configure OAuth authentication for SubPilot in production.

## Problem

Getting the error "Configuration" when trying to use OAuth login means the OAuth credentials are not properly set in the production environment.

## Solution Steps

### 1. Add Environment Variables to Vercel

Go to your Vercel dashboard → SubPilot project → Settings → Environment Variables

Add these variables:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth  
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# NextAuth.js Configuration
NEXTAUTH_URL=https://subpilot.app
NEXTAUTH_SECRET=your-nextauth-secret-key
```

**Important**: 
- Use the exact same values from your `.env.local` file
- NEXTAUTH_URL must be your production URL (https://subpilot.app)
- Generate a secure NEXTAUTH_SECRET using: `openssl rand -base64 32`

### 2. Update OAuth Provider Settings

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Credentials"
4. Click on your OAuth 2.0 Client ID
5. Add to "Authorized redirect URIs":
   ```
   https://subpilot.app/api/auth/callback/google
   ```
6. Save the changes

#### GitHub OAuth Setup

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Select your OAuth App
3. Update "Authorization callback URL" to:
   ```
   https://subpilot.app/api/auth/callback/github
   ```
4. Save the changes

### 3. Redeploy on Vercel

After adding the environment variables:

1. Go to your Vercel dashboard
2. Navigate to your SubPilot project
3. Go to the "Deployments" tab
4. Click the three dots on the latest deployment
5. Select "Redeploy"

### 4. Verify Configuration

After redeployment, verify OAuth is working:

1. Visit https://subpilot.app/login
2. OAuth buttons should appear (not the "OAuth Not Configured" message)
3. Clicking buttons should redirect to Google/GitHub login pages
4. After authorization, you should be redirected back to SubPilot

## Troubleshooting

### OAuth buttons not showing

If OAuth buttons don't appear:
- Check that environment variables are set in Vercel (not just in .env.local)
- Ensure you redeployed after adding environment variables
- Check browser console for any errors

### Redirect URI mismatch error

If you get a redirect URI mismatch:
- Double-check the callback URLs in Google/GitHub match exactly
- Ensure no trailing slashes
- Verify NEXTAUTH_URL is set to your production URL

### Still getting Configuration error

1. Check Vercel function logs:
   - Vercel dashboard → Functions tab → Check for errors
2. Verify all 4 required variables are set:
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET  
   - GITHUB_CLIENT_ID
   - GITHUB_CLIENT_SECRET

## Security Notes

- Never commit OAuth credentials to your repository
- Use different OAuth apps for development and production
- Regularly rotate your NEXTAUTH_SECRET
- Keep OAuth credentials in a secure password manager

## Service Worker Updates

The service worker has been updated to skip caching Vercel analytics scripts, which should resolve the console errors about failed fetches for `/_vercel/` paths.