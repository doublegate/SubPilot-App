'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// Separator import removed - not used in this component
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  Zap,
  Brain,
  FileText,
  RefreshCw,
  ExternalLink,
  Copy,
  Calendar,
} from 'lucide-react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

// Interface for manual instructions structure
interface ManualInstructions {
  instructions: {
    steps: string[];
    contactInfo: {
      website?: string;
      phone?: string;
      email?: string;
    };
  };
}

interface CancellationInitiateResult {
  requestId: string;
  orchestrationId: string;
  subscriptionUrl?: string;
  success: boolean;
  method: string;
}

interface TimelineEvent {
  status: string;
  action: string;
  message: string;
  timestamp: string | Date;
  metadata?: Record<string, unknown> | null;
}

interface RealtimeUpdate {
  requestId: string;
  orchestrationId: string;
  status: string;
  action: string;
  message: string;
  timestamp: string;
  type?: string;
  title?: string; // Optional title property
  metadata?: Record<string, unknown> | null;
}

interface CancellationMethod {
  id: string;
  name: string;
  description: string;
  estimatedTime: string;
  successRate: number;
  icon?: string;
  isRecommended?: boolean;
  requiresInteraction?: boolean;
}

interface CancellationStatus {
  status: string;
  method: string;
  completedSteps: number;
  totalSteps: number;
  progress: number;
  message?: string;
  error?: string;
  confirmationCode?: string;
  effectiveDate?: string | Date;
  cancellationUrl?: string;
  supportUrl?: string;
  customerServiceNumber?: string;
  instructions?: string;
  manualInstructions?: ManualInstructions;
}

interface NextStep {
  action: string;
  instructions: string;
  url?: string;
  estimatedTime?: string;
}

interface AlternativeOption {
  method: string;
  instructions: string;
  estimatedTime?: string;
}

interface StatusQueryData {
  status: CancellationStatus;
  timeline: TimelineEvent[];
  nextSteps?: NextStep[];
  alternativeOptions?: AlternativeOption[];
}

interface UnifiedCancellationModalProps {
  subscriptionId: string;
  subscriptionName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: {
    success: boolean;
    requestId: string;
    method: string;
  }) => void;
}

export function UnifiedCancellationModal({
  subscriptionId,
  subscriptionName,
  isOpen,
  onClose,
  onSuccess,
}: UnifiedCancellationModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<
    'auto' | 'manual' | 'api' | 'automation'
  >('auto');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [notes, setNotes] = useState('');
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [orchestrationId, setOrchestrationId] = useState<string | null>(null);
  const [realtimeUpdates, setRealtimeUpdates] = useState<RealtimeUpdate[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // API calls
  const canCancelQuery = api.unifiedCancellation.canCancel.useQuery(
    { subscriptionId },
    { enabled: isOpen }
  );

  const availableMethodsQuery =
    api.unifiedCancellation.getAvailableMethods.useQuery(
      { subscriptionId },
      { enabled: isOpen }
    );

  const providerCapabilitiesQuery =
    api.unifiedCancellation.getProviderCapabilities.useQuery(
      { subscriptionId },
      { enabled: isOpen }
    );

  const statusQuery = api.unifiedCancellation.getStatus.useQuery(
    {
      requestId: currentRequestId!,
      orchestrationId: orchestrationId ?? undefined,
    },
    {
      enabled: !!currentRequestId,
      refetchInterval: 2000,
    }
  );

  const initiateMutation = api.unifiedCancellation.initiate.useMutation({
    onSuccess: (result: CancellationInitiateResult) => {
      setCurrentRequestId(result.requestId);
      setOrchestrationId(result.orchestrationId);

      // Setup real-time updates
      if (result.subscriptionUrl) {
        setupRealtimeUpdates(result.subscriptionUrl);
      }

      toast.success('Cancellation request initiated successfully');
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to initiate cancellation: ${errorMessage}`);
    },
  });

  const retryMutation = api.unifiedCancellation.retry.useMutation({
    onSuccess: result => {
      setCurrentRequestId(result.requestId);
      setOrchestrationId(result.orchestrationId);
      toast.success('Cancellation retry initiated');
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to retry cancellation: ${errorMessage}`);
    },
  });

  const cancelMutation = api.unifiedCancellation.cancel.useMutation({
    onSuccess: () => {
      toast.success('Cancellation request cancelled');
      cleanup();
      onClose();
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to cancel request: ${errorMessage}`);
    },
  });

  const confirmManualMutation =
    api.unifiedCancellation.confirmManual.useMutation({
      onSuccess: () => {
        toast.success('Manual cancellation confirmed');
        onSuccess?.({
          success: true,
          requestId: currentRequestId ?? '',
          method:
            (statusQuery.data as unknown as StatusQueryData)?.status?.method ??
            'manual',
        });
        cleanup();
        onClose();
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to confirm cancellation: ${errorMessage}`);
      },
    });

  // Setup real-time updates via SSE
  const setupRealtimeUpdates = (url: string) => {
    if (eventSource) {
      eventSource.close();
    }

    const es = new EventSource(url);

    es.onmessage = event => {
      try {
        const data = JSON.parse(
          event.data as string
        ) as Partial<RealtimeUpdate>;
        setRealtimeUpdates(prev => [
          ...prev,
          {
            requestId: data.requestId ?? '',
            orchestrationId: data.orchestrationId ?? '',
            status: data.status ?? '',
            action: data.action ?? '',
            message: data.message ?? '',
            timestamp: new Date().toISOString(),
            metadata: data.metadata ?? null,
          },
        ]);

        if (data.type === 'cancellation.orchestration_progress') {
          // Force refetch status on progress updates
          void statusQuery.refetch();
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    es.onerror = error => {
      console.error('SSE error:', error);
    };

    setEventSource(es);
  };

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setCurrentRequestId(null);
    setOrchestrationId(null);
    setRealtimeUpdates([]);
  }, [eventSource]);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen, cleanup]);

  const handleInitiate = () => {
    if (!canCancelQuery.data?.canCancel) {
      toast.error(
        canCancelQuery.data?.message ?? 'Cannot cancel this subscription'
      );
      return;
    }

    initiateMutation.mutate({
      subscriptionId,
      priority,
      reason: notes,
      method: selectedMethod === 'auto' ? 'api' : selectedMethod,
      userPreference: {
        preferredMethod: selectedMethod === 'auto' ? 'api' : selectedMethod,
        allowFallback: true,
        notificationPreferences: {
          realTime: true,
          email: true,
          sms: false,
        },
      },
    });
  };

  const handleRetry = (escalate = false) => {
    if (!currentRequestId) return;

    retryMutation.mutate({
      requestId: currentRequestId,
      escalate,
    });
  };

  const handleCancel = () => {
    if (!currentRequestId) return;

    cancelMutation.mutate({
      requestId: currentRequestId,
      reason: 'Cancelled by user',
    });
  };

  const handleConfirmManual = (wasSuccessful: boolean) => {
    if (!currentRequestId) return;

    const confirmationCode = wasSuccessful
      ? (document.getElementById('confirmation-code') as HTMLInputElement)
          ?.value
      : undefined;
    const confirmationNotes = (
      document.getElementById('confirmation-notes') as HTMLTextAreaElement
    )?.value;

    confirmManualMutation.mutate({
      requestId: currentRequestId,
      wasSuccessful,
      confirmationCode,
      notes: confirmationNotes,
      effectiveDate: wasSuccessful ? new Date() : undefined,
    });
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success('Copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy to clipboard:', err);
        toast.error('Failed to copy');
      });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'api':
        return <Zap className="h-4 w-4" />;
      case 'event_driven':
        return <Brain className="h-4 w-4" />;
      case 'lightweight':
        return <FileText className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getProgressPercentage = () => {
    if (!statusQuery.data) return 0;
    const statusData = statusQuery.data as unknown as StatusQueryData;
    const { completedSteps, totalSteps } = statusData.status;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  // Loading state
  if (canCancelQuery.isLoading || availableMethodsQuery.isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading cancellation options...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Cannot cancel
  if (!canCancelQuery.data?.canCancel) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cannot Cancel Subscription</DialogTitle>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {canCancelQuery.data?.message ??
                'This subscription cannot be cancelled at this time.'}
            </AlertDescription>
          </Alert>
          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show status if we have an active request
  if (currentRequestId && statusQuery.data) {
    const queryData = statusQuery.data as unknown as StatusQueryData;
    const status = queryData.status as {
      status: string;
      method: string;
      completedSteps: number;
      totalSteps: number;
      error?: string;
      confirmationCode?: string;
      effectiveDate?: string | Date;
      manualInstructions?: {
        instructions: {
          steps: string[];
          contactInfo: {
            website?: string;
            phone?: string;
            email?: string;
          };
        };
      };
    };
    const timeline = queryData.timeline;
    const nextSteps = queryData.nextSteps;
    const alternativeOptions = queryData.alternativeOptions;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getStatusIcon(status.status)}
              Cancellation Progress - {subscriptionName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getMethodIcon(status.method)}
                  {status.method.charAt(0).toUpperCase() +
                    status.method.slice(1)}{' '}
                  Method
                  <Badge
                    variant={
                      status.status === 'completed' ? 'default' : 'secondary'
                    }
                  >
                    {status.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{status.method} in progress</span>
                    <span>
                      {status.completedSteps} / {status.totalSteps}
                    </span>
                  </div>
                  <Progress value={getProgressPercentage()} className="h-2" />
                </div>

                {status.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{status.error}</AlertDescription>
                  </Alert>
                )}

                {status.confirmationCode && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className="font-medium">Confirmation Code</p>
                      <p className="text-sm text-gray-600">
                        {status.confirmationCode}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(status.confirmationCode ?? '')
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {status.effectiveDate && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Effective Date</p>
                      <p className="text-sm text-gray-600">
                        {status.effectiveDate
                          ? new Date(status.effectiveDate).toLocaleDateString()
                          : 'Not specified'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Instructions */}
            {status.manualInstructions &&
              typeof status.manualInstructions === 'object' &&
              'instructions' in status.manualInstructions && (
                <Card>
                  <CardHeader>
                    <CardTitle>Manual Cancellation Instructions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Steps to Cancel</h4>
                      <ol className="list-inside list-decimal space-y-1 text-sm">
                        {(
                          status.manualInstructions as ManualInstructions
                        )?.instructions?.steps?.map(
                          (step: string, index: number) => (
                            <li key={index}>{step}</li>
                          )
                        ) ?? <li>No steps available</li>}
                      </ol>
                    </div>

                    {(status.manualInstructions as ManualInstructions)
                      ?.instructions?.contactInfo?.website && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(
                              (status.manualInstructions as ManualInstructions)
                                ?.instructions?.contactInfo?.website ?? '',
                              '_blank'
                            )
                          }
                        >
                          <ExternalLink className="mr-1 h-4 w-4" />
                          Go to Website
                        </Button>
                        {(status.manualInstructions as ManualInstructions)
                          ?.instructions?.contactInfo?.phone && (
                          <Badge variant="outline">
                            📞{' '}
                            {
                              (status.manualInstructions as ManualInstructions)
                                ?.instructions?.contactInfo?.phone
                            }
                          </Badge>
                        )}
                      </div>
                    )}

                    {status.status === 'pending' &&
                      status.method === 'lightweight' && (
                        <div className="border-t pt-4">
                          <h4 className="mb-3 font-medium">
                            Confirm Completion
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="confirmation-code">
                                Confirmation Code (optional)
                              </Label>
                              <input
                                id="confirmation-code"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                placeholder="Enter confirmation code if provided"
                              />
                            </div>
                            <div>
                              <Label htmlFor="confirmation-notes">
                                Additional Notes
                              </Label>
                              <Textarea
                                id="confirmation-notes"
                                className="mt-1"
                                placeholder="Any additional information about the cancellation"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleConfirmManual(true)}
                                disabled={confirmManualMutation.isPending}
                              >
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Confirm Success
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleConfirmManual(false)}
                                disabled={confirmManualMutation.isPending}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                Report Failed
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              )}

            <Tabs defaultValue="timeline" className="w-full">
              <TabsList>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="next-steps">Next Steps</TabsTrigger>
                <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
                <TabsTrigger value="real-time">Live Updates</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="space-y-3">
                {timeline.map((event: TimelineEvent, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    {getStatusIcon(event.status)}
                    <div className="flex-1">
                      <p className="font-medium">{event.action}</p>
                      <p className="text-sm text-gray-600">{event.message}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="next-steps" className="space-y-2">
                {nextSteps?.map((step: NextStep, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded bg-blue-50 p-2"
                  >
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">{step.instructions}</span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="alternatives" className="space-y-2">
                {alternativeOptions?.map(
                  (option: AlternativeOption, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded bg-gray-50 p-2"
                    >
                      <span className="text-sm">{option.instructions}</span>
                    </div>
                  )
                )}

                {status.status === 'failed' && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => handleRetry(false)}>
                      <RefreshCw className="mr-1 h-4 w-4" />
                      Retry
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetry(true)}
                    >
                      Escalate & Retry
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="real-time"
                className="max-h-60 space-y-2 overflow-y-auto"
              >
                {realtimeUpdates.map(
                  (update: RealtimeUpdate, index: number) => (
                    <div key={index} className="rounded bg-gray-50 p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {update.type ?? update.action}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(
                            update.timestamp as string | Date
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-1">{update.message ?? update.title}</p>
                    </div>
                  )
                )}
                {realtimeUpdates.length === 0 && (
                  <p className="py-4 text-center text-gray-500">
                    No real-time updates yet
                  </p>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-between">
              <div className="flex gap-2">
                {(status.status === 'pending' ||
                  status.status === 'processing') && (
                  <Button variant="destructive" onClick={handleCancel}>
                    Cancel Request
                  </Button>
                )}
              </div>
              <Button onClick={onClose}>
                {status.status === 'completed' ? 'Done' : 'Close'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Initial cancellation setup
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cancel {subscriptionName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Provider Info */}
          {providerCapabilitiesQuery.data && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cancellation Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="font-medium">Success Rate</p>
                    <p>
                      {Math.round(
                        providerCapabilitiesQuery.data.capabilities
                          .estimatedSuccessRate * 100
                      )}
                      %
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Est. Time</p>
                    <p>
                      {
                        providerCapabilitiesQuery.data.capabilities
                          .averageTimeMinutes
                      }{' '}
                      min
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Difficulty</p>
                    <Badge variant="outline">
                      {providerCapabilitiesQuery.data.capabilities.difficulty}
                    </Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Recommended method:{' '}
                  <strong>
                    {providerCapabilitiesQuery.data.recommendedMethod}
                  </strong>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Cancellation Method</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedMethod}
                onValueChange={(value: string) =>
                  setSelectedMethod(
                    value as 'auto' | 'manual' | 'api' | 'automation'
                  )
                }
              >
                {availableMethodsQuery.data?.methods.map(
                  (method: CancellationMethod) => (
                    <div
                      key={method.id}
                      className="flex items-start space-x-3 rounded-lg border p-3"
                    >
                      <RadioGroupItem value={method.id} className="mt-1" />
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          {getMethodIcon(method.id)}
                          <span className="font-medium">{method.name}</span>
                          {method.isRecommended && (
                            <Badge variant="default" className="text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="mb-2 text-sm text-gray-600">
                          {method.description}
                        </p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>⏱️ {method.estimatedTime}</span>
                          <span>✅ {method.successRate}% success</span>
                          {method.requiresInteraction && (
                            <span>👤 Interaction required</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader>
              <CardTitle>Cancellation Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Priority</Label>
                <RadioGroup
                  value={priority}
                  onValueChange={(value: string) =>
                    setPriority(value as 'low' | 'normal' | 'high')
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="low" />
                    <Label htmlFor="low">Low - Normal processing</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal">Normal - Standard priority</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="high" />
                    <Label htmlFor="high">High - Expedited processing</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any specific instructions or information..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleInitiate}
              disabled={initiateMutation.isPending}
            >
              {initiateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Start Cancellation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
