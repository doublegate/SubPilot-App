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
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = api.subscriptions.getStats.useQuery();
  const {
    data: subscriptionsData,
    isLoading: subsLoading,
    refetch: refetchSubscriptions,
  } = api.subscriptions.getAll.useQuery({
    limit: 6,
    status: 'active', // Only show active subscriptions on dashboard
    sortBy: 'nextBilling',
    sortOrder: 'asc',
  });
  const {
    data: plaidItems,
    isLoading: plaidLoading,
    refetch: refetchPlaid,
  } = api.plaid.getAccounts.useQuery();
  const { data: notificationData, refetch: refetchNotifications } =
    api.notifications.getUnreadCount.useQuery();

  // Fetch analytics data for enhanced dashboard with proper typing
  const { data: insights, isLoading: insightsLoading } =
    api.analytics.getSubscriptionInsights.useQuery() as {
      data:
        | {
            totalActive: number;
            unusedCount: number;
            averageSubscriptionAge: number;
            priceIncreaseCount: number;
            insights: Array<{
              type: string;
              title: string;
              message: string;
              subscriptions?: Array<{
                id: string;
                name: string;
                amount: number;
              }>;
            }>;
          }
        | undefined;
      isLoading: boolean;
    };
  const { data: renewals, isLoading: renewalsLoading } =
    api.analytics.getUpcomingRenewals.useQuery({
      days: 30,
    }) as {
      data: { totalCount: number } | undefined;
      isLoading: boolean;
    };
  const { data: overview, isLoading: overviewLoading } =
    api.analytics.getSpendingOverview.useQuery({
      timeRange: 'month',
    }) as {
      data:
        | {
            subscriptionPercentage: number;
            categoryBreakdown: Array<{
              category: string;
              amount: number;
              percentage: number;
            }>;
          }
        | undefined;
      isLoading: boolean;
    };
  const { data: trends, isLoading: trendsLoading } =
    api.analytics.getSpendingTrends.useQuery({
      timeRange: 'quarter',
      groupBy: 'month',
    }) as {
      data: Array<{ total: number }> | undefined;
      isLoading: boolean;
    };

  // Mutations
  const syncMutation = api.plaid.syncTransactions.useMutation({
    onSuccess: data => {
      toast.success(data.message);
      void refetchPlaid();
      router.refresh();
    },
    onError: error => {
      toast.error('Failed to sync: ' + error.message);
    },
  });

  const generateMockData = api.plaid.generateMockData.useMutation({
    onSuccess: async data => {
      toast.success(data.message);
      // Run detection immediately after generating mock data
      const detectionResult = await detectSubscriptions.mutateAsync({});
      if (detectionResult.created > 0) {
        toast.success(
          `Detected ${detectionResult.created} subscriptions from mock data!`
        );
      }
      // Refetch all data
      await Promise.all([
        refetchStats(),
        refetchSubscriptions(),
        refetchPlaid(),
      ]);
    },
    onError: error => {
      toast.error('Failed to generate mock data: ' + error.message);
    },
  });

  // Removed unused mutation - disconnectMutation
  // const disconnectMutation = api.plaid.disconnectAccount.useMutation({
  //   onSuccess: () => {
  //     toast.success('Bank disconnected successfully');
  //     void refetchPlaid();
  //   },
  //   onError: (error) => {
  //     toast.error('Failed to disconnect: ' + error.message);
  //   },
  // });

  // Detect subscriptions after sync
  const detectSubscriptions = api.subscriptions.detectSubscriptions.useMutation(
    {
      onSuccess: async data => {
        if (data.created > 0) {
          toast.success(`Detected ${data.created} new subscriptions!`);
          // Refetch all data to show new subscriptions
          await Promise.all([
            refetchStats(),
            refetchSubscriptions(),
            refetchNotifications(),
          ]);
        } else if (data.detected > 0) {
          toast.info(
            `Analyzed ${data.detected} merchants, but no subscriptions found yet. Keep syncing for better detection!`
          );
        }
      },
      onError: error => {
        toast.error('Failed to detect subscriptions: ' + error.message);
      },
    }
  );

  const handleSync = async (institutionName: string) => {
    const accounts = plaidItems?.filter(
      acc => acc.institution.name === institutionName
    );
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
    const accounts = plaidItems?.filter(
      acc => acc.institution.name === institutionName
    );
    if (!accounts || accounts.length === 0) return;

    const firstAccount = accounts[0];
    if (!firstAccount) return;

    // We need to find the plaid item ID from the accounts
    // For now, we'll need to pass the account ID and let the backend figure it out
    // Institution-based disconnect requires Plaid item management
    toast.info(
      'Use individual account settings to disconnect specific accounts'
    );
  };

  const isLoading =
    statsLoading ||
    subsLoading ||
    plaidLoading ||
    insightsLoading ||
    renewalsLoading ||
    overviewLoading ||
    trendsLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const notifications = notificationData?.count ?? 0;

  // Calculate spending trend from analytics data
  const calculateSpendingTrend = (): number => {
    if (!trends || trends.length < 2) return 0;

    const recent = trends.slice(-2);
    const previous = recent[0];
    const current = recent[1];

    if (!previous || !current) return 0;

    const prevTotal = previous.total;
    const currentTotal = current.total;

    if (prevTotal === 0) return 0;

    return ((currentTotal - prevTotal) / prevTotal) * 100;
  };

  const dashboardStats = {
    totalActive: stats?.totalActive ?? 0,
    monthlySpend: stats?.monthlySpend ?? 0,
    yearlySpend: stats?.yearlySpend ?? 0,
    percentageChange: calculateSpendingTrend(),
    upcomingRenewals: renewals?.totalCount ?? 0,
    unusedSubscriptions: insights?.unusedCount ?? 0,
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
          <button
            onClick={() => router.push('/notifications')}
            className="flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2 text-sm text-cyan-700 transition-colors hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 dark:hover:bg-cyan-900/30"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
            </span>
            {notifications} New Notification{notifications !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Stats Overview */}
      <DashboardStats stats={dashboardStats} />

      {/* Bank Connections */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Bank Connections</h2>
          {plaidItems && plaidItems.length > 0 && (
            <button
              onClick={() => generateMockData.mutate()}
              disabled={generateMockData.isPending}
              className="text-sm text-accent-600 hover:text-accent-700 disabled:opacity-50"
            >
              {generateMockData.isPending
                ? 'Generating...'
                : 'Generate Test Data'}
            </button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plaidItems && plaidItems.length > 0 ? (
            <>
              {/* Group accounts by institution */}
              {Object.entries(
                plaidItems.reduce(
                  (acc, account) => {
                    const instName = account.institution.name;
                    acc[instName] ??= [];
                    acc[instName].push(account);
                    return acc;
                  },
                  {} as Record<string, typeof plaidItems>
                )
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
                  <h3 className="mb-2 text-lg font-semibold">
                    Add another bank
                  </h3>
                  <PlaidLinkButton className="mt-2" />
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-full flex items-center justify-center rounded-lg border-2 border-dashed p-8">
              <div className="text-center">
                <h3 className="mb-2 text-lg font-semibold">
                  No banks connected
                </h3>
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
          <div className="flex items-center gap-4">
            {plaidItems && plaidItems.length > 0 && (
              <button
                onClick={() => detectSubscriptions.mutate({})}
                disabled={detectSubscriptions.isPending}
                className="text-sm text-cyan-600 hover:text-cyan-700 disabled:opacity-50"
              >
                {detectSubscriptions.isPending
                  ? 'Detecting...'
                  : 'Detect Subscriptions'}
              </button>
            )}
            <a
              href="/subscriptions"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              View all →
            </a>
          </div>
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
              category: sub.category ?? undefined,
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

      {/* Insights and Alerts */}
      {insights?.insights && insights.insights.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Insights & Recommendations
            </h2>
            <a
              href="/analytics"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              View all analytics →
            </a>
          </div>
          <div className="space-y-4">
            {insights.insights.slice(0, 2).map(
              (
                insight: {
                  type: string;
                  title: string;
                  message: string;
                  subscriptions?: Array<{
                    id: string;
                    name: string;
                    amount: number;
                  }>;
                },
                index: number
              ) => (
                <div
                  key={index}
                  className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-4 dark:border-yellow-900 dark:bg-yellow-900/10"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/20">
                      {insight.type === 'unused' ? (
                        <svg
                          className="h-4 w-4 text-yellow-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.662-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4 text-yellow-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {insight.message}
                      </p>
                      {insight.type === 'unused' && insight.subscriptions && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">
                            Potential monthly savings:
                          </p>
                          <p className="text-lg font-bold text-green-600">
                            $
                            {insight.subscriptions
                              .reduce((sum, sub) => sum + sub.amount, 0)
                              .toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Quick Analytics Summary */}
      {overview && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Spending Overview</h2>
            <a
              href="/analytics"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              View detailed analytics →
            </a>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Subscription vs Total
                  </p>
                  <p className="text-2xl font-bold">
                    {overview?.subscriptionPercentage ?? 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    of spending is subscriptions
                  </p>
                </div>
              </div>
            </div>

            {overview?.categoryBreakdown?.slice(0, 2).map((category, index) => (
              <div key={category.category} className="rounded-lg border p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 rounded-lg bg-purple-100 p-2 dark:bg-purple-900/20">
                    <svg
                      className="h-5 w-5 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      Top Category
                      <sup className="ml-1 text-xs font-normal">
                        {index + 1}
                      </sup>
                    </p>
                    <p className="text-lg font-bold">{category.category}</p>
                    <p className="text-sm text-muted-foreground">
                      ${category.amount.toFixed(2)}/mo (
                      {category.percentage.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
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
