'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { LightweightCancellationModal } from './lightweight-cancellation-modal';
import { CancellationConfirmationModal } from './cancellation-confirmation-modal';
import { api } from '@/trpc/react';
import { toast } from '@/components/ui/use-toast';

interface LightweightCancelButtonProps {
  subscriptionId: string;
  subscriptionName: string;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onCancellationCompleted?: () => void;
}

export function LightweightCancelButton({
  subscriptionId,
  subscriptionName,
  variant = 'destructive',
  size = 'default',
  className,
  onCancellationCompleted,
}: LightweightCancelButtonProps) {
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string>('');

  // Check if cancellation is possible
  const { data: canCancel, isLoading: checkingCancel } =
    api.lightweightCancellation.canCancel.useQuery(
      { subscriptionId },
      {
        enabled: Boolean(subscriptionId),
        retry: false,
      }
    );

  const handleCancelClick = () => {
    if (!canCancel?.canCancel) {
      let message = 'Cannot cancel this subscription at this time.';

      switch (canCancel?.reason) {
        case 'already_cancelled':
          message = 'This subscription has already been cancelled.';
          break;
        case 'cancellation_in_progress':
          message =
            'A cancellation is already in progress for this subscription.';
          break;
        case 'not_found':
          message = 'Subscription not found.';
          break;
      }

      toast({
        title: 'Cannot Cancel',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    setShowCancellationModal(true);
  };

  const handleInstructionsGenerated = (requestId: string) => {
    setActiveRequestId(requestId);
    setShowCancellationModal(false);
    // Optionally show confirmation modal immediately, or let user trigger it later
  };

  const handleShowConfirmation = () => {
    if (activeRequestId) {
      setShowConfirmationModal(true);
    }
  };

  const handleCancellationConfirmed = () => {
    setShowConfirmationModal(false);
    setActiveRequestId('');
    onCancellationCompleted?.();
  };

  const isDisabled = checkingCancel || !canCancel?.canCancel;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleCancelClick}
        disabled={isDisabled}
      >
        {checkingCancel ? (
          <>
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <Icons.x className="mr-2 h-4 w-4" />
            Cancel Subscription
          </>
        )}
      </Button>

      {/* Show confirmation button if we have an active request */}
      {activeRequestId && (
        <Button
          variant="outline"
          size={size}
          className="ml-2"
          onClick={handleShowConfirmation}
        >
          <Icons.checkCircle className="mr-2 h-4 w-4" />
          Confirm Cancellation
        </Button>
      )}

      <LightweightCancellationModal
        isOpen={showCancellationModal}
        onClose={() => setShowCancellationModal(false)}
        subscriptionId={subscriptionId}
        subscriptionName={subscriptionName}
        onInstructionsGenerated={handleInstructionsGenerated}
      />

      <CancellationConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        requestId={activeRequestId}
        subscriptionName={subscriptionName}
        onConfirmed={handleCancellationConfirmed}
      />
    </>
  );
}
