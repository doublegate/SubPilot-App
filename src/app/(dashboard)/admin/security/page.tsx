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
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/admin/data-table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  // Shield,
  Lock,
  // Key,
  AlertTriangle,
  Search,
  Filter,
  Download,
  RefreshCw,
  UserX,
  Smartphone,
  Globe,
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';

interface AuditLogEntry {
  id: string;
  action: string;
  user: string;
  resource: string | null;
  result: string;
  ipAddress: string | null;
  timestamp: Date;
}

const auditLogColumns: ColumnDef<AuditLogEntry>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Time',
    cell: ({ row }) => {
      return new Date(row.getValue('timestamp')).toLocaleString();
    },
  },
  {
    accessorKey: 'action',
    header: 'Action',
    cell: ({ row }) => {
      return <Badge variant="outline">{row.getValue('action')}</Badge>;
    },
  },
  {
    accessorKey: 'user',
    header: 'User',
  },
  {
    accessorKey: 'resource',
    header: 'Resource',
    cell: ({ row }) => {
      const resource = row.getValue('resource') as string | null;
      return resource ? (
        <span className="font-mono text-xs">{resource}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    accessorKey: 'result',
    header: 'Result',
    cell: ({ row }) => {
      const result = row.getValue('result') as string;
      return (
        <Badge variant={result === 'success' ? 'default' : 'destructive'}>
          {result}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'ipAddress',
    header: 'IP Address',
    cell: ({ row }) => {
      const ip = row.getValue('ipAddress') as string | null;
      return ip ? (
        <span className="font-mono text-xs">{ip}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
];

async function SecurityDashboard() {
  const [securityStats, auditLogs, activeSessions, securityConfig, threats] =
    await Promise.all([
      api.admin.getSecurityStats(),
      api.admin.getAuditLogs({ limit: 100 }),
      api.admin.getActiveSessions(),
      api.admin.getSecurityConfig(),
      api.admin.getSecurityThreats(),
    ]);

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityStats.failedLogins}
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Locked Accounts
            </CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityStats.lockedAccounts}
            </div>
            <p className="text-xs text-muted-foreground">Currently locked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">2FA Enabled</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityStats.twoFactorUsers}%
            </div>
            <p className="text-xs text-muted-foreground">Of all users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Sessions
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityStats.activeSessions}
            </div>
            <p className="text-xs text-muted-foreground">Current sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Threats */}
      {threats.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Security Alerts</p>
              {threats.map((threat, i) => (
                <div key={i} className="text-sm">
                  • {threat.description} ({threat.severity})
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Security Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Security Configuration</CardTitle>
          <CardDescription>
            Configure security settings for the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Require 2FA for all users
                </p>
              </div>
              <Switch defaultChecked={securityConfig.require2FA} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Session Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically log out inactive users
                </p>
              </div>
              <Select defaultValue={securityConfig.sessionTimeout.toString()}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Max Login Attempts</Label>
                <p className="text-sm text-muted-foreground">
                  Lock account after failed attempts
                </p>
              </div>
              <Select defaultValue={securityConfig.maxLoginAttempts.toString()}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 attempts</SelectItem>
                  <SelectItem value="5">5 attempts</SelectItem>
                  <SelectItem value="10">10 attempts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Password Policy</Label>
                <p className="text-sm text-muted-foreground">
                  Enforce strong password requirements
                </p>
              </div>
              <Switch defaultChecked={securityConfig.enforcePasswordPolicy} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Currently active user sessions</CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activeSessions.map(session => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{session.userEmail}</p>
                    {session.isCurrent && (
                      <Badge variant="secondary" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{session.ipAddress}</span>
                    <span>{session.deviceInfo}</span>
                    <span>Active {session.lastActivity}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" disabled={session.isCurrent}>
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                Security and administrative actions
              </CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="User, action, or resource"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">Action Type</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="auth">Authentication</SelectItem>
                    <SelectItem value="admin">Administration</SelectItem>
                    <SelectItem value="user">User Actions</SelectItem>
                    <SelectItem value="system">System Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="result">Result</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="result">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
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
            <DataTable columns={auditLogColumns} data={auditLogs} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Security Management</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor security events and manage security settings
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
        <SecurityDashboard />
      </Suspense>
    </div>
  );
}
