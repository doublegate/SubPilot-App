'use client';

import { api } from '@/trpc/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, TrendingUp, Tag, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategorizationStatsProps {
  className?: string;
}

export function CategorizationStats({ className }: CategorizationStatsProps) {
  const { data: stats, isLoading } = api.categorization.getStats.useQuery();

  if (isLoading) {
    return <CategorizationStatsSkeleton className={className} />;
  }

  if (!stats) {
    return null;
  }

  // Calculate overall progress
  const totalItems = stats.transactions.total + stats.subscriptions.total;
  const categorizedItems =
    stats.transactions.categorized + stats.subscriptions.categorized;
  const overallPercentage =
    totalItems > 0 ? Math.round((categorizedItems / totalItems) * 100) : 0;

  // Get top categories
  const topCategories = stats.categoryBreakdown
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {/* Overall Progress */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Categorization Progress
          </CardTitle>
          <CardDescription>
            {categorizedItems} of {totalItems} items categorized
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{overallPercentage}%</span>
            </div>
            <Progress value={overallPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Transactions Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {stats.transactions.percentage}%
            </span>
            <span className="text-sm text-muted-foreground">categorized</span>
          </div>
          <Progress
            value={stats.transactions.percentage}
            className="mt-2 h-1.5"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {stats.transactions.categorized} of {stats.transactions.total}
          </p>
        </CardContent>
      </Card>

      {/* Subscriptions Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {stats.subscriptions.percentage}%
            </span>
            <span className="text-sm text-muted-foreground">categorized</span>
          </div>
          <Progress
            value={stats.subscriptions.percentage}
            className="mt-2 h-1.5"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {stats.subscriptions.categorized} of {stats.subscriptions.total}
          </p>
        </CardContent>
      </Card>

      {/* Top Categories */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Tag className="h-4 w-4" />
            Top Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topCategories.length > 0 ? (
              topCategories.map((category, index) => (
                <div
                  key={category.category}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">
                      {category.category}
                    </span>
                    {index === 0 && (
                      <TrendingUp className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {category.count} {category.count === 1 ? 'item' : 'items'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No categorized items yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            AI Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Model</span>
              <span className="font-mono text-xs">GPT-4o-mini</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Status</span>
              <span className="text-green-600 dark:text-green-400">Active</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Accuracy</span>
              <span>~95%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CategorizationStatsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>

      {[1, 2, 3, 4].map(i => (
        <Card key={i} className={i === 3 ? 'md:col-span-2' : ''}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-2 h-1.5 w-full" />
            <Skeleton className="mt-2 h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
