'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { useState, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TrendData {
  period: string;
  total: number;
  recurring: number;
  nonRecurring: number;
}

interface SpendingTrendsChartProps {
  data: TrendData[];
  height?: number;
}

export const SpendingTrendsChart = memo(function SpendingTrendsChart({
  data,
  height = 400,
}: SpendingTrendsChartProps) {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [showTotal, setShowTotal] = useState(true);
  const [showRecurring, setShowRecurring] = useState(true);
  const [showNonRecurring, setShowNonRecurring] = useState(false);

  // Calculate trends with memoization
  const calculateTrend = useMemo(() => {
    return (values: number[]) => {
      if (values.length < 2) return 0;
      const recent = values.slice(-3);
      const previous = values.slice(-6, -3);
      if (previous.length === 0) return 0;

      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

      return ((recentAvg - previousAvg) / previousAvg) * 100;
    };
  }, []);

  const totalTrend = useMemo(
    () => calculateTrend(data.map(d => d.total)),
    [data, calculateTrend]
  );
  const recurringTrend = useMemo(
    () => calculateTrend(data.map(d => d.recurring)),
    [data, calculateTrend]
  );

  // Format period labels
  const formatPeriod = (period: string) => {
    // Handle different period formats
    if (period.includes('-')) {
      // Monthly format: 2025-01
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year ?? '0'), parseInt(month ?? '0') - 1);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
    } else {
      // Daily format: 2025-01-15
      const date = new Date(period);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Format currency for tooltips
  const formatCurrency = React.useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length || !label) return null;

    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium">{formatPeriod(label)}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;

  return (
    <div className="space-y-4">
      {/* Chart Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={chartType === 'area' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('area')}
          >
            Area Chart
          </Button>
          <Button
            variant={chartType === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('line')}
          >
            Line Chart
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showTotal ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowTotal(!showTotal)}
          >
            Total
          </Button>
          <Button
            variant={showRecurring ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowRecurring(!showRecurring)}
          >
            Recurring
          </Button>
          <Button
            variant={showNonRecurring ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowNonRecurring(!showNonRecurring)}
          >
            One-time
          </Button>
        </div>
      </div>

      {/* Trend Indicators */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Spending Trend</span>
            <div className="flex items-center gap-1">
              {totalTrend > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
              <span
                className={`text-sm font-medium ${totalTrend > 0 ? 'text-red-500' : 'text-green-500'}`}
              >
                {Math.abs(totalTrend).toFixed(1)}%
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Recurring Spending Trend
            </span>
            <div className="flex items-center gap-1">
              {recurringTrend > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
              <span
                className={`text-sm font-medium ${recurringTrend > 0 ? 'text-red-500' : 'text-green-500'}`}
              >
                {Math.abs(recurringTrend).toFixed(1)}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="period"
              tickFormatter={formatPeriod}
              className="text-xs"
            />
            <YAxis
              tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />

            {showTotal &&
              (chartType === 'area' ? (
                <Area
                  type="monotone"
                  dataKey="total"
                  stackId="1"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.3}
                  name="Total Spending"
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Total Spending"
                />
              ))}

            {showRecurring &&
              (chartType === 'area' ? (
                <Area
                  type="monotone"
                  dataKey="recurring"
                  stackId="2"
                  stroke="#9333ea"
                  fill="#9333ea"
                  fillOpacity={0.3}
                  name="Recurring"
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="recurring"
                  stroke="#9333ea"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Recurring"
                />
              ))}

            {showNonRecurring &&
              (chartType === 'area' ? (
                <Area
                  type="monotone"
                  dataKey="nonRecurring"
                  stackId="3"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.3}
                  name="One-time"
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="nonRecurring"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="One-time"
                />
              ))}
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      {useMemo(() => {
        const avgTotal =
          data.reduce((sum, d) => sum + d.total, 0) / data.length;
        const avgRecurring =
          data.reduce((sum, d) => sum + d.recurring, 0) / data.length;
        const totalSum = data.reduce((sum, d) => sum + d.total, 0);
        const recurringSum = data.reduce((sum, d) => sum + d.recurring, 0);
        const recurringPercentage =
          totalSum > 0 ? (recurringSum / totalSum) * 100 : 0;

        return (
          <div className="grid gap-4 text-sm md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="font-medium text-muted-foreground">
                Average Total
              </div>
              <div className="text-lg font-bold">
                {formatCurrency(avgTotal)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-medium text-muted-foreground">
                Average Recurring
              </div>
              <div className="text-lg font-bold">
                {formatCurrency(avgRecurring)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-medium text-muted-foreground">
                Recurring %
              </div>
              <div className="text-lg font-bold">
                {recurringPercentage.toFixed(0)}%
              </div>
            </div>
          </div>
        );
      }, [data, formatCurrency])}
    </div>
  );
});
