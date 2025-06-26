'use client';

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
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';

const addSubscriptionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  frequency: z.enum(['monthly', 'yearly', 'weekly', 'quarterly']),
  category: z.string().optional(),
  notes: z.string().max(500).optional(),
  nextBilling: z.date().optional(),
  providerName: z.string().optional(),
  providerWebsite: z.string().url().optional().or(z.literal('')),
});

type AddSubscriptionFormData = z.infer<typeof addSubscriptionSchema>;

interface AddSubscriptionModalProps {
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

const currencies = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
];

const frequencies = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'weekly', label: 'Weekly' },
];

export function AddSubscriptionModal({
  open,
  onOpenChange,
  onSuccess,
}: AddSubscriptionModalProps) {
  const utils = api.useUtils();

  const form = useForm<AddSubscriptionFormData>({
    resolver: zodResolver(addSubscriptionSchema),
    defaultValues: {
      currency: 'USD',
      frequency: 'monthly',
      nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  // We'll need to add this mutation to the tRPC router
  const createMutation = api.subscriptions.create.useMutation({
    onSuccess: () => {
      toast.success('Subscription added successfully');
      onOpenChange(false);
      form.reset();
      void utils.subscriptions.getAll.invalidate();
      void utils.subscriptions.getStats.invalidate();
      void utils.subscriptions.getCategories.invalidate();
      onSuccess?.();
    },
    onError: error => {
      toast.error('Failed to add subscription', {
        description: error.message,
      });
    },
  });

  const onSubmit = (data: AddSubscriptionFormData) => {
    const provider = data.providerName
      ? {
          name: data.providerName,
          website: data.providerWebsite ?? null,
        }
      : undefined;

    createMutation.mutate({
      name: data.name,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      frequency: data.frequency,
      category: data.category,
      notes: data.notes,
      nextBilling: data.nextBilling,
      provider,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Manual Subscription
          </DialogTitle>
          <DialogDescription>
            Add a subscription that wasn&apos;t automatically detected
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Name *</FormLabel>
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
                          <SelectValue placeholder="Select category" />
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
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Premium streaming service" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map(currency => (
                          <SelectItem
                            key={currency.value}
                            value={currency.value}
                          >
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {frequencies.map(frequency => (
                          <SelectItem
                            key={frequency.value}
                            value={frequency.value}
                          >
                            {frequency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nextBilling"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Billing Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={
                        field.value
                          ? field.value.toISOString().split('T')[0]
                          : ''
                      }
                      onChange={e => {
                        const date = e.target.value
                          ? new Date(e.target.value)
                          : undefined;
                        field.onChange(date);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    When will this subscription next charge you?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-medium">
                Provider Information (Optional)
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="providerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Netflix Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="providerWebsite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://netflix.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about this subscription..."
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Subscription
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
