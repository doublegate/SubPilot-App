import { notFound } from 'next/navigation';
import { api } from '@/trpc/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  Globe,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import { SubscriptionActions } from '@/components/subscription-actions';
import { SubscriptionNotes } from '@/components/subscription-notes';
import { ProviderLogo } from '@/components/ui/provider-logo';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

interface ProviderData {
  name?: string;
  logo?: string;
}

interface TransactionData {
  id: string;
  date: string | Date;
  description?: string;
  amount: number;
}

interface PriceHistoryData {
  date: string | Date;
  amount: number;
}

interface CancellationInfoData {
  phone?: string;
  email?: string;
  url?: string;
  supportInfo?: string;
}

export default async function SubscriptionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const subscription = await api.subscriptions
    .getById({ id })
    .catch(() => null);

  if (!subscription) {
    notFound();
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: subscription.currency,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      monthly: 'Monthly',
      yearly: 'Yearly',
      weekly: 'Weekly',
      quarterly: 'Quarterly',
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  const isUpcomingSoon =
    subscription.nextBilling &&
    new Date(subscription.nextBilling).getTime() - new Date().getTime() <
      7 * 24 * 60 * 60 * 1000;

  // Calculate yearly equivalent
  let yearlyAmount = subscription.amount;
  switch (subscription.frequency) {
    case 'monthly':
      yearlyAmount = subscription.amount * 12;
      break;
    case 'weekly':
      yearlyAmount = subscription.amount * 52;
      break;
    case 'quarterly':
      yearlyAmount = subscription.amount * 4;
      break;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {(() => {
            const provider = subscription.provider as ProviderData | null;
            return (
              <ProviderLogo
                src={provider?.logo}
                alt={provider?.name ?? subscription.name}
                fallbackText={subscription.name}
                size="lg"
              />
            );
          })()}
          <div>
            <h1 className="text-3xl font-bold">{subscription.name}</h1>
            <p className="text-muted-foreground">{subscription.description}</p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className={getStatusColor(subscription.status)}
        >
          {subscription.status}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(subscription.amount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {getFrequencyLabel(subscription.frequency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Yearly Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(yearlyAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Per year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription.nextBilling ? (
              <>
                <div className="text-2xl font-bold">
                  {format(subscription.nextBilling, 'MMM d')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(subscription.nextBilling, {
                    addSuffix: true,
                  })}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">No upcoming billing</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscription.category || 'General'}
            </div>
            <p className="text-xs text-muted-foreground">Subscription type</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {isUpcomingSoon && subscription.status === 'active' && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Renewal Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This subscription will renew on{' '}
              {format(subscription.nextBilling!, 'MMMM d, yyyy')}. Make sure you
              have sufficient funds in your account.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription.transactions &&
            subscription.transactions.length > 0 ? (
              <div className="space-y-4">
                {(subscription.transactions as TransactionData[])
                  .slice(0, 6)
                  .map(transaction => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-muted p-2">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(transaction.date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.description ?? 'Payment'}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium">
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No billing history available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Price History */}
        <Card>
          <CardHeader>
            <CardTitle>Price History</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription.priceHistory &&
            subscription.priceHistory.length > 1 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>Price changes over time</span>
                </div>
                {(subscription.priceHistory as PriceHistoryData[]).map(
                  (price, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">
                        {format(new Date(price.date), 'MMM yyyy')}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(price.amount)}
                      </span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No price changes detected</p>
            )}
          </CardContent>
        </Card>

        {/* Notes & Tags */}
        <SubscriptionNotes
          subscriptionId={subscription.id}
          notes={(subscription as { notes?: string | null }).notes ?? null}
          tags={[]}
        />
      </div>

      {/* Cancellation Info */}
      {(() => {
        const cancelInfo =
          subscription.cancellationInfo as CancellationInfoData | null;
        return cancelInfo ? (
          <Card>
            <CardHeader>
              <CardTitle>Cancellation Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cancelInfo.url && (
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Cancel Online</p>
                    <Link
                      href={cancelInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Visit cancellation page →
                    </Link>
                  </div>
                </div>
              )}

              {cancelInfo.supportInfo && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Contact Support</p>
                    <p className="text-sm text-muted-foreground">
                      {cancelInfo.supportInfo}
                    </p>
                  </div>
                </div>
              )}

              {!cancelInfo.phone && !cancelInfo.email && !cancelInfo.url && (
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">
                    No cancellation information available. You may need to
                    contact the provider directly.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Actions */}
      <SubscriptionActions subscription={subscription} />
    </div>
  );
}
