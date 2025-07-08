import { redirect } from 'next/navigation';
import { getServerAuthSession } from '@/server/auth';
import { NavHeader } from '@/components/layout/nav-header';

export default async function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <>
      <NavHeader />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
    </>
  );
}
