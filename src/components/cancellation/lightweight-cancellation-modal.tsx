'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import { api } from '@/trpc/react';
import { toast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';

interface CancellationInstructions {
  provider: {
    name: string;
    supportsRefunds?: boolean;
  };
  instructions: {
    difficulty: string;
    estimatedTime: string;
    overview: string;
    contactInfo: {
      website?: string;
      phone?: string;
      email?: string;
      chatUrl?: string;
    };
    specificSteps?: Array<{ steps: string[] }>;
    tips?: string[];
    warnings?: string[];
  };
}

// Type guard for preview data
function isValidPreview(data: unknown): data is {
  instructions: CancellationInstructions;
} {
  return typeof data === 'object' && data !== null && 'instructions' in data;
}

interface LightweightCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: string;
  subscriptionName: string;
  onInstructionsGenerated: (requestId: string) => void;
}

export function LightweightCancellationModal({
  isOpen,
  onClose,
  subscriptionId,
  subscriptionName,
  onInstructionsGenerated,
}: LightweightCancellationModalProps) {
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'preview' | 'confirm' | 'instructions'>(
    'preview'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [instructions, setInstructions] =
    useState<CancellationInstructions | null>(null);
  const [, setRequestId] = useState<string>('');

  // Preview instructions before creating request
  const { data: preview, isLoading: previewLoading } =
    api.lightweightCancellation.previewInstructions.useQuery(
      { subscriptionId },
      { enabled: isOpen && step === 'preview' }
    );

  const getInstructions =
    api.lightweightCancellation.getInstructions.useMutation({
      onSuccess: result => {
        setInstructions(result.instructions ?? null);
        setRequestId(result.requestId);
        setStep('instructions');
        setIsLoading(false);
        onInstructionsGenerated(result.requestId);
        toast({
          title: 'Instructions Generated',
          description: 'Follow the steps below to cancel your subscription.',
        });
      },
      onError: error => {
        toast({
          title: 'Failed to Generate Instructions',
          description: error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
      },
    });

  const handleConfirm = async () => {
    setIsLoading(true);
    await getInstructions.mutateAsync({
      subscriptionId,
      notes: notes.trim() || undefined,
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderPreview = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Icons.fileText className="mx-auto mb-4 h-12 w-12 text-blue-600" />
        <h3 className="text-lg font-semibold">
          Manual Cancellation Instructions
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll provide you with step-by-step instructions to cancel your
          subscription manually. This approach is simple, reliable, and gives
          you full control over the process.
        </p>
      </div>

      {preview?.instructions && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {isValidPreview(preview)
                  ? (preview.instructions.provider?.name ?? 'Unknown Provider')
                  : 'Unknown Provider'}
              </CardTitle>
              <Badge
                variant="outline"
                className={getDifficultyColor(
                  isValidPreview(preview)
                    ? (preview.instructions.instructions?.difficulty ??
                        'medium')
                    : 'medium'
                )}
              >
                {isValidPreview(preview)
                  ? (preview.instructions.instructions?.difficulty ?? 'medium')
                  : 'medium'}{' '}
                difficulty
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Estimated Time:</span>
                <div className="font-medium">
                  {isValidPreview(preview)
                    ? (preview.instructions.instructions?.estimatedTime ??
                      'Unknown')
                    : 'Unknown'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Method:</span>
                <div className="font-medium">Manual Instructions</div>
              </div>
            </div>

            {isValidPreview(preview) &&
              preview.instructions.provider?.supportsRefunds && (
                <Alert>
                  <Icons.dollarSign className="h-4 w-4" />
                  <AlertDescription>
                    This service may offer refunds for recent charges.
                  </AlertDescription>
                </Alert>
              )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <Label htmlFor="notes">Additional Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Any specific reasons or requirements for cancellation..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <Alert>
        <Icons.info className="h-4 w-4" />
        <AlertDescription>
          You&apos;ll receive detailed, step-by-step instructions tailored to{' '}
          {subscriptionName}. Once you complete the cancellation, you can
          confirm it in the app to update your records.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderInstructions = () => {
    if (!instructions) return null;

    const { provider, instructions: inst } = instructions;

    return (
      <div className="max-h-[600px] space-y-6 overflow-y-auto">
        <div className="text-center">
          <Icons.checkCircle className="mx-auto mb-2 h-8 w-8 text-green-600" />
          <h3 className="text-lg font-semibold">
            Cancellation Instructions Ready
          </h3>
          <p className="text-sm text-muted-foreground">
            Follow these steps to cancel your {provider?.name ?? 'subscription'}{' '}
            subscription
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{provider?.name ?? 'Unknown Provider'}</span>
              <Badge
                variant="outline"
                className={getDifficultyColor(inst?.difficulty ?? 'medium')}
              >
                {inst?.difficulty ?? 'medium'} •{' '}
                {inst?.estimatedTime ?? 'Unknown'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{inst?.overview}</p>

            {/* Contact Information */}
            {(inst?.contactInfo?.website ??
              inst?.contactInfo?.phone ??
              inst?.contactInfo?.chatUrl) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Quick Access:</h4>
                <div className="flex flex-wrap gap-2">
                  {inst?.contactInfo?.website && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={inst.contactInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icons.externalLink className="mr-1 h-3 w-3" />
                        Website
                      </a>
                    </Button>
                  )}
                  {inst?.contactInfo?.phone && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`tel:${inst.contactInfo.phone}`}>
                        <Icons.phone className="mr-1 h-3 w-3" />
                        {inst.contactInfo.phone}
                      </a>
                    </Button>
                  )}
                  {inst?.contactInfo?.chatUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={inst.contactInfo.chatUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icons.messageCircle className="mr-1 h-3 w-3" />
                        Live Chat
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Steps */}
            {inst?.specificSteps && inst.specificSteps.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Cancellation Steps:</h4>
                <ol className="space-y-2">
                  {inst.specificSteps
                    .flatMap(stepGroup => stepGroup.steps ?? [])
                    .map((step: string, index: number) => (
                      <li key={index} className="flex gap-3 text-sm">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-800">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                </ol>
              </div>
            )}

            {/* Tips */}
            {inst?.tips && inst.tips.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1 text-sm font-medium">
                    <Icons.lightbulb className="h-4 w-4" />
                    Helpful Tips:
                  </h4>
                  <ul className="space-y-1">
                    {inst.tips.map((tip: string, index: number) => (
                      <li
                        key={index}
                        className="flex gap-2 text-sm text-muted-foreground"
                      >
                        <Icons.check className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-600" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Warnings */}
            {inst?.warnings && inst.warnings.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1 text-sm font-medium text-orange-700">
                    <Icons.alertTriangle className="h-4 w-4" />
                    Important Warnings:
                  </h4>
                  <ul className="space-y-1">
                    {inst.warnings.map((warning: string, index: number) => (
                      <li
                        key={index}
                        className="flex gap-2 text-sm text-orange-700"
                      >
                        <Icons.alertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Alert>
          <Icons.info className="h-4 w-4" />
          <AlertDescription>
            After completing these steps, use the &quot;Confirm
            Cancellation&quot; button in your dashboard to update your
            subscription status and provide any confirmation details.
          </AlertDescription>
        </Alert>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'instructions' ? (
              <Icons.fileText className="h-5 w-5 text-blue-600" />
            ) : (
              <Icons.x className="h-5 w-5 text-red-600" />
            )}
            {step === 'instructions'
              ? 'Cancellation Instructions'
              : `Cancel ${subscriptionName}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'instructions'
              ? 'Follow these instructions to cancel your subscription manually.'
              : 'Get step-by-step instructions to cancel your subscription manually.'}
          </DialogDescription>
        </DialogHeader>

        {previewLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icons.spinner className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading instructions...</span>
          </div>
        ) : step === 'preview' ? (
          renderPreview()
        ) : (
          renderInstructions()
        )}

        <DialogFooter>
          {step === 'preview' ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Icons.fileText className="mr-2 h-4 w-4" />
                    Get Instructions
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>
              <Icons.check className="mr-2 h-4 w-4" />
              Got It
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
