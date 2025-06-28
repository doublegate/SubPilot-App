"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { CancellationModal } from "./cancellation-modal";
import { Ban, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";

interface CancelSubscriptionButtonProps {
  subscription: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    frequency: string;
    status: string;
  };
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function CancelSubscriptionButton({
  subscription,
  variant = "outline",
  size = "default",
  className,
}: CancelSubscriptionButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  
  const utils = api.useUtils();
  
  // Check available cancellation methods
  const { data: methods, isLoading: methodsLoading } = api.cancellation.availableMethods.useQuery(
    { subscriptionId: subscription.id },
    { enabled: showCancellationModal }
  );

  // Quick cancel mutation (for easy cancellations)
  const { mutate: quickCancel, isPending: isCancelling } = api.cancellation.initiate.useMutation({
    onSuccess: (result) => {
      if (result.status === "completed") {
        toast.success(`Successfully cancelled ${subscription.name}`, {
          description: result.confirmationCode ? `Confirmation: ${result.confirmationCode}` : undefined,
        });
        // Refresh subscription data
        void utils.subscriptions.getAll.invalidate();
        void utils.subscriptions.getById.invalidate({ id: subscription.id });
      } else if (result.status === "failed" && result.error?.code === "MANUAL_INTERVENTION_REQUIRED") {
        // Show manual cancellation modal
        setShowCancellationModal(true);
      } else if (result.status === "processing") {
        toast.info("Cancellation in progress", {
          description: "We're working on cancelling your subscription. This may take a few minutes.",
        });
      } else {
        toast.error("Cancellation failed", {
          description: result.error?.message ?? "Please try again or use manual cancellation.",
        });
      }
      setShowConfirmDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to initiate cancellation", {
        description: error.message,
      });
      setShowConfirmDialog(false);
    },
  });

  const handleCancel = () => {
    if (subscription.status === "cancelled") {
      toast.info("Already cancelled", {
        description: "This subscription is already cancelled.",
      });
      return;
    }

    // Check if we have methods data and if API is available
    if (methods?.recommended === "api") {
      // For easy API cancellations, show confirm dialog
      setShowConfirmDialog(true);
    } else {
      // For other methods, go straight to modal
      setShowCancellationModal(true);
    }
  };

  const handleConfirmQuickCancel = () => {
    quickCancel({
      subscriptionId: subscription.id,
      method: "api",
    });
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleCancel}
        disabled={subscription.status === "cancelled" || isCancelling}
      >
        {isCancelling ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cancelling...
          </>
        ) : (
          <>
            <Ban className="mr-2 h-4 w-4" />
            Cancel
          </>
        )}
      </Button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {subscription.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this subscription? This will save you{" "}
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: subscription.currency,
              }).format(subscription.amount)}{" "}
              per {subscription.frequency.replace("ly", "")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmQuickCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CancellationModal
        subscription={subscription}
        open={showCancellationModal}
        onOpenChange={setShowCancellationModal}
        methods={methods}
        methodsLoading={methodsLoading}
      />
    </>
  );
}