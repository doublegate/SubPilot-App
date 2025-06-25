'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  isSameDay,
} from 'date-fns';

interface RenewalData {
  renewals: Array<{
    date: string;
    subscriptions: Array<{
      id: string;
      name: string;
      amount: number;
      currency: string;
      provider: any;
    }>;
    dailyTotal: number;
  }>;
  totalCount: number;
  totalAmount: number;
}

interface UpcomingRenewalsCalendarProps {
  renewals: RenewalData;
}

export function UpcomingRenewalsCalendar({
  renewals,
}: UpcomingRenewalsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Create a map of renewals by date
  const renewalMap = new Map<string, (typeof renewals.renewals)[0]>();
  renewals.renewals.forEach(renewal => {
    renewalMap.set(renewal.date, renewal);
  });

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days to complete the weeks
  const startDay = monthStart.getDay(); // 0 = Sunday
  const endDay = monthEnd.getDay();

  const paddingStart = Array.from({ length: startDay }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - (startDay - i));
    return date;
  });

  const paddingEnd = Array.from({ length: 6 - endDay }, (_, i) => {
    const date = new Date(monthEnd);
    date.setDate(date.getDate() + (i + 1));
    return date;
  });

  const allDays = [...paddingStart, ...days, ...paddingEnd];

  const getRenewalForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return renewalMap.get(dateKey);
  };

  const getDayClasses = (date: Date) => {
    const isCurrentMonth = isSameMonth(date, currentDate);
    const isCurrentDay = isToday(date);
    const renewal = getRenewalForDate(date);

    let classes = 'relative h-24 p-2 border rounded-lg transition-colors ';

    if (!isCurrentMonth) {
      classes += 'text-muted-foreground bg-muted/30 ';
    } else {
      classes += 'hover:bg-muted/50 ';
    }

    if (isCurrentDay) {
      classes += 'ring-2 ring-primary ';
    }

    if (renewal && isCurrentMonth) {
      if (renewal.dailyTotal > 100) {
        classes +=
          'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900 ';
      } else if (renewal.dailyTotal > 50) {
        classes +=
          'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-900 ';
      } else {
        classes +=
          'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900 ';
      }
    }

    return classes;
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calculate this month's totals
  const thisMonthRenewals = renewals.renewals.filter(renewal => {
    const renewalDate = parseISO(renewal.date);
    return isSameMonth(renewalDate, currentDate);
  });

  const thisMonthTotal = thisMonthRenewals.reduce(
    (sum, renewal) => sum + renewal.dailyTotal,
    0
  );
  const thisMonthCount = thisMonthRenewals.reduce(
    (sum, renewal) => sum + renewal.subscriptions.length,
    0
  );

  // Find the most expensive day
  const mostExpensiveDay = renewals.renewals.reduce(
    (max, renewal) => (renewal.dailyTotal > max.dailyTotal ? renewal : max),
    { dailyTotal: 0, date: '', subscriptions: [] }
  );

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={view === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('calendar')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            List
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(thisMonthTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {thisMonthCount} renewals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Upcoming
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(renewals.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Day</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(mostExpensiveDay.dailyTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {mostExpensiveDay.date
                ? format(parseISO(mostExpensiveDay.date), 'MMM d')
                : 'No renewals'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar or List View */}
      {view === 'calendar' ? (
        <Card>
          <CardContent className="p-4">
            {/* Day headers */}
            <div className="mb-2 grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  className="p-2 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {allDays.map((date, index) => {
                const renewal = getRenewalForDate(date);
                const isCurrentMonth = isSameMonth(date, currentDate);

                return (
                  <div key={index} className={getDayClasses(date)}>
                    <div className="text-sm font-medium">
                      {format(date, 'd')}
                    </div>

                    {renewal && isCurrentMonth && (
                      <div className="mt-1 space-y-1">
                        <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          {formatCurrency(renewal.dailyTotal)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {renewal.subscriptions.length} renewal
                          {renewal.subscriptions.length !== 1 ? 's' : ''}
                        </div>
                        {renewal.subscriptions.slice(0, 2).map(sub => (
                          <div key={sub.id} className="truncate text-xs">
                            {sub.name}
                          </div>
                        ))}
                        {renewal.subscriptions.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{renewal.subscriptions.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {renewals.renewals
            .filter(renewal => {
              const renewalDate = parseISO(renewal.date);
              return isSameMonth(renewalDate, currentDate);
            })
            .sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            )
            .map(renewal => (
              <Card key={renewal.date}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {format(parseISO(renewal.date), 'EEEE, MMMM d')}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {renewal.subscriptions.length} renewal
                        {renewal.subscriptions.length !== 1 ? 's' : ''}
                      </Badge>
                      <Badge variant="outline">
                        {formatCurrency(renewal.dailyTotal)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {renewal.subscriptions.map(sub => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <div className="font-medium">{sub.name}</div>
                          {sub.provider && (
                            <div className="text-sm text-muted-foreground">
                              {typeof sub.provider === 'object' &&
                              sub.provider.name
                                ? sub.provider.name
                                : 'Unknown Provider'}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {formatCurrency(sub.amount, sub.currency)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <Clock className="mr-1 inline h-3 w-3" />
                            Renewal
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <h4 className="mb-2 font-medium">Color Legend</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20" />
              <span>Low ($0-50)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-900/20" />
              <span>Medium ($50-100)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20" />
              <span>High ($100+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border-2 border-primary bg-background" />
              <span>Today</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
