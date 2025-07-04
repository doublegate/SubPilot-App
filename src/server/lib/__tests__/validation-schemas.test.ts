import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  idSchema,
  emailSchema,
  passwordSchema,
  textFieldSchema,
  nameSchema,
  amountSchema,
  dateSchema,
  urlSchema,
  phoneSchema,
  subscriptionCreateSchema,
  cancellationRequestSchema,
  billingSubscriptionSchema,
  notificationSchema,
  paginationSchema,
  validationUtils,
} from '../validation-schemas';

describe('Validation Schemas', () => {
  describe('Common Schemas', () => {
    describe('idSchema', () => {
      it('should accept valid IDs', () => {
        expect(idSchema.parse('user-123456789')).toBe('user-123456789');
        expect(idSchema.parse('abcd1234_-')).toBe('abcd1234_-');
      });

      it('should reject invalid IDs', () => {
        expect(() => idSchema.parse('short')).toThrow(ZodError);
        expect(() => idSchema.parse('id with spaces')).toThrow(ZodError);
        expect(() => idSchema.parse('id@invalid')).toThrow(ZodError);
      });
    });

    describe('emailSchema', () => {
      it('should accept valid emails', () => {
        expect(emailSchema.parse('user@example.com')).toBe('user@example.com');
        expect(emailSchema.parse('User@Example.COM')).toBe('user@example.com');
      });

      it('should reject invalid emails', () => {
        expect(() => emailSchema.parse('not-an-email')).toThrow(ZodError);
        expect(() => emailSchema.parse('user@')).toThrow(ZodError);
        expect(() => emailSchema.parse('@example.com')).toThrow(ZodError);
      });
    });

    describe('passwordSchema', () => {
      it('should accept strong passwords', () => {
        const strongPassword = 'StrongPass123!';
        expect(passwordSchema.parse(strongPassword)).toBe(strongPassword);
      });

      it('should reject weak passwords', () => {
        expect(() => passwordSchema.parse('short')).toThrow(ZodError);
        expect(() => passwordSchema.parse('nouppercase123!')).toThrow(ZodError);
        expect(() => passwordSchema.parse('NOLOWERCASE123!')).toThrow(ZodError);
        expect(() => passwordSchema.parse('NoNumbers!')).toThrow(ZodError);
        expect(() => passwordSchema.parse('NoSpecialChars123')).toThrow(ZodError);
      });
    });

    describe('textFieldSchema', () => {
      it('should accept valid text', () => {
        const validText = 'This is valid text';
        expect(textFieldSchema().parse(validText)).toBe(validText);
      });

      it('should reject potentially dangerous text', () => {
        expect(() => textFieldSchema().parse('<script>alert("xss")</script>')).toThrow(ZodError);
        expect(() => textFieldSchema().parse('Text with "quotes"')).toThrow(ZodError);
        expect(() => textFieldSchema().parse("Text with 'quotes'")).toThrow(ZodError);
      });

      it('should respect length limits', () => {
        const longText = 'a'.repeat(300);
        expect(() => textFieldSchema(100).parse(longText)).toThrow(ZodError);
      });
    });

    describe('nameSchema', () => {
      it('should accept valid names', () => {
        expect(nameSchema.parse('John Doe')).toBe('John Doe');
        expect(nameSchema.parse("O'Connor")).toBe("O'Connor");
        expect(nameSchema.parse('Jean-Luc')).toBe('Jean-Luc');
      });

      it('should reject invalid names', () => {
        expect(() => nameSchema.parse('')).toThrow(ZodError);
        expect(() => nameSchema.parse('<script>')).toThrow(ZodError);
      });
    });

    describe('amountSchema', () => {
      it('should accept valid amounts', () => {
        expect(amountSchema.parse(100)).toBe(100);
        expect(amountSchema.parse('99.99')).toBe(99.99);
        expect(amountSchema.parse(0)).toBe(0);
      });

      it('should reject invalid amounts', () => {
        expect(() => amountSchema.parse(-1)).toThrow(ZodError);
        expect(() => amountSchema.parse(10000000)).toThrow(ZodError);
        expect(() => amountSchema.parse('not-a-number')).toThrow(ZodError);
      });
    });

    describe('dateSchema', () => {
      it('should accept valid dates', () => {
        const validDate = new Date('2024-01-01');
        expect(dateSchema.parse('2024-01-01')).toEqual(validDate);
        expect(dateSchema.parse(validDate)).toEqual(validDate);
      });

      it('should reject invalid dates', () => {
        expect(() => dateSchema.parse('not-a-date')).toThrow(ZodError);
        expect(() => dateSchema.parse('1999-01-01')).toThrow(ZodError); // Too old
        expect(() => dateSchema.parse('2101-01-01')).toThrow(ZodError); // Too future
      });
    });

    describe('urlSchema', () => {
      it('should accept valid URLs', () => {
        expect(urlSchema.parse('https://example.com')).toBe('https://example.com');
        expect(urlSchema.parse('http://localhost:3000')).toBe('http://localhost:3000');
      });

      it('should reject invalid URLs', () => {
        expect(() => urlSchema.parse('not-a-url')).toThrow();
        expect(() => urlSchema.parse('ftp://example.com')).toThrow(ZodError);
      });
    });

    describe('phoneSchema', () => {
      it('should accept valid phone numbers', () => {
        expect(phoneSchema.parse('+1-555-123-4567')).toBe('+1-555-123-4567');
        expect(phoneSchema.parse('(555) 123-4567')).toBe('(555)123-4567');
      });

      it('should reject invalid phone numbers', () => {
        expect(() => phoneSchema.parse('123')).toThrow(ZodError);
        expect(() => phoneSchema.parse('abc-def-ghij')).toThrow(ZodError);
      });
    });
  });

  describe('Business Logic Schemas', () => {
    describe('subscriptionCreateSchema', () => {
      const validSubscription = {
        name: 'Netflix',
        provider: 'Netflix Inc',
        amount: 15.99,
        currency: 'USD',
        billingFrequency: 'monthly' as const,
        nextBillingDate: '2024-02-01',
        description: 'Video streaming service',
        category: 'entertainment' as const,
        isActive: true,
      };

      it('should accept valid subscription data', () => {
        const result = subscriptionCreateSchema.parse(validSubscription);
        expect(result.name).toBe('Netflix');
        expect(result.amount).toBe(15.99);
      });

      it('should reject invalid subscription data', () => {
        expect(() =>
          subscriptionCreateSchema.parse({
            ...validSubscription,
            amount: -10,
          })
        ).toThrow(ZodError);

        expect(() =>
          subscriptionCreateSchema.parse({
            ...validSubscription,
            billingFrequency: 'invalid',
          })
        ).toThrow(ZodError);
      });
    });

    describe('cancellationRequestSchema', () => {
      const validRequest = {
        subscriptionId: 'sub-123456789',
        reason: 'No longer needed',
        method: 'auto' as const,
        priority: 'normal' as const,
      };

      it('should accept valid cancellation request', () => {
        const result = cancellationRequestSchema.parse(validRequest);
        expect(result.subscriptionId).toBe('sub-123456789');
        expect(result.priority).toBe('normal');
      });

      it('should use defaults for optional fields', () => {
        const minimal = { subscriptionId: 'sub-123456789' };
        const result = cancellationRequestSchema.parse(minimal);
        expect(result.priority).toBe('normal');
      });
    });

    describe('billingSubscriptionSchema', () => {
      it('should accept valid billing subscription', () => {
        const valid = {
          planId: 'pro' as const,
          billingPeriod: 'monthly' as const,
        };
        const result = billingSubscriptionSchema.parse(valid);
        expect(result.planId).toBe('pro');
        expect(result.billingPeriod).toBe('monthly');
      });

      it('should reject invalid plan IDs', () => {
        expect(() =>
          billingSubscriptionSchema.parse({
            planId: 'invalid',
            billingPeriod: 'monthly',
          })
        ).toThrow(ZodError);
      });
    });

    describe('notificationSchema', () => {
      const validNotification = {
        type: 'subscription_detected' as const,
        title: 'New Subscription Found',
        message: 'We detected a new subscription on your account',
        severity: 'info' as const,
      };

      it('should accept valid notification', () => {
        const result = notificationSchema.parse(validNotification);
        expect(result.type).toBe('subscription_detected');
        expect(result.severity).toBe('info');
      });

      it('should use default severity', () => {
        const { severity, ...withoutSeverity } = validNotification;
        const result = notificationSchema.parse(withoutSeverity);
        expect(result.severity).toBe('info');
      });
    });
  });

  describe('API Schemas', () => {
    describe('paginationSchema', () => {
      it('should accept valid pagination', () => {
        const result = paginationSchema.parse({
          page: 2,
          limit: 50,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        expect(result.page).toBe(2);
        expect(result.limit).toBe(50);
      });

      it('should use defaults', () => {
        const result = paginationSchema.parse({});
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
        expect(result.sortOrder).toBe('desc');
      });

      it('should enforce limits', () => {
        expect(() => paginationSchema.parse({ page: 0 })).toThrow(ZodError);
        expect(() => paginationSchema.parse({ limit: 200 })).toThrow(ZodError);
      });
    });
  });

  describe('Validation Utils', () => {
    describe('validateRequestSize', () => {
      it('should accept small requests', () => {
        const smallData = { message: 'hello' };
        expect(validationUtils.validateRequestSize(smallData, 100)).toBe(true);
      });

      it('should reject large requests', () => {
        const largeData = { message: 'x'.repeat(200 * 1024) };
        expect(validationUtils.validateRequestSize(largeData, 100)).toBe(false);
      });
    });

    describe('sanitizeString', () => {
      it('should remove dangerous characters', () => {
        const dangerous = '<script>alert("xss")</script>';
        const sanitized = validationUtils.sanitizeString(dangerous);
        expect(sanitized).not.toContain('<');
        expect(sanitized).not.toContain('>');
        expect(sanitized).not.toContain('"');
      });

      it('should trim whitespace', () => {
        const withSpaces = '  hello world  ';
        const sanitized = validationUtils.sanitizeString(withSpaces);
        expect(sanitized).toBe('hello world');
      });

      it('should limit length', () => {
        const longString = 'x'.repeat(2000);
        const sanitized = validationUtils.sanitizeString(longString);
        expect(sanitized.length).toBe(1000);
      });
    });

    describe('validateFileUpload', () => {
      const validFile = {
        size: 500 * 1024, // 500KB
        type: 'image/jpeg',
        name: 'photo.jpg',
      };

      it('should accept valid files', () => {
        const result = validationUtils.validateFileUpload(validFile, {
          maxSizeKB: 1024,
          allowedTypes: ['image/jpeg', 'image/png'],
          allowedExtensions: ['jpg', 'png'],
        });
        expect(result.valid).toBe(true);
      });

      it('should reject files that are too large', () => {
        const largeFile = { ...validFile, size: 2 * 1024 * 1024 };
        const result = validationUtils.validateFileUpload(largeFile, {
          maxSizeKB: 1024,
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('too large');
      });

      it('should reject invalid file types', () => {
        const invalidFile = { ...validFile, type: 'application/pdf' };
        const result = validationUtils.validateFileUpload(invalidFile, {
          allowedTypes: ['image/jpeg', 'image/png'],
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('type not allowed');
      });

      it('should reject invalid file extensions', () => {
        const invalidFile = { ...validFile, name: 'document.pdf' };
        const result = validationUtils.validateFileUpload(invalidFile, {
          allowedExtensions: ['jpg', 'png'],
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('extension not allowed');
      });
    });
  });

  describe('Security Tests', () => {
    it('should reject XSS attempts in text fields', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '\'"<script>alert(String.fromCharCode(88,83,83))</script>',
      ];

      xssAttempts.forEach((xss) => {
        expect(() => textFieldSchema().parse(xss)).toThrow(ZodError);
      });
    });

    it('should reject SQL injection attempts in names', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        'UNION SELECT * FROM users',
      ];

      sqlInjections.forEach((sql) => {
        expect(() => nameSchema.parse(sql)).toThrow(ZodError);
      });
    });

    it('should enforce reasonable limits on all inputs', () => {
      const oversizedInputs = {
        name: 'x'.repeat(200),
        email: 'x'.repeat(300) + '@example.com',
        amount: 99999999,
        url: 'https://example.com/' + 'x'.repeat(3000),
      };

      expect(() => nameSchema.parse(oversizedInputs.name)).toThrow(ZodError);
      expect(() => emailSchema.parse(oversizedInputs.email)).toThrow(ZodError);
      expect(() => amountSchema.parse(oversizedInputs.amount)).toThrow(ZodError);
      expect(() => urlSchema.parse(oversizedInputs.url)).toThrow(ZodError);
    });
  });
});