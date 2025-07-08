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
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Server,
  Package,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Cpu,
  HardDrive,
  Clock,
} from 'lucide-react';

async function SystemInfo() {
  const [systemInfo, envVars, featureFlags, jobStatus] = await Promise.all([
    api.admin.getSystemInfo(),
    api.admin.getEnvironmentVariables(),
    api.admin.getFeatureFlags(),
    api.admin.getBackgroundJobStatus(),
  ]);

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Node Version</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemInfo.nodeVersion}</div>
            <p className="text-xs text-muted-foreground">Runtime Environment</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Environment</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemInfo.environment}</div>
            <p className="text-xs text-muted-foreground">Current Environment</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemInfo.uptime}</div>
            <p className="text-xs text-muted-foreground">System Uptime</p>
          </CardContent>
        </Card>
      </div>

      {/* System Details */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Server and application details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Application</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Next.js Version</span>
                    <span className="font-mono">{systemInfo.nextVersion}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prisma Version</span>
                    <span className="font-mono">{systemInfo.prismaVersion}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">TypeScript Version</span>
                    <span className="font-mono">{systemInfo.typescriptVersion}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Resources</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Memory Usage</span>
                    <span className="font-mono">{systemInfo.memoryUsage}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CPU Usage</span>
                    <span className="font-mono">{systemInfo.cpuUsage}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Disk Usage</span>
                    <span className="font-mono">{systemInfo.diskUsage}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>
            Non-sensitive environment configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {envVars.map(env => (
              <div
                key={env.key}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{env.key}</p>
                  <p className="text-sm text-muted-foreground">
                    {env.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {env.masked ? '••••••••' : env.value}
                  </span>
                  {env.source && (
                    <Badge variant="outline" className="text-xs">
                      {env.source}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Toggle application features
              </CardDescription>
            </div>
            <Button size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {featureFlags.map(flag => (
              <div
                key={flag.key}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{flag.name}</p>
                    {flag.enabled ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {flag.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={flag.enabled ? "default" : "outline"}
                  onClick={() => {/* Toggle feature flag */}}
                >
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Background Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Background Jobs</CardTitle>
          <CardDescription>
            Status of background processing jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {jobStatus.map(job => (
              <div
                key={job.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{job.name}</p>
                    <Badge
                      variant={
                        job.status === 'running'
                          ? 'default'
                          : job.status === 'idle'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {job.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Last run: {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}
                    {job.nextRun && ` | Next: ${new Date(job.nextRun).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {job.processed !== undefined && (
                    <span className="text-sm text-muted-foreground">
                      {job.processed} processed
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={job.status === 'running'}
                  >
                    Run Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
          <CardDescription>
            Clear application caches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Clearing caches may temporarily impact performance while they rebuild.
              </AlertDescription>
            </Alert>
            
            <div className="grid gap-2 md:grid-cols-3">
              <Button variant="outline">
                <HardDrive className="mr-2 h-4 w-4" />
                Clear Database Cache
              </Button>
              <Button variant="outline">
                <Package className="mr-2 h-4 w-4" />
                Clear API Cache
              </Button>
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Clear All Caches
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SystemPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">System Configuration</h1>
        <p className="mt-2 text-muted-foreground">
          Manage system settings and monitor application health
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-96" />
          </div>
        }
      >
        <SystemInfo />
      </Suspense>
    </div>
  );
}