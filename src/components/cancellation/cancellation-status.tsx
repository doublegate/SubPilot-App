'use client';

import { useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/ui/icons';
import { api } from '@/trpc/react';
import { ManualInstructionsDialog } from './manual-instructions-dialog';
import { formatDistanceToNow } from 'date-fns';

interface CancellationStatusProps {
  requestId: string;
}

export function CancellationStatus({ requestId }: CancellationStatusProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  const {
    data: status,
    isLoading,
    refetch,
  } = api.cancellation.getStatus.useQuery({
    requestId,
  });

  const { data: logs } = api.cancellation.getLogs.useQuery({
    requestId,
  });

  const retryMutation = api.cancellation.retry.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const confirmManualMutation = api.cancellation.confirmManual.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Icons.spinner className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading cancellation status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Cancellation request not found.
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'completed':
        return <Icons.check className="h-4 w-4" />;
      case 'failed':
        return <Icons.x className="h-4 w-4" />;
      case 'processing':
        return <Icons.spinner className="h-4 w-4 animate-spin" />;
      case 'pending':
        return <Icons.clock className="h-4 w-4" />;
      default:
        return <Icons.clock className="h-4 w-4" />;
    }
  };

  const getProgress = (statusValue: string) => {
    switch (statusValue) {
      case 'pending':
        return 25;
      case 'processing':
        return 75;
      case 'completed':
        return 100;
      case 'failed':
        return 100;
      default:
        return 0;
    }
  };

  const getStatusDescription = (statusValue: string) => {
    switch (statusValue) {
      case 'pending':
        return 'Your cancellation request is queued for processing.';
      case 'processing':
        return "We're actively working on cancelling your subscription.";
      case 'completed':
        return 'Your subscription has been successfully cancelled.';
      case 'failed':
        return 'We encountered an issue cancelling your subscription.';
      default:
        return 'Status unknown.';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(status.status)}
            Cancellation Status
          </CardTitle>
          <CardDescription>Request ID: {requestId}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badge and Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(status.status)}>
                {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
              </Badge>
            </div>

            <div className="space-y-2">
              <Progress value={getProgress(status.status)} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {getStatusDescription(status.status)}
              </p>
            </div>
          </div>

          {/* Success Information */}
          {status.status === 'completed' && (
            <Alert>
              <Icons.check className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Cancellation Confirmed</div>
                  {status.confirmationCode && (
                    <div>
                      Confirmation Code:{' '}
                      <code className="rounded bg-muted px-1">
                        {status.confirmationCode}
                      </code>
                    </div>
                  )}
                  {status.effectiveDate && (
                    <div>
                      Effective Date:{' '}
                      {new Date(status.effectiveDate).toLocaleDateString()}
                    </div>
                  )}
                  {status.refundAmount && (
                    <div>Refund Amount: ${status.refundAmount.toFixed(2)}</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Information */}
          {status.status === 'failed' && status.error && (
            <Alert variant="destructive">
              <Icons.alertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">Cancellation Failed</div>
                  <div>{status.error}</div>
                  <Button
                    size="sm"
                    onClick={() => retryMutation.mutate({ requestId })}
                    disabled={retryMutation.isPending}
                  >
                    {retryMutation.isPending ? (
                      <>
                        <Icons.spinner className="mr-2 h-3 w-3 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <Icons.rotateClockwise className="mr-2 h-3 w-3" />
                        Retry Cancellation
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Manual Instructions */}
          {status.status === 'pending' && status.manualInstructions && (
            <Alert>
              <Icons.book className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">
                    Manual Cancellation Required
                  </div>
                  <div>
                    We've prepared step-by-step instructions to help you cancel
                    this subscription.
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowInstructions(true)}
                  >
                    <Icons.book className="mr-2 h-3 w-3" />
                    View Instructions
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Activity Log */}
          {logs && logs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Activity Log</h4>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 text-xs">
                    <div
                      className={`mt-1 h-2 w-2 rounded-full ${
                        log.status === 'success'
                          ? 'bg-green-500'
                          : log.status === 'failure'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-muted-foreground">
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })}
                      </div>
                      <div>{log.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Instructions Dialog */}
      {status.manualInstructions && (
        <ManualInstructionsDialog
          isOpen={showInstructions}
          onClose={() => setShowInstructions(false)}
          instructions={status.manualInstructions}
          requestId={requestId}
          onConfirmation={confirmationData => {
            confirmManualMutation.mutate({
              requestId,
              confirmation: confirmationData,
            });
            setShowInstructions(false);
          }}
        />
      )}
    </div>
  );
}
