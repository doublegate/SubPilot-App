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
  ReferenceLine,
  Brush,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  predicted?: number;
  lowerBound?: number;
  upperBound?: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  valueLabel?: string;
  showPredictions?: boolean;
  showConfidenceInterval?: boolean;
  height?: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
}

export const TimeSeriesChart = React.memo(function TimeSeriesChart({
  data,
  title = 'Time Series Analysis',
  valueLabel = 'Value',
  showPredictions = true,
  showConfidenceInterval = true,
  height = 400,
  trend,
}: TimeSeriesChartProps) {
  // Format date labels
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip with proper Recharts types
  const CustomTooltip: React.FC<{
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
      dataKey: string;
    }>;
    label?: string;
  }> = ({ active, payload, label }) => {
    if (!active || !payload?.length || !label) return null;

    const actualValue = payload.find(p => p.dataKey === 'value');
    const predictedValue = payload.find(p => p.dataKey === 'predicted');

    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium">{formatDate(label)}</p>
        {actualValue && (
          <p className="text-sm" style={{ color: actualValue.color }}>
            Actual: {formatCurrency(actualValue.value)}
          </p>
        )}
        {predictedValue && (
          <p className="text-sm" style={{ color: predictedValue.color }}>
            Predicted: {formatCurrency(predictedValue.value)}
          </p>
        )}
      </div>
    );
  };

  // Find where predictions start
  const predictionStartIndex = data.findIndex(
    d => d.predicted !== undefined && d.value === undefined
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {trend && (
          <Badge
            variant={
              trend === 'increasing'
                ? 'destructive'
                : trend === 'decreasing'
                  ? 'default'
                  : 'secondary'
            }
          >
            {trend === 'increasing' && <TrendingUp className="mr-1 h-3 w-3" />}
            {trend === 'decreasing' && (
              <TrendingDown className="mr-1 h-3 w-3" />
            )}
            {trend === 'stable' && <Minus className="mr-1 h-3 w-3" />}
            {trend}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
              />
              <YAxis
                tickFormatter={value => formatCurrency(Number(value))}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Actual values */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 3 }}
                name={valueLabel}
                connectNulls={false}
              />

              {/* Predicted values */}
              {showPredictions && (
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#9333ea"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  name="Predicted"
                  connectNulls={false}
                />
              )}

              {/* Confidence interval */}
              {showConfidenceInterval && showPredictions && (
                <>
                  <Line
                    type="monotone"
                    dataKey="upperBound"
                    stroke="#9333ea"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    name="Upper Bound"
                    opacity={0.3}
                  />
                  <Line
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="#9333ea"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    name="Lower Bound"
                    opacity={0.3}
                  />
                </>
              )}

              {/* Prediction start line */}
              {predictionStartIndex > 0 && (
                <ReferenceLine
                  x={data[predictionStartIndex]?.date}
                  stroke="#666"
                  strokeDasharray="3 3"
                  label="Forecast"
                />
              )}

              {/* Brush for zooming */}
              {data.length > 10 && (
                <Brush
                  dataKey="date"
                  height={30}
                  stroke="#8884d8"
                  tickFormatter={formatDate}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});
