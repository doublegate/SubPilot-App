'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  Settings,
  FileText,
  Wifi,
  WifiOff,
  Server,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Info,
  Timer,
  Target,
} from 'lucide-react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

// Type definitions for system health data
interface PerformanceMetrics {
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

interface UptimeMetrics {
  uptime: string;
  lastDowntime: string | null;
  plannedMaintenance: string | null;
}

type ErrorBreakdown = Record<string, number>;

interface DetailedMetrics {
  performanceMetrics: PerformanceMetrics;
  uptimeMetrics: UptimeMetrics;
  errorBreakdown: ErrorBreakdown;
}

interface MethodHealth {
  available: boolean;
  successRate: number;
  recentRequests: number;
  avgResponseTime: number;
}

interface SystemLoad {
  cpu: number;
  memory: number;
  activeConnections: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  overall: {
    successRate: number;
    totalRecentRequests: number;
    avgResponseTimeMs: number;
    recentFailures: number;
  };
  methods: Record<string, MethodHealth>;
  system: SystemLoad;
  recommendations: string[];
  detailed?: DetailedMetrics;
}

interface ProviderStats {
  provider: string;
  totalAttempts: number;
  averageCompletionTime: number;
  successRate: number;
}

interface AlertData {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export function CancellationMonitoringDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    'day' | 'week' | 'month' | 'quarter' | 'year'
  >('month');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // API queries
  const {
    data: systemHealthData,
    isLoading: loadingHealth,
    refetch: refetchHealth,
  } = api.unifiedCancellationEnhanced.getSystemHealth.useQuery(
    { includeDetailedMetrics: true },
    {
      refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
    }
  );

  // Handle data updates manually instead of onSuccess
  useEffect(() => {
    if (systemHealthData) {
      setLastRefresh(new Date());
    }
  }, [systemHealthData]);

  // Type-safe system health with proper assertion
  const systemHealth = systemHealthData as SystemHealth | undefined;

  const {
    data: analytics,
    isLoading: loadingAnalytics,
    refetch: refetchAnalytics,
  } = api.unifiedCancellationEnhanced.getAnalytics.useQuery(
    {
      timeframe: selectedTimeframe,
      includeProviderBreakdown: true,
      includeTrends: true,
    },
    {
      refetchInterval: autoRefresh ? 60000 : false, // Refresh every minute
    }
  );

  // Manual refresh
  const handleRefresh = async () => {
    toast.info('Refreshing dashboard data...');
    await Promise.all([refetchHealth(), refetchAnalytics()]);
    setLastRefresh(new Date());
    toast.success('Dashboard refreshed');
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-orange-600 bg-orange-100';
      case 'unhealthy':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Get method icon
  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'api':
        return <Zap className="h-4 w-4" />;
      case 'automation':
        return <Settings className="h-4 w-4" />;
      case 'manual':
        return <FileText className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cancellation Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time system health and analytics dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loadingHealth || loadingAnalytics}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loadingHealth || loadingAnalytics ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <Wifi className="mr-2 h-4 w-4" />
            ) : (
              <WifiOff className="mr-2 h-4 w-4" />
            )}
            Auto-refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* System Status Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Overall Health */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  System Status
                </CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge
                    className={getStatusColor(
                      systemHealth?.status ?? 'unknown'
                    )}
                  >
                    {systemHealth?.status ?? 'Unknown'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {systemHealth?.overall?.successRate ?? 0}% success rate
                </p>
              </CardContent>
            </Card>

            {/* Total Requests */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Recent Requests
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemHealth?.overall?.totalRecentRequests ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Last hour</p>
              </CardContent>
            </Card>

            {/* Avg Response Time */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Response Time
                </CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemHealth?.overall?.avgResponseTimeMs
                    ? formatDuration(systemHealth.overall.avgResponseTimeMs)
                    : '0ms'}
                </div>
                <p className="text-xs text-muted-foreground">Average</p>
              </CardContent>
            </Card>

            {/* Recent Failures */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Recent Failures
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {systemHealth?.overall?.recentFailures ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>
          </div>

          {/* Method Status */}
          <Card>
            <CardHeader>
              <CardTitle>Cancellation Methods Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {systemHealth?.methods &&
                  Object.entries(systemHealth.methods).map(
                    ([method, methodData]) => {
                      const data = methodData as {
                        available: boolean;
                        successRate: number;
                        recentRequests: number;
                      };
                      return (
                        <div key={method} className="rounded-lg border p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getMethodIcon(method)}
                              <span className="font-medium capitalize">
                                {method}
                              </span>
                            </div>
                            <Badge
                              variant={
                                data.available ? 'default' : 'destructive'
                              }
                            >
                              {data.available ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Success Rate:</span>
                              <span className="font-medium">
                                {data.successRate}%
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Recent Requests:</span>
                              <span className="font-medium">
                                {data.recentRequests}
                              </span>
                            </div>
                            <Progress
                              value={data.successRate}
                              className="h-2"
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
              </div>
            </CardContent>
          </Card>

          {/* System Recommendations */}
          {systemHealth?.recommendations &&
            systemHealth.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" />
                    System Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {systemHealth.recommendations.map(
                      (recommendation: string, index: number) => (
                        <Alert key={index}>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{recommendation}</AlertDescription>
                        </Alert>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="health" className="space-y-6">
          {/* System Resources */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-2xl font-bold">
                  {systemHealth?.system?.cpu ?? 0}%
                </div>
                <Progress
                  value={systemHealth?.system?.cpu ?? 0}
                  className={`h-2 ${(systemHealth?.system?.cpu ?? 0) > 80 ? 'bg-red-100' : 'bg-green-100'}`}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-2xl font-bold">
                  {systemHealth?.system?.memory ?? 0}%
                </div>
                <Progress
                  value={systemHealth?.system?.memory ?? 0}
                  className={`h-2 ${(systemHealth?.system?.memory ?? 0) > 80 ? 'bg-red-100' : 'bg-green-100'}`}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Active Connections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-2xl font-bold">
                  {systemHealth?.system?.activeConnections ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Real-time connections
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
          {systemHealth?.detailed?.performanceMetrics && (
            <>
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Response Time Percentiles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {formatDuration(
                          systemHealth?.detailed?.performanceMetrics
                            ?.p50ResponseTime ?? 0
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        P50 (Median)
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {formatDuration(
                          systemHealth?.detailed?.performanceMetrics
                            ?.p95ResponseTime ?? 0
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">P95</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {formatDuration(
                          systemHealth?.detailed?.performanceMetrics
                            ?.p99ResponseTime ?? 0
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">P99</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Error Breakdown */}
              {systemHealth?.detailed?.errorBreakdown &&
                Object.keys(systemHealth.detailed.errorBreakdown).length >
                  0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Error Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(
                          systemHealth.detailed.errorBreakdown
                        ).map(([error, count]) => (
                          <div
                            key={error}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm">{error}</span>
                            <Badge variant="destructive">{String(count)}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Uptime Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Uptime Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>System Uptime:</span>
                      <span className="font-medium text-green-600">
                        {systemHealth?.detailed?.uptimeMetrics?.uptime ??
                          'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Downtime:</span>
                      <span className="font-medium">
                        {systemHealth?.detailed?.uptimeMetrics?.lastDowntime
                          ? new Date(
                              systemHealth.detailed.uptimeMetrics.lastDowntime
                            ).toLocaleString()
                          : 'None recorded'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Planned Maintenance:</span>
                      <span className="font-medium">
                        {systemHealth?.detailed?.uptimeMetrics
                          ?.plannedMaintenance
                          ? new Date(
                              systemHealth.detailed.uptimeMetrics.plannedMaintenance
                            ).toLocaleString()
                          : 'None scheduled'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Timeframe:</span>
            <div className="flex gap-1">
              {(['day', 'week', 'month', 'quarter', 'year'] as const).map(
                timeframe => (
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
                )
              )}
            </div>
          </div>

          {/* Summary Cards */}
          {analytics &&
            (() => {
              const analyticsData = analytics as {
                summary: {
                  total: number;
                  successful: number;
                  failed: number;
                  pending: number;
                  successRate: number;
                };
                methodBreakdown: Record<string, number>;
                successRates: Record<string, number>;
                providerAnalytics: ProviderStats[];
                insights: AlertData[];
              };
              return (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Requests
                        </CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {analyticsData.summary.total}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Completed
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {analyticsData.summary.successful}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Failed
                        </CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {analyticsData.summary.failed}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Pending
                        </CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                          {analyticsData.summary.pending}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Success Rate
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {analyticsData.summary.successRate}%
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Method Breakdown */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Method Usage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(analyticsData.methodBreakdown).map(
                            ([method, count]) => (
                              <div
                                key={method}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  {getMethodIcon(method)}
                                  <span className="capitalize">{method}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{count}</span>
                                  <div className="h-2 w-20 rounded-full bg-gray-200">
                                    <div
                                      className="h-2 rounded-full bg-blue-600"
                                      style={{
                                        width: `${(count / analyticsData.summary.total) * 100}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Success Rates by Method</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(analyticsData.successRates).map(
                            ([method, rate]) => (
                              <div
                                key={method}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  {getMethodIcon(method)}
                                  <span className="capitalize">{method}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{rate}%</span>
                                  <Progress value={rate} className="h-2 w-20" />
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Provider Analytics */}
                  {analyticsData.providerAnalytics.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Provider Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analyticsData.providerAnalytics.map(
                            (provider: ProviderStats, index: number) => (
                              <div
                                key={index}
                                className="flex items-center justify-between rounded-lg border p-3"
                              >
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {provider.provider}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {provider.totalAttempts} attempts •{' '}
                                    {provider.averageCompletionTime}min avg
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {provider.successRate}%
                                  </span>
                                  <Progress
                                    value={provider.successRate}
                                    className="h-2 w-20"
                                  />
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Insights */}
                  {analyticsData.insights &&
                    analyticsData.insights.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Analytics Insights</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analyticsData.insights.map(
                              (insight: AlertData, index: number) => (
                                <Alert
                                  key={index}
                                  variant={
                                    insight.type === 'warning'
                                      ? 'destructive'
                                      : 'default'
                                  }
                                >
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    <strong>{insight.title}:</strong>{' '}
                                    {insight.message}
                                  </AlertDescription>
                                </Alert>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </>
              );
            })()}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Trend Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="mx-auto mb-2 h-12 w-12" />
                  <p>
                    Performance trend visualization would be implemented here
                  </p>
                  <p className="text-sm">
                    Using a charting library like Recharts or Chart.js
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          {systemHealth?.detailed && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Response Time Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>P50 (Median)</span>
                      <span className="font-mono">
                        {formatDuration(
                          systemHealth?.detailed?.performanceMetrics
                            ?.p50ResponseTime ?? 0
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>P95</span>
                      <span className="font-mono">
                        {formatDuration(
                          systemHealth?.detailed?.performanceMetrics
                            ?.p95ResponseTime ?? 0
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>P99</span>
                      <span className="font-mono">
                        {formatDuration(
                          systemHealth?.detailed?.performanceMetrics
                            ?.p99ResponseTime ?? 0
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1 flex justify-between">
                        <span className="text-sm">CPU Usage</span>
                        <span className="text-sm font-medium">
                          {systemHealth?.system?.cpu ?? 0}%
                        </span>
                      </div>
                      <Progress
                        value={systemHealth?.system?.cpu ?? 0}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between">
                        <span className="text-sm">Memory Usage</span>
                        <span className="text-sm font-medium">
                          {systemHealth?.system?.memory ?? 0}%
                        </span>
                      </div>
                      <Progress
                        value={systemHealth?.system?.memory ?? 0}
                        className="h-2"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Connections</span>
                      <span className="text-sm font-medium">
                        {systemHealth?.system?.activeConnections ?? 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
