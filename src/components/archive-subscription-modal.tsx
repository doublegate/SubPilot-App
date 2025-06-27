'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { Loader2, Calendar as CalendarIcon, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const archiveSubscriptionSchema = z.object({
  cancellationDate: z.date({
    required_error: 'Please select a cancellation date',
  }),
  reason: z.string().max(500).optional(),
  refundAmount: z.number().min(0).optional(),
});

type ArchiveSubscriptionFormData = z.infer<typeof archiveSubscriptionSchema>;

interface ArchiveSubscriptionModalProps {
  subscription: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    frequency: string;
    provider?: {
      name: string;
    } | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const commonReasons = [
  'No longer needed',
  'Too expensive',
  'Found better alternative',
  'Service quality declined',
  'Billing issues',
  'Temporary pause',
  'Other',
];

export function ArchiveSubscriptionModal({
  subscription,
  open,
  onOpenChange,
  onSuccess,
}: ArchiveSubscriptionModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const utils = api.useUtils();

  const form = useForm<ArchiveSubscriptionFormData>({
    resolver: zodResolver(archiveSubscriptionSchema),
    defaultValues: {
      cancellationDate: new Date(),
      reason: '',
      refundAmount: 0,
    },
  });

  const markCancelledMutation = api.subscriptions.markCancelled.useMutation({
    onSuccess: () => {
      toast.success('Subscription marked as cancelled');
      onOpenChange(false);
      form.reset();
      setSelectedReason('');
      void utils.subscriptions.getAll.invalidate();
      void utils.subscriptions.getById.invalidate({ id: subscription.id });
      void utils.subscriptions.getStats.invalidate();
      onSuccess?.();
    },
    onError: error => {
      toast.error('Failed to mark subscription as cancelled', {
        description: error.message,
      });
    },
  });

  const onSubmit = (data: ArchiveSubscriptionFormData) => {
    markCancelledMutation.mutate({
      id: subscription.id,
      cancellationDate: data.cancellationDate,
      reason: data.reason,
      refundAmount: data.refundAmount,
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Mark Subscription as Cancelled
          </DialogTitle>
          <DialogDescription>
            Record the cancellation details for {subscription.name}
          </DialogDescription>
        </DialogHeader>

        {/* Subscription Summary */}
        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">{subscription.name}</span>
            <Badge variant="secondary">
              {formatCurrency(subscription.amount, subscription.currency)} /{' '}
              {subscription.frequency.replace('ly', '')}
            </Badge>
          </div>
          {subscription.provider && (
            <p className="text-sm text-muted-foreground">
              Provider: {subscription.provider.name}
            </p>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cancellationDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Cancellation Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                          aria-required="true"
                          aria-label="Select cancellation date"
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={date =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When did you cancel this subscription?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Cancellation Reason</FormLabel>
              <div className="flex flex-wrap gap-2">
                {commonReasons.map(reason => (
                  <Button
                    key={reason}
                    type="button"
                    variant={selectedReason === reason ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedReason(reason);
                      form.setValue('reason', reason);
                    }}
                  >
                    {reason}
                  </Button>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional details about the cancellation..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional additional details (max 500 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="refundAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Refund Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={e => {
                        const value = e.target.value
                          ? parseFloat(e.target.value)
                          : 0;
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Any refund amount you received (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={markCancelledMutation.isPending}
                variant="destructive"
              >
                {markCancelledMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Mark as Cancelled
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
