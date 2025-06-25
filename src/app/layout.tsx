import '@/styles/globals.css';
import { Analytics } from '@vercel/analytics/next';
import { Inter } from 'next/font/google';
import { type Metadata } from 'next';
import { Toaster } from 'sonner';

import { TRPCReactProvider } from '@/trpc/react';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'SubPilot - Track Your Subscriptions',
    template: '%s | SubPilot',
  },
  description:
    'Your command center for recurring finances. Monitor, manage, and cancel subscriptions automatically.',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            {children}
            <Analytics />
            <Toaster richColors position="bottom-right" />
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
