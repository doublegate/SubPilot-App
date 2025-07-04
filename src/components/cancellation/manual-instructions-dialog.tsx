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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';

interface CancellationInstructions {
  provider: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime?: string;
  steps?: Array<{
    title: string;
    description: string;
    url?: string;
    note?: string;
  }>;
  specificSteps?: string[];
  alternativeMethod?: {
    description: string;
    contactInfo?: string;
  };
  tips?: string[];
  website?: string;
  phone?: string;
  email?: string;
  chatUrl?: string;
}

interface ManualInstructionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  instructions: CancellationInstructions;
  requestId: string;
  onConfirmation: (data: {
    confirmationCode?: string;
    effectiveDate?: Date;
    notes?: string;
    refundAmount?: number;
  }) => void;
}

export function ManualInstructionsDialog({
  isOpen,
  onClose,
  instructions,
  requestId: _requestId,
  onConfirmation,
}: ManualInstructionsDialogProps) {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [notes, setNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleConfirmCancellation = () => {
    const data: {
      confirmationCode?: string;
      effectiveDate?: Date;
      notes?: string;
      refundAmount?: number;
    } = {};

    if (confirmationCode.trim()) {
      data.confirmationCode = confirmationCode.trim();
    }

    if (effectiveDate) {
      data.effectiveDate = new Date(effectiveDate);
    }

    if (notes.trim()) {
      data.notes = notes.trim();
    }

    if (refundAmount) {
      const amount = parseFloat(refundAmount);
      if (!isNaN(amount) && amount > 0) {
        data.refundAmount = amount;
      }
    }

    onConfirmation(data);
    onClose();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.book className="h-5 w-5" />
            Cancellation Instructions
          </DialogTitle>
          <DialogDescription>
            Follow these steps to cancel your subscription. Once complete,
            confirm the cancellation below to update your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Information */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{instructions.service}</h3>
            {instructions.difficulty && (
              <Badge className={getDifficultyColor(instructions.difficulty)}>
                {instructions.difficulty} difficulty
              </Badge>
            )}
          </div>

          {/* Contact Information */}
          {(instructions.website ??
            instructions.phone ??
            instructions.email ??
            instructions.chatUrl) && (
            <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted p-4 md:grid-cols-2">
              <h4 className="col-span-full text-sm font-medium">
                Contact Information
              </h4>

              {instructions.website && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Website
                  </Label>
                  <a
                    href={instructions.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <Icons.externalLink className="h-3 w-3" />
                    Login & Cancel
                  </a>
                </div>
              )}

              {instructions.phone && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <a
                    href={`tel:${instructions.phone}`}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <Icons.phone className="h-3 w-3" />
                    {instructions.phone}
                  </a>
                </div>
              )}

              {instructions.email && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <a
                    href={`mailto:${instructions.email}`}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <Icons.mail className="h-3 w-3" />
                    {instructions.email}
                  </a>
                </div>
              )}

              {instructions.chatUrl && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Live Chat
                  </Label>
                  <a
                    href={instructions.chatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <Icons.messageCircle className="h-3 w-3" />
                    Start Chat
                  </a>
                </div>
              )}

              {instructions.estimatedTime && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Estimated Time
                  </Label>
                  <div className="text-sm">{instructions.estimatedTime}</div>
                </div>
              )}
            </div>
          )}

          {/* Cancellation Steps */}
          <div className="space-y-3">
            <h4 className="font-medium">Cancellation Steps</h4>
            <div className="space-y-2">
              {(instructions.specificSteps ?? instructions.steps)?.map(
                (step: string, index: number) => (
                  <div key={index} className="flex gap-3">
                    <div className="text-primary-foreground flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="text-sm">{step}</div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Tips */}
          {instructions.tips && instructions.tips.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Helpful Tips</h4>
              <div className="space-y-2">
                {instructions.tips.map((tip: string, index: number) => (
                  <div key={index} className="flex gap-2 text-sm">
                    <Icons.lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Confirmation Form */}
          {!showConfirmation ? (
            <div className="text-center">
              <Button onClick={() => setShowConfirmation(true)}>
                <Icons.check className="mr-2 h-4 w-4" />
                I&apos;ve Completed the Cancellation
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-medium">Confirm Cancellation Details</h4>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="confirmationCode">
                    Confirmation Code
                    <span className="ml-1 text-xs text-muted-foreground">
                      (if provided)
                    </span>
                  </Label>
                  <Input
                    id="confirmationCode"
                    value={confirmationCode}
                    onChange={e => setConfirmationCode(e.target.value)}
                    placeholder="e.g., CANC123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="effectiveDate">
                    Effective Date
                    <span className="ml-1 text-xs text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={effectiveDate}
                    onChange={e => setEffectiveDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refundAmount">
                    Refund Amount
                    <span className="ml-1 text-xs text-muted-foreground">
                      (if applicable)
                    </span>
                  </Label>
                  <Input
                    id="refundAmount"
                    type="number"
                    step="0.01"
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">
                  Additional Notes
                  <span className="ml-1 text-xs text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional details about the cancellation process..."
                  rows={3}
                />
              </div>

              <Alert>
                <Icons.info className="h-4 w-4" />
                <AlertDescription>
                  This information helps us track your cancellation and improve
                  our service. Only provide details you&apos;re comfortable
                  sharing.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {showConfirmation && (
            <Button onClick={handleConfirmCancellation}>
              <Icons.check className="mr-2 h-4 w-4" />
              Confirm Cancellation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
