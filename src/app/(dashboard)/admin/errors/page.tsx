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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/admin/data-table';
// import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Bug,
  AlertTriangle,
  XCircle,
  CheckCircle,
  // ChevronDown,
  // ChevronRight,
  // Copy,
  ExternalLink,
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

interface ErrorLog {
  id: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  userId?: string;
  userEmail?: string;
  endpoint?: string;
  statusCode?: number;
  resolved: boolean;
}

const errorColumns: ColumnDef<ErrorLog>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Time',
    cell: ({ row }) => {
      return new Date(row.getValue('timestamp')).toLocaleString();
    },
  },
  {
    accessorKey: 'level',
    header: 'Level',
    cell: ({ row }) => {
      const level = row.getValue('level') as string;
      return (
        <Badge
          variant={
            level === 'error'
              ? 'destructive'
              : level === 'warning'
                ? 'secondary'
                : 'outline'
          }
        >
          {level}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'message',
    header: 'Message',
    cell: ({ row }) => {
      const message = row.getValue('message') as string;
      return (
        <div className="max-w-md truncate" title={message}>
          {message}
        </div>
      );
    },
  },
  {
    accessorKey: 'userEmail',
    header: 'User',
    cell: ({ row }) => {
      const email = row.getValue('userEmail') as string | undefined;
      return email ? (
        <span className="text-sm">{email}</span>
      ) : (
        <span className="text-sm text-muted-foreground">System</span>
      );
    },
  },
  {
    accessorKey: 'endpoint',
    header: 'Endpoint',
    cell: ({ row }) => {
      const endpoint = row.getValue('endpoint') as string | undefined;
      return endpoint ? (
        <span className="font-mono text-xs">{endpoint}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    accessorKey: 'resolved',
    header: 'Status',
    cell: ({ row }) => {
      const resolved = row.getValue('resolved');
      return resolved ? (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          <span className="text-xs">Resolved</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-orange-600">
          <AlertCircle className="h-3 w-3" />
          <span className="text-xs">Open</span>
        </div>
      );
    },
  },
];

// function ErrorDetails({ error }: { error: ErrorLog }) {
//   const [isExpanded, setIsExpanded] = useState(false);
//
//   return (
//     <div className="mt-2 border-t pt-2">
//       <Button
//         variant="ghost"
//         size="sm"
//         onClick={() => setIsExpanded(!isExpanded)}
//         className="w-full justify-start"
//       >
//         {isExpanded ? (
//           <ChevronDown className="mr-2 h-4 w-4" />
//         ) : (
//           <ChevronRight className="mr-2 h-4 w-4" />
//         )}
//         Stack Trace
//       </Button>
//
//       {isExpanded && error.stack && (
//         <div className="mt-2 rounded-lg bg-muted p-3">
//           <div className="mb-2 flex items-center justify-between">
//             <span className="text-xs text-muted-foreground">Stack Trace</span>
//             <Button
//               size="sm"
//               variant="ghost"
//               onClick={() => navigator.clipboard.writeText(error.stack!)}
//             >
//               <Copy className="h-3 w-3" />
//             </Button>
//           </div>
//           <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
//             {error.stack}
//           </pre>
//         </div>
//       )}
//     </div>
//   );
// }

async function ErrorsDashboard() {
  const [errorStats, recentErrors, errorTrends, commonErrors] =
    await Promise.all([
      api.admin.getErrorStats(),
      api.admin.getRecentErrors({ limit: 100 }),
      api.admin.getErrorTrends(),
      api.admin.getCommonErrors(),
    ]);

  return (
    <div className="space-y-6">
      {/* Error Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorStats.total}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {errorStats.unresolved}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorStats.errorRate}%</div>
            <div
              className={cn(
                'text-xs',
                errorStats.trend > 0 ? 'text-red-500' : 'text-green-500'
              )}
            >
              {errorStats.trend > 0 ? '↑' : '↓'} {Math.abs(errorStats.trend)}%
              from yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Affected Users
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorStats.affectedUsers}</div>
            <p className="text-xs text-muted-foreground">Unique users</p>
          </CardContent>
        </Card>
      </div>

      {/* Common Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Common Errors</CardTitle>
          <CardDescription>
            Most frequent errors in the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {commonErrors.map((error, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{error.message}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{error.count} occurrences</span>
                    <span>{error.lastSeen}</span>
                    {error.endpoint && (
                      <span className="font-mono">{error.endpoint}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={error.resolved ? 'secondary' : 'destructive'}>
                    {error.resolved ? 'Resolved' : 'Open'}
                  </Badge>
                  <Button size="sm" variant="ghost">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>
                Detailed error tracking and debugging
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Error message or stack trace"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeRange">Time Range</Label>
                <Select defaultValue="24h">
                  <SelectTrigger id="timeRange">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>

            {/* Logs Table */}
            <DataTable columns={errorColumns} data={recentErrors} />
          </div>
        </CardContent>
      </Card>

      {/* Error Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Error Trends</CardTitle>
          <CardDescription>
            Error frequency over the last 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {errorTrends.byDay.map((day, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm font-medium">{day.date}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{
                        width: `${(day.errors / Math.max(...errorTrends.byDay.map(d => d.errors))) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm text-muted-foreground">
                    {day.errors}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ErrorsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Error Management</h1>
        <p className="mt-2 text-muted-foreground">
          Track, analyze, and resolve application errors
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
        <ErrorsDashboard />
      </Suspense>
    </div>
  );
}
