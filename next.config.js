/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import('./src/env.js');

// Import Sentry webpack plugin for source maps
import { withSentryConfig } from '@sentry/nextjs';

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    // optimizeCss: true, // Disabled temporarily due to critters module issue
  },
  eslint: {
    // During builds, use external ESLint config (eslint.config.js)
    // This informs Next.js that we're using flat config format
    ignoreDuringBuilds: false,
    // Configure to work with flat config and suppress plugin detection warning
    dirs: ['src'],
    // Suppress the plugin detection warning since we're using flat config
    // This is a known issue with Next.js 15 + ESLint 9 flat config detection
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    domains: [
      'images.unsplash.com',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
    ],
  },
  webpack: (config, { isServer }) => {
    // Suppress critical dependency warnings from OpenTelemetry instrumentation
    if (isServer) {
      config.ignoreWarnings = [
        {
          module: /node_modules\/@opentelemetry\/instrumentation/,
          message: /Critical dependency/,
        },
        {
          module: /node_modules\/@sentry\/node/,
          message: /Critical dependency/,
        },
      ];
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

// Sentry configuration
const sentryConfig = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: !process.env.CI,

  org: process.env.SENTRY_ORG || 'subpilot-app',
  project: process.env.SENTRY_PROJECT || 'subpilot-app',

  // Only upload source maps in production
  dryRun: process.env.NODE_ENV !== 'production',

  // Upload source maps during CI/CD
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Additional options
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: true,
};

// Export the config with Sentry if enabled, otherwise export plain config
export default process.env.SENTRY_DSN
  ? withSentryConfig(config, sentryConfig)
  : config;
