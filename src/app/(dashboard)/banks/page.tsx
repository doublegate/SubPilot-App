import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { api } from '@/trpc/server';
import { BankAccountCard } from '@/components/bank-account-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function BanksPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const plaidItems = await api.plaid.getItems();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connected Banks</h1>
          <p className="text-muted-foreground">
            Manage your connected bank accounts and financial institutions
          </p>
        </div>
        <Button asChild>
          <Link href="/banks/connect">
            <Plus className="mr-2 h-4 w-4" />
            Connect Bank
          </Link>
        </Button>
      </div>

      {plaidItems.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No banks connected</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your bank accounts to start tracking subscriptions
          </p>
          <Button asChild className="mt-4">
            <Link href="/banks/connect">Connect Your First Bank</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plaidItems.map(item => (
            <BankAccountCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
