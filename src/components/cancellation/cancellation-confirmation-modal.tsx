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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/ui/icons';
import { api } from '@/trpc/react';
import { toast } from '@/components/ui/use-toast';

interface CancellationConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  subscriptionName: string;
  onConfirmed: () => void;
}

export function CancellationConfirmationModal({
  isOpen,
  onClose,
  requestId,
  subscriptionName,
  onConfirmed,
}: CancellationConfirmationModalProps) {
  const [wasSuccessful, setWasSuccessful] = useState<string>('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmCancellation =
    api.lightweightCancellation.confirmCancellation.useMutation({
      onSuccess: result => {
        toast({
          title:
            result.status === 'completed'
              ? 'Cancellation Confirmed'
              : 'Cancellation Noted',
          description:
            result.status === 'completed'
              ? 'Your subscription has been marked as cancelled.'
              : "We've noted that the cancellation was unsuccessful. You can try again or contact support.",
        });
        onConfirmed();
        resetForm();
      },
      onError: error => {
        toast({
          title: 'Failed to Confirm Cancellation',
          description: error.message,
          variant: 'destructive',
        });
        setIsSubmitting(false);
      },
    });

  const resetForm = () => {
    setWasSuccessful('');
    setConfirmationCode('');
    setEffectiveDate('');
    setNotes('');
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!wasSuccessful) {
      toast({
        title: 'Please select an option',
        description: 'Let us know if the cancellation was successful or not.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const effectiveDateObj = effectiveDate
      ? new Date(effectiveDate)
      : undefined;

    await confirmCancellation.mutateAsync({
      requestId,
      wasSuccessful: wasSuccessful === 'yes',
      confirmationCode: confirmationCode.trim() || undefined,
      effectiveDate: effectiveDateObj,
      notes: notes.trim() || undefined,
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.checkCircle className="h-5 w-5 text-green-600" />
            Confirm Cancellation Status
          </DialogTitle>
          <DialogDescription>
            Please let us know if you were able to successfully cancel your{' '}
            {subscriptionName} subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success/Failure Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Cancellation Status</Label>
            <RadioGroup value={wasSuccessful} onValueChange={setWasSuccessful}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="success" />
                <Label htmlFor="success" className="font-normal">
                  ✅ Successfully cancelled
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="failure" />
                <Label htmlFor="failure" className="font-normal">
                  ❌ Unable to cancel / encountered issues
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Confirmation Details (only if successful) */}
          {wasSuccessful === 'yes' && (
            <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="space-y-2">
                <Label htmlFor="confirmation-code">
                  Confirmation Code/Number (Optional)
                </Label>
                <Input
                  id="confirmation-code"
                  placeholder="e.g., CANCEL123456, REF#789"
                  value={confirmationCode}
                  onChange={e => setConfirmationCode(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  If you received a cancellation confirmation number, enter it
                  here.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="effective-date">
                  Effective Date (Optional)
                </Label>
                <Input
                  id="effective-date"
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground">
                  When does the cancellation take effect? Leave blank if
                  immediate.
                </p>
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {wasSuccessful === 'no' ? 'What went wrong?' : 'Additional Notes'}{' '}
              (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder={
                wasSuccessful === 'no'
                  ? 'Describe any issues you encountered during cancellation...'
                  : 'Any additional details about the cancellation process...'
              }
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Help Alert */}
          {wasSuccessful === 'no' && (
            <Alert>
              <Icons.helpCircle className="h-4 w-4" />
              <AlertDescription>
                If you&apos;re having trouble cancelling, consider contacting
                customer support directly. We can also help you find alternative
                cancellation methods.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !wasSuccessful}
          >
            {isSubmitting ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <Icons.check className="mr-2 h-4 w-4" />
                Confirm Status
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
