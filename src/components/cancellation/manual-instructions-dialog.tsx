"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  MessageCircle,
  Globe,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  FileText,
  Copy,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

interface ManualInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructions: any;
  subscription: {
    id: string;
    name: string;
    amount: number;
    currency: string;
  };
  requestId: string | null;
}

export function ManualInstructionsDialog({
  open,
  onOpenChange,
  instructions,
  subscription,
  requestId,
}: ManualInstructionsDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [notes, setNotes] = useState("");

  const utils = api.useUtils();

  // Confirm manual cancellation mutation
  const { mutate: confirmCancellation, isPending: isConfirming } = 
    api.cancellation.confirmManual.useMutation({
      onSuccess: () => {
        toast.success("Cancellation confirmed!", {
          description: "Your subscription has been marked as cancelled.",
        });
        void utils.subscriptions.getAll.invalidate();
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error("Failed to confirm cancellation", {
          description: error.message,
        });
      },
    });

  if (!instructions || !requestId) return null;

  const totalSteps = instructions.instructions?.length ?? 0;
  const currentInstruction = instructions.instructions?.[currentStep];

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowConfirmation(true);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirm = () => {
    if (!requestId) return;

    confirmCancellation({
      requestId,
      confirmationCode: confirmationCode || undefined,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      notes: notes || undefined,
    });
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getContactIcon = (type: string) => {
    switch (type) {
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "chat":
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual Cancellation Instructions</DialogTitle>
          <DialogDescription>
            Follow these steps to cancel {subscription.name}
          </DialogDescription>
        </DialogHeader>

        {showConfirmation ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Confirm Your Cancellation</CardTitle>
                <CardDescription>
                  Once you've completed the cancellation process, please confirm the details below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="confirmationCode">Confirmation Code (if provided)</Label>
                  <Input
                    id="confirmationCode"
                    placeholder="e.g., ABC123XYZ"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="effectiveDate">Effective Date</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional details about the cancellation..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="flex-1"
              >
                Back to Instructions
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="flex-1"
              >
                {isConfirming ? "Confirming..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {totalSteps}</span>
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-8 rounded-full ${
                      i <= currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Prerequisites */}
            {currentStep === 0 && instructions.prerequisites && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Before You Start
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {instructions.prerequisites.map((prereq: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                        {prereq}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Current Step */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{currentInstruction?.title}</CardTitle>
                  <Badge variant="secondary">
                    <Clock className="mr-1 h-3 w-3" />
                    ~{instructions.estimatedTime} min
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">{currentInstruction?.description}</p>

                {currentInstruction?.warning && (
                  <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      {currentInstruction.warning}
                    </p>
                  </div>
                )}

                {currentInstruction?.tip && (
                  <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {currentInstruction.tip}
                    </p>
                  </div>
                )}

                {currentInstruction?.expectedResult && (
                  <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Expected Result:
                    </p>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                      {currentInstruction.expectedResult}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            {instructions.contactInfo && Object.keys(instructions.contactInfo).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {instructions.contactInfo.phone && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{instructions.contactInfo.phone}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(instructions.contactInfo.phone)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {instructions.contactInfo.email && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{instructions.contactInfo.email}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(instructions.contactInfo.email)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {instructions.contactInfo.chat && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={instructions.contactInfo.chat}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Live Chat
                          </a>
                        </div>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    {instructions.contactInfo.hours && (
                      <p className="text-xs text-muted-foreground">
                        Hours: {instructions.contactInfo.hours}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="flex-1"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button onClick={handleNext} className="flex-1">
                {currentStep === totalSteps - 1 ? (
                  <>
                    Complete
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Tips */}
            {instructions.tips && instructions.tips.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Helpful Tips</h4>
                  <ul className="space-y-1">
                    {instructions.tips.map((tip: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}