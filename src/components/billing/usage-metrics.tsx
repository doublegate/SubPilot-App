'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { api } from '@/trpc/react';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Users } from 'lucide-react';

export function UsageMetrics() {
  const { data: usage, isLoading } = api.billing.getUsageLimits.useQuery();
  const { data: subscription } = api.billing.getSubscription.useQuery();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!usage) return null;

  const getUsageColor = (used: number, limit: number) => {
    if (limit === -1) return 'text-green-600'; // unlimited
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Helper function for progress bar colors
  const getProgressColor = (used: number, limit: number) => {
    if (limit === -1) return 'bg-green-500'; // unlimited
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Bank Accounts Usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bank Accounts</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={getUsageColor(
                  usage.bankAccounts.used,
                  usage.bankAccounts.limit
                )}
              >
                {usage.bankAccounts.used} /{' '}
                {usage.bankAccounts.limit === -1
                  ? '∞'
                  : usage.bankAccounts.limit}
              </span>
              {!usage.bankAccounts.canAdd &&
                usage.bankAccounts.limit !== -1 && (
                  <Badge variant="destructive" className="text-xs">
                    Limit Reached
                  </Badge>
                )}
              {usage.bankAccounts.limit === -1 && (
                <Badge variant="default" className="text-xs">
                  Unlimited
                </Badge>
              )}
            </div>
            {usage.bankAccounts.limit !== -1 && (
              <Progress
                value={
                  (usage.bankAccounts.used / usage.bankAccounts.limit) * 100
                }
                className={`h-2 ${getProgressColor(usage.bankAccounts.used, usage.bankAccounts.limit)}`}
              />
            )}
            <p className="text-xs text-muted-foreground">
              {usage.bankAccounts.canAdd
                ? 'You can add more bank accounts'
                : usage.bankAccounts.limit === -1
                  ? 'No limits on your current plan'
                  : 'Upgrade to add more accounts'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Team Members</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={getUsageColor(
                  usage.teamMembers.used,
                  usage.teamMembers.limit
                )}
              >
                {usage.teamMembers.used} /{' '}
                {usage.teamMembers.limit === -1 ? '∞' : usage.teamMembers.limit}
              </span>
              {!usage.teamMembers.canAdd && usage.teamMembers.limit !== -1 && (
                <Badge variant="destructive" className="text-xs">
                  Limit Reached
                </Badge>
              )}
              {usage.teamMembers.limit === -1 && (
                <Badge variant="default" className="text-xs">
                  Unlimited
                </Badge>
              )}
              {subscription?.plan?.name === 'free' && (
                <Badge variant="outline" className="text-xs">
                  Team Upgrade Required
                </Badge>
              )}
            </div>
            {usage.teamMembers.limit !== -1 && (
              <Progress
                value={
                  usage.teamMembers.limit > 0
                    ? (usage.teamMembers.used / usage.teamMembers.limit) * 100
                    : 0
                }
                className={`h-2 ${getProgressColor(usage.teamMembers.used, usage.teamMembers.limit)}`}
              />
            )}
            <p className="text-xs text-muted-foreground">
              {subscription?.plan?.name === 'free'
                ? 'Team features require Team plan'
                : usage.teamMembers.canAdd
                  ? 'You can invite more members'
                  : usage.teamMembers.limit === -1
                    ? 'No limits on your current plan'
                    : 'Upgrade to add more members'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
