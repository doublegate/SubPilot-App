'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EditSubscriptionModal } from '@/components/edit-subscription-modal';
import { ArchiveSubscriptionModal } from '@/components/archive-subscription-modal';
import { CancellationAssistant } from '@/components/cancellation-assistant';
import {
  Edit,
  Archive,
  HelpCircle,
  ArrowLeft,
  Tag,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SubscriptionActionsProps {
  subscription: {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    notes?: string | null;
    isActive: boolean;
    amount: number;
    currency: string;
    frequency: string;
    status: string;
    provider?: {
      name: string;
      website?: string | null;
    } | null;
  };
}

export function SubscriptionActions({
  subscription,
}: SubscriptionActionsProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
  const router = useRouter();

  const handleMarkCancelled = (id: string) => {
    setArchiveModalOpen(true);
  };

  const handleEditSuccess = () => {
    // Refresh the page data
    router.refresh();
  };

  const handleArchiveSuccess = () => {
    // Redirect to subscriptions list
    router.push('/subscriptions');
  };

  return (
    <>
      <div className="flex flex-wrap gap-4">
        <Button asChild variant="outline">
          <Link href="/subscriptions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subscriptions
          </Link>
        </Button>

        {subscription.status === 'active' && (
          <>
            <Button variant="outline" onClick={() => setEditModalOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Details
            </Button>

            <Button
              variant="outline"
              onClick={() => setCancellationModalOpen(true)}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Cancel Guide
            </Button>

            <Button
              variant="destructive"
              onClick={() => setArchiveModalOpen(true)}
            >
              <Archive className="mr-2 h-4 w-4" />
              Mark as Cancelled
            </Button>
          </>
        )}

        {subscription.status === 'cancelled' && (
          <Button variant="outline" onClick={() => setEditModalOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Details
          </Button>
        )}
      </div>

      {/* Edit Subscription Modal */}
      <EditSubscriptionModal
        subscription={{
          id: subscription.id,
          name: subscription.name,
          category: subscription.category,
          notes: subscription.notes,
          isActive: subscription.isActive,
          amount: subscription.amount,
        }}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={handleEditSuccess}
      />

      {/* Archive Subscription Modal */}
      <ArchiveSubscriptionModal
        subscription={{
          id: subscription.id,
          name: subscription.name,
          amount: subscription.amount,
          currency: subscription.currency,
          frequency: subscription.frequency,
          provider: subscription.provider,
        }}
        open={archiveModalOpen}
        onOpenChange={setArchiveModalOpen}
        onSuccess={handleArchiveSuccess}
      />

      {/* Cancellation Assistant */}
      <CancellationAssistant
        subscription={{
          id: subscription.id,
          name: subscription.name,
          provider: subscription.provider,
          amount: subscription.amount,
          currency: subscription.currency,
          frequency: subscription.frequency,
        }}
        open={cancellationModalOpen}
        onOpenChange={setCancellationModalOpen}
        onMarkCancelled={handleMarkCancelled}
      />
    </>
  );
}
