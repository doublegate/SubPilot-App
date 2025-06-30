import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BillingSettings } from '@/components/billing/billing-settings';
import { UsageMetrics } from '@/components/billing/usage-metrics';
import { PricingTable } from '@/components/billing/pricing-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Billing & Subscription</h3>
        <p className="text-sm text-muted-foreground">
          Manage your subscription, billing, and usage limits.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="upgrade">Upgrade</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Suspense
            fallback={
              <div className="space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <BillingSettings />
          </Suspense>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage & Limits</CardTitle>
              <CardDescription>
                Monitor your usage against your plan limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                  </div>
                }
              >
                <UsageMetrics />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upgrade" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Plan</CardTitle>
              <CardDescription>
                Upgrade your plan to unlock premium features and remove limits
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <Suspense
                fallback={
                  <div className="grid gap-8 lg:grid-cols-3 p-6">
                    <Skeleton className="h-96" />
                    <Skeleton className="h-96" />
                    <Skeleton className="h-96" />
                  </div>
                }
              >
                <div className="w-full overflow-x-auto p-6">
                  <PricingTable />
                </div>
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
