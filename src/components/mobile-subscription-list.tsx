'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SwipeableSubscriptionCard } from './swipeable-subscription-card';
import { EditSubscriptionModal } from './edit-subscription-modal';
import { ArchiveSubscriptionModal } from './archive-subscription-modal';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import type { Subscription } from './subscription-list';

interface MobileSubscriptionListProps {
  subscriptions: Subscription[];
  onRefresh?: () => void;
}

export function MobileSubscriptionList({
  subscriptions,
  onRefresh,
}: MobileSubscriptionListProps) {
  const router = useRouter();
  const [editingSubscription, setEditingSubscription] =
    useState<Subscription | null>(null);
  const [archivingSubscription, setArchivingSubscription] =
    useState<Subscription | null>(null);

  const cancelSubscription = api.subscriptions.markCancelled.useMutation({
    onSuccess: () => {
      toast.success('Subscription cancelled');
      onRefresh?.();
      router.refresh();
    },
    onError: (error: { message: string }) => {
      toast.error('Failed to cancel: ' + error.message);
    },
  });

  const handleDelete = (subscription: Subscription) => {
    if (confirm(`Are you sure you want to cancel ${subscription.name}?`)) {
      cancelSubscription.mutate({
        id: subscription.id,
        reason: 'Cancelled via mobile app',
        cancellationDate: new Date(),
      });
    }
  };

  return (
    <>
      <div className="space-y-3">
        {subscriptions.map(subscription => (
          <SwipeableSubscriptionCard
            key={subscription.id}
            subscription={subscription}
            onEdit={() => setEditingSubscription(subscription)}
            onArchive={() => setArchivingSubscription(subscription)}
            onDelete={() => handleDelete(subscription)}
          />
        ))}
      </div>

      {editingSubscription && (
        <EditSubscriptionModal
          subscription={editingSubscription}
          open={!!editingSubscription}
          onOpenChange={open => !open && setEditingSubscription(null)}
          onSuccess={() => {
            setEditingSubscription(null);
            onRefresh?.();
          }}
        />
      )}

      {archivingSubscription && (
        <ArchiveSubscriptionModal
          subscription={archivingSubscription}
          open={!!archivingSubscription}
          onOpenChange={open => !open && setArchivingSubscription(null)}
          onSuccess={() => {
            setArchivingSubscription(null);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}
