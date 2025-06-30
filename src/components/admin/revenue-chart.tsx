'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Mock data for now
const data = [
  { month: 'Jan', revenue: 12500 },
  { month: 'Feb', revenue: 14800 },
  { month: 'Mar', revenue: 16200 },
  { month: 'Apr', revenue: 18900 },
  { month: 'May', revenue: 21500 },
  { month: 'Jun', revenue: 24200 },
  { month: 'Jul', revenue: 26800 },
  { month: 'Aug', revenue: 29500 },
  { month: 'Sep', revenue: 32100 },
  { month: 'Oct', revenue: 35800 },
  { month: 'Nov', revenue: 39200 },
  { month: 'Dec', revenue: 42500 },
];

export function RevenueChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Growth</CardTitle>
        <CardDescription>Monthly recurring revenue over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  'Revenue',
                ]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ fill: '#06b6d4' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
