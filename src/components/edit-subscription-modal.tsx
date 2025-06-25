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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const editSubscriptionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.string().optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean(),
  customAmount: z.number().positive().optional(),
});

type EditSubscriptionFormData = z.infer<typeof editSubscriptionSchema>;

interface EditSubscriptionModalProps {
  subscription: {
    id: string;
    name: string;
    category?: string | null;
    notes?: string | null;
    isActive: boolean;
    amount: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const categories = [
  'Streaming',
  'Music',
  'Software',
  'Gaming',
  'News',
  'Fitness',
  'Education',
  'Storage',
  'Food',
  'Other',
];

export function EditSubscriptionModal({
  subscription,
  open,
  onOpenChange,
  onSuccess,
}: EditSubscriptionModalProps) {
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const utils = api.useUtils();

  const form = useForm<EditSubscriptionFormData>({
    resolver: zodResolver(editSubscriptionSchema),
    defaultValues: {
      name: subscription.name,
      category: subscription.category ?? undefined,
      notes: subscription.notes ?? '',
      isActive: subscription.isActive,
      customAmount: subscription.amount,
    },
  });

  const updateMutation = api.subscriptions.update.useMutation({
    onSuccess: () => {
      toast.success('Subscription updated successfully');
      onOpenChange(false);
      utils.subscriptions.getAll.invalidate();
      utils.subscriptions.getById.invalidate({ id: subscription.id });
      utils.subscriptions.getStats.invalidate();
      onSuccess?.();
    },
    onError: error => {
      toast.error('Failed to update subscription', {
        description: error.message,
      });
    },
  });

  const onSubmit = (data: EditSubscriptionFormData) => {
    updateMutation.mutate({
      id: subscription.id,
      ...data,
      customAmount: isCustomAmount ? data.customAmount : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
          <DialogDescription>
            Update the details for your subscription
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Netflix Premium" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="custom-amount"
                  checked={isCustomAmount}
                  onCheckedChange={setIsCustomAmount}
                />
                <Label htmlFor="custom-amount">Override amount</Label>
              </div>
              {isCustomAmount && (
                <FormField
                  control={form.control}
                  name="customAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="19.99"
                          {...field}
                          onChange={e =>
                            field.onChange(parseFloat(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Override the detected amount
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this subscription..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional notes or reminders (max 500 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Mark this subscription as active or inactive
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
