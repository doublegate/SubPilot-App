'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CategorySelectorProps {
  subscriptionId: string;
  currentCategory?: string | null;
  aiCategory?: string | null;
  aiConfidence?: number | null;
  onCategoryChange?: (category: string) => void;
  className?: string;
}

export function CategorySelector({
  subscriptionId,
  currentCategory,
  aiCategory,
  aiConfidence,
  onCategoryChange,
  className,
}: CategorySelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const utils = api.useUtils();

  // Fetch available categories
  const { data: categories, isLoading: categoriesLoading } =
    api.categorization.getCategories.useQuery();

  // Update category mutation
  const updateCategory = api.categorization.updateCategory.useMutation({
    onMutate: () => {
      setIsUpdating(true);
    },
    onSuccess: (_, variables) => {
      toast.success('Category updated successfully');
      onCategoryChange?.(variables.category);

      // Invalidate related queries
      void utils.subscriptions.getAll.invalidate();
      void utils.analytics.getOverview.invalidate();
      void utils.categorization.getStats.invalidate();
    },
    onError: error => {
      toast.error('Failed to update category', {
        description: error.message,
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  // AI categorization mutation
  const categorizeWithAI =
    api.categorization.categorizeSubscription.useMutation({
      onMutate: () => {
        setIsUpdating(true);
      },
      onSuccess: result => {
        toast.success('AI categorization complete', {
          description: `Category: ${result.category} (${Math.round(result.confidence * 100)}% confidence)`,
        });

        // Invalidate related queries
        void utils.subscriptions.getAll.invalidate();
        void utils.analytics.getOverview.invalidate();
        void utils.categorization.getStats.invalidate();
      },
      onError: error => {
        toast.error('AI categorization failed', {
          description: error.message,
        });
      },
      onSettled: () => {
        setIsUpdating(false);
      },
    });

  const handleCategoryChange = (newCategory: string) => {
    updateCategory.mutate({
      subscriptionId,
      category: newCategory as keyof typeof categories,
    });
  };

  const handleAICategorization = () => {
    categorizeWithAI.mutate({
      subscriptionId,
      forceRecategorize: true,
    });
  };

  // Determine the effective category (manual override takes precedence)
  const effectiveCategory = currentCategory ?? aiCategory;

  if (categoriesLoading || !categories) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">
          Loading categories...
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select
        value={effectiveCategory ?? 'other'}
        onValueChange={handleCategoryChange}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-[180px]">
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SelectValue placeholder="Select category" />
          )}
        </SelectTrigger>
        <SelectContent>
          {Object.entries(categories).map(([id, category]) => (
            <SelectItem key={id} value={id}>
              <span className="flex items-center gap-2">
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* AI Badge */}
      {aiCategory && aiConfidence && (
        <Badge
          variant="secondary"
          className="flex items-center gap-1"
          title={`AI categorized as ${aiCategory} with ${Math.round(aiConfidence * 100)}% confidence`}
        >
          <Sparkles className="h-3 w-3" />
          AI
        </Badge>
      )}

      {/* Manual Override Indicator */}
      {currentCategory && aiCategory && currentCategory !== aiCategory && (
        <Badge variant="outline" title="Manually overridden">
          Manual
        </Badge>
      )}

      {/* AI Categorization Button */}
      {!aiCategory && (
        <button
          onClick={handleAICategorization}
          disabled={isUpdating}
          className="text-sm text-primary hover:underline disabled:opacity-50"
          title="Use AI to categorize this subscription"
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Categorize
            </span>
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Bulk category selector for multiple items
 */
interface BulkCategorySelectorProps {
  onBulkCategorize: () => void;
  isProcessing?: boolean;
  itemCount?: number;
}

export function BulkCategorySelector({
  onBulkCategorize,
  isProcessing = false,
  itemCount = 0,
}: BulkCategorySelectorProps) {
  return (
    <button
      onClick={onBulkCategorize}
      disabled={isProcessing || itemCount === 0}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
        'text-primary-foreground bg-primary hover:bg-primary/90',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors'
      )}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Categorizing...</span>
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          <span>
            Categorize {itemCount > 0 ? `${itemCount} items` : 'All'} with AI
          </span>
        </>
      )}
    </button>
  );
}
