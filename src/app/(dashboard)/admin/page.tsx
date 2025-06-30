import { Suspense } from 'react';
import { api } from '@/trpc/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  CreditCard,
  Activity,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Building,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

async function AdminStats() {
  // Get various stats
  const [userCount, activeSubscriptions, totalRevenue, systemHealth] =
    await Promise.all([
      api.admin.getUserCount(),
      api.admin.getActiveSubscriptionCount(),
      api.admin.getTotalRevenue(),
      api.admin.getSystemHealth(),
    ]);

  const stats = [
    {
      title: 'Total Users',
      value: userCount.toLocaleString(),
      description: 'Registered accounts',
      icon: Users,
      trend: '+12%',
      href: '/admin/users',
    },
    {
      title: 'Active Subscriptions',
      value: activeSubscriptions.toLocaleString(),
      description: 'Paid subscriptions',
      icon: CreditCard,
      trend: '+8%',
      href: '/admin/billing',
    },
    {
      title: 'Monthly Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      description: 'Current month',
      icon: DollarSign,
      trend: '+23%',
      href: '/admin/billing',
    },
    {
      title: 'System Health',
      value: `${systemHealth}%`,
      description: 'All systems operational',
      icon: Activity,
      trend: 'Stable',
      href: '/admin/system',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map(stat => (
        <Link key={stat.title} href={stat.href}>
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <span className="flex items-center text-xs text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {stat.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

async function RecentActivity() {
  const recentEvents = await api.admin.getRecentEvents();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest system events and user actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentEvents.map(event => (
            <div key={event.id} className="flex items-start space-x-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                {event.type === 'user' && <Users className="h-4 w-4" />}
                {event.type === 'billing' && <CreditCard className="h-4 w-4" />}
                {event.type === 'system' && <Shield className="h-4 w-4" />}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-sm text-muted-foreground">
                  {event.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

async function SystemAlerts() {
  const alerts = await api.admin.getSystemAlerts();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <AlertCircle className="h-5 w-5" />
          System Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className="rounded-lg border border-orange-200 bg-white p-3 dark:border-orange-800 dark:bg-gray-900"
            >
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-sm text-muted-foreground">{alert.message}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor and manage your SubPilot application
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        }
      >
        <AdminStats />
      </Suspense>

      <div className="grid gap-8 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <RecentActivity />
        </Suspense>

        <div className="space-y-8">
          <Suspense fallback={<Skeleton className="h-48" />}>
            <SystemAlerts />
          </Suspense>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Link
                  href="/admin/users/new"
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Add New User</p>
                    <p className="text-sm text-muted-foreground">
                      Create a new user account
                    </p>
                  </div>
                </Link>

                <Link
                  href="/admin/billing/plans"
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Manage Pricing Plans</p>
                    <p className="text-sm text-muted-foreground">
                      Update subscription tiers and pricing
                    </p>
                  </div>
                </Link>

                <Link
                  href="/admin/plaid"
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Configure Plaid</p>
                    <p className="text-sm text-muted-foreground">
                      Manage bank integration settings
                    </p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
