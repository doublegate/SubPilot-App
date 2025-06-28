"use client";

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { api } from "~/trpc/react";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock,
  RefreshCw,
  FileText,
  DollarSign,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import type { CancellationStatus as Status } from "~/server/services/cancellation.service";

interface CancellationStatusProps {
  requestId: string;
  subscriptionName: string;
}

export function CancellationStatus({ requestId, subscriptionName }: CancellationStatusProps) {
  const utils = api.useUtils();

  // Query cancellation status
  const { data: status, isLoading } = api.cancellation.status.useQuery(
    { requestId },
    {
      refetchInterval: (query) => {
        // Poll every 5 seconds if still processing
        const data = query.state.data;
        if (data?.status === "pending" || data?.status === "processing") {
          return 5000;
        }
        return false;
      },
    }
  );

  // Retry mutation
  const { mutate: retry, isPending: isRetrying } = api.cancellation.retry.useMutation({
    onSuccess: () => {
      void utils.cancellation.status.invalidate({ requestId });
    },
  });

  const getStatusIcon = (status?: Status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case "failed":
        return <XCircle className="h-8 w-8 text-red-600" />;
      case "processing":
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
      case "pending":
        return <Clock className="h-8 w-8 text-yellow-600" />;
      default:
        return <FileText className="h-8 w-8 text-gray-600" />;
    }
  };

  const getStatusColor = (status?: Status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "failed":
        return "text-red-600 bg-red-100";
      case "processing":
        return "text-blue-600 bg-blue-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusMessage = (status?: Status) => {
    switch (status) {
      case "completed":
        return "Cancellation successful!";
      case "failed":
        return "Cancellation failed";
      case "processing":
        return "Processing your cancellation...";
      case "pending":
        return "Cancellation pending";
      default:
        return "Unknown status";
    }
  };

  const getProgressValue = (status?: Status) => {
    switch (status) {
      case "completed":
        return 100;
      case "failed":
        return 100;
      case "processing":
        return 66;
      case "pending":
        return 33;
      default:
        return 0;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(status?.status)}
              <div>
                <CardTitle>{getStatusMessage(status?.status)}</CardTitle>
                <CardDescription className="mt-1">
                  {subscriptionName}
                </CardDescription>
              </div>
            </div>
            <Badge className={getStatusColor(status?.status)}>
              {status?.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={getProgressValue(status?.status)} className="h-2" />

          {/* Success Details */}
          {status?.status === "completed" && (
            <div className="space-y-3">
              {status.confirmationCode && (
                <div className="flex items-center justify-between rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                  <span className="text-sm font-medium">Confirmation Code</span>
                  <code className="rounded bg-green-100 px-2 py-1 text-sm font-mono dark:bg-green-900">
                    {status.confirmationCode}
                  </code>
                </div>
              )}
              
              {status.effectiveDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Effective: {format(new Date(status.effectiveDate), "MMMM d, yyyy")}</span>
                </div>
              )}

              {status.refundAmount && status.refundAmount > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <DollarSign className="h-4 w-4" />
                  <span>Refund of ${status.refundAmount.toFixed(2)} will be processed</span>
                </div>
              )}
            </div>
          )}

          {/* Error Details */}
          {status?.status === "failed" && status.error && (
            <div className="space-y-3">
              <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {status.error.message}
                </p>
                {status.error.code && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                    Error code: {status.error.code}
                  </p>
                )}
              </div>

              <Button
                onClick={() => retry({ requestId })}
                disabled={isRetrying}
                variant="outline"
                className="w-full"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Cancellation
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Processing Message */}
          {status?.status === "processing" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                We're working on cancelling your subscription. This usually takes a few minutes.
              </p>
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Please wait while we process your request...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}