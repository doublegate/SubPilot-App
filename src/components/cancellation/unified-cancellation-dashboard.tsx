'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Brain,
  FileText,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/trpc/react';
import { UnifiedCancellationModal } from './unified-cancellation-modal';

// Type definitions for tRPC return data
interface MethodHealth {
  available: boolean;
  successRate: number;
  recentRequests: number;
}

interface SystemHealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  methods: Record<string, MethodHealth>;
  overall: {
    averageSuccessRate: number;
    totalRecentRequests: number;
  };
  recommendations: string[];
}

interface AnalyticsSummary {
  total: number;
  successRate: number;
  completed: number;
  failed: number;
  pending: number;
  averageTime: number;
}

interface MethodStats {
  successRate: number;
  total: number;
  averageTime: number;
  completed: number;
  failed: number;
  pending: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  methodComparison: Record<string, MethodStats>;
  recommendations: string[];
}

interface SubscriptionDetails {
  id: string;
  name: string;
  amount: number;
}

interface ProviderDetails {
  name: string;
  logo: string | null;
  type: string;
}

interface HistoryRequest {
  id: string;
  subscription: SubscriptionDetails;
  provider: ProviderDetails | null;
  status: string;
  method: string;
  priority: string;
  confirmationCode: string | null;
  effectiveDate: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  error: string | null;
}

interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  status: string;
  nextBilling: Date | null;
}

interface SubscriptionsData {
  subscriptions: Subscription[];
}

export function UnifiedCancellationDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    'day' | 'week' | 'month'
  >('month');
  const [selectedSubscription, setSelectedSubscription] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // API queries with proper typing
  const analyticsQuery = api.unifiedCancellation.getAnalytics.useQuery({
    timeframe: selectedTimeframe,
  });

  const historyQuery = api.unifiedCancellation.getHistory.useQuery({
    limit: 20,
  });

  const systemHealthQuery = api.unifiedCancellation.getSystemHealth.useQuery(
    undefined,
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  const subscriptionsQuery = api.subscriptions.getAll.useQuery();

  // Type guard functions
  const isSystemHealthData = (data: unknown): data is SystemHealthData => {
    return (
      typeof data === 'object' &&
      data !== null &&
      'status' in data &&
      'methods' in data
    );
  };

  const isAnalyticsData = (data: unknown): data is AnalyticsData => {
    return (
      typeof data === 'object' &&
      data !== null &&
      'summary' in data &&
      'methodComparison' in data
    );
  };

  const isHistoryRequestArray = (data: unknown): data is HistoryRequest[] => {
    return Array.isArray(data) && (data.length === 0 || 'subscription' in data[0]);
  };

  const isSubscriptionsData = (data: unknown): data is SubscriptionsData => {
    return (
      typeof data === 'object' &&
      data !== null &&
      'subscriptions' in data &&
      Array.isArray((data as SubscriptionsData).subscriptions)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'processing':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'api':
        return <Zap className="h-4 w-4" />;
      case 'event_driven':
        return <Brain className="h-4 w-4" />;
      case 'lightweight':
        return <FileText className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Unified Cancellation Dashboard</h2>
          <p className="text-gray-600">
            Monitor and manage subscription cancellations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void analyticsQuery.refetch().catch(console.error);
              void historyQuery.refetch().catch(console.error);
              void systemHealthQuery.refetch().catch(console.error);
            }}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health */}
      {systemHealthQuery.data && isSystemHealthData(systemHealthQuery.data) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
              <Badge className={getHealthColor(systemHealthQuery.data.status)}>
                {systemHealthQuery.data.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {Object.entries(systemHealthQuery.data.methods).map(
                ([method, health]) => (
                  <div
                    key={method}
                    className="rounded-lg border p-3 text-center"
                  >
                    <div className="mb-2 flex items-center justify-center gap-2">
                      {getMethodIcon(method)}
                      <span className="font-medium capitalize">
                        {method.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mb-1 text-2xl font-bold">
                      {health.successRate}%
                    </div>
                    <div className="text-sm text-gray-600">
                      {health.recentRequests} recent requests
                    </div>
                    <Badge
                      variant={health.available ? 'default' : 'destructive'}
                      className="mt-2"
                    >
                      {health.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                )
              )}
            </div>

            {systemHealthQuery.data.recommendations.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {systemHealthQuery.data.recommendations.map(
                      (rec, index) => (
                        <div key={index}>• {rec}</div>
                      )
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analytics Overview */}
      {analyticsQuery.data && isAnalyticsData(analyticsQuery.data) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsQuery.data.summary.total}
              </div>
              <p className="text-xs text-gray-600">Last {selectedTimeframe}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analyticsQuery.data.summary.successRate}%
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                {analyticsQuery.data.summary.completed} completed
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsQuery.data.summary.averageTime}m
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <Clock className="mr-1 h-3 w-3" />
                Average completion
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {analyticsQuery.data.summary.pending}
              </div>
              <p className="text-xs text-gray-600">In progress</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="history">Recent Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="methods">Method Comparison</TabsTrigger>
          <TabsTrigger value="subscriptions">Quick Cancel</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Cancellation Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {historyQuery.data && 
               isHistoryRequestArray(historyQuery.data) && 
               historyQuery.data.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No cancellation requests yet
                </div>
              ) : (
                <div className="space-y-3">
                  {historyQuery.data && 
                   isHistoryRequestArray(historyQuery.data) && 
                   historyQuery.data.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-3 w-3 rounded-full ${getStatusColor(request.status)}`}
                        />
                        <div>
                          <p className="font-medium">
                            {request.subscription.name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {getMethodIcon(request.method)}
                            <span className="capitalize">
                              {request.method.replace('_', ' ')}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(request.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            request.status === 'completed'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {request.status}
                        </Badge>
                        {request.confirmationCode && (
                          <p className="mt-1 text-xs text-gray-600">
                            Code: {request.confirmationCode}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="mb-4 flex gap-2">
            {(['day', 'week', 'month'] as const).map(timeframe => (
              <Button
                key={timeframe}
                variant={
                  selectedTimeframe === timeframe ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => setSelectedTimeframe(timeframe)}
              >
                {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              </Button>
            ))}
          </div>

          {analyticsQuery.data && isAnalyticsData(analyticsQuery.data) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Completed
                    </span>
                    <span className="font-medium">
                      {analyticsQuery.data.summary.completed}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Failed
                    </span>
                    <span className="font-medium">
                      {analyticsQuery.data.summary.failed}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      Pending
                    </span>
                    <span className="font-medium">
                      {analyticsQuery.data.summary.pending}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analyticsQuery.data.recommendations.map(
                      (rec, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 text-sm"
                        >
                          <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                          <span>{rec}</span>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          {analyticsQuery.data && isAnalyticsData(analyticsQuery.data) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Object.entries(analyticsQuery.data.methodComparison).map(
                ([method, stats]) => (
                  <Card key={method}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {getMethodIcon(method)}
                        {method.charAt(0).toUpperCase() +
                          method.slice(1).replace('_', ' ')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>Success Rate</span>
                          <span className="font-medium">
                            {stats.successRate}%
                          </span>
                        </div>
                        <Progress value={stats.successRate} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-600">Total</p>
                          <p className="font-medium">{stats.total}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Avg. Time</p>
                          <p className="font-medium">{stats.averageTime}m</p>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-green-600">Completed</span>
                          <span>{stats.completed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Failed</span>
                          <span>{stats.failed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-600">Pending</span>
                          <span>{stats.pending}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <p className="text-sm text-gray-600">
                Click on any subscription to start the cancellation process
              </p>
            </CardHeader>
            <CardContent>
              {subscriptionsQuery.data && 
               isSubscriptionsData(subscriptionsQuery.data) && 
               subscriptionsQuery.data.subscriptions?.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No active subscriptions found
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {subscriptionsQuery.data && 
                   isSubscriptionsData(subscriptionsQuery.data) && 
                   subscriptionsQuery.data.subscriptions
                    ?.filter((sub) => sub.status === 'active')
                    .map((subscription) => (
                      <div
                        key={subscription.id}
                        className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-gray-50"
                        onClick={() =>
                          setSelectedSubscription({
                            id: subscription.id,
                            name: subscription.name,
                          })
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{subscription.name}</p>
                            <p className="text-sm text-gray-600">
                              ${subscription.amount} / {subscription.frequency}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">Active</Badge>
                            {subscription.nextBilling && (
                              <p className="mt-1 text-xs text-gray-600">
                                Next:{' '}
                                {new Date(
                                  subscription.nextBilling
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Unified Cancellation Modal */}
      {selectedSubscription && (
        <UnifiedCancellationModal
          subscriptionId={selectedSubscription.id}
          subscriptionName={selectedSubscription.name}
          isOpen={!!selectedSubscription}
          onClose={() => setSelectedSubscription(null)}
          onSuccess={() => {
            setSelectedSubscription(null);
            // Refresh data
            void historyQuery.refetch().catch(console.error);
            void analyticsQuery.refetch().catch(console.error);
            void subscriptionsQuery.refetch().catch(console.error);
          }}
        />
      )}
    </div>
  );
}