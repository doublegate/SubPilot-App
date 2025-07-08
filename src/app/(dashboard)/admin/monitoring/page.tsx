import { Suspense } from 'react';
import { api } from '@/trpc/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  // Activity,
  Users,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  // BarChart3,
  Cpu,
  HardDrive,
  Wifi,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple line chart component
function SimpleLineChart({
  data,
  height = 100,
}: {
  data: number[];
  height?: number;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <div className="relative" style={{ height }}>
      <svg className="absolute inset-0 h-full w-full">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
          points={data
            .map((value, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = ((max - value) / range) * 100;
              return `${x},${y}`;
            })
            .join(' ')}
        />
      </svg>
    </div>
  );
}

async function MonitoringDashboard() {
  const [
    systemMetrics,
    apiMetrics,
    userActivity,
    errorRates,
    performanceMetrics,
  ] = await Promise.all([
    api.admin.getSystemMetrics(),
    api.admin.getApiMetrics(),
    api.admin.getUserActivity(),
    api.admin.getErrorRates(),
    api.admin.getPerformanceMetrics(),
  ]);

  return (
    <div className="space-y-6">
      {/* Real-time Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userActivity.activeNow}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {userActivity.trend > 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              {Math.abs(userActivity.trend)}% from last hour
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Requests</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiMetrics.requestsPerMinute}/min
            </div>
            <div className="text-xs text-muted-foreground">
              {apiMetrics.totalRequests.toLocaleString()} total today
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceMetrics.avgResponseTime}ms
            </div>
            <div className="text-xs text-muted-foreground">
              p95: {performanceMetrics.p95ResponseTime}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorRates.current}%</div>
            <div
              className={cn(
                'text-xs',
                parseFloat(errorRates.current) > 1
                  ? 'text-red-500'
                  : 'text-green-500'
              )}
            >
              {parseFloat(errorRates.current) > 1 ? 'Above' : 'Below'} threshold
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Resources */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Resources</CardTitle>
              <CardDescription>Real-time resource utilization</CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span>CPU Usage</span>
                </div>
                <span className="font-medium">{systemMetrics.cpu}%</span>
              </div>
              <Progress value={systemMetrics.cpu} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span>Memory Usage</span>
                </div>
                <span className="font-medium">{systemMetrics.memory}%</span>
              </div>
              <Progress value={systemMetrics.memory} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span>Disk Usage</span>
                </div>
                <span className="font-medium">{systemMetrics.disk}%</span>
              </div>
              <Progress value={systemMetrics.disk} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                  <span>Network I/O</span>
                </div>
                <span className="font-medium">
                  ↓ {systemMetrics.networkIn} MB/s | ↑{' '}
                  {systemMetrics.networkOut} MB/s
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Performance</CardTitle>
              <CardDescription>Response times and throughput</CardDescription>
            </div>
            <Select defaultValue="1h">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">Last 15 min</SelectItem>
                <SelectItem value="1h">Last hour</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Response Time (ms)</p>
              <SimpleLineChart data={performanceMetrics.responseTimeHistory} />
            </div>

            <div className="grid gap-4 text-sm md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-muted-foreground">Average</p>
                <p className="text-2xl font-bold">
                  {performanceMetrics.avgResponseTime}ms
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Median</p>
                <p className="text-2xl font-bold">
                  {performanceMetrics.medianResponseTime}ms
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">95th Percentile</p>
                <p className="text-2xl font-bold">
                  {performanceMetrics.p95ResponseTime}ms
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Users Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>User Activity</CardTitle>
          <CardDescription>Active users over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SimpleLineChart data={userActivity.timeline} height={150} />

            <div className="grid gap-4 text-sm md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-muted-foreground">Current</p>
                <p className="text-xl font-bold">{userActivity.activeNow}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Peak Today</p>
                <p className="text-xl font-bold">{userActivity.peakToday}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Daily Active</p>
                <p className="text-xl font-bold">{userActivity.dailyActive}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Monthly Active</p>
                <p className="text-xl font-bold">
                  {userActivity.monthlyActive}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Error Rates</CardTitle>
          <CardDescription>Error frequency by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {errorRates.byType.map(error => (
              <div key={error.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{error.type}</span>
                    <Badge
                      variant={
                        error.severity === 'critical'
                          ? 'destructive'
                          : error.severity === 'warning'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {error.severity}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {error.count} errors ({error.percentage}%)
                  </span>
                </div>
                <Progress
                  value={error.percentage}
                  className={cn(
                    'h-2',
                    error.severity === 'critical' &&
                      'bg-red-100 [&>div]:bg-red-500',
                    error.severity === 'warning' &&
                      'bg-yellow-100 [&>div]:bg-yellow-500'
                  )}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Endpoint Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Top Endpoints</CardTitle>
          <CardDescription>Most accessed API endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {apiMetrics.topEndpoints.map((endpoint, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-mono text-sm font-medium">
                    {endpoint.path}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {endpoint.method} • {endpoint.avgTime}ms avg
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {endpoint.calls.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">calls/hour</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MonitoringPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <p className="mt-2 text-muted-foreground">
          Real-time system metrics and performance monitoring
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-96" />
          </div>
        }
      >
        <MonitoringDashboard />
      </Suspense>
    </div>
  );
}
