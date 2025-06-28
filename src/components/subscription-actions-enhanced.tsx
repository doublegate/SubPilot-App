"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  Edit, 
  Archive, 
  Ban,
  FileText,
  AlertTriangle,
  History,
} from "lucide-react";
import { CancelSubscriptionButton } from "./cancellation/cancel-subscription-button";
import { EditSubscriptionModal } from "./edit-subscription-modal";
import { ArchiveSubscriptionModal } from "./archive-subscription-modal";
import { SubscriptionNotes } from "./subscription-notes";
import { api } from "~/trpc/react";
import { toast } from "sonner";

interface SubscriptionActionsProps {
  subscription: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    frequency: string;
    status: string;
    notes?: string | null;
  };
  onUpdate?: () => void;
}

export function SubscriptionActionsEnhanced({ 
  subscription,
  onUpdate,
}: SubscriptionActionsProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const utils = api.useUtils();

  // Get cancellation history
  const { data: cancellationHistory } = api.cancellation.history.useQuery(
    { limit: 5 },
    {
      select: (data) => data.filter(req => req.subscription.id === subscription.id),
    }
  );

  const hasCancellationHistory = cancellationHistory && cancellationHistory.length > 0;

  const handleArchive = () => {
    // Archive logic would be implemented here
    toast.success(`${subscription.name} archived`);
    setShowArchiveModal(false);
    onUpdate?.();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Cancel Button - Primary Action */}
        {subscription.status !== "cancelled" && (
          <CancelSubscriptionButton
            subscription={subscription}
            variant="outline"
            size="sm"
          />
        )}

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setShowEditModal(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Details
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => setShowNotes(true)}>
              <FileText className="mr-2 h-4 w-4" />
              {subscription.notes ? "View Notes" : "Add Notes"}
            </DropdownMenuItem>

            {hasCancellationHistory && (
              <DropdownMenuItem onClick={() => {
                // Navigate to cancellation history or show modal
                toast.info("Cancellation history", {
                  description: `${cancellationHistory.length} cancellation attempt(s) found`,
                });
              }}>
                <History className="mr-2 h-4 w-4" />
                Cancellation History
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem 
              onClick={() => setShowArchiveModal(true)}
              className="text-destructive"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modals */}
      <EditSubscriptionModal
        subscription={{ ...subscription, isActive: subscription.status === 'active' }}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={() => {
          setShowEditModal(false);
          onUpdate?.();
        }}
      />

      <ArchiveSubscriptionModal
        subscription={subscription}
        open={showArchiveModal}
        onOpenChange={setShowArchiveModal}
      />

      {showNotes && (
        <SubscriptionNotes
          subscriptionId={subscription.id}
          notes={subscription.notes ?? null}
          tags={[]}
          onUpdate={() => {
            setShowNotes(false);
            onUpdate?.();
          }}
        />
      )}
    </>
  );
}