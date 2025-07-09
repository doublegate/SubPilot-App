import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { api } from '@/trpc/server';
import { AdminSidebar } from './admin-sidebar';

// Force Node.js runtime for admin pages to support Node.js APIs
// This fixes Edge Runtime incompatibility issues with admin panel features
export const runtime = 'nodejs';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Check if user is admin
  const user = await api.auth.getCurrentUser();

  if (!user?.isAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-full">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
