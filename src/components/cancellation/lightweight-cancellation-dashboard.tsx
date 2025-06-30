'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/ui/icons';
import { api } from '@/trpc/react';
import { CancellationConfirmationModal } from './cancellation-confirmation-modal';
import { LightweightCancellationModal } from './lightweight-cancellation-modal';
import { formatDistanceToNow } from 'date-fns';

export function LightweightCancellationDashboard() {
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [selectedSubscriptionName, setSelectedSubscriptionName] =
    useState<string>('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  const {
    data: history,
    isLoading,
    refetch,
  } = api.lightweightCancellation.getHistory.useQuery({
    limit: 20,
  });

  const { data: stats } = api.lightweightCancellation.getStats.useQuery();

  const { data: instructionsData } =
    api.lightweightCancellation.getStatus.useQuery(
      { requestId: selectedRequestId },
      { enabled: Boolean(selectedRequestId) && showInstructionsModal }
    );

  const handleViewInstructions = (
    requestId: string,
    subscriptionName: string
  ) => {
    setSelectedRequestId(requestId);
    setSelectedSubscriptionName(subscriptionName);
    setShowInstructionsModal(true);
  };

  const handleConfirmCancellation = (
    requestId: string,
    subscriptionName: string
  ) => {
    setSelectedRequestId(requestId);
    setSelectedSubscriptionName(subscriptionName);
    setShowConfirmationModal(true);
  };

  const handleConfirmed = () => {
    setShowConfirmationModal(false);
    setSelectedRequestId('');
    setSelectedSubscriptionName('');
    refetch();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Icons.checkCircle className="h-4 w-4" />;
      case 'pending':
        return <Icons.clock className="h-4 w-4" />;
      case 'failed':
        return <Icons.x className="h-4 w-4" />;
      default:
        return <Icons.info className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Icons.spinner className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading cancellation history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {stats.completedRequests}
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pendingRequests}
              </div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancellation History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.history className="h-5 w-5" />
            Cancellation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!history || history.length === 0 ? (
            <Alert>
              <Icons.info className="h-4 w-4" />
              <AlertDescription>
                No cancellation requests found. When you start a cancellation
                process, it will appear here.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {history.map(request => (
                <div
                  key={request.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {request.subscription.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={getStatusColor(request.status)}
                        >
                          {getStatusIcon(request.status)}
                          <span className="ml-1 capitalize">
                            {request.status}
                          </span>
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>
                          Requested{' '}
                          {formatDistanceToNow(new Date(request.createdAt))} ago
                        </p>
                        {request.completedAt && (
                          <p>
                            Completed{' '}
                            {formatDistanceToNow(new Date(request.completedAt))}{' '}
                            ago
                          </p>
                        )}
                        {request.confirmationCode && (
                          <p>Confirmation: {request.confirmationCode}</p>
                        )}
                        {request.effectiveDate && (
                          <p>
                            Effective:{' '}
                            {new Date(
                              request.effectiveDate
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleViewInstructions(
                                request.id,
                                request.subscription.name
                              )
                            }
                          >
                            <Icons.eye className="mr-1 h-3 w-3" />
                            View Instructions
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() =>
                              handleConfirmCancellation(
                                request.id,
                                request.subscription.name
                              )
                            }
                          >
                            <Icons.checkCircle className="mr-1 h-3 w-3" />
                            Confirm
                          </Button>
                        </>
                      )}

                      {request.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleViewInstructions(
                              request.id,
                              request.subscription.name
                            )
                          }
                        >
                          <Icons.eye className="mr-1 h-3 w-3" />
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CancellationConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        requestId={selectedRequestId}
        subscriptionName={selectedSubscriptionName}
        onConfirmed={handleConfirmed}
      />

      {/* Instructions Modal (simplified - reusing the main modal without create functionality) */}
      {showInstructionsModal && instructionsData && (
        <LightweightCancellationModal
          isOpen={showInstructionsModal}
          onClose={() => setShowInstructionsModal(false)}
          subscriptionId="" // Not needed for viewing existing
          subscriptionName={selectedSubscriptionName}
          onInstructionsGenerated={() => {}} // Not applicable
        />
      )}
    </div>
  );
}
