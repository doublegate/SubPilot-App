'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Settings,
  FileText,
  Loader2,
  Wifi,
  WifiOff,
  Play,
  Pause,
  Square,
  RefreshCw,
  ExternalLink,
  Phone,
  Mail,
  MessageCircle,
  Shield,
  TrendingUp,
  Users,
  Timer,
  X,
} from 'lucide-react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  nextBilling?: Date;
}

interface UnifiedCancellationEnhancedModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription;
  onSuccess?: (result: any) => void;
}

interface CancellationMethod {
  id: string;
  name: string;
  description: string;
  estimatedTime: number;
  successRate: number;
  requiresInteraction: boolean;
  isRecommended: boolean;
  available: boolean;
}

interface RealTimeUpdate {
  type: string;
  timestamp: string;
  message?: string;
  status?: string;
  method?: string;
  error?: string;
  progress?: number;
  metadata?: any;
}

export function UnifiedCancellationEnhancedModal({
  isOpen,
  onClose,
  subscription,
  onSuccess,
}: UnifiedCancellationEnhancedModalProps) {
  // State management
  const [currentStep, setCurrentStep] = useState<
    | 'eligibility'
    | 'method-selection'
    | 'confirmation'
    | 'processing'
    | 'manual-instructions'
    | 'completed'
  >('eligibility');
  const [selectedMethod, setSelectedMethod] = useState<string>('auto');
  const [cancellationReason, setCancellationReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orchestrationId, setOrchestrationId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState<RealTimeUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [estimatedCompletion, setEstimatedCompletion] = useState<Date | null>(
    null
  );
  const [result, setResult] = useState<any>(null);
  const [manualInstructions, setManualInstructions] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for SSE and cleanup
  const eventSourceRef = useRef<EventSource | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // API queries and mutations
  const { data: eligibility, isLoading: checkingEligibility } = (
    api.unifiedCancellationEnhanced.canCancel as any
  ).useQuery({ subscriptionId: subscription.id }, { enabled: isOpen });

  const { data: capabilities, isLoading: loadingCapabilities } = (
    api.unifiedCancellationEnhanced.getProviderCapabilities as any
  ).useQuery(
    { subscriptionId: subscription.id },
    { enabled: isOpen && currentStep === 'method-selection' }
  );

  const initiateCancellation = (
    api.unifiedCancellationEnhanced.initiate as any
  ).useMutation({
    onSuccess: (data: any) => {
      setResult(data);
      setOrchestrationId(data.orchestrationId);
      setRequestId(data.requestId);
      setEstimatedCompletion(
        data.estimatedCompletion ? new Date(data.estimatedCompletion) : null
      );

      if (data.status === 'requires_manual') {
        setManualInstructions(data.manualInstructions);
        setCurrentStep('manual-instructions');
      } else if (data.status === 'completed') {
        setCurrentStep('completed');
      } else {
        setCurrentStep('processing');
        // Start real-time updates
        connectToRealTimeUpdates(data.orchestrationId);
      }

      setIsProcessing(false);
      toast.success('Cancellation initiated successfully');
    },
    onError: (error: any) => {
      setError(error.message);
      setIsProcessing(false);
      toast.error(`Failed to initiate cancellation: ${error.message}`);
    },
  });

  const confirmManual = (
    api.unifiedCancellationEnhanced.confirmManual as any
  ).useMutation({
    onSuccess: (data: any) => {
      setResult(data);
      setCurrentStep('completed');
      toast.success('Manual cancellation confirmed');
      onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error(`Failed to confirm cancellation: ${error.message}`);
    },
  });

  // Real-time updates via Server-Sent Events
  const connectToRealTimeUpdates = (orchId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/sse/cancellation/${orchId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('[SSE] Connected to real-time updates');
    };

    eventSource.onmessage = event => {
      try {
        const update: RealTimeUpdate = JSON.parse(event.data);
        handleRealTimeUpdate(update);
      } catch (error) {
        console.error('[SSE] Error parsing update:', error);
      }
    };

    eventSource.onerror = error => {
      console.error('[SSE] Connection error:', error);
      setIsConnected(false);

      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (orchestrationId && currentStep === 'processing') {
          connectToRealTimeUpdates(orchestrationId);
        }
      }, 5000);
    };
  };

  // Handle real-time updates
  const handleRealTimeUpdate = (update: RealTimeUpdate) => {
    setRealTimeUpdates(prev => [...prev, update]);

    switch (update.type) {
      case 'connection_established':
        setIsConnected(true);
        break;

      case 'status_update':
        if (update.status === 'completed') {
          setCurrentStep('completed');
          setCurrentProgress(100);
        } else if (update.status === 'failed') {
          setError(update.message || 'Cancellation failed');
        }
        break;

      case 'method_attempt':
        toast.info(`Attempting ${update.method} cancellation...`);
        setCurrentProgress(25);
        break;

      case 'method_failed':
        toast.warning(
          `${update.method} method failed${(update as any).willRetry ? ', trying alternative...' : ''}`
        );
        if ((update as any).willRetry) {
          setCurrentProgress(50);
        }
        break;

      case 'orchestration_final':
        if ((update as any).finalStatus === 'completed') {
          setCurrentStep('completed');
          setCurrentProgress(100);
          toast.success('Cancellation completed successfully!');
        } else {
          setError('Cancellation could not be completed automatically');
        }
        disconnectRealTimeUpdates();
        break;

      case 'heartbeat':
        // Update connection status
        setIsConnected(true);
        break;
    }
  };

  // Disconnect from real-time updates
  const disconnectRealTimeUpdates = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  };

  // Handle method selection and confirmation
  const handleProceed = () => {
    if (currentStep === 'eligibility' && eligibility?.canCancel) {
      setCurrentStep('method-selection');
    } else if (currentStep === 'method-selection') {
      setCurrentStep('confirmation');
    } else if (currentStep === 'confirmation') {
      handleInitiateCancellation();
    }
  };

  const handleInitiateCancellation = () => {
    setIsProcessing(true);
    setError(null);

    initiateCancellation.mutate({
      subscriptionId: subscription.id,
      reason: cancellationReason,
      preferredMethod: selectedMethod === 'auto' ? undefined : selectedMethod,
      userPreferences: {
        allowFallback: selectedMethod === 'auto',
        notificationPreferences: {
          realTime: true,
          email: true,
        },
      },
    });
  };

  // Manual confirmation handlers
  const [manualConfirmation, setManualConfirmation] = useState({
    confirmationCode: '',
    effectiveDate: '',
    refundAmount: '',
    notes: '',
    wasSuccessful: false,
  });

  const handleManualConfirmation = (wasSuccessful: boolean) => {
    if (!requestId) return;

    confirmManual.mutate({
      requestId,
      confirmationCode: manualConfirmation.confirmationCode || undefined,
      effectiveDate: manualConfirmation.effectiveDate
        ? new Date(manualConfirmation.effectiveDate)
        : undefined,
      refundAmount: manualConfirmation.refundAmount
        ? parseFloat(manualConfirmation.refundAmount)
        : undefined,
      notes: manualConfirmation.notes || undefined,
      wasSuccessful,
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectRealTimeUpdates();
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Handle modal close
  const handleClose = () => {
    if (currentStep === 'processing' && isConnected) {
      // Warn user about closing during processing
      const shouldClose = confirm(
        'Cancellation is in progress. Are you sure you want to close this window? You can check the status later in your cancellation history.'
      );
      if (!shouldClose) return;
    }

    disconnectRealTimeUpdates();
    onClose();

    // Reset state for next time
    setTimeout(() => {
      setCurrentStep('eligibility');
      setSelectedMethod('auto');
      setCancellationReason('');
      setIsProcessing(false);
      setOrchestrationId(null);
      setRequestId(null);
      setRealTimeUpdates([]);
      setIsConnected(false);
      setCurrentProgress(0);
      setEstimatedCompletion(null);
      setResult(null);
      setManualInstructions(null);
      setError(null);
      setManualConfirmation({
        confirmationCode: '',
        effectiveDate: '',
        refundAmount: '',
        notes: '',
        wasSuccessful: false,
      });
    }, 300);
  };

  // Render method icons
  const getMethodIcon = (methodId: string) => {
    switch (methodId) {
      case 'auto':
        return <Zap className="h-4 w-4" />;
      case 'api':
        return <Zap className="h-4 w-4" />;
      case 'automation':
        return <Settings className="h-4 w-4" />;
      case 'manual':
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Render success rate badge
  const getSuccessRateBadge = (rate: number) => {
    if (rate >= 90)
      return (
        <Badge variant="default" className="bg-green-500">
          Excellent
        </Badge>
      );
    if (rate >= 80)
      return (
        <Badge variant="default" className="bg-blue-500">
          Good
        </Badge>
      );
    if (rate >= 70) return <Badge variant="secondary">Fair</Badge>;
    return <Badge variant="destructive">Limited</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-5 w-5" />
            Cancel {subscription.name}
          </DialogTitle>
        </DialogHeader>

        {/* Eligibility Check Step */}
        {currentStep === 'eligibility' && (
          <div className="space-y-6">
            {checkingEligibility ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">
                  Checking cancellation eligibility...
                </span>
              </div>
            ) : eligibility?.canCancel ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    This subscription can be cancelled. We'll help you through
                    the process.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Subscription Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Service:</span>
                      <span className="font-medium">{subscription.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-medium">
                        ${subscription.amount}/{subscription.frequency}
                      </span>
                    </div>
                    {subscription.nextBilling && (
                      <div className="flex justify-between">
                        <span>Next Billing:</span>
                        <span className="font-medium">
                          {subscription.nextBilling.toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {eligibility.provider && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Provider Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Difficulty:</span>
                        <Badge
                          variant={
                            eligibility.provider.difficulty === 'easy'
                              ? 'default'
                              : eligibility.provider.difficulty === 'medium'
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {eligibility.provider.difficulty}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Est. Time:</span>
                        <span>
                          {eligibility.provider.estimatedTime} minutes
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Success Rate:</span>
                        {getSuccessRateBadge(eligibility.provider.successRate)}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {eligibility?.message ||
                    'This subscription cannot be cancelled at this time.'}
                  {eligibility?.existingRequestId && (
                    <div className="mt-2">
                      <span>
                        Existing request: {eligibility.existingRequestId}
                      </span>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {eligibility?.canCancel && (
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleProceed}>Continue</Button>
              </div>
            )}
          </div>
        )}

        {/* Method Selection Step */}
        {currentStep === 'method-selection' && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-lg font-semibold">
                Choose Cancellation Method
              </h3>
              <p className="text-muted-foreground">
                Select how you'd like to cancel your subscription. We recommend
                the automatic option for best results.
              </p>
            </div>

            {loadingCapabilities ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Analyzing cancellation options...</span>
              </div>
            ) : (
              capabilities?.methods && (
                <RadioGroup
                  value={selectedMethod}
                  onValueChange={setSelectedMethod}
                >
                  <div className="space-y-3">
                    {capabilities.methods.map((method: CancellationMethod) => (
                      <div
                        key={method.id}
                        className="flex items-start space-x-3"
                      >
                        <RadioGroupItem
                          value={method.id}
                          id={method.id}
                          className="mt-1"
                        />
                        <Label
                          htmlFor={method.id}
                          className="flex-1 cursor-pointer"
                        >
                          <Card
                            className={`${method.isRecommended ? 'ring-2 ring-blue-500' : ''}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    {getMethodIcon(method.id)}
                                    <span className="font-medium">
                                      {method.name}
                                    </span>
                                    {method.isRecommended && (
                                      <Badge
                                        variant="default"
                                        className="bg-blue-500"
                                      >
                                        Recommended
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {method.description}
                                  </p>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1">
                                      <Timer className="h-3 w-3" />
                                      {method.estimatedTime} min
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3" />
                                      {method.successRate}% success
                                    </span>
                                    {method.requiresInteraction && (
                                      <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        Requires interaction
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )
            )}

            {capabilities?.recommendations && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">💡 Recommendation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {capabilities.recommendations.reasoning}
                  </p>
                  {capabilities.recommendations.considerations.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 text-sm font-medium">
                        Things to know:
                      </p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {capabilities.recommendations.considerations.map(
                          (consideration: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="mt-0.5 text-orange-500">•</span>
                              {consideration}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('eligibility')}
              >
                Back
              </Button>
              <Button onClick={handleProceed}>Continue</Button>
            </div>
          </div>
        )}

        {/* Confirmation Step */}
        {currentStep === 'confirmation' && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-lg font-semibold">
                Confirm Cancellation
              </h3>
              <p className="text-muted-foreground">
                Review your cancellation request before proceeding.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Cancellation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Subscription:</span>
                  <span className="font-medium">{subscription.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span className="font-medium">
                    {
                      capabilities?.methods?.find(
                        (m: CancellationMethod) => m.id === selectedMethod
                      )?.name
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Time:</span>
                  <span className="font-medium">
                    {
                      capabilities?.methods?.find(
                        (m: CancellationMethod) => m.id === selectedMethod
                      )?.estimatedTime
                    }{' '}
                    minutes
                  </span>
                </div>
              </CardContent>
            </Card>

            <div>
              <Label htmlFor="reason">Reason for cancelling (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Tell us why you're cancelling..."
                value={cancellationReason}
                onChange={e => setCancellationReason(e.target.value)}
                className="mt-1"
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Once started, the cancellation process will begin immediately.
                You'll receive real-time updates on the progress.
              </AlertDescription>
            </Alert>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('method-selection')}
              >
                Back
              </Button>
              <Button onClick={handleProceed} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start Cancellation'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {currentStep === 'processing' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="mb-2 text-lg font-semibold">
                Cancelling Subscription
              </h3>
              <p className="text-muted-foreground">
                Please wait while we process your cancellation request...
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{currentProgress}%</span>
              </div>
              <Progress value={currentProgress} className="w-full" />
            </div>

            {/* Connection Status */}
            <div className="flex items-center justify-center gap-2 text-sm">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">
                    Connected to real-time updates
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-600">
                    Connecting to updates...
                  </span>
                </>
              )}
            </div>

            {/* Estimated Completion */}
            {estimatedCompletion && (
              <div className="text-center text-sm text-muted-foreground">
                Estimated completion: {estimatedCompletion.toLocaleTimeString()}
              </div>
            )}

            {/* Real-time Updates */}
            {realTimeUpdates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Live Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {realTimeUpdates.slice(-5).map((update, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(update.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="flex-1">
                          {update.message || update.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center">
              <Button variant="outline" onClick={handleClose}>
                Close (Continue in Background)
              </Button>
            </div>
          </div>
        )}

        {/* Manual Instructions Step */}
        {currentStep === 'manual-instructions' && manualInstructions && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-lg font-semibold">
                Manual Cancellation Instructions
              </h3>
              <p className="text-muted-foreground">
                Follow these steps to cancel your {subscription.name}{' '}
                subscription manually.
              </p>
            </div>

            {/* Provider Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {manualInstructions.provider.logo && (
                    <img
                      src={manualInstructions.provider.logo}
                      alt={manualInstructions.provider.name}
                      className="h-6 w-6"
                    />
                  )}
                  {manualInstructions.provider.name}
                  <Badge
                    variant={
                      manualInstructions.provider.difficulty === 'easy'
                        ? 'default'
                        : manualInstructions.provider.difficulty === 'medium'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {manualInstructions.provider.difficulty}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />~
                    {manualInstructions.provider.estimatedTime} minutes
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            {(manualInstructions.contactInfo.website ||
              manualInstructions.contactInfo.phone ||
              manualInstructions.contactInfo.email ||
              manualInstructions.contactInfo.chat) && (
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {manualInstructions.contactInfo.website && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      <a
                        href={manualInstructions.contactInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Open Account Settings
                      </a>
                    </div>
                  )}
                  {manualInstructions.contactInfo.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <a
                        href={`tel:${manualInstructions.contactInfo.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {manualInstructions.contactInfo.phone}
                      </a>
                    </div>
                  )}
                  {manualInstructions.contactInfo.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <a
                        href={`mailto:${manualInstructions.contactInfo.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {manualInstructions.contactInfo.email}
                      </a>
                    </div>
                  )}
                  {manualInstructions.contactInfo.chat && (
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      <a
                        href={manualInstructions.contactInfo.chat}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Live Chat Support
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step-by-step Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Step-by-Step Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {manualInstructions.steps.map(
                    (step: string, index: number) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white">
                          {index + 1}
                        </span>
                        <span className="flex-1">{step}</span>
                      </li>
                    )
                  )}
                </ol>
              </CardContent>
            </Card>

            {/* Tips */}
            {manualInstructions.tips.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Helpful Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {manualInstructions.tips.map(
                      (tip: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="mt-0.5 text-green-500">•</span>
                          <span className="text-sm">{tip}</span>
                        </li>
                      )
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Warnings */}
            {manualInstructions.warnings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Important Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {manualInstructions.warnings.map(
                      (warning: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="mt-0.5 text-orange-500">•</span>
                          <span className="text-sm">{warning}</span>
                        </li>
                      )
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Manual Confirmation Form */}
            <Card>
              <CardHeader>
                <CardTitle>Confirm Cancellation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  After completing the cancellation process, please confirm the
                  result below:
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="confirmationCode">
                      Confirmation Code (if any)
                    </Label>
                    <input
                      id="confirmationCode"
                      type="text"
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      placeholder="ABC123..."
                      value={manualConfirmation.confirmationCode}
                      onChange={e =>
                        setManualConfirmation(prev => ({
                          ...prev,
                          confirmationCode: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="effectiveDate">Effective Date</Label>
                    <input
                      id="effectiveDate"
                      type="date"
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={manualConfirmation.effectiveDate}
                      onChange={e =>
                        setManualConfirmation(prev => ({
                          ...prev,
                          effectiveDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="refundAmount">
                    Refund Amount (if applicable)
                  </Label>
                  <input
                    id="refundAmount"
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    placeholder="0.00"
                    value={manualConfirmation.refundAmount}
                    onChange={e =>
                      setManualConfirmation(prev => ({
                        ...prev,
                        refundAmount: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional details about the cancellation..."
                    value={manualConfirmation.notes}
                    onChange={e =>
                      setManualConfirmation(prev => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleManualConfirmation(true)}
                    disabled={confirmManual.isLoading}
                    className="flex-1"
                  >
                    {confirmManual.isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Cancellation Successful
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleManualConfirmation(false)}
                    disabled={confirmManual.isLoading}
                    className="flex-1"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancellation Failed
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Completed Step */}
        {currentStep === 'completed' && result && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xl font-semibold text-green-600">
                Cancellation{' '}
                {result.status === 'completed' ? 'Completed' : 'Initiated'}!
              </h3>
              <p className="text-muted-foreground">
                {result.message ||
                  'Your subscription has been successfully cancelled.'}
              </p>
            </div>

            {/* Result Details */}
            <Card>
              <CardHeader>
                <CardTitle>Cancellation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-left">
                {result.confirmationCode && (
                  <div className="flex justify-between">
                    <span>Confirmation Code:</span>
                    <span className="font-mono">{result.confirmationCode}</span>
                  </div>
                )}
                {result.effectiveDate && (
                  <div className="flex justify-between">
                    <span>Effective Date:</span>
                    <span>
                      {new Date(result.effectiveDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {result.refundAmount && (
                  <div className="flex justify-between">
                    <span>Refund Amount:</span>
                    <span className="font-medium text-green-600">
                      ${result.refundAmount}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Method Used:</span>
                  <span className="capitalize">{result.method}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center gap-3">
              <Button onClick={handleClose}>Close</Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Open subscription details or history
                  window.location.href = '/subscriptions';
                }}
              >
                View Subscriptions
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
