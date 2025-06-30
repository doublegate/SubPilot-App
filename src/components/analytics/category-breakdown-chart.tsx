'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

interface CategoryBreakdownChartProps {
  data: CategoryData[];
  height?: number;
}

// Define colors for categories
const CATEGORY_COLORS = {
  Streaming: '#06b6d4',
  Music: '#8b5cf6',
  Software: '#10b981',
  Gaming: '#f59e0b',
  News: '#ef4444',
  Fitness: '#84cc16',
  Education: '#3b82f6',
  Storage: '#6366f1',
  Food: '#f97316',
  Other: '#6b7280',
} as const;

const FALLBACK_COLORS = [
  '#06b6d4',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#84cc16',
  '#3b82f6',
  '#6366f1',
  '#f97316',
  '#6b7280',
  '#ec4899',
  '#14b8a6',
  '#f43f5e',
  '#a855f7',
  '#22c55e',
];

export function CategoryBreakdownChart({
  data,
  height = 400,
}: CategoryBreakdownChartProps) {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [sortBy, setSortBy] = useState<'amount' | 'percentage'>('amount');

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'amount') {
      return b.amount - a.amount;
    }
    return b.percentage - a.percentage;
  });

  // Get color for category
  const getColor = (category: string, index: number) => {
    return (
      CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] ||
      FALLBACK_COLORS[index % FALLBACK_COLORS.length]
    );
  };

  // Add colors to data
  const chartData = sortedData.map((item, index) => ({
    ...item,
    color: getColor(item.category, index),
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
  }: {
    active?: boolean;
    payload?: Array<{ payload: CategoryData; value: number }>;
  }) => {
    if (!active || !payload?.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium">{data.category}</p>
        <p className="text-sm text-blue-600">
          Amount: {formatCurrency(data.amount)}/mo
        </p>
        <p className="text-sm text-gray-600">{data.percentage.toFixed(2)}% of total</p>
      </div>
    );
  };

  // Calculate statistics
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
  const topCategory = sortedData[0];
  const diversityScore =
    data.length > 1
      ? (1 - Math.max(...data.map(d => d.percentage)) / 100) * 100
      : 0;

  return (
    <div className="space-y-4">
      {/* Chart Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={chartType === 'pie' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('pie')}
          >
            Pie Chart
          </Button>
          <Button
            variant={chartType === 'bar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('bar')}
          >
            Bar Chart
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Button
            variant={sortBy === 'amount' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('amount')}
          >
            Amount
          </Button>
          <Button
            variant={sortBy === 'percentage' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('percentage')}
          >
            Percentage
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">
            Total Monthly
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(totalAmount)}
          </div>
        </Card>

        {topCategory && (
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Top Category
            </div>
            <div className="text-lg font-bold">{topCategory.category}</div>
            <div className="text-sm text-muted-foreground">
              {formatCurrency(topCategory.amount)} ({topCategory.percentage.toFixed(2)}%)
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">
            Diversity Score
          </div>
          <div className="text-2xl font-bold">{diversityScore.toFixed(0)}%</div>
          <div className="text-sm text-muted-foreground">
            {diversityScore > 70
              ? 'Well diversified'
              : diversityScore > 40
                ? 'Moderately diversified'
                : 'Concentrated'}
          </div>
        </Card>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) =>
                  percentage > 5 ? `${category} ${percentage.toFixed(2)}%` : ''
                }
                outerRadius={Math.min(height * 0.35, 150)}
                fill="#8884d8"
                dataKey="amount"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="category"
                angle={-45}
                textAnchor="end"
                height={80}
                className="text-xs"
              />
              <YAxis tickFormatter={value => `$${value}`} className="text-xs" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Category Details Table */}
      <div className="space-y-2">
        <h4 className="font-medium">Category Details</h4>
        <div className="space-y-2">
          {sortedData.map((category, index) => (
            <div
              key={category.category}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{
                    backgroundColor: getColor(category.category, index),
                  }}
                />
                <span className="font-medium">{category.category}</span>
                <Badge variant="secondary">{category.percentage.toFixed(2)}%</Badge>
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {formatCurrency(category.amount)}
                </div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      {data.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Insights</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            {diversityScore < 30 && (
              <p>
                • Your spending is concentrated in one category. Consider if
                this aligns with your priorities.
              </p>
            )}
            {data.find(
              d => d.category === 'Streaming' && d.percentage > 40
            ) && (
              <p>
                • Streaming services make up a large portion of your
                subscriptions. Review if you&apos;re using all of them.
              </p>
            )}
            {data.length > 6 && (
              <p>
                • You have subscriptions across {data.length} categories.
                Consider consolidating where possible.
              </p>
            )}
            {topCategory && topCategory.percentage > 50 && (
              <p>
                • {topCategory.category} dominates your subscription spending at{' '}
                {topCategory.percentage.toFixed(2)}%.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
