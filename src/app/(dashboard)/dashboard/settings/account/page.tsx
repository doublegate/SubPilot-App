import { Suspense } from 'react';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountSwitcher } from '@/components/account/account-switcher';
import { UsageMetrics } from '@/components/billing/usage-metrics';

export default function AccountSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and team members.
        </p>
      </div>
      <Separator />

      {/* Account Switcher */}
      <Card>
        <CardHeader>
          <CardTitle>Active Account</CardTitle>
          <CardDescription>
            Switch between personal and team accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountSwitcher />
        </CardContent>
      </Card>

      {/* Usage Metrics */}
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
    </div>
  );
}
