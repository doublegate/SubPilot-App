'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Lightbulb,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface Insight {
  id: string;
  type: 'saving' | 'warning' | 'tip' | 'anomaly';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  amount?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface InsightsCardProps {
  insights: Insight[];
  title?: string;
  showAll?: boolean;
  maxItems?: number;
  onShowAll?: () => void;
}

export const InsightsCard = React.memo(function InsightsCard({
  insights,
  title = 'Insights & Recommendations',
  showAll = false,
  maxItems = 3,
  onShowAll,
}: InsightsCardProps) {
  const displayedInsights = showAll ? insights : insights.slice(0, maxItems);

  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'saving':
        return <TrendingDown className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'anomaly':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'tip':
        return <Lightbulb className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: Insight['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
            <p className="text-lg font-medium">You're all set!</p>
            <p className="text-sm text-muted-foreground">
              No new insights or recommendations at this time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {insights.length} {insights.length === 1 ? 'insight' : 'insights'}{' '}
            found
          </CardDescription>
        </div>
        {!showAll && insights.length > maxItems && onShowAll && (
          <Button variant="outline" size="sm" onClick={onShowAll}>
            View All
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedInsights.map(insight => (
            <div
              key={insight.id}
              className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="mt-0.5">{getIcon(insight.type)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{insight.title}</h4>
                  <Badge
                    variant={getPriorityColor(insight.priority)}
                    className="text-xs"
                  >
                    {insight.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {insight.description}
                </p>
                {insight.amount !== undefined && (
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <DollarSign className="h-3 w-3" />
                    <span
                      className={
                        insight.type === 'saving' ? 'text-green-600' : ''
                      }
                    >
                      {formatCurrency(insight.amount)}
                    </span>
                    {insight.type === 'saving' && (
                      <span className="text-muted-foreground">
                        potential savings
                      </span>
                    )}
                  </div>
                )}
                {insight.action && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={insight.action.onClick}
                  >
                    {insight.action.label}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
