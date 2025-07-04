'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CancellationModal } from './cancellation-modal';
import { api } from '@/trpc/react';
import { Icons } from '@/components/ui/icons';

interface CancelSubscriptionButtonProps {
  subscriptionId: string;
  subscriptionName: string;
  onCancellationStarted?: () => void;
}

export function CancelSubscriptionButton({
  subscriptionId,
  subscriptionName,
  onCancellationStarted,
}: CancelSubscriptionButtonProps) {
  const [showModal, setShowModal] = useState(false);

  // Check if cancellation is possible
  const { data: canCancelData, isLoading } =
    api.cancellation.canCancel.useQuery({
      subscriptionId,
    });

  const handleCancellationStarted = () => {
    setShowModal(false);
    onCancellationStarted?.();
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (!canCancelData?.canCancel) {
    if (canCancelData?.reason === 'already_cancelled') {
      return (
        <Badge variant="secondary" className="pointer-events-none">
          Already Cancelled
        </Badge>
      );
    }

    if (canCancelData?.reason === 'cancellation_in_progress') {
      return (
        <Badge variant="outline" className="pointer-events-none">
          Cancellation in Progress
        </Badge>
      );
    }

    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowModal(true)}
        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <Icons.x className="mr-2 h-4 w-4" />
        Cancel Subscription
      </Button>

      <CancellationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        subscriptionId={subscriptionId}
        subscriptionName={subscriptionName}
        provider={canCancelData.provider ?? null}
        onCancellationStarted={handleCancellationStarted}
      />
    </>
  );
}
