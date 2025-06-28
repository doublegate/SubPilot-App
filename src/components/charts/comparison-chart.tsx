'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';

export interface ComparisonData {
  label: string;
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
}

interface ComparisonChartProps {
  data: ComparisonData[];
  title?: string;
  description?: string;
  height?: number;
  showPercentages?: boolean;
}

export const ComparisonChart = React.memo(function ComparisonChart({
  data,
  title = 'Period Comparison',
  description,
  height = 300,
  showPercentages = true,
}: ComparisonChartProps) {
  // Prepare data for chart
  const chartData = data.map(item => ({
    name: item.label,
    Current: item.current,
    Previous: item.previous,
    change: item.change,
    changePercentage: item.changePercentage,
  }));

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      dataKey: string;
      payload: {
        change: number;
        changePercentage: number;
      };
    }>;
    label?: string;
  }) => {
    if (!active || !payload?.length || !label) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
        <div className="mt-2 flex items-center gap-1 text-sm">
          {data.change > 0 ? (
            <ArrowUpIcon className="h-3 w-3 text-red-500" />
          ) : data.change < 0 ? (
            <ArrowDownIcon className="h-3 w-3 text-green-500" />
          ) : (
            <MinusIcon className="h-3 w-3 text-gray-500" />
          )}
          <span
            className={
              data.change > 0
                ? 'text-red-500'
                : data.change < 0
                  ? 'text-green-500'
                  : 'text-gray-500'
            }
          >
            {formatCurrency(Math.abs(data.change))} (
            {Math.abs(data.changePercentage).toFixed(1)}%)
          </span>
        </div>
      </div>
    );
  };

  // Custom label for bars
  const renderCustomLabel = (props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    value?: number;
    index?: number;
  }) => {
    const { x = 0, y = 0, width = 0, index = 0 } = props;
    const item = chartData[index];
    if (!item || !showPercentages) return null;

    const percentage = item.changePercentage;
    const isPositive = percentage > 0;
    const isNegative = percentage < 0;

    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill={isPositive ? '#ef4444' : isNegative ? '#22c55e' : '#6b7280'}
        textAnchor="middle"
        fontSize="12"
        fontWeight="500"
      >
        {isPositive && '+'}
        {percentage.toFixed(1)}%
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis
                tickFormatter={value => formatCurrency(value)}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />

              <Bar dataKey="Previous" fill="#e5e7eb" radius={[4, 4, 0, 0]}>
                <LabelList content={renderCustomLabel} position="top" />
              </Bar>
              <Bar dataKey="Current" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Total Change</p>
            <p className="text-lg font-semibold">
              {data.reduce((sum, item) => sum + item.change, 0) > 0 ? '+' : ''}
              {formatCurrency(
                Math.abs(data.reduce((sum, item) => sum + item.change, 0))
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Average Change</p>
            <p className="text-lg font-semibold">
              {data.reduce((sum, item) => sum + item.changePercentage, 0) /
                data.length >
              0
                ? '+'
                : ''}
              {(
                data.reduce((sum, item) => sum + item.changePercentage, 0) /
                data.length
              ).toFixed(1)}
              %
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Categories</p>
            <p className="text-lg font-semibold">{data.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
