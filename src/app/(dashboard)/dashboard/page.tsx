import { Suspense } from "react"
import { DashboardStats } from "@/components/dashboard-stats"
import { SubscriptionList } from "@/components/subscription-list"
import { BankConnectionCard } from "@/components/bank-connection-card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/trpc/server"
import { auth } from "@/server/auth"

async function DashboardContent() {
  // Get session once (layout already ensures auth)
  const session = await auth()
  
  try {
    // Fetch all data in parallel
    const [stats, subscriptions, plaidItems, notificationData] = await Promise.all([
      api.subscriptions.getStats(),
      api.subscriptions.getAll({ limit: 6 }),
      api.plaid.getAccounts(),
      api.notifications.getUnreadCount(),
    ])
    
    const notifications = notificationData.count

    // Calculate upcoming renewals (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    
    const upcomingRenewals = subscriptions.subscriptions.filter(sub => {
      if (!sub.nextBilling) return false
      return new Date(sub.nextBilling) <= thirtyDaysFromNow
    }).length

    const dashboardStats = {
      totalActive: stats.totalActive,
      monthlySpend: stats.monthlySpend,
      yearlySpend: stats.yearlySpend,
      percentageChange: 0, // TODO: Calculate from historical data
      upcomingRenewals,
      unusedSubscriptions: 0, // TODO: Implement unused subscription detection
    }

    return (
      <div className="space-y-8">
        {/* Quick Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {session?.user?.name ?? session?.user?.email}! Here&apos;s your subscription overview.
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
            {plaidItems.length > 0 ? (
              plaidItems.map((item) => (
                <BankConnectionCard
                  key={item.id}
                  connection={{
                    id: item.id,
                    institutionName: item.institutionName,
                    institutionLogo: item.institutionLogo,
                    accountCount: item.accounts.length,
                    lastSync: item.lastSync,
                    status: item.status as "connected" | "error" | "pending",
                    errorMessage: item.errorMessage,
                  }}
                />
              ))
            ) : (
              <BankConnectionCard
                connection={{
                  id: "add-new",
                  institutionName: "Connect Your Bank",
                  accountCount: 0,
                  status: "pending",
                }}
              />
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
          {subscriptions.subscriptions.length > 0 ? (
            <SubscriptionList subscriptions={subscriptions.subscriptions} />
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground">
                No subscriptions detected yet. Connect a bank account to get started.
              </p>
            </div>
          )}
        </section>
      </div>
    )
  } catch (error) {
    console.error("Dashboard error:", error)
    
    // Fallback UI for when data fetching fails
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}!
          </p>
        </div>
        
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Unable to load dashboard data. Please try refreshing the page.
          </p>
        </div>
      </div>
    )
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      
      <div>
        <Skeleton className="mb-4 h-7 w-40" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}