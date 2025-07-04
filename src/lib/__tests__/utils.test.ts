import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import {
  cn,
  formatCurrency,
  formatFrequency,
  calculateNextBilling,
  isUpcomingRenewal,
  getSubscriptionStatus,
  validateEmail,
  truncateText,
  debounce,
  generateId,
} from '@/lib/utils';

describe('utils', () => {
  describe('cn (className utility)', () => {
    it('merges class names correctly', () => {
      expect(cn('base-class', 'additional-class')).toBe(
        'base-class additional-class'
      );
    });

    it('handles conditional classes', () => {
      const showConditional = true;
      const showHidden = false;
      expect(
        cn('base', showConditional && 'conditional', showHidden && 'hidden')
      ).toBe('base conditional');
    });

    it('handles undefined and null values', () => {
      expect(cn('base', undefined, null, 'end')).toBe('base end');
    });

    it('resolves Tailwind conflicts', () => {
      expect(cn('p-4 p-6')).toBe('p-6');
      expect(cn('text-red-500 text-blue-500')).toBe('text-blue-500');
    });
  });

  describe('formatCurrency', () => {
    it('formats USD currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('handles negative amounts', () => {
      expect(formatCurrency(-15.99)).toBe('-$15.99');
    });

    it('formats different currencies', () => {
      expect(formatCurrency(100, 'EUR')).toBe('€100.00');
      expect(formatCurrency(100, 'GBP')).toBe('£100.00');
    });

    it('handles very large numbers', () => {
      expect(formatCurrency(1000000.5)).toBe('$1,000,000.50');
    });

    it('handles decimal precision', () => {
      expect(formatCurrency(9.999)).toBe('$10.00');
      expect(formatCurrency(9.001)).toBe('$9.00');
    });
  });

  describe('formatFrequency', () => {
    it('formats frequency strings correctly', () => {
      expect(formatFrequency('monthly')).toBe('month');
      expect(formatFrequency('yearly')).toBe('year');
      expect(formatFrequency('weekly')).toBe('week');
      expect(formatFrequency('daily')).toBe('day');
    });

    it('handles unknown frequencies', () => {
      expect(
        formatFrequency(
          'unknown' as unknown as Parameters<typeof formatFrequency>[0]
        )
      ).toBe('unknown');
    });

    it('handles edge cases', () => {
      expect(
        formatFrequency(
          undefined as unknown as Parameters<typeof formatFrequency>[0]
        )
      ).toBe('undefined');
      expect(
        formatFrequency(
          null as unknown as Parameters<typeof formatFrequency>[0]
        )
      ).toBe('null');
    });
  });

  describe('calculateNextBilling', () => {
    const baseDate = new Date('2024-07-15');

    it('calculates next monthly billing', () => {
      const nextBilling = calculateNextBilling(baseDate, 'monthly');
      expect(nextBilling).toEqual(new Date('2024-08-15'));
    });

    it('calculates next weekly billing', () => {
      const nextBilling = calculateNextBilling(baseDate, 'weekly');
      expect(nextBilling).toEqual(new Date('2024-07-22'));
    });

    it('calculates next yearly billing', () => {
      const nextBilling = calculateNextBilling(baseDate, 'yearly');
      expect(nextBilling).toEqual(new Date('2025-07-15'));
    });

    it('calculates next daily billing', () => {
      const nextBilling = calculateNextBilling(baseDate, 'daily');
      expect(nextBilling).toEqual(new Date('2024-07-16'));
    });

    it('handles month-end dates correctly', () => {
      const endOfMonth = new Date('2024-01-31');
      const nextBilling = calculateNextBilling(endOfMonth, 'monthly');
      // JavaScript Date handles month overflow, Feb 31 becomes Mar 2/3
      expect(nextBilling.getMonth()).toBe(2); // March (JavaScript handles overflow)
    });

    it('handles leap years', () => {
      const leapYearDate = new Date('2024-02-29');
      const nextBilling = calculateNextBilling(leapYearDate, 'yearly');
      expect(nextBilling).toEqual(new Date('2025-03-01')); // JS Date overflow
    });
  });

  describe('isUpcomingRenewal', () => {
    const now = new Date('2024-07-15T12:00:00Z');

    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('identifies upcoming renewals within default threshold', () => {
      const threeDaysFromNow = new Date('2024-07-18T12:00:00Z');
      expect(isUpcomingRenewal(threeDaysFromNow)).toBe(true);
    });

    it('identifies renewals not upcoming with default threshold', () => {
      const eightDaysFromNow = new Date('2024-07-23T12:00:00Z');
      expect(isUpcomingRenewal(eightDaysFromNow)).toBe(false);
    });

    it('handles custom threshold', () => {
      const tenDaysFromNow = new Date('2024-07-25T12:00:00Z');
      expect(isUpcomingRenewal(tenDaysFromNow, 10)).toBe(true);
      expect(isUpcomingRenewal(tenDaysFromNow, 5)).toBe(false);
    });

    it('handles past dates', () => {
      const yesterday = new Date('2024-07-14T12:00:00Z');
      expect(isUpcomingRenewal(yesterday)).toBe(false);
    });

    it('handles same-day renewals', () => {
      const today = new Date('2024-07-15T18:00:00Z');
      expect(isUpcomingRenewal(today)).toBe(true);
    });
  });

  describe('getSubscriptionStatus', () => {
    it('returns active for active subscriptions', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days in the future
      expect(getSubscriptionStatus(true, futureDate)).toBe('active');
    });

    it('returns canceled for inactive subscriptions', () => {
      expect(getSubscriptionStatus(false, new Date())).toBe('canceled');
    });

    it('returns expired for active subscriptions past due', () => {
      const pastDate = new Date('2024-01-01');
      expect(getSubscriptionStatus(true, pastDate)).toBe('expired');
    });

    it('handles edge case of subscription expiring today', () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      expect(getSubscriptionStatus(true, today)).toBe('active');
    });
  });

  describe('validateEmail', () => {
    it('validates correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
      expect(validateEmail('test123@sub.domain.com')).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test.example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(validateEmail('test@localhost')).toBe(true); // Technically valid
      expect(validateEmail('test@@example.com')).toBe(false);
      expect(validateEmail('test@ex ample.com')).toBe(false);
    });
  });

  describe('truncateText', () => {
    it('truncates text longer than max length', () => {
      expect(truncateText('This is a long text', 10)).toBe('This is...');
    });

    it('does not truncate text shorter than max length', () => {
      expect(truncateText('Short', 10)).toBe('Short');
    });

    it('handles exact length match', () => {
      expect(truncateText('Exact', 5)).toBe('Exact');
    });

    it('handles custom suffix', () => {
      expect(truncateText('Long text here', 8, ' [more]')).toBe('L [more]');
    });

    it('handles empty strings', () => {
      expect(truncateText('', 10)).toBe('');
    });

    it('handles very short max lengths', () => {
      expect(truncateText('Hello', 2)).toBe('...');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('delays function execution', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('cancels previous calls', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('passes arguments correctly', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn('arg1', 'arg2');
      vi.advanceTimersByTime(1000);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('maintains this context', () => {
      const obj = {
        value: 'test',
        method: vi.fn(function (this: { value: string }) {
          return this.value;
        }),
      };

      const debouncedMethod = debounce(obj.method, 1000);
      debouncedMethod.call(obj);

      vi.advanceTimersByTime(1000);
      expect(obj.method).toHaveBeenCalled();
    });
  });

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('generates IDs with correct format', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(10);
    });

    it('generates IDs with specified prefix', () => {
      const id = generateId('sub');
      expect(id).toMatch(/^sub-/);
    });

    it('generates IDs with specified length', () => {
      const id = generateId('test', 20);
      expect(id.length).toBe(25); // 'test-' + 20 characters
    });

    it('generates multiple unique IDs with same prefix', () => {
      const ids = Array.from({ length: 100 }, () => generateId('test'));
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });
  });

  describe('edge cases and error handling', () => {
    it('handles null and undefined in formatCurrency', () => {
      expect(formatCurrency(null as unknown as number)).toBe('$0.00');
      expect(formatCurrency(undefined as unknown as number)).toBe('$0.00');
    });

    it('handles invalid dates in calculateNextBilling', () => {
      const invalidDate = new Date('invalid');
      const result = calculateNextBilling(invalidDate, 'monthly');
      expect(isNaN(result.getTime())).toBe(true);
    });

    it('handles invalid email inputs', () => {
      expect(validateEmail(null as unknown as string)).toBe(false);
      expect(validateEmail(undefined as unknown as string)).toBe(false);
      expect(validateEmail(123 as unknown as string)).toBe(false);
    });

    it('handles negative length in truncateText', () => {
      expect(truncateText('Hello', -5)).toBe('Hello');
    });

    it('handles zero delay in debounce', () => {
      vi.useFakeTimers();

      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 0);

      debouncedFn();
      vi.advanceTimersByTime(0);
      expect(mockFn).toHaveBeenCalledOnce();

      vi.useRealTimers();
    });
  });
});
