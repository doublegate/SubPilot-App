'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Check, Star, Users, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function BillingPageContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'usage', 'upgrade'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  return (
    <div className="container mx-auto py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Billing & Subscription
          </h1>
          <p className="text-muted-foreground">
            Manage your subscription plan, view usage metrics, and update
            payment information.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="upgrade">Plans</TabsTrigger>
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

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  View your recent transactions and download invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Payment history will be displayed here once you have an active
                  subscription.
                </div>
              </CardContent>
            </Card>
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

            {/* Usage Details */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Details</CardTitle>
                <CardDescription>
                  Detailed breakdown of your feature usage this billing period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Detailed usage metrics will be available here.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upgrade" className="space-y-8">
            {/* Feature Highlights */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">AI-Powered</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Advanced AI assistant that helps you manage, analyze, and
                    optimize your subscriptions automatically.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary" />
                      Smart categorization
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary" />
                      Predictive analytics
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary" />
                      Automated cancellation
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Team Features</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Perfect for families and teams who want to share and manage
                    subscriptions together.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary" />
                      Multi-account support
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary" />
                      Shared analytics
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary" />
                      Admin controls
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Enterprise Ready</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Advanced security, integrations, and support for
                    organizations of any size.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary" />
                      SSO integration
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary" />
                      API access
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary" />
                      Dedicated support
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Pricing Table */}
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Choose Your Plan</CardTitle>
                <CardDescription>
                  All plans include a 14-day free trial. No setup fees. Cancel
                  anytime.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <Suspense
                  fallback={
                    <div className="grid gap-8 p-6 lg:grid-cols-3">
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

            {/* FAQ Section */}
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="mb-2 font-medium">
                      Can I change plans anytime?
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Yes! You can upgrade or downgrade your plan at any time.
                      Changes take effect immediately for upgrades, or at the
                      end of your billing period for downgrades.
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-2 font-medium">
                      What payment methods do you accept?
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      We accept all major credit cards (Visa, MasterCard,
                      American Express) and debit cards through our secure
                      Stripe integration.
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-2 font-medium">Is there a setup fee?</h4>
                    <p className="text-sm text-muted-foreground">
                      No, there are no setup fees or hidden costs. You only pay
                      the monthly or yearly subscription fee for your chosen
                      plan.
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-2 font-medium">Can I get a refund?</h4>
                    <p className="text-sm text-muted-foreground">
                      We offer a 14-day free trial, and you can cancel anytime.
                      For paid subscriptions, refunds are handled on a
                      case-by-case basis.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <Star className="h-5 w-5 fill-current text-yellow-500" />
                <Star className="h-5 w-5 fill-current text-yellow-500" />
                <Star className="h-5 w-5 fill-current text-yellow-500" />
                <Star className="h-5 w-5 fill-current text-yellow-500" />
                <Star className="h-5 w-5 fill-current text-yellow-500" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Trusted by thousands of users
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Join the growing community of users who have taken control of
                their subscriptions with SubPilot.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Need help?{' '}
            <Link href="/help" className="text-primary hover:underline">
              Contact Support
            </Link>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BillingPageContent />
    </Suspense>
  );
}
