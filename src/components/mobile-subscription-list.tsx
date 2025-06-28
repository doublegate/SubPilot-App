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

  const deleteSubscription = api.subscriptions.delete.useMutation({
    onSuccess: () => {
      toast.success('Subscription deleted');
      onRefresh?.();
      router.refresh();
    },
    onError: error => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  const handleDelete = (subscription: Subscription) => {
    if (confirm(`Are you sure you want to delete ${subscription.name}?`)) {
      deleteSubscription.mutate({ id: subscription.id });
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
