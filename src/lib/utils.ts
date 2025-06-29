import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with proper locale and symbol
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency = 'USD'
): string {
  if (amount == null || isNaN(amount)) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format subscription frequency for display
 */
export function formatFrequency(frequency: string | null | undefined): string {
  if (frequency == null) return String(frequency);

  const frequencies: Record<string, string> = {
    monthly: 'month',
    yearly: 'year',
    weekly: 'week',
    daily: 'day',
  };

  return frequencies[frequency] ?? frequency;
}

/**
 * Calculate next billing date based on current date and frequency
 */
export function calculateNextBilling(date: Date, frequency: string): Date {
  const nextDate = new Date(date);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1); // Default to monthly
  }

  return nextDate;
}

/**
 * Check if a renewal date is upcoming within threshold days
 */
export function isUpcomingRenewal(
  renewalDate: Date,
  thresholdDays = 7
): boolean {
  const now = new Date();
  const timeDiff = renewalDate.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

  return daysDiff >= 0 && daysDiff <= thresholdDays;
}

/**
 * Get subscription status based on active state and next billing
 */
export function getSubscriptionStatus(
  isActive: boolean,
  nextBilling: Date
): string {
  if (!isActive) return 'canceled';

  const now = new Date();
  if (nextBilling < now) return 'expired';

  return 'active';
}

/**
 * Validate email address format
 */
export function validateEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;

  // More permissive regex that allows localhost and simple domains
  const emailRegex = /^[^\s@]+@[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Truncate text to specified length with suffix
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix = '...'
): string {
  if (!text || maxLength < 0) return text || '';
  if (text.length <= maxLength) return text;

  const truncateLength = Math.max(0, maxLength - suffix.length);
  return text.substring(0, truncateLength) + suffix;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(this: unknown, ...args: Parameters<T>) {
    const context = this as ThisParameterType<T>;
    const later = () => {
      timeout = null;
      func.apply(context, args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate unique ID with optional prefix
 */
export function generateId(prefix?: string, length = 12): string {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  // Use crypto.getRandomValues for secure random generation
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars.charAt(array[i] % chars.length);
    }
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    // Node.js 19+ or other environments with global crypto
    const array = new Uint8Array(length);
    globalThis.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars.charAt(array[i] % chars.length);
    }
  } else {
    // Fallback for older Node.js versions
    try {
      const crypto = require('crypto');
      const bytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        result += chars.charAt(bytes[i] % chars.length);
      }
    } catch {
      // Last resort fallback
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
  }

  return prefix ? `${prefix}-${result}` : result;
}

/**
 * Format date for display
 */
export function formatDate(
  date: Date | string | null | undefined,
  formatStr = 'MMM d, yyyy'
): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';

    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}
