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
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
// import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Database,
  HardDrive,
  Activity,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Table,
} from 'lucide-react';
import { DataTable } from '@/components/admin/data-table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { type ColumnDef } from '@tanstack/react-table';

interface TableInfo {
  name: string;
  rowCount: number;
  size: string;
  indexSize: string;
  lastAnalyzed: Date | null;
}

const tableColumns: ColumnDef<TableInfo>[] = [
  {
    accessorKey: 'name',
    header: 'Table Name',
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <Table className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{row.original.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'rowCount',
    header: 'Rows',
    cell: ({ row }) => {
      return new Intl.NumberFormat().format(row.original.rowCount);
    },
  },
  {
    accessorKey: 'size',
    header: 'Data Size',
  },
  {
    accessorKey: 'indexSize',
    header: 'Index Size',
  },
  {
    accessorKey: 'lastAnalyzed',
    header: 'Last Analyzed',
    cell: ({ row }) => {
      const date = row.original.lastAnalyzed;
      return date ? (
        new Date(date).toLocaleDateString()
      ) : (
        <span className="text-muted-foreground">Never</span>
      );
    },
  },
];

async function DatabaseDashboard() {
  try {
    const [
      dbStats,
      connectionPool,
      tables,
      queryPerformance,
      backupStatus,
      migrations,
    ] = await Promise.all([
      api.admin.getDatabaseStats(),
      api.admin.getConnectionPoolStatus(),
      api.admin.getTableInfo(),
      api.admin.getQueryPerformance(),
      api.admin.getBackupStatus(),
      api.admin.getMigrationStatus(),
    ]);

    return (
      <div className="space-y-6">
        {/* Database Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Database Size
              </CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dbStats.totalSize}</div>
              <p className="text-xs text-muted-foreground">
                Total storage used
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat().format(dbStats.totalRows)}
              </div>
              <p className="text-xs text-muted-foreground">Across all tables</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connections</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {connectionPool.active}/{connectionPool.max}
              </div>
              <p className="text-xs text-muted-foreground">Active / Max</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Query Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dbStats.avgQueryTime}ms</div>
              <p className="text-xs text-muted-foreground">Average response</p>
            </CardContent>
          </Card>
        </div>

        {/* Connection Pool Status */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Pool</CardTitle>
            <CardDescription>
              Database connection pool status and metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Active Connections</span>
                  <span className="font-medium">{connectionPool.active}</span>
                </div>
                <Progress
                  value={(connectionPool.active / connectionPool.max) * 100}
                />
              </div>

              <div className="grid gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Idle</p>
                  <p className="font-medium">{connectionPool.idle}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Waiting</p>
                  <p className="font-medium">{connectionPool.waiting}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Timeout</p>
                  <p className="font-medium">{connectionPool.timeout}s</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pool Health</p>
                  <div className="flex items-center gap-1">
                    {connectionPool.health === 'healthy' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="font-medium capitalize">
                      {connectionPool.health}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Query Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Query Performance</CardTitle>
                <CardDescription>
                  Recent query execution metrics
                </CardDescription>
              </div>
              <Button size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Analyze
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {queryPerformance.slowQueries.map((query, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          query.duration > 1000 ? 'destructive' : 'secondary'
                        }
                      >
                        {query.duration}ms
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {query.count} calls
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {query.lastExecuted}
                    </span>
                  </div>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {query.query}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Database Tables</CardTitle>
                <CardDescription>Table sizes and row counts</CardDescription>
              </div>
              <Button size="sm" variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                Optimize
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable columns={tableColumns} data={tables} />
          </CardContent>
        </Card>

        {/* Backup Status */}
        <Card>
          <CardHeader>
            <CardTitle>Backup Status</CardTitle>
            <CardDescription>
              Database backup schedule and history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">Last Backup</p>
                  <p className="text-sm text-muted-foreground">
                    {backupStatus.lastBackup
                      ? new Date(backupStatus.lastBackup).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <Badge
                  variant={
                    backupStatus.status === 'success'
                      ? 'default'
                      : 'destructive'
                  }
                >
                  {backupStatus.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">Next Scheduled Backup</p>
                  <p className="text-sm text-muted-foreground">
                    {backupStatus.nextBackup
                      ? new Date(backupStatus.nextBackup).toLocaleString()
                      : 'Not scheduled'}
                  </p>
                </div>
                <Button size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Backup Now
                </Button>
              </div>

              {backupStatus.backups.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent Backups</h4>
                  {backupStatus.backups.map((backup, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{new Date(backup.date).toLocaleDateString()}</span>
                      <span className="text-muted-foreground">
                        {backup.size}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Migration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Database Migrations</CardTitle>
            <CardDescription>
              Schema migration history and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Current Version</p>
                  <p className="text-2xl font-bold">{migrations.current}</p>
                </div>
                <Badge variant="secondary">{migrations.pending} pending</Badge>
              </div>

              {migrations.history.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent Migrations</h4>
                  {migrations.history.map((migration, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-2"
                    >
                      <div className="flex items-center gap-2">
                        {migration.direction === 'up' ? (
                          <ArrowUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-mono text-sm">
                          {migration.name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(migration.appliedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error('Error fetching database info:', error);
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load database information. Please check your admin
          permissions and try again.
        </AlertDescription>
      </Alert>
    );
  }
}

export default function DatabasePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Database Management</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor database performance and manage backups
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
        <DatabaseDashboard />
      </Suspense>
    </div>
  );
}
