'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
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
  Calendar
} from 'lucide-react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

interface UnifiedCancellationModalProps {
  subscriptionId: string;
  subscriptionName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

export function UnifiedCancellationModal({
  subscriptionId,
  subscriptionName,
  isOpen,
  onClose,
  onSuccess,
}: UnifiedCancellationModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('auto');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [notes, setNotes] = useState('');
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [orchestrationId, setOrchestrationId] = useState<string | null>(null);
  const [realtimeUpdates, setRealtimeUpdates] = useState<any[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // API calls
  const canCancelQuery = api.unifiedCancellation.canCancel.useQuery(
    { subscriptionId },
    { enabled: isOpen }
  );

  const availableMethodsQuery = api.unifiedCancellation.getAvailableMethods.useQuery(
    { subscriptionId },
    { enabled: isOpen }
  );

  const providerCapabilitiesQuery = api.unifiedCancellation.getProviderCapabilities.useQuery(
    { subscriptionId },
    { enabled: isOpen }
  );

  const statusQuery: any = api.unifiedCancellation.getStatus.useQuery(
    { 
      requestId: currentRequestId!, 
      orchestrationId: orchestrationId || undefined 
    },
    { 
      enabled: !!currentRequestId,
      refetchInterval: 2000,
    }
  );

  const initiateMutation = api.unifiedCancellation.initiate.useMutation({
    onSuccess: (result) => {
      setCurrentRequestId(result.requestId);
      setOrchestrationId(result.orchestrationId);
      
      // Setup real-time updates
      if ((result as any).subscriptionUrl) {
        setupRealtimeUpdates((result as any).subscriptionUrl);
      }
      
      toast.success('Cancellation request initiated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to initiate cancellation: ${error.message}`);
    },
  });

  const retryMutation = api.unifiedCancellation.retry.useMutation({
    onSuccess: (result) => {
      setCurrentRequestId(result.requestId);
      setOrchestrationId(result.orchestrationId);
      toast.success('Cancellation retry initiated');
    },
    onError: (error) => {
      toast.error(`Failed to retry cancellation: ${error.message}`);
    },
  });

  const cancelMutation = api.unifiedCancellation.cancel.useMutation({
    onSuccess: () => {
      toast.success('Cancellation request cancelled');
      cleanup();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to cancel request: ${error.message}`);
    },
  });

  const confirmManualMutation = api.unifiedCancellation.confirmManual.useMutation({
    onSuccess: () => {
      toast.success('Manual cancellation confirmed');
      onSuccess?.(statusQuery.data);
      cleanup();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to confirm cancellation: ${error.message}`);
    },
  });

  // Setup real-time updates via SSE
  const setupRealtimeUpdates = (url: string) => {
    if (eventSource) {
      eventSource.close();
    }

    const es = new EventSource(url);
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setRealtimeUpdates(prev => [...prev, { ...data, timestamp: new Date() }]);
        
        if (data.type === 'cancellation.orchestration_progress') {
          // Force refetch status on progress updates
          statusQuery.refetch();
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    es.onerror = (error) => {
      console.error('SSE error:', error);
    };

    setEventSource(es);
  };

  // Cleanup function
  const cleanup = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setCurrentRequestId(null);
    setOrchestrationId(null);
    setRealtimeUpdates([]);
  };

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen]);

  const handleInitiate = () => {
    if (!canCancelQuery.data?.canCancel) {
      toast.error(canCancelQuery.data?.message || 'Cannot cancel this subscription');
      return;
    }

    initiateMutation.mutate({
      subscriptionId,
      priority,
      reason: notes,
      method: selectedMethod as any,
      userPreference: {
        realtime: true,
        email: true,
        sms: false,
      },
    } as any);
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

    const confirmationCode = wasSuccessful ? 
      (document.getElementById('confirmation-code') as HTMLInputElement)?.value : undefined;
    const confirmationNotes = 
      (document.getElementById('confirmation-notes') as HTMLTextAreaElement)?.value;

    confirmManualMutation.mutate({
      requestId: currentRequestId,
      wasSuccessful,
      confirmationCode,
      notes: confirmationNotes,
      effectiveDate: wasSuccessful ? new Date() : undefined,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
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
    const { completedSteps, totalSteps } = statusQuery.data.status;
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
              {canCancelQuery.data?.message || 'This subscription cannot be cancelled at this time.'}
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
    const { status, timeline, nextSteps, alternativeOptions } = statusQuery.data;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                  {status.method.charAt(0).toUpperCase() + status.method.slice(1)} Method
                  <Badge variant={status.status === 'completed' ? 'default' : 'secondary'}>
                    {status.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{status.currentStep}</span>
                    <span>{status.completedSteps} / {status.totalSteps}</span>
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
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className="font-medium">Confirmation Code</p>
                      <p className="text-sm text-gray-600">{status.confirmationCode}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(status.confirmationCode!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {status.effectiveDate && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Effective Date</p>
                      <p className="text-sm text-gray-600">
                        {new Date(status.effectiveDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Instructions */}
            {status.manualInstructions && (
              <Card>
                <CardHeader>
                  <CardTitle>Manual Cancellation Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Steps to Cancel</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      {status.manualInstructions.instructions.steps.map((step: string, index: number) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {status.manualInstructions.instructions.contactInfo.website && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(status.manualInstructions.instructions.contactInfo.website, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Go to Website
                      </Button>
                      {status.manualInstructions.instructions.contactInfo.phone && (
                        <Badge variant="outline">
                          📞 {status.manualInstructions.instructions.contactInfo.phone}
                        </Badge>
                      )}
                    </div>
                  )}

                  {status.status === 'pending' && status.method === 'lightweight' && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Confirm Completion</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="confirmation-code">Confirmation Code (optional)</Label>
                          <input
                            id="confirmation-code"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            placeholder="Enter confirmation code if provided"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirmation-notes">Additional Notes</Label>
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
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Confirm Success
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleConfirmManual(false)}
                            disabled={confirmManualMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
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
                {timeline.map((event: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
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
                {nextSteps.map((step: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="alternatives" className="space-y-2">
                {alternativeOptions.map((option: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="text-sm">{option}</span>
                  </div>
                ))}
                
                {status.status === 'failed' && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => handleRetry(false)}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRetry(true)}>
                      Escalate & Retry
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="real-time" className="space-y-2 max-h-60 overflow-y-auto">
                {realtimeUpdates.map((update: any, index: number) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {update.type}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(update.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1">{update.message || update.title}</p>
                  </div>
                ))}
                {realtimeUpdates.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No real-time updates yet</p>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-between">
              <div className="flex gap-2">
                {(status.status === 'pending' || status.status === 'processing') && (
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Success Rate</p>
                    <p>{Math.round(providerCapabilitiesQuery.data.capabilities.estimatedSuccessRate * 100)}%</p>
                  </div>
                  <div>
                    <p className="font-medium">Est. Time</p>
                    <p>{providerCapabilitiesQuery.data.capabilities.averageTimeMinutes} min</p>
                  </div>
                  <div>
                    <p className="font-medium">Difficulty</p>
                    <Badge variant="outline">
                      {providerCapabilitiesQuery.data.capabilities.difficulty}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Recommended method: <strong>{providerCapabilitiesQuery.data.recommendedMethod}</strong>
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
              <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
                {availableMethodsQuery.data?.methods.map((method: any) => (
                  <div key={method.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value={method.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getMethodIcon(method.id)}
                        <span className="font-medium">{method.name}</span>
                        {method.isRecommended && (
                          <Badge variant="default" className="text-xs">Recommended</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{method.description}</p>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>⏱️ {method.estimatedTime}</span>
                        <span>✅ {method.successRate}% success</span>
                        {method.requiresInteraction && <span>👤 Interaction required</span>}
                      </div>
                    </div>
                  </div>
                ))}
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
                <RadioGroup value={priority} onValueChange={(value: any) => setPriority(value)}>
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
                  onChange={(e) => setNotes(e.target.value)}
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
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Start Cancellation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}