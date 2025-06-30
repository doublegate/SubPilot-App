import { Suspense } from 'react';
import { api } from '@/trpc/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StripeConfigCard } from '@/components/admin/stripe-config-card';
import { PlanManagement } from '@/components/admin/plan-management';
import { BillingStats } from '@/components/admin/billing-stats';
import { RevenueChart } from '@/components/admin/revenue-chart';
import Link from 'next/link';
import { 
  CreditCard, 
  Settings, 
  BarChart3, 
  Receipt, 
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

async function BillingOverview() {
  const stats = await api.admin.getBillingStats();
  
  return (
    <div className="space-y-6">
      <BillingStats stats={stats} />
      
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart />
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest subscription payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{tx.userEmail}</p>
                    <p className="text-sm text-muted-foreground">
                      {tx.plan} - {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${tx.amount}</p>
                    <p className="text-sm text-muted-foreground">{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing Management</h1>
        <p className="mt-2 text-muted-foreground">
          Configure Stripe billing and manage subscription plans
        </p>
      </div>

      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-5 w-5" />
            Stripe Test Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            You are currently using Stripe in test mode. Remember to switch to live mode before launching.
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Stripe Dashboard
              </Button>
            </a>
            <Link href="/admin/api-keys">
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Configure API Keys
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Suspense
            fallback={
              <div className="space-y-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-96" />
              </div>
            }
          >
            <BillingOverview />
          </Suspense>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <PlanManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <StripeConfigCard />
          
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Configure Stripe webhooks for real-time updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Webhook Endpoint</p>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Required Events</p>
                  <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                    <li>• customer.subscription.created</li>
                    <li>• customer.subscription.updated</li>
                    <li>• customer.subscription.deleted</li>
                    <li>• invoice.payment_succeeded</li>
                    <li>• invoice.payment_failed</li>
                  </ul>
                </div>
                
                <a
                  href="https://dashboard.stripe.com/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Configure in Stripe
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}