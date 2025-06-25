'use client';

import { useState, useMemo } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Play,
  Pause,
  StopCircle,
  AlertTriangle,
} from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

interface TimelineFilters {
  categories: string[];
  minAmount?: number;
  maxAmount?: number;
  status: 'all' | 'active' | 'cancelled';
}

interface SubscriptionTimelineProps {
  filters: TimelineFilters;
}

interface TimelineEvent {
  id: string;
  type: 'started' | 'cancelled' | 'price_change' | 'payment' | 'detected';
  date: Date;
  subscription: {
    id: string;
    name: string;
    amount: number;
    category?: string;
    status: string;
  };
  details?: {
    oldAmount?: number;
    newAmount?: number;
    reason?: string;
  };
}

export function SubscriptionTimeline({ filters }: SubscriptionTimelineProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<
    'week' | 'month' | 'quarter' | 'year'
  >('month');
  const [eventTypes, setEventTypes] = useState({
    started: true,
    cancelled: true,
    price_change: true,
    payment: false,
    detected: true,
  });

  // Fetch subscriptions data
  const { data: subscriptions, isLoading } = api.subscriptions.getAll.useQuery({
    status: filters.status === 'all' ? undefined : (filters.status as any),
    limit: 100,
  });

  // Create timeline events from subscription data
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    if (!subscriptions) return [];

    const events: TimelineEvent[] = [];

    subscriptions.subscriptions.forEach(sub => {
      // Filter by category
      if (
        filters.categories.length > 0 &&
        sub.category &&
        !filters.categories.includes(sub.category)
      ) {
        return;
      }

      // Filter by amount
      if (filters.minAmount !== undefined && sub.amount < filters.minAmount)
        return;
      if (filters.maxAmount !== undefined && sub.amount > filters.maxAmount)
        return;

      // Add subscription start event
      events.push({
        id: `${sub.id}-started`,
        type: 'started',
        date: sub.createdAt,
        subscription: {
          id: sub.id,
          name: sub.name,
          amount: sub.amount,
          category: sub.category,
          status: sub.status,
        },
      });

      // Add detection event if different from creation
      if (
        sub.detectedAt &&
        sub.detectedAt.getTime() !== sub.createdAt.getTime()
      ) {
        events.push({
          id: `${sub.id}-detected`,
          type: 'detected',
          date: sub.detectedAt,
          subscription: {
            id: sub.id,
            name: sub.name,
            amount: sub.amount,
            category: sub.category,
            status: sub.status,
          },
        });
      }

      // Add cancellation event
      if (sub.status === 'cancelled') {
        events.push({
          id: `${sub.id}-cancelled`,
          type: 'cancelled',
          date: sub.updatedAt, // Use updated date as approximation
          subscription: {
            id: sub.id,
            name: sub.name,
            amount: sub.amount,
            category: sub.category,
            status: sub.status,
          },
        });
      }

      // TODO: Add price change events when transaction history is available
      // TODO: Add payment events when transaction data is integrated
    });

    // Filter by selected period
    const now = new Date();
    const cutoffDate = new Date();
    switch (selectedPeriod) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return events
      .filter(event => event.date >= cutoffDate)
      .filter(event => eventTypes[event.type])
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [subscriptions, filters, selectedPeriod, eventTypes]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatEventDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'started':
        return <Play className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <StopCircle className="h-4 w-4 text-red-600" />;
      case 'price_change':
        return <TrendingUp className="h-4 w-4 text-orange-600" />;
      case 'payment':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'detected':
        return <AlertTriangle className="h-4 w-4 text-purple-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'started':
        return 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/10';
      case 'cancelled':
        return 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/10';
      case 'price_change':
        return 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-900/10';
      case 'payment':
        return 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/10';
      case 'detected':
        return 'border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-900/10';
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-900 dark:bg-gray-900/10';
    }
  };

  const getEventTitle = (event: TimelineEvent) => {
    switch (event.type) {
      case 'started':
        return 'Subscription Started';
      case 'cancelled':
        return 'Subscription Cancelled';
      case 'price_change':
        return 'Price Changed';
      case 'payment':
        return 'Payment Made';
      case 'detected':
        return 'Subscription Detected';
      default:
        return 'Event';
    }
  };

  const getEventDescription = (event: TimelineEvent) => {
    const { subscription, details } = event;

    switch (event.type) {
      case 'started':
        return `Started paying ${formatCurrency(subscription.amount)}/month for ${subscription.name}`;
      case 'cancelled':
        return `Cancelled ${subscription.name} (was ${formatCurrency(subscription.amount)}/month)`;
      case 'price_change':
        return `${subscription.name} price changed from ${formatCurrency(details?.oldAmount || 0)} to ${formatCurrency(details?.newAmount || subscription.amount)}`;
      case 'payment':
        return `Paid ${formatCurrency(subscription.amount)} for ${subscription.name}`;
      case 'detected':
        return `Automatically detected ${subscription.name} subscription (${formatCurrency(subscription.amount)}/month)`;
      default:
        return subscription.name;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Time Period:</span>
          <div className="flex gap-1">
            {(['week', 'month', 'quarter', 'year'] as const).map(period => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Show:</span>
          <div className="flex flex-wrap gap-1">
            {Object.entries(eventTypes).map(([type, enabled]) => (
              <Button
                key={type}
                variant={enabled ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setEventTypes(prev => ({
                    ...prev,
                    [type]: !prev[type as keyof typeof prev],
                  }))
                }
              >
                {type.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {timelineEvents.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No timeline events found for the selected period and filters.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {timelineEvents.map((event, index) => (
            <Card
              key={event.id}
              className={`relative ${getEventColor(event.type)}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {getEventIcon(event.type)}
                  </div>

                  <div className="flex-grow space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{getEventTitle(event)}</h4>
                      <div className="flex items-center gap-2">
                        {event.subscription.category && (
                          <Badge variant="secondary" className="text-xs">
                            {event.subscription.category}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            event.subscription.status === 'active'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {event.subscription.status}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {getEventDescription(event)}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatEventDate(event.date)}</span>
                      <span>
                        {formatDistanceToNow(event.date, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>

              {/* Timeline connector */}
              {index < timelineEvents.length - 1 && (
                <div className="absolute left-6 top-16 h-4 w-px bg-border" />
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">
            Total Events
          </div>
          <div className="text-2xl font-bold">{timelineEvents.length}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">
            New Subscriptions
          </div>
          <div className="text-2xl font-bold">
            {timelineEvents.filter(e => e.type === 'started').length}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">
            Cancellations
          </div>
          <div className="text-2xl font-bold">
            {timelineEvents.filter(e => e.type === 'cancelled').length}
          </div>
        </Card>
      </div>
    </div>
  );
}
