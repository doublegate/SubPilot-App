'use client';

import { SessionProvider } from 'next-auth/react';
import { AssistantToggleWithListener } from '@/components/assistant';

export function DashboardProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      {children}
      <AssistantToggleWithListener />
    </SessionProvider>
  );
}
