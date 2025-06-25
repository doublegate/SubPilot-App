'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2,
  MoreVertical,
  RefreshCw,
  Unlink,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BankConnectionProps {
  connection: {
    id: string;
    institutionName: string;
    lastSync: Date | null;
    status: 'connected' | 'error' | 'syncing';
    error?: string | null;
    accountCount: number;
  };
  onSync?: (id: string) => void;
  onDisconnect?: (id: string) => void;
  onReconnect?: (id: string) => void;
}

export function BankConnectionCard({
  connection,
  onSync,
  onDisconnect,
  onReconnect,
}: BankConnectionProps) {
  const getStatusIcon = () => {
    switch (connection.status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />;
    }
  };

  const getStatusColor = () => {
    switch (connection.status) {
      case 'connected':
        return 'bg-green-500/10 text-green-600 hover:bg-green-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-600 hover:bg-red-500/20';
      case 'syncing':
        return 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20';
    }
  };

  const getStatusLabel = () => {
    switch (connection.status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'syncing':
        return 'Syncing';
    }
  };

  return (
    <Card
      className={`transition-all hover:shadow-lg ${connection.status === 'error' ? 'border-red-200' : ''}`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-slate-600 to-slate-800">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                {connection.institutionName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {connection.accountCount}{' '}
                {connection.accountCount === 1 ? 'account' : 'accounts'}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`More options for ${connection.institutionName}`}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">
                  More options for {connection.institutionName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {connection.status === 'connected' && onSync && (
                <DropdownMenuItem onClick={() => onSync(connection.id)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </DropdownMenuItem>
              )}
              {connection.status === 'error' && onReconnect && (
                <DropdownMenuItem onClick={() => onReconnect(connection.id)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reconnect
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDisconnect && (
                <DropdownMenuItem
                  onClick={() => onDisconnect(connection.id)}
                  className="text-red-600"
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  Disconnect Bank
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant="secondary" className={getStatusColor()}>
              {getStatusLabel()}
            </Badge>
          </div>
          {connection.lastSync && (
            <p className="text-sm text-muted-foreground">
              Last synced{' '}
              {formatDistanceToNow(connection.lastSync, { addSuffix: true })}
            </p>
          )}
        </div>

        {connection.error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <p className="font-medium">Connection Error</p>
            <p className="mt-1 text-xs">{connection.error}</p>
          </div>
        )}

        {connection.status === 'syncing' && (
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <p>Syncing transactions...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
