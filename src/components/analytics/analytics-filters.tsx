'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, X } from 'lucide-react';

interface AnalyticsFilters {
  categories: string[];
  minAmount?: number;
  maxAmount?: number;
  status: 'all' | 'active' | 'cancelled';
}

interface AnalyticsFiltersProps {
  categories: string[];
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
}

export function AnalyticsFilters({
  categories,
  filters,
  onFiltersChange,
}: AnalyticsFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  const handleCategoryToggle = (category: string) => {
    const updatedCategories = tempFilters.categories.includes(category)
      ? tempFilters.categories.filter(c => c !== category)
      : [...tempFilters.categories, category];

    setTempFilters(prev => ({
      ...prev,
      categories: updatedCategories,
    }));
  };

  const handleAmountChange = (
    field: 'minAmount' | 'maxAmount',
    value: string
  ) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setTempFilters(prev => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const handleStatusChange = (status: string) => {
    setTempFilters(prev => ({
      ...prev,
      status: status as 'all' | 'active' | 'cancelled',
    }));
  };

  const applyFilters = () => {
    onFiltersChange(tempFilters);
    setIsOpen(false);
  };

  const resetFilters = () => {
    const defaultFilters = {
      categories: [],
      minAmount: undefined,
      maxAmount: undefined,
      status: 'all' as const,
    };
    setTempFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    setIsOpen(false);
  };

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.minAmount !== undefined ||
    filters.maxAmount !== undefined ||
    filters.status !== 'all';

  const activeFilterCount =
    filters.categories.length +
    (filters.minAmount !== undefined ? 1 : 0) +
    (filters.maxAmount !== undefined ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1">
          {filters.categories.map(category => (
            <Badge key={category} variant="secondary" className="text-xs">
              {category}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-auto p-0"
                onClick={() => {
                  const newFilters = {
                    ...filters,
                    categories: filters.categories.filter(c => c !== category),
                  };
                  onFiltersChange(newFilters);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}

          {filters.minAmount !== undefined && (
            <Badge variant="secondary" className="text-xs">
              Min: ${filters.minAmount}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-auto p-0"
                onClick={() => {
                  const newFilters = { ...filters, minAmount: undefined };
                  onFiltersChange(newFilters);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.maxAmount !== undefined && (
            <Badge variant="secondary" className="text-xs">
              Max: ${filters.maxAmount}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-auto p-0"
                onClick={() => {
                  const newFilters = { ...filters, maxAmount: undefined };
                  onFiltersChange(newFilters);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.status !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Status: {filters.status}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-auto p-0"
                onClick={() => {
                  const newFilters = { ...filters, status: 'all' as const };
                  onFiltersChange(newFilters);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}

      {/* Filter Button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Filter Analytics</h4>
              <p className="text-sm text-muted-foreground">
                Customize the data shown in your analytics
              </p>
            </div>

            {/* Category Filters */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Categories</Label>
              <div className="space-y-2">
                {categories.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={tempFilters.categories.includes(category)}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    />
                    <Label
                      htmlFor={`category-${category}`}
                      className="text-sm font-normal"
                    >
                      {category}
                    </Label>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No categories available
                  </p>
                )}
              </div>
            </div>

            {/* Amount Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Amount Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label
                    htmlFor="min-amount"
                    className="text-xs text-muted-foreground"
                  >
                    Min Amount
                  </Label>
                  <Input
                    id="min-amount"
                    type="number"
                    placeholder="$0"
                    value={tempFilters.minAmount ?? ''}
                    onChange={e =>
                      handleAmountChange('minAmount', e.target.value)
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="max-amount"
                    className="text-xs text-muted-foreground"
                  >
                    Max Amount
                  </Label>
                  <Input
                    id="max-amount"
                    type="number"
                    placeholder="$999"
                    value={tempFilters.maxAmount ?? ''}
                    onChange={e =>
                      handleAmountChange('maxAmount', e.target.value)
                    }
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value={tempFilters.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
              >
                Reset
              </Button>
              <Button size="sm" onClick={applyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear All Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="text-muted-foreground"
        >
          Clear All
        </Button>
      )}
    </div>
  );
}
