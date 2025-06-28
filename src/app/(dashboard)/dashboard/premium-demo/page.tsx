import { Suspense } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { PremiumFeatureGate } from '@/components/billing/premium-feature-gate';
import { UsageMetrics } from '@/components/billing/usage-metrics';
import { AccountSwitcher } from '@/components/account/account-switcher';
import {
  Sparkles,
  Users,
  CreditCard,
  Download,
  TrendingUp,
  Bot,
  Shield,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

export default function PremiumDemoPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Premium Features Demo
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          This page demonstrates all the premium features available in SubPilot
          Phase 3. Each feature is gated based on your subscription tier and
          shows upgrade prompts for features that require a higher plan.
        </p>
      </div>

      <Separator />

      {/* Feature Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan & Usage</CardTitle>
          <CardDescription>
            Your current subscription status and usage limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <UsageMetrics />
          </Suspense>
        </CardContent>
      </Card>

      {/* AI Assistant Feature */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>AI Assistant</CardTitle>
            <Badge variant="secondary">Pro Feature</Badge>
          </div>
          <CardDescription>
            Get intelligent insights and automated management for your
            subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PremiumFeatureGate
            feature="ai_assistant"
            requiredPlan="pro"
            fallback={
              <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
                <div>
                  <p className="font-medium">AI Assistant Locked</p>
                  <p className="text-sm text-muted-foreground">
                    Chat with AI to get personalized subscription insights
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Upgrade to Pro
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                <p className="font-medium text-green-900 dark:text-green-100">
                  AI Assistant Available
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  You have access to our AI assistant for subscription
                  management
                </p>
              </div>
              <Button asChild>
                <Link href="/dashboard/assistant">Open AI Assistant</Link>
              </Button>
            </div>
          </PremiumFeatureGate>
        </CardContent>
      </Card>

      {/* Multi-Account Feature */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Multi-Account Support</CardTitle>
            <Badge variant="secondary">Team Feature</Badge>
          </div>
          <CardDescription>
            Create team accounts and share subscription management with family
            or colleagues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PremiumFeatureGate
            feature="multi_account"
            requiredPlan="team"
            fallback={
              <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
                <div>
                  <p className="font-medium">Team Accounts Locked</p>
                  <p className="text-sm text-muted-foreground">
                    Create and manage team accounts for shared subscriptions
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Upgrade to Team
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                <p className="font-medium text-green-900 dark:text-green-100">
                  Team Accounts Available
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  You can create and manage team accounts
                </p>
              </div>
              <AccountSwitcher />
            </div>
          </PremiumFeatureGate>
        </CardContent>
      </Card>

      {/* Data Export Feature */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <CardTitle>Data Export</CardTitle>
            <Badge variant="secondary">Pro Feature</Badge>
          </div>
          <CardDescription>
            Export your subscription data in various formats for analysis or
            backup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PremiumFeatureGate
            feature="export_data"
            requiredPlan="pro"
            fallback={
              <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
                <div>
                  <p className="font-medium">Data Export Locked</p>
                  <p className="text-sm text-muted-foreground">
                    Export subscription data to CSV, PDF, or JSON formats
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Upgrade to Pro
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                <p className="font-medium text-green-900 dark:text-green-100">
                  Data Export Available
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  You can export your subscription data in multiple formats
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Export CSV
                </Button>
                <Button variant="outline" size="sm">
                  Export PDF
                </Button>
                <Button variant="outline" size="sm">
                  Export JSON
                </Button>
              </div>
            </div>
          </PremiumFeatureGate>
        </CardContent>
      </Card>

      {/* Bank Account Limits */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Bank Account Management</CardTitle>
            <Badge variant="secondary">Plan Limited</Badge>
          </div>
          <CardDescription>
            Connect multiple bank accounts to track all your subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Bank Account Limits
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Free: 2 accounts • Pro: Unlimited • Team: Unlimited
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/banks">Manage Bank Accounts</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">View Plans</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Compare all available subscription tiers and their features
            </p>
            <Button className="w-full" asChild>
              <Link href="/dashboard/settings/billing/upgrade">View Plans</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Billing Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Manage your subscription, payment methods, and billing history
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard/settings/billing">Billing Settings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Account Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Configure team accounts, usage limits, and account preferences
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard/settings/account">Account Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Implementation Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Phase 3 Implementation Status</CardTitle>
          <CardDescription>
            Current implementation status of premium billing features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-medium text-green-700 dark:text-green-300">
                ✅ Implemented
              </h4>
              <ul className="space-y-1 text-sm">
                <li>• Complete Stripe integration</li>
                <li>• Pricing plans & subscription management</li>
                <li>• Feature gating system</li>
                <li>• Usage metrics & limits</li>
                <li>• Team account creation</li>
                <li>• Billing portal & invoices</li>
                <li>• Webhook handling</li>
                <li>• Premium UI components</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-medium text-blue-700 dark:text-blue-300">
                🔧 Ready to Configure
              </h4>
              <ul className="space-y-1 text-sm">
                <li>• Stripe API keys (test/production)</li>
                <li>• Pricing plan price IDs</li>
                <li>• Webhook endpoints</li>
                <li>• Payment method configuration</li>
                <li>• Email notification templates</li>
                <li>• Feature flag toggles</li>
                <li>• Usage limit adjustments</li>
                <li>• Custom enterprise features</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
