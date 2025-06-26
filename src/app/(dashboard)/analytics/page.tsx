'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/trpc/react';
import { SpendingTrendsChart } from '@/components/analytics/spending-trends-chart';
import { CategoryBreakdownChart } from '@/components/analytics/category-breakdown-chart';
import { SubscriptionTimeline } from '@/components/analytics/subscription-timeline';
import { UpcomingRenewalsCalendar } from '@/components/analytics/upcoming-renewals-calendar';
import { AnalyticsFilters } from '@/components/analytics/analytics-filters';
import { Download, TrendingUp, PieChart, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

type TimeRange = 'week' | 'month' | 'quarter' | 'year' | 'all';

interface AnalyticsFilters {
  categories: string[];
  minAmount?: number;
  maxAmount?: number;
  status: 'all' | 'active' | 'cancelled';
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [filters, setFilters] = useState<AnalyticsFilters>({
    categories: [],
    minAmount: undefined,
    maxAmount: undefined,
    status: 'all',
  });

  // Fetch data
  const { data: categories } = api.subscriptions.getCategories.useQuery();
  const { data: overview, isLoading: overviewLoading } =
    api.analytics.getSpendingOverview.useQuery({
      timeRange,
    });
  const { data: trends, isLoading: trendsLoading } =
    api.analytics.getSpendingTrends.useQuery({
      timeRange,
      groupBy:
        timeRange === 'week'
          ? 'day'
          : timeRange === 'year' || timeRange === 'all'
            ? 'month'
            : 'week',
    });
  const { data: insights, isLoading: insightsLoading } =
    api.analytics.getSubscriptionInsights.useQuery();
  const { data: renewals, isLoading: renewalsLoading } =
    api.analytics.getUpcomingRenewals.useQuery({
      days: 30,
    });

  // Export data query
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | null>(null);
  const { data: exportData, isLoading: exportLoading } =
    api.analytics.exportData.useQuery(
      { format: exportFormat ?? 'csv', includeTransactions: true },
      { enabled: exportFormat !== null }
    );

  // Handle export completion
  React.useEffect(() => {
    if (exportData && exportFormat) {
      if (
        'format' in exportData &&
        exportData.format === 'csv' &&
        'data' in exportData &&
        exportData.data
      ) {
        // CSV export
        interface CsvExportData {
          data: { subscriptions?: string };
        }
        const dataObj = exportData as CsvExportData;
        const csvContent =
          typeof dataObj.data?.subscriptions === 'string'
            ? dataObj.data.subscriptions
            : '';

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        interface ExportDataWithFilename {
          filename?: string;
        }
        const filenameObj = exportData as ExportDataWithFilename;
        a.download =
          filenameObj.filename ??
          `subpilot-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Data exported successfully');
      } else if (exportData && 'format' in exportData && 'data' in exportData) {
        // Type guard for JSON export data
        interface JsonExportResponse {
          format: string;
          data: unknown;
        }
        const jsonExportData = exportData as unknown as JsonExportResponse;
        if (jsonExportData.format === 'json' && jsonExportData.data) {
          // JSON export
          const dataObj = jsonExportData;
          const jsonContent = JSON.stringify(dataObj.data, null, 2);
          const blob = new Blob([jsonContent], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          interface ExportDataWithFilename {
            filename?: string;
          }
          const filenameObj = exportData as ExportDataWithFilename;
          a.download =
            filenameObj.filename ??
            `subpilot-export-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);

          toast.success('Data exported successfully');
        }
      }
      setExportFormat(null); // Reset export state
    }
  }, [exportData, exportFormat]);

  const handleExport = (format: 'csv' | 'json') => {
    setExportFormat(format);
  };

  const isLoading =
    overviewLoading || trendsLoading || insightsLoading || renewalsLoading;

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Gain insights into your subscription spending and patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onValueChange={v => setTimeRange(v as TimeRange)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={exportLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Spending Overview Cards */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Subscription Spending
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {overview &&
                'subscriptionSpending' in overview &&
                overview.subscriptionSpending &&
                'monthly' in overview.subscriptionSpending
                  ? overview.subscriptionSpending.monthly.toFixed(2)
                  : '0.00'}
                /mo
              </div>
              <p className="text-xs text-muted-foreground">
                $
                {overview &&
                'subscriptionSpending' in overview &&
                overview.subscriptionSpending &&
                'yearly' in overview.subscriptionSpending
                  ? overview.subscriptionSpending.yearly.toFixed(2)
                  : '0.00'}{' '}
                yearly
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Spending
              </CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {overview &&
                'totalSpending' in overview &&
                overview.totalSpending &&
                'monthlyAverage' in overview.totalSpending
                  ? overview.totalSpending.monthlyAverage.toFixed(2)
                  : '0.00'}
                /mo
              </div>
              <p className="text-xs text-muted-foreground">
                {overview && 'subscriptionPercentage' in overview
                  ? overview.subscriptionPercentage
                  : 0}
                % is subscriptions
              </p>
            </CardContent>
          </Card>

          {insights && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Subscriptions
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {insights?.totalActive ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {insights?.unusedCount ?? 0} unused (60+ days)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Average Age
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {insights?.averageSubscriptionAge ?? 0} days
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {insights?.priceIncreaseCount ?? 0} price increases detected
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Spending Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Category Breakdown</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="renewals">Upcoming Renewals</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spending Trends</CardTitle>
              <CardDescription>
                Track your subscription and total spending over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trends && Array.isArray(trends) && trends.length > 0 ? (
                <SpendingTrendsChart data={trends} />
              ) : (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  No spending trend data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>
                See where your subscription money goes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview &&
              'categoryBreakdown' in overview &&
              Array.isArray(overview.categoryBreakdown) &&
              overview.categoryBreakdown.length > 0 ? (
                <CategoryBreakdownChart data={overview.categoryBreakdown} />
              ) : (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  No category breakdown data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Subscription Timeline</CardTitle>
                <CardDescription>
                  View your subscription history and changes
                </CardDescription>
              </div>
              <AnalyticsFilters
                categories={
                  categories?.map((c: { name: string }) => c.name) ?? []
                }
                filters={filters}
                onFiltersChange={setFilters}
              />
            </CardHeader>
            <CardContent>
              <SubscriptionTimeline filters={filters} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Renewals</CardTitle>
              <CardDescription>
                Plan for upcoming subscription renewals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renewals && renewals.totalCount > 0 ? (
                <UpcomingRenewalsCalendar renewals={renewals} />
              ) : (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  No upcoming renewals
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Insights and Alerts */}
      {insights?.insights && insights.insights.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Insights & Recommendations</h2>
          {insights.insights.map((insight, index) => (
            <Card
              key={index}
              className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-900/10"
            >
              <CardHeader>
                <CardTitle className="text-base">{insight.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {insight.message}
                </p>
                {insight.type === 'unused' && insight.subscriptions && (
                  <div className="mt-2 space-y-1">
                    {insight.subscriptions.map(sub => (
                      <div key={sub.id} className="text-sm">
                        • {sub.name} - ${sub.amount.toFixed(2)}/mo
                      </div>
                    ))}
                  </div>
                )}
                {insight.type === 'price_increase' && insight.subscriptions && (
                  <div className="mt-2 space-y-1">
                    {insight.subscriptions.map(sub => (
                      <div key={sub.id} className="text-sm">
                        • {sub.name}: ${(sub.oldAmount ?? 0).toFixed(2)} → $
                        {(sub.newAmount ?? 0).toFixed(2)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      <Skeleton className="h-[400px]" />
    </div>
  );
}
