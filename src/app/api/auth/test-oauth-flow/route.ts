import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Test OAuth flow and check for configuration errors
export async function GET() {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    // Import auth handlers
    const { handlers } = await import('@/server/auth.config');

    // Check if handlers are properly configured
    const handlerChecks = {
      hasHandlers: !!handlers,
      hasGET: !!handlers?.GET,
      hasPOST: !!handlers?.POST,
    };

    // Check CSRF token generation (Auth.js requirement)
    const csrfCheck = {
      hasAuthUrl: !!process.env.NEXTAUTH_URL,
      authUrl: process.env.NEXTAUTH_URL || 'not-set',
      computedUrl: baseUrl,
      urlsMatch: process.env.NEXTAUTH_URL === baseUrl,
    };

    // Check for common Auth.js configuration errors
    const configErrors = [];

    // Error: Missing NEXTAUTH_SECRET in production
    if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
      configErrors.push('NEXTAUTH_SECRET is required in production');
    }

    // Error: NEXTAUTH_URL mismatch
    if (
      process.env.NEXTAUTH_URL &&
      !process.env.NEXTAUTH_URL.startsWith('http')
    ) {
      configErrors.push(
        'NEXTAUTH_URL must be a valid URL starting with http:// or https://'
      );
    }

    // Error: Empty string OAuth credentials
    const oauthChecks = {
      googleClientIdEmpty: process.env.GOOGLE_CLIENT_ID === '',
      googleSecretEmpty: process.env.GOOGLE_CLIENT_SECRET === '',
      githubClientIdEmpty: process.env.GITHUB_CLIENT_ID === '',
      githubSecretEmpty: process.env.GITHUB_CLIENT_SECRET === '',
    };

    if (oauthChecks.googleClientIdEmpty || oauthChecks.googleSecretEmpty) {
      configErrors.push(
        'Google OAuth credentials are empty strings (should be undefined if not set)'
      );
    }

    if (oauthChecks.githubClientIdEmpty || oauthChecks.githubSecretEmpty) {
      configErrors.push(
        'GitHub OAuth credentials are empty strings (should be undefined if not set)'
      );
    }

    // Test provider URLs
    const providerUrls = {
      googleAuthUrl: `${baseUrl}/api/auth/signin/google`,
      githubAuthUrl: `${baseUrl}/api/auth/signin/github`,
      callbackUrl: `${baseUrl}/api/auth/callback`,
    };

    // Sentry check
    const sentryCheck = {
      hasDSN: !!process.env.SENTRY_DSN,
      isCapturingErrors:
        !!process.env.SENTRY_DSN && process.env.NODE_ENV === 'production',
    };

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      baseUrl,
      handlerChecks,
      csrfCheck,
      oauthChecks,
      configErrors,
      providerUrls,
      sentryCheck,
      recommendations: [
        configErrors.length === 0
          ? 'No configuration errors detected'
          : 'Fix the configuration errors above',
        oauthChecks.googleClientIdEmpty || oauthChecks.googleSecretEmpty
          ? 'Remove Google OAuth env vars from Vercel if not using Google OAuth'
          : null,
        oauthChecks.githubClientIdEmpty || oauthChecks.githubSecretEmpty
          ? 'Remove GitHub OAuth env vars from Vercel if not using GitHub OAuth'
          : null,
        !csrfCheck.urlsMatch
          ? 'Ensure NEXTAUTH_URL matches your deployment URL'
          : null,
      ].filter(Boolean),
    };

    console.log('=== OAuth Flow Test ===');
    console.log(JSON.stringify(diagnostics, null, 2));
    console.log('=====================');

    return NextResponse.json(diagnostics);
  } catch (error) {
    console.error('OAuth flow test error:', error);
    return NextResponse.json(
      {
        error: 'Failed to test OAuth flow',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
