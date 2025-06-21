'use client';

import { DashboardStats } from '@/components/dashboard-stats';
import { SubscriptionList } from '@/components/subscription-list';
import { BankConnectionCard } from '@/components/bank-connection-card';
import { PlaidLinkButton } from '@/components/plaid-link-button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Fetch all data
  const { data: stats, isLoading: statsLoading } = api.subscriptions.getStats.useQuery();
  const { data: subscriptionsData, isLoading: subsLoading } = api.subscriptions.getAll.useQuery({ limit: 6 });
  const { data: plaidItems, isLoading: plaidLoading, refetch: refetchPlaid } = api.plaid.getAccounts.useQuery();
  const { data: notificationData } = api.notifications.getUnreadCount.useQuery();

  // Mutations
  const syncMutation = api.plaid.syncTransactions.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchPlaid();
      router.refresh();
    },
    onError: (error) => {
      toast.error('Failed to sync: ' + error.message);
    },
  });

  const disconnectMutation = api.plaid.disconnectAccount.useMutation({
    onSuccess: () => {
      toast.success('Bank disconnected successfully');
      refetchPlaid();
    },
    onError: (error) => {
      toast.error('Failed to disconnect: ' + error.message);
    },
  });

  // Detect subscriptions after sync
  const detectSubscriptions = api.subscriptions.detectSubscriptions.useMutation({
    onSuccess: (data) => {
      if (data.created > 0) {
        toast.success(`Detected ${data.created} new subscriptions!`);
        router.refresh();
      }
    },
  });

  const handleSync = async (institutionName: string) => {
    const accounts = plaidItems?.filter(acc => acc.institution.name === institutionName);
    if (!accounts || accounts.length === 0) return;

    // Find the plaid item ID (all accounts from same institution share the same plaid item)
    const plaidItemId = accounts[0]?.id;
    if (!plaidItemId) return;

    // First sync transactions
    const result = await syncMutation.mutateAsync({});
    
    // Then detect subscriptions from the new transactions
    if (result.totalNewTransactions > 0) {
      await detectSubscriptions.mutateAsync({});
    }
  };

  const handleDisconnect = async (institutionName: string) => {
    const accounts = plaidItems?.filter(acc => acc.institution.name === institutionName);
    if (!accounts || accounts.length === 0) return;

    const firstAccount = accounts[0];
    if (!firstAccount) return;

    // We need to find the plaid item ID from the accounts
    // For now, we'll need to pass the account ID and let the backend figure it out
    // TODO: Update the API to accept institution-based disconnect
    toast.info('Disconnect functionality will be available soon');
  };

  if (statsLoading || subsLoading || plaidLoading) {
    return <DashboardSkeleton />;
  }

  const notifications = notificationData?.count ?? 0;

  // Calculate upcoming renewals (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const upcomingRenewals = subscriptionsData?.subscriptions.filter(sub => {
    if (!sub.nextBilling) return false;
    return new Date(sub.nextBilling) <= thirtyDaysFromNow;
  }).length ?? 0;

  const dashboardStats = {
    totalActive: stats?.totalActive ?? 0,
    monthlySpend: stats?.monthlySpend ?? 0,
    yearlySpend: stats?.yearlySpend ?? 0,
    percentageChange: 0, // TODO: Calculate from historical data
    upcomingRenewals,
    unusedSubscriptions: 0, // TODO: Implement unused subscription detection
  };

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name ?? session?.user?.email}!
            Here&apos;s your subscription overview.
          </p>
        </div>
        {notifications > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2 text-sm text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
            </span>
            {notifications} new notification{notifications !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <DashboardStats stats={dashboardStats} />

      {/* Bank Connections */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Bank Connections</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plaidItems && plaidItems.length > 0 ? (
            <>
              {/* Group accounts by institution */}
              {Object.entries(
                plaidItems.reduce((acc, account) => {
                  const instName = account.institution.name;
                  if (!acc[instName]) {
                    acc[instName] = [];
                  }
                  acc[instName]!.push(account);
                  return acc;
                }, {} as Record<string, typeof plaidItems>)
              ).map(([institutionName, accounts]) => (
                <BankConnectionCard
                  key={institutionName}
                  connection={{
                    id: accounts[0]!.id,
                    institutionName,
                    accountCount: accounts.length,
                    lastSync: accounts[0]!.lastSync,
                    status: 'connected',
                  }}
                  onSync={() => handleSync(institutionName)}
                  onDisconnect={() => handleDisconnect(institutionName)}
                />
              ))}
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed p-8">
                <div className="text-center">
                  <h3 className="mb-2 text-lg font-semibold">Add another bank</h3>
                  <PlaidLinkButton className="mt-2" />
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-full flex items-center justify-center rounded-lg border-2 border-dashed p-8">
              <div className="text-center">
                <h3 className="mb-2 text-lg font-semibold">No banks connected</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Connect your bank account to start tracking subscriptions
                </p>
                <PlaidLinkButton />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Recent Subscriptions */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Active Subscriptions</h2>
          <a
            href="/subscriptions"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            View all →
          </a>
        </div>
        {subscriptionsData && subscriptionsData.subscriptions.length > 0 ? (
          <SubscriptionList
            subscriptions={subscriptionsData.subscriptions.map(sub => ({
              id: sub.id,
              name: sub.name,
              amount: sub.amount,
              currency: sub.currency,
              frequency: sub.frequency as
                | 'monthly'
                | 'yearly'
                | 'weekly'
                | 'quarterly',
              nextBilling: sub.nextBilling,
              status: sub.isActive
                ? ('active' as const)
                : ('cancelled' as const),
              category: sub.category,
            }))}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No subscriptions detected yet. Connect a bank account to get
              started.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      <div>
        <Skeleton className="mb-4 h-7 w-40" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    </div>
  );
}