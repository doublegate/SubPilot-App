'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  CreditCard,
  AlertCircle,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export function BillingSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const { data: subscription, isLoading: subscriptionLoading } =
    api.billing.getSubscription.useQuery();
  const { data: stats } = api.billing.getStats.useQuery();
  const { data: invoices } = api.billing.getInvoices.useQuery({ limit: 5 });

  const createPortalSession = api.billing.createPortalSession.useMutation({
    onSuccess: data => {
      if (data.url) {
        router.push(data.url);
      }
    },
    onError: error => {
      toast.error(error.message);
      setLoading(null);
    },
  });

  const cancelSubscription = api.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success(
        'Subscription will be cancelled at the end of the billing period'
      );
      setLoading(null);
    },
    onError: error => {
      toast.error(error.message);
      setLoading(null);
    },
  });

  const reactivateSubscription = api.billing.reactivateSubscription.useMutation(
    {
      onSuccess: () => {
        toast.success('Subscription reactivated successfully');
        setLoading(null);
      },
      onError: error => {
        toast.error(error.message);
        setLoading(null);
      },
    }
  );

  const handleManageSubscription = async () => {
    setLoading('manage');
    await createPortalSession.mutateAsync();
  };

  const handleCancelSubscription = async () => {
    setLoading('cancel');
    await cancelSubscription.mutateAsync();
  };

  const handleReactivateSubscription = async () => {
    setLoading('reactivate');
    await reactivateSubscription.mutateAsync();
  };

  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'trialing':
        return <Badge variant="secondary">Trial</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      case 'canceled':
        return <Badge variant="outline">Canceled</Badge>;
      case 'incomplete':
        return <Badge variant="secondary">Incomplete</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Manage your subscription and billing details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {subscription?.plan?.displayName ?? 'Free'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {subscription?.plan?.description}
              </p>
            </div>
            {subscription?.status && getStatusBadge(subscription.status)}
          </div>

          {subscription?.plan?.name !== 'free' && (
            <>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">
                    ${Number(subscription?.plan?.price ?? 0).toFixed(2)}/month
                  </span>
                </div>
                {subscription &&
                  'currentPeriodEnd' in subscription &&
                  subscription.currentPeriodEnd && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Next billing date
                      </span>
                      <span className="font-medium">
                        {format(
                          new Date(subscription.currentPeriodEnd),
                          'MMM d, yyyy'
                        )}
                      </span>
                    </div>
                  )}
                {subscription &&
                  'trialEnd' in subscription &&
                  subscription.trialEnd &&
                  new Date(subscription.trialEnd) > new Date() && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trial ends</span>
                      <span className="font-medium">
                        {format(new Date(subscription.trialEnd), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
              </div>

              {subscription &&
                'cancelAtPeriodEnd' in subscription &&
                subscription.cancelAtPeriodEnd && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your subscription will be cancelled on{' '}
                      {subscription &&
                        'currentPeriodEnd' in subscription &&
                        subscription.currentPeriodEnd &&
                        format(
                          new Date(subscription.currentPeriodEnd),
                          'MMM d, yyyy'
                        )}
                    </AlertDescription>
                  </Alert>
                )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={loading !== null}
                >
                  {loading === 'manage' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </>
                  )}
                </Button>

                {subscription &&
                'cancelAtPeriodEnd' in subscription &&
                subscription.cancelAtPeriodEnd ? (
                  <Button
                    variant="default"
                    onClick={handleReactivateSubscription}
                    disabled={loading !== null}
                  >
                    {loading === 'reactivate' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Reactivating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Reactivate
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleCancelSubscription}
                    disabled={loading !== null}
                  >
                    {loading === 'cancel' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel Subscription
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}

          {subscription?.plan?.name === 'free' && (
            <Button onClick={() => router.push('/billing?tab=upgrade')}>
              Upgrade to Pro
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Billing Summary */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Billing Summary</CardTitle>
            <CardDescription>
              Your subscription history and spending
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">
                  ${stats.totalSpent.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="text-2xl font-bold">
                  {format(new Date(stats.memberSince), 'MMM yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-2xl font-bold">{stats.currentPlan}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Invoices */}
      {invoices && invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>
              Download your billing invoices for accounting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoices.map(invoice => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      Invoice #{invoice.number ?? invoice.id?.slice(-8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.paidAt
                        ? format(new Date(invoice.paidAt), 'MMM d, yyyy')
                        : 'Pending'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">
                      ${invoice.amount.toFixed(2)}
                    </span>
                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={
                          invoice.invoicePdf ?? invoice.hostedInvoiceUrl ?? '#'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="mr-1 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
