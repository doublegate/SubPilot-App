// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn:
    SENTRY_DSN ??
    'https://0e749c029e9ce36639df7a5326835d33@o4509622716399616.ingest.us.sentry.io/4509623741251584',

  // Set tracesSampleRate to 1.0 to capture 100%
  // of the transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture 100% of the transactions for performance monitoring in development
  // Reduce in production to save quota
  replaysOnErrorSampleRate: 1.0,

  // Capture 10% of all sessions for replay in production
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // You can remove this option if you're not planning to use the Sentry webpack plugin for uploading source maps.
  debug: process.env.NODE_ENV === 'development',

  integrations: [
    // Use the new v9 functional integration API
    Sentry.replayIntegration({
      // Additional SDK configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
    // Browser tracing is now automatic in Next.js, but we can add custom options
    Sentry.browserTracingIntegration(),
  ],

  // Filter out common noise
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLED) {
      return null;
    }

    // Filter out specific errors
    if (event.exception) {
      const error = hint.originalException as Error;

      // Filter out network errors
      if (error?.message?.includes('Network request failed')) {
        return null;
      }

      // Filter out ResizeObserver errors (common browser quirk)
      if (error?.message?.includes('ResizeObserver loop limit exceeded')) {
        return null;
      }
    }

    return event;
  },

  // Set environment
  environment: process.env.NODE_ENV,

  // Set release version
  release: process.env.npm_package_version ?? '1.8.0',

  // Additional tags
  initialScope: {
    tags: {
      component: 'client',
    },
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
