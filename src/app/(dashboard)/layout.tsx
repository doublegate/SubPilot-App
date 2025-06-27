import { NavHeaderClient } from '@/components/layout/nav-header-client';
import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { DashboardProviders } from './dashboard-providers';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <DashboardProviders>
      <div className="flex min-h-screen flex-col">
        <NavHeaderClient />
        <main id="main-content" className="flex-1">
          <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </DashboardProviders>
  );
}
