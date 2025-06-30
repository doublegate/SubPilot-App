'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubscriptionList } from '@/components/subscription-list';
import { DashboardStats } from '@/components/dashboard-stats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/trpc/react';
import {
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AddSubscriptionModal } from '@/components/add-subscription-modal';
import { EditSubscriptionModal } from '@/components/edit-subscription-modal';
import { CancellationAssistant } from '@/components/cancellation-assistant';
import { ArchiveSubscriptionModal } from '@/components/archive-subscription-modal';
import { ErrorBoundary } from '@/components/error-boundary';

interface Subscription {
  id: string;
  name: string;
  description?: string | null;
  amount: number;
  currency: string;
  frequency: string;
  status: string;
  category?: string | null;
  nextBilling?: Date | null;
  provider?: {
    name: string;
    website?: string | null;
    logo?: string | null;
  } | null;
  notes?: string | null;
  isActive: boolean;
}

export default function SubscriptionsPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'nextBilling'>(
    'nextBilling'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);

  // Fetch subscriptions with filters
  const {
    data: subscriptionsData,
    isLoading,
    refetch,
  } = api.subscriptions.getAll.useQuery({
    status:
      statusFilter === 'all'
        ? undefined
        : (statusFilter as 'active' | 'cancelled' | 'pending'),
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    sortBy,
    sortOrder,
  });

  // Fetch stats
  const { data: stats } = api.subscriptions.getStats.useQuery();

  // Fetch categories
  const { data: categories } = api.subscriptions.getCategories.useQuery();

  // Detect subscriptions mutation
  const detectSubscriptions = api.subscriptions.detectSubscriptions.useMutation(
    {
      onSuccess: data => {
        if (data.created > 0) {
          toast.success(`Found ${data.created} new subscriptions!`);
        } else {
          toast.info('No new subscriptions detected');
        }

        // Refresh the data and then refresh the page to ensure all components update
        void refetch().then(() => {
          // Small delay to allow the toast to be seen before refresh
          setTimeout(() => {
            router.refresh();
          }, 1500);
        });
      },
      onError: error => {
        toast.error('Failed to detect subscriptions', {
          description: error.message,
        });
      },
    }
  );

  // Cleanup duplicates mutation
  const cleanupDuplicates = api.subscriptions.cleanupDuplicates.useMutation({
    onSuccess: data => {
      if (data.duplicatesRemoved > 0) {
        toast.success(data.message);
      } else {
        toast.info('No duplicate subscriptions found');
      }
      void refetch();
    },
    onError: error => {
      toast.error('Failed to cleanup duplicates', {
        description: error.message,
      });
    },
  });

  // Filter subscriptions based on search query
  const filteredSubscriptions =
    subscriptionsData?.subscriptions.filter(
      sub =>
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

  // Modal handlers
  const handleEditSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setEditModalOpen(true);
  };

  const handleCancelSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setArchiveModalOpen(true);
  };

  const handleMarkCancelled = (subscriptionId: string) => {
    const subscription = subscriptionsData?.subscriptions.find(
      s => s.id === subscriptionId
    );
    if (subscription) {
      setSelectedSubscription(subscription);
      setArchiveModalOpen(true);
    }
  };

  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8">
          <h2 className="text-xl font-semibold text-destructive">
            Error loading subscriptions
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={reset} variant="outline" className="mt-4">
            Try again
          </Button>
        </div>
      )}
    >
      <main className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
            <p className="text-muted-foreground">
              Manage and track all your recurring payments
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Subscription
            </Button>
            <Button
              variant="outline"
              onClick={() => cleanupDuplicates.mutate()}
              disabled={cleanupDuplicates.isPending}
              title="Remove duplicate subscriptions with similar names"
            >
              {cleanupDuplicates.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clean Duplicates
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => detectSubscriptions.mutate({})}
              disabled={detectSubscriptions.isPending}
            >
              {detectSubscriptions.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Detect Subscriptions
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && <DashboardStats stats={stats} />}

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search subscriptions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat.name} value={cat.name}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({cat.count})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={v => setSortBy(v as typeof sortBy)}
            >
              <SelectTrigger className="w-[140px]">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="nextBilling">Next Billing</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
              <span className="sr-only">
                Sort {sortOrder === 'asc' ? 'descending' : 'ascending'}
              </span>
            </Button>
          </div>
        </div>

        {/* Subscriptions List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filteredSubscriptions.length > 0 ? (
          <SubscriptionList
            subscriptions={filteredSubscriptions.map(sub => ({
              id: sub.id,
              name: sub.name,
              amount: sub.amount,
              currency: sub.currency,
              frequency: sub.frequency as
                | 'monthly'
                | 'yearly'
                | 'weekly'
                | 'quarterly',
              nextBilling: sub.nextBilling,
              status: sub.isActive
                ? ('active' as const)
                : ('cancelled' as const),
              isActive: sub.isActive,
              category: sub.category ?? undefined,
              provider: sub.provider ?? undefined,
            }))}
            onUpdate={(id: string) => {
              const subscription = filteredSubscriptions.find(s => s.id === id);
              if (subscription) handleEditSubscription(subscription);
            }}
            onCancel={(id: string) => {
              const subscription = filteredSubscriptions.find(s => s.id === id);
              if (subscription) handleCancelSubscription(subscription);
            }}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-lg font-medium">No subscriptions found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Connect a bank account and run detection to find your subscriptions'}
            </p>
          </div>
        )}

        {/* Modals */}
        <AddSubscriptionModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          onSuccess={() => void refetch()}
        />

        {selectedSubscription && (
          <>
            <EditSubscriptionModal
              subscription={{
                id: selectedSubscription.id,
                name: selectedSubscription.name,
                category: selectedSubscription.category,
                notes: selectedSubscription.notes,
                isActive: selectedSubscription.isActive,
                amount: selectedSubscription.amount,
              }}
              open={editModalOpen}
              onOpenChange={setEditModalOpen}
              onSuccess={() => void refetch()}
            />

            <ArchiveSubscriptionModal
              subscription={{
                id: selectedSubscription.id,
                name: selectedSubscription.name,
                amount: selectedSubscription.amount,
                currency: selectedSubscription.currency,
                frequency: selectedSubscription.frequency,
                provider: selectedSubscription.provider,
              }}
              open={archiveModalOpen}
              onOpenChange={setArchiveModalOpen}
              onSuccess={() => void refetch()}
            />

            <CancellationAssistant
              subscription={{
                id: selectedSubscription.id,
                name: selectedSubscription.name,
                provider: selectedSubscription.provider,
                amount: selectedSubscription.amount,
                currency: selectedSubscription.currency,
                frequency: selectedSubscription.frequency,
              }}
              open={cancellationModalOpen}
              onOpenChange={setCancellationModalOpen}
              onMarkCancelled={handleMarkCancelled}
            />
          </>
        )}
      </main>
    </ErrorBoundary>
  );
}
