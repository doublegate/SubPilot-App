'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    totalActive: number;
    monthlySpend: number;
    yearlySpend: number;
    percentageChange?: number;
    upcomingRenewals?: number;
    unusedSubscriptions?: number;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statsCards = [
    {
      title: 'Active Subscriptions',
      value: stats.totalActive.toString(),
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Monthly Spend',
      value: formatCurrency(stats.monthlySpend),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      change: stats.percentageChange,
    },
    {
      title: 'Yearly Projection',
      value: formatCurrency(stats.yearlySpend),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      title: 'Upcoming Renewals',
      value: stats.upcomingRenewals?.toString() ?? '0',
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      subtitle: 'Next 30 days',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`rounded-lg p-2 ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.change !== undefined && (
              <p className="mt-1 flex items-center text-xs text-muted-foreground">
                {stat.change > 0 ? (
                  <>
                    <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                    <span className="text-green-600">+{stat.change}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                    <span className="text-red-600">{stat.change}%</span>
                  </>
                )}
                <span className="ml-1">from last month</span>
              </p>
            )}
            {stat.subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.subtitle}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {stats.unusedSubscriptions && stats.unusedSubscriptions > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50 md:col-span-2 lg:col-span-4 dark:border-yellow-900 dark:bg-yellow-900/10">
          <CardHeader className="flex flex-row items-center space-x-2 pb-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-base">
              Optimization Opportunity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You have{' '}
              <span className="font-semibold text-yellow-700 dark:text-yellow-600">
                {stats.unusedSubscriptions} unused subscriptions
              </span>{' '}
              that haven&apos;t been accessed in over 60 days. Consider
              reviewing these to save money.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
