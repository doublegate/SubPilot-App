'use client';

import { useState } from 'react';
import { SubscriptionCard } from '@/components/subscription-card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  nextBilling: Date | null;
  status: 'active' | 'cancelled' | 'pending';
  isActive: boolean;
  category?: string;
  provider?: {
    name: string;
    logo?: string | null;
  } | null;
  lastTransaction?: Date;
}

interface SubscriptionListProps {
  subscriptions: Subscription[];
  categories?: string[];
  onCancel?: (id: string) => void;
  onUpdate?: (id: string) => void;
  isLoading?: boolean;
}

export function SubscriptionList({
  subscriptions,
  categories = [],
  onCancel,
  onUpdate,
  isLoading,
}: SubscriptionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('nextBilling');

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch =
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.provider?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesCategory =
      categoryFilter === 'all' || sub.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Sort subscriptions
  const sortedSubscriptions = [...filteredSubscriptions].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'amount':
        return b.amount - a.amount;
      case 'nextBilling':
        if (!a.nextBilling) return 1;
        if (!b.nextBilling) return -1;
        return (
          new Date(a.nextBilling).getTime() - new Date(b.nextBilling).getTime()
        );
      default:
        return 0;
    }
  });

  const activeFilters = [
    statusFilter !== 'all' && { key: 'status', value: statusFilter },
    categoryFilter !== 'all' && { key: 'category', value: categoryFilter },
  ].filter(Boolean);

  const clearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search subscriptions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
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
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nextBilling">Next Billing</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Active filters:
            </span>
            {activeFilters.map(
              filter =>
                filter && (
                  <Badge key={filter.key} variant="secondary">
                    {filter.key}: {filter.value}
                  </Badge>
                )
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 px-2"
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      {sortedSubscriptions.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery || activeFilters.length > 0
              ? 'No subscriptions found matching your filters'
              : 'No subscriptions found'}
          </p>
          {activeFilters.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="mt-4"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedSubscriptions.map(subscription => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onCancel={onCancel}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
