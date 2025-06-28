"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { 
  Bot, 
  Globe, 
  HandHelping, 
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Shield,
} from "lucide-react";
import { CancellationStatus } from "./cancellation-status";
import { ManualInstructionsDialog } from "./manual-instructions-dialog";
import type { CancellationMethod } from "~/server/services/cancellation.service";

interface CancellationModalProps {
  subscription: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    frequency: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  methods?: {
    methods: CancellationMethod[];
    recommended: CancellationMethod;
    provider: {
      name: string;
      logo?: string | null;
      difficulty: string;
      averageTime?: number | null;
      supportsRefunds: boolean;
      requires2FA: boolean;
      requiresRetention: boolean;
    } | null;
  } | null;
  methodsLoading?: boolean;
}

export function CancellationModal({
  subscription,
  open,
  onOpenChange,
  methods,
  methodsLoading,
}: CancellationModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<CancellationMethod | null>(null);
  const [cancellationRequestId, setCancellationRequestId] = useState<string | null>(null);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [manualInstructions, setManualInstructions] = useState<any>(null);

  const utils = api.useUtils();

  // Initiate cancellation mutation
  const { mutate: initiateCancellation, isPending: isInitiating } = api.cancellation.initiate.useMutation({
    onSuccess: (result) => {
      setCancellationRequestId(result.requestId);
      
      if (result.status === "completed") {
        toast.success("Subscription cancelled successfully!", {
          description: result.confirmationCode ? `Confirmation: ${result.confirmationCode}` : undefined,
        });
        void utils.subscriptions.getAll.invalidate();
        void utils.subscriptions.getById.invalidate({ id: subscription.id });
        // Close modal after short delay
        setTimeout(() => onOpenChange(false), 2000);
      } else if (result.error?.code === "MANUAL_INTERVENTION_REQUIRED" && result.manualInstructions) {
        setManualInstructions(result.manualInstructions);
        setShowManualInstructions(true);
      }
    },
    onError: (error) => {
      toast.error("Failed to initiate cancellation", {
        description: error.message,
      });
    },
  });

  const handleMethodSelect = (method: CancellationMethod) => {
    setSelectedMethod(method);
    initiateCancellation({
      subscriptionId: subscription.id,
      method,
    });
  };

  const getMethodIcon = (method: CancellationMethod) => {
    switch (method) {
      case "api":
        return <Bot className="h-5 w-5" />;
      case "web_automation":
        return <Globe className="h-5 w-5" />;
      case "manual":
        return <HandHelping className="h-5 w-5" />;
    }
  };

  const getMethodTitle = (method: CancellationMethod) => {
    switch (method) {
      case "api":
        return "Instant Cancellation";
      case "web_automation":
        return "Automated Cancellation";
      case "manual":
        return "Manual Cancellation";
    }
  };

  const getMethodDescription = (method: CancellationMethod) => {
    switch (method) {
      case "api":
        return "Cancel instantly through our direct integration";
      case "web_automation":
        return "We'll navigate the cancellation process for you";
      case "manual":
        return "Follow our step-by-step guide to cancel";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "hard":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Cancel {subscription.name}</DialogTitle>
            <DialogDescription>
              Choose how you'd like to cancel your subscription
            </DialogDescription>
          </DialogHeader>

          {cancellationRequestId ? (
            <CancellationStatus 
              requestId={cancellationRequestId}
              subscriptionName={subscription.name}
            />
          ) : (
            <div className="space-y-4">
              {/* Provider Info */}
              {methods?.provider && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Provider Information</CardTitle>
                      <Badge className={getDifficultyColor(methods.provider.difficulty)}>
                        {methods.provider.difficulty} to cancel
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {methods.provider.averageTime && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>~{methods.provider.averageTime} min</span>
                        </div>
                      )}
                      {methods.provider.supportsRefunds && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span>Refunds available</span>
                        </div>
                      )}
                      {methods.provider.requires2FA && (
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          <span>2FA required</span>
                        </div>
                      )}
                      {methods.provider.requiresRetention && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <span>May offer retention</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cancellation Methods */}
              <div className="space-y-3">
                <h3 className="font-medium">Select Cancellation Method</h3>
                
                {methodsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {methods?.methods.map((method) => (
                      <Card 
                        key={method}
                        className={`cursor-pointer transition-all hover:border-primary ${
                          method === methods.recommended ? "border-primary shadow-sm" : ""
                        }`}
                        onClick={() => handleMethodSelect(method)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getMethodIcon(method)}
                              <div>
                                <CardTitle className="text-base">
                                  {getMethodTitle(method)}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {getMethodDescription(method)}
                                </CardDescription>
                              </div>
                            </div>
                            {method === methods.recommended && (
                              <Badge variant="secondary">Recommended</Badge>
                            )}
                          </div>
                        </CardHeader>
                        {isInitiating && selectedMethod === method && (
                          <CardContent>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Initiating cancellation...
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Savings Reminder */}
              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  You'll save {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: subscription.currency,
                  }).format(subscription.amount)} per {subscription.frequency.replace("ly", "")}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isInitiating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ManualInstructionsDialog
        open={showManualInstructions}
        onOpenChange={setShowManualInstructions}
        instructions={manualInstructions}
        subscription={subscription}
        requestId={cancellationRequestId}
      />
    </>
  );
}