import { SUBSCRIPTION_CATEGORIES } from '@/server/lib/openai-client';

/**
 * Utility functions for handling subscription categories
 */

/**
 * Capitalize the first letter of a string
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Get the proper display name for a category
 * Returns capitalized category name from the definition, or capitalizes the input
 */
export function getCategoryDisplayName(categoryKey: string): string {
  if (!categoryKey) return 'Other';

  // First check if we have a proper category definition
  const categoryDef =
    SUBSCRIPTION_CATEGORIES[
      categoryKey as keyof typeof SUBSCRIPTION_CATEGORIES
    ];
  if (categoryDef) {
    return categoryDef.name; // Already properly capitalized
  }

  // Fallback: capitalize the input
  return capitalizeFirst(categoryKey);
}

/**
 * Get category icon
 */
export function getCategoryIcon(categoryKey: string): string {
  const categoryDef =
    SUBSCRIPTION_CATEGORIES[
      categoryKey as keyof typeof SUBSCRIPTION_CATEGORIES
    ];
  return categoryDef?.icon ?? '📁';
}

/**
 * Get category description
 */
export function getCategoryDescription(categoryKey: string): string {
  const categoryDef =
    SUBSCRIPTION_CATEGORIES[
      categoryKey as keyof typeof SUBSCRIPTION_CATEGORIES
    ];
  return categoryDef?.description ?? 'Other subscription category';
}

/**
 * Get all available categories with their display names
 */
export function getAllCategories() {
  return Object.entries(SUBSCRIPTION_CATEGORIES).map(([key, value]) => ({
    key,
    name: value.name,
    description: value.description,
    icon: value.icon,
  }));
}

/**
 * Normalize a category key to ensure consistency
 */
export function normalizeCategoryKey(category: string): string {
  if (!category) return 'other';
  return category.toLowerCase().trim();
}

/**
 * Format category for display with proper capitalization
 */
export function formatCategoryForDisplay(category: string): string {
  const normalizedKey = normalizeCategoryKey(category);
  return getCategoryDisplayName(normalizedKey);
}
