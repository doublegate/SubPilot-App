import '@/styles/globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { type Metadata, type Viewport } from 'next';
import { Toaster } from 'sonner';

import { TRPCReactProvider } from '@/trpc/react';
import { ThemeProvider } from '@/components/theme-provider';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';

export const metadata: Metadata = {
  title: {
    default: 'SubPilot - Track Your Subscriptions',
    template: '%s | SubPilot',
  },
  description:
    'Your command center for recurring finances. Monitor, manage, and cancel subscriptions automatically.',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SubPilot',
  },
  other: {
    'theme-color': '#06B6D4',
    'color-scheme': 'light dark',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        <link rel="dns-prefetch" href="https://cdn.plaid.com" />
      </head>
      <body className="font-sans">
        <a
          href="#main-content"
          className="text-primary-foreground sr-only rounded-md bg-primary px-4 py-2 focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <ServiceWorkerRegistration />
            {children}
            <Analytics />
            <SpeedInsights />
            <Toaster
              richColors
              position="top-center"
              className="md:bottom-right"
            />
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
