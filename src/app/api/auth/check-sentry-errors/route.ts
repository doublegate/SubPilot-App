import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Check if Sentry is capturing OAuth errors
export async function GET() {
  try {
    const sentryStatus = {
      isInitialized: !!Sentry.getCurrentScope(),
      dsn: process.env.SENTRY_DSN ? 'configured' : 'not-configured',
      environment: process.env.NODE_ENV,
      isCapturing: !!process.env.SENTRY_DSN && process.env.NODE_ENV === 'production',
    };

    // Test Sentry by capturing a test event
    if (sentryStatus.isCapturing) {
      Sentry.captureMessage('OAuth diagnostic test - checking if Sentry is working', 'info');
      
      // Also capture a breadcrumb
      Sentry.addBreadcrumb({
        message: 'OAuth configuration diagnostic',
        category: 'auth',
        level: 'info',
        data: {
          hasGoogleOAuth: !!process.env.GOOGLE_CLIENT_ID,
          hasGitHubOAuth: !!process.env.GITHUB_CLIENT_ID,
          emptyStrings: {
            google: process.env.GOOGLE_CLIENT_ID === '',
            github: process.env.GITHUB_CLIENT_ID === '',
          },
        },
      });
    }

    // Check for recent OAuth-related errors in console
    const diagnosticInfo = {
      sentryStatus,
      authRelatedChecks: {
        hasAuthErrors: false, // Would need to query Sentry API for this
        recommendation: 'Check Sentry dashboard for auth-related errors',
      },
      configurationHints: {
        emptyStringWarning: 'Empty string env vars are treated as undefined by env.js',
        providerWarning: 'Providers are only added if both CLIENT_ID and CLIENT_SECRET exist',
        redirectWarning: 'Configuration error usually means requested provider is not in providers array',
      },
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...diagnosticInfo,
      message: sentryStatus.isCapturing ? 
        'Test event sent to Sentry - check your Sentry dashboard' : 
        'Sentry not configured for error tracking',
    });
  } catch (error) {
    console.error('Sentry check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check Sentry',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}