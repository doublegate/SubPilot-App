'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  DollarSign,
  MoreVertical,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import { ProviderLogo } from '@/components/ui/provider-logo';
import { CancelSubscriptionButton } from '@/components/cancellation/cancel-subscription-button';

interface SubscriptionCardProps {
  subscription: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    frequency: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
    nextBilling: Date | null;
    status: 'active' | 'cancelled' | 'pending';
    category?: string;
    provider?: {
      name: string;
      logo?: string | null;
    } | null;
    lastTransaction?: Date;
  };
  onCancel?: (id: string) => void;
  onUpdate?: (id: string) => void;
}

export function SubscriptionCard({
  subscription,
  onCancel,
  onUpdate,
}: SubscriptionCardProps) {
  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      monthly: 'Monthly',
      yearly: 'Yearly',
      weekly: 'Weekly',
      quarterly: 'Quarterly',
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 hover:bg-green-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 hover:bg-red-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 hover:bg-gray-500/20';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const isUpcomingSoon =
    subscription.nextBilling &&
    new Date(subscription.nextBilling).getTime() - new Date().getTime() <
      7 * 24 * 60 * 60 * 1000;

  return (
    <Card
      className={`transition-all hover:shadow-lg ${subscription.status === 'cancelled' ? 'opacity-60' : ''}`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <ProviderLogo
              src={subscription.provider?.logo}
              alt={subscription.provider?.name ?? subscription.name}
              fallbackText={subscription.name}
              size="md"
            />
            <div>
              <CardTitle className="text-lg font-semibold">
                {subscription.name}
              </CardTitle>
              {subscription.provider?.name && (
                <p className="text-sm text-muted-foreground">
                  {subscription.provider.name}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`More options for ${subscription.name}`}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">
                  More options for {subscription.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/subscriptions/${subscription.id}`}>
                  View Details
                </Link>
              </DropdownMenuItem>
              {onUpdate && (
                <DropdownMenuItem onClick={() => onUpdate(subscription.id)}>
                  Edit Subscription
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {subscription.status === 'active' && (
                <div className="px-2 py-1">
                  <CancelSubscriptionButton
                    subscriptionId={subscription.id}
                    subscriptionName={subscription.name}
                    onCancellationStarted={() => onCancel?.(subscription.id)}
                  />
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={getStatusColor(subscription.status)}
            >
              {subscription.status}
            </Badge>
            {subscription.category && (
              <Badge variant="outline">{subscription.category}</Badge>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {formatCurrency(subscription.amount, subscription.currency)}
            </p>
            <p className="text-sm text-muted-foreground">
              {getFrequencyLabel(subscription.frequency)}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {subscription.nextBilling && subscription.status === 'active' && (
            <div className="flex items-center gap-2">
              <Calendar
                className={`h-4 w-4 ${isUpcomingSoon ? 'text-yellow-600' : 'text-muted-foreground'}`}
              />
              <div
                className={
                  isUpcomingSoon
                    ? 'font-medium text-yellow-600'
                    : 'text-muted-foreground'
                }
              >
                <div>
                  Next billing:{' '}
                  {format(subscription.nextBilling, 'MMM d, yyyy')}
                </div>
                <div className="text-xs">
                  (
                  {formatDistanceToNow(subscription.nextBilling, {
                    addSuffix: true,
                  })}
                  )
                </div>
              </div>
              {isUpcomingSoon && (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
            </div>
          )}

          {subscription.lastTransaction && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Last charged:{' '}
                {formatDistanceToNow(subscription.lastTransaction, {
                  addSuffix: true,
                })}
              </span>
            </div>
          )}
        </div>

        {subscription.status === 'cancelled' && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            This subscription has been cancelled
          </div>
        )}
      </CardContent>
    </Card>
  );
}
