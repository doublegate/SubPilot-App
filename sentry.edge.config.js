import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of the transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // You can remove this option if you're not planning to use the Sentry webpack plugin for uploading source maps.
  debug: process.env.NODE_ENV === 'development',

  // Edge runtime has limited integrations
  integrations: [],

  // Filter out common noise
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLED) {
      return null;
    }

    return event;
  },

  // Set environment
  environment: process.env.NODE_ENV,

  // Set release version
  release: process.env.npm_package_version || '0.1.8',

  // Additional tags
  initialScope: {
    tags: {
      component: 'edge',
      runtime: 'edge',
    },
  },
});
