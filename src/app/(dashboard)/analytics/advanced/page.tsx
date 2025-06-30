'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TimeSeriesChart } from '@/components/charts/time-series-chart';
import { ComparisonChart } from '@/components/charts/comparison-chart';
import { InsightsCard, type Insight } from '@/components/charts/insights-card';
import { HeatmapChartEnhanced } from '@/components/charts/heatmap-chart-enhanced';
import { CategoryBreakdownChart } from '@/components/analytics/category-breakdown-chart';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  FileText,
  PieChart,
  BarChart3,
  LineChart,
  Brain,
} from 'lucide-react';
import { toast } from 'sonner';

type TimeRange = 'week' | 'month' | 'quarter' | 'year' | 'all';

export default function AdvancedAnalyticsPage() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [comparisonType, setComparisonType] = useState<
    'month-over-month' | 'year-over-year' | 'quarter-over-quarter'
  >('month-over-month');

  // Fetch data
  const { data: predictions, isLoading: predictionsLoading } =
    api.analytics.getPredictions.useQuery({
      horizonMonths: 3,
    });

  const { data: comparisons, isLoading: comparisonsLoading } =
    api.analytics.getComparisons.useQuery({
      comparisonType,
    });

  const { data: categoryBreakdown, isLoading: categoryLoading } =
    api.analytics.getCategoryBreakdown.useQuery({
      timeRange,
    });

  const { data: anomalies, isLoading: anomaliesLoading } =
    api.analytics.getAnomalies.useQuery();

  const { data: optimizations, isLoading: optimizationsLoading } =
    api.analytics.getOptimizations.useQuery();

  const { data: timeSeries, isLoading: timeSeriesLoading } =
    api.analytics.getTimeSeries.useQuery({
      groupBy:
        timeRange === 'week'
          ? 'day'
          : timeRange === 'year' || timeRange === 'all'
            ? 'month'
            : 'week',
    });

  // Generate report query - we'll trigger it manually
  const [shouldGenerateReport, setShouldGenerateReport] = useState(false);
  const generateReportQuery = api.analytics.generateReport.useQuery(
    {},
    {
      enabled: shouldGenerateReport,
    }
  );

  // Handle report success/error with useEffect
  React.useEffect(() => {
    if (generateReportQuery.isSuccess && generateReportQuery.data) {
      toast.success('Report generated successfully');
      // Handle report download or display
      console.log('Generated report:', generateReportQuery.data);
      setShouldGenerateReport(false);
    }
    if (generateReportQuery.isError) {
      toast.error('Failed to generate report');
      setShouldGenerateReport(false);
    }
  }, [
    generateReportQuery.isSuccess,
    generateReportQuery.isError,
    generateReportQuery.data,
  ]);

  const handleGenerateReport = () => {
    setShouldGenerateReport(true);
  };

  // Convert insights to the expected format
  const insights: Insight[] = [
    ...(anomalies?.map((anomaly, index) => ({
      id: `anomaly-${index}`,
      type: 'anomaly' as const,
      priority: anomaly.severity,
      title: `${anomaly.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Detected`,
      description: anomaly.description,
      amount: anomaly.affectedAmount,
    })) ?? []),
    ...(optimizations?.map((opt, index) => ({
      id: `optimization-${index}`,
      type: 'saving' as const,
      priority: opt.priority,
      title: opt.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: opt.description,
      amount: opt.potentialSavings,
      action: {
        label: 'View Details',
        onClick: () => {
          // Navigate to subscriptions with filter based on optimization type
          if (opt.type === 'duplicate_services') {
            router.push('/subscriptions?filter=duplicates');
          } else if (opt.type === 'unused_services') {
            router.push('/subscriptions?filter=unused');
          } else if (opt.type === 'expensive_services') {
            router.push('/subscriptions?filter=expensive');
          } else {
            router.push('/subscriptions');
          }
        },
      },
    })) ?? []),
  ];

  // Prepare time series data with predictions
  const timeSeriesWithPredictions = React.useMemo(() => {
    if (!timeSeries || !predictions) return [];

    const actualData = timeSeries.map(point => ({
      date: point.date,
      value: point.value,
    }));

    // Add prediction points
    const lastDate = actualData[actualData.length - 1]?.date;
    if (lastDate) {
      const predictionDate = new Date(lastDate);
      predictionDate.setMonth(predictionDate.getMonth() + 1);

      actualData.push({
        date: predictionDate.toISOString().split('T')[0] ?? '',
        value: predictions.predictedValue,
      });
    }

    return actualData;
  }, [timeSeries, predictions]);

  // Prepare comparison data
  const comparisonData = React.useMemo(() => {
    if (!comparisons || !categoryBreakdown) return [];

    return categoryBreakdown.map(cat => ({
      label: cat.category,
      current: cat.totalSpending,
      previous: cat.totalSpending - (cat.trend?.change ?? 0),
      change: cat.trend?.change ?? 0,
      changePercentage: cat.trend?.changePercentage ?? 0,
    }));
  }, [comparisons, categoryBreakdown]);

  // Prepare heatmap data (dummy data for now, would need real daily data)
  const heatmapData = React.useMemo(() => {
    const data = [];
    const currentYear = new Date().getFullYear();

    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        data.push({
          day,
          month,
          value: Math.random() * 500, // Replace with real data
          label: `${day}/${month + 1}`,
        });
      }
    }

    return data;
  }, []);

  const isLoading =
    predictionsLoading ||
    comparisonsLoading ||
    categoryLoading ||
    anomaliesLoading ||
    optimizationsLoading ||
    timeSeriesLoading;

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Advanced Analytics
          </h1>
          <p className="text-muted-foreground">
            Deep insights, predictions, and optimization recommendations
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
            onClick={handleGenerateReport}
            disabled={generateReportQuery.isLoading}
          >
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Predictive Analytics Summary */}
      {predictions && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Next Month Prediction
              </CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${predictions.predictedValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {(predictions.confidence * 100).toFixed(0)}% confidence
              </p>
              <Badge
                variant={
                  predictions.trend === 'increasing' ? 'destructive' : 'default'
                }
                className="mt-2"
              >
                {predictions.trend === 'increasing' && (
                  <TrendingUp className="mr-1 h-3 w-3" />
                )}
                {predictions.trend === 'decreasing' && (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {predictions.trend}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Potential Savings
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {optimizations
                  ?.reduce((sum, opt) => sum + opt.potentialSavings, 0)
                  .toFixed(2) ?? '0.00'}
                /mo
              </div>
              <p className="text-xs text-muted-foreground">
                Across {optimizations?.length ?? 0} opportunities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Anomalies Detected
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{anomalies?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {anomalies?.filter(a => a.severity === 'high').length ?? 0} high
                priority
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tabs */}
      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="predictions">
            <LineChart className="mr-2 h-4 w-4" />
            Predictions
          </TabsTrigger>
          <TabsTrigger value="comparisons">
            <BarChart3 className="mr-2 h-4 w-4" />
            Comparisons
          </TabsTrigger>
          <TabsTrigger value="categories">
            <PieChart className="mr-2 h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Brain className="mr-2 h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="heatmap">
            <BarChart3 className="mr-2 h-4 w-4" />
            Heatmap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-4">
          <TimeSeriesChart
            data={timeSeriesWithPredictions}
            title="Spending Predictions"
            valueLabel="Spending"
            showPredictions={true}
            showConfidenceInterval={true}
            trend={predictions?.trend}
          />
        </TabsContent>

        <TabsContent value="comparisons" className="space-y-4">
          <div className="mb-4">
            <Select
              value={comparisonType}
              onValueChange={v =>
                setComparisonType(
                  v as
                    | 'month-over-month'
                    | 'year-over-year'
                    | 'quarter-over-quarter'
                )
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month-over-month">
                  Month over Month
                </SelectItem>
                <SelectItem value="quarter-over-quarter">
                  Quarter over Quarter
                </SelectItem>
                <SelectItem value="year-over-year">Year over Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ComparisonChart
            data={comparisonData}
            title="Category Spending Comparison"
            description={`Comparing current period vs previous period`}
            showPercentages={true}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of spending by category with trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryBreakdown && categoryBreakdown.length > 0 ? (
                <CategoryBreakdownChart
                  data={categoryBreakdown.map(cat => ({
                    category: cat.category,
                    amount: cat.totalSpending,
                    percentage:
                      (cat.totalSpending /
                        categoryBreakdown.reduce(
                          (sum, c) => sum + c.totalSpending,
                          0
                        )) *
                      100,
                  }))}
                />
              ) : (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <InsightsCard
            insights={insights}
            title="AI-Powered Insights"
            showAll={true}
          />
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <HeatmapChartEnhanced
            data={heatmapData}
            title="Spending Heatmap"
            description="Daily spending patterns throughout the year"
            colorScheme="blue"
            showLegend={true}
          />
        </TabsContent>
      </Tabs>
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

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      <Skeleton className="h-[400px]" />
    </div>
  );
}
