'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, BarChart3 } from 'lucide-react';

interface BillingStatsProps {
  stats: {
    totalRevenue: number;
    monthlyRevenue: number;
    activeSubscriptions: Array<{ planId: string; _count: number }>;
    churnRate: number;
  };
}

export function BillingStats({ stats }: BillingStatsProps) {
  const totalActiveSubscriptions = stats.activeSubscriptions.reduce(
    (sum, plan) => sum + plan._count,
    0
  );

  const statsCards = [
    {
      title: 'Total Revenue',
      value: `$${(stats.totalRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      description: 'All-time revenue',
      icon: DollarSign,
      trend: null,
    },
    {
      title: 'Monthly Revenue',
      value: `$${(stats.monthlyRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      description: 'Current month',
      icon: TrendingUp,
      trend: '+23%',
    },
    {
      title: 'Active Subscriptions',
      value: totalActiveSubscriptions.toLocaleString(),
      description: 'Paid accounts',
      icon: Users,
      trend: '+12%',
    },
    {
      title: 'Churn Rate',
      value: `${((stats.churnRate / totalActiveSubscriptions) * 100).toFixed(1)}%`,
      description: 'Last 30 days',
      icon: BarChart3,
      trend: '-2%',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
              {stat.trend && (
                <span className={`text-xs flex items-center ${
                  stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.trend}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}