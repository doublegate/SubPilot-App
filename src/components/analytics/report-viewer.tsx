'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TimeSeriesChart } from '@/components/charts/time-series-chart';
import { CategoryBreakdownChart } from './category-breakdown-chart';
import { InsightsCard } from '@/components/charts/insights-card';
import { type AnalyticsReport } from '~/server/services/analytics.service';
import {
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

interface ReportViewerProps {
  report: AnalyticsReport;
  onDownload?: () => void;
}

export const ReportViewer = React.memo(function ReportViewer({
  report,
  onDownload,
}: ReportViewerProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Convert data for charts
  const timeSeriesData = report.trends.map(point => ({
    date: point.date,
    value: point.value,
    predicted: undefined,
  }));

  const categoryData = report.categories.map(cat => ({
    category: cat.category,
    amount: cat.totalSpending,
    percentage: (cat.totalSpending / report.summary.subscriptionSpending) * 100,
  }));

  const insights = [
    ...report.anomalies.map((anomaly, i) => ({
      id: `anomaly-${i}`,
      type: 'anomaly' as const,
      priority: anomaly.severity,
      title: anomaly.type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase()),
      description: anomaly.description,
      amount: anomaly.affectedAmount,
    })),
    ...report.optimizations.map((opt, i) => ({
      id: `optimization-${i}`,
      type: 'saving' as const,
      priority: opt.priority,
      title: opt.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: opt.description,
      amount: opt.potentialSavings,
    })),
  ];

  return (
    <div className="space-y-8">
      {/* Report Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Analytics Report</CardTitle>
            <CardDescription>
              Period: {format(report.period.start, 'MMM d, yyyy')} -{' '}
              {format(report.period.end, 'MMM d, yyyy')}
            </CardDescription>
          </div>
          {onDownload && (
            <Button onClick={onDownload} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          )}
        </CardHeader>
      </Card>

      {/* Executive Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Spending
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(report.summary.totalSpending)}
            </div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Subscription Spending
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(report.summary.subscriptionSpending)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (report.summary.subscriptionSpending /
                  report.summary.totalSpending) *
                100
              ).toFixed(0)}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subscriptions
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.summary.activeSubscriptions}
            </div>
            <p className="text-xs text-muted-foreground">
              {report.summary.cancelledSubscriptions} cancelled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Savings Opportunities
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(report.summary.savingsOpportunities)}
            </div>
            <p className="text-xs text-muted-foreground">Per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Issues Detected
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.anomalies.length}</div>
            <p className="text-xs text-muted-foreground">
              {report.anomalies.filter(a => a.severity === 'high').length} high
              priority
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Predictions */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Predictions</CardTitle>
          <CardDescription>
            AI-powered forecasts based on your spending patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Next Month</span>
                <Badge
                  variant={
                    report.predictions.nextMonth.trend === 'increasing'
                      ? 'destructive'
                      : 'default'
                  }
                >
                  {report.predictions.nextMonth.trend === 'increasing' && (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  )}
                  {report.predictions.nextMonth.trend === 'decreasing' && (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {report.predictions.nextMonth.trend}
                </Badge>
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(report.predictions.nextMonth.predictedValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {(report.predictions.nextMonth.confidence * 100).toFixed(0)}%
                confidence
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Next Quarter</span>
                <Badge
                  variant={
                    report.predictions.nextQuarter.trend === 'increasing'
                      ? 'destructive'
                      : 'default'
                  }
                >
                  {report.predictions.nextQuarter.trend === 'increasing' && (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  )}
                  {report.predictions.nextQuarter.trend === 'decreasing' && (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {report.predictions.nextQuarter.trend}
                </Badge>
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  report.predictions.nextQuarter.predictedValue * 3
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {(report.predictions.nextQuarter.confidence * 100).toFixed(0)}%
                confidence
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Next Year</span>
                <Badge
                  variant={
                    report.predictions.nextYear.trend === 'increasing'
                      ? 'destructive'
                      : 'default'
                  }
                >
                  {report.predictions.nextYear.trend === 'increasing' && (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  )}
                  {report.predictions.nextYear.trend === 'decreasing' && (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {report.predictions.nextYear.trend}
                </Badge>
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  report.predictions.nextYear.predictedValue * 12
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {(report.predictions.nextYear.confidence * 100).toFixed(0)}%
                confidence
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spending Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Trends</CardTitle>
          <CardDescription>
            Historical spending patterns over the report period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimeSeriesChart
            data={timeSeriesData}
            title=""
            valueLabel="Spending"
            showPredictions={false}
            height={300}
          />
        </CardContent>
      </Card>

      {/* Category Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>
            Spending distribution across different categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryBreakdownChart data={categoryData} />

          <Separator className="my-4" />

          <div className="space-y-3">
            {report.categories.slice(0, 5).map((cat, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{cat.category}</span>
                    <span className="text-sm text-muted-foreground">
                      {cat.subscriptionCount} subscription
                      {cat.subscriptionCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatCurrency(cat.totalSpending)}/mo</span>
                    <span>Avg: {formatCurrency(cat.averageAmount)}</span>
                    {cat.trend && (
                      <span
                        className={
                          cat.trend.trend === 'up'
                            ? 'text-red-500'
                            : 'text-green-500'
                        }
                      >
                        {formatPercentage(cat.trend.changePercentage)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights and Recommendations */}
      <InsightsCard
        insights={insights}
        title="Insights & Recommendations"
        showAll={true}
      />

      {/* Detailed Findings */}
      {report.optimizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Opportunities</CardTitle>
            <CardDescription>
              Specific actions you can take to reduce spending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.optimizations.map((opt, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      {opt.type
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <Badge variant="default">
                      {formatCurrency(opt.potentialSavings)}/mo savings
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {opt.description}
                  </p>
                  {opt.subscriptions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {opt.subscriptions.map((sub, j) => (
                        <div
                          key={j}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{sub.name}</span>
                          <span className="text-muted-foreground">
                            {formatCurrency(sub.currentCost)}/mo
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Report generated on {format(new Date(), 'MMM d, yyyy h:mm a')}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              SubPilot Analytics Report
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
