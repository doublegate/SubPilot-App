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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/ui/icons';
import { api } from '@/trpc/react';
import { toast } from '@/components/ui/use-toast';

interface Provider {
  id: string;
  name: string;
  type: string;
  difficulty: string;
  averageTime: number | null;
  successRate: number;
  supportsRefunds: boolean;
}

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: string;
  subscriptionName: string;
  provider: Provider | null;
  onCancellationStarted: () => void;
}

type Priority = 'low' | 'normal' | 'high';

export function CancellationModal({
  isOpen,
  onClose,
  subscriptionId,
  subscriptionName,
  provider,
  onCancellationStarted,
}: CancellationModalProps) {
  const [priority, setPriority] = useState<Priority>('normal');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initiateCancellation = api.cancellation.initiate.useMutation({
    onSuccess: result => {
      toast({
        title: 'Cancellation Started',
        description: getSuccessMessage(result.status),
      });
      onCancellationStarted();
    },
    onError: error => {
      toast({
        title: 'Failed to Start Cancellation',
        description: error.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await initiateCancellation.mutateAsync({
        subscriptionId,
        priority,
        notes: notes.trim() || undefined,
      });
    } catch {
      // Error is handled by the mutation's onError
    }
  };

  const getSuccessMessage = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Your subscription has been cancelled successfully!';
      case 'processing':
        return 'Cancellation is being processed. You&apos;ll be notified when complete.';
      case 'pending':
        return 'Manual cancellation instructions have been generated.';
      default:
        return 'Cancellation request has been submitted.';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodDescription = (type: string) => {
    switch (type) {
      case 'api':
        return 'Automatic cancellation via provider API';
      case 'webhook':
        return 'Automatic with confirmation tracking';
      default:
        return 'Manual cancellation with step-by-step instructions';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.x className="h-5 w-5 text-red-600" />
            Cancel {subscriptionName}
          </DialogTitle>
          <DialogDescription>
            This will start the cancellation process for your subscription. You
            can track the progress and receive updates along the way.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Provider Information */}
          {provider && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Cancellation Method</h4>
                <Badge className={getDifficultyColor(provider.difficulty)}>
                  {provider.difficulty} difficulty
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {getMethodDescription(provider.type)}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Success Rate:</span>
                  <div className="font-medium">
                    {Math.round(provider.successRate)}%
                  </div>
                </div>
                {provider.averageTime && (
                  <div>
                    <span className="text-muted-foreground">Avg Time:</span>
                    <div className="font-medium">
                      {provider.averageTime} minutes
                    </div>
                  </div>
                )}
              </div>

              {provider.supportsRefunds && (
                <Alert>
                  <Icons.dollarSign className="h-4 w-4" />
                  <AlertDescription>
                    This provider may offer refunds for recent charges.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Priority Selection */}
          <div className="space-y-3">
            <Label>Priority Level</Label>
            <RadioGroup
              value={priority}
              onValueChange={value => setPriority(value as Priority)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="font-normal">
                  Low - Process when convenient
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal" className="font-normal">
                  Normal - Standard processing
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="font-normal">
                  High - Expedited cancellation
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any specific reasons or requirements for cancellation..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning Alert */}
          <Alert>
            <Icons.alertTriangle className="h-4 w-4" />
            <AlertDescription>
              Once started, the cancellation process cannot be undone. Make sure
              you want to cancel this subscription before proceeding.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isSubmitting ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Starting Cancellation...
              </>
            ) : (
              <>
                <Icons.x className="mr-2 h-4 w-4" />
                Start Cancellation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
