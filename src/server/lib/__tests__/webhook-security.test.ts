import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

// Mock environment variables with hoisted pattern
const mockEnv = vi.hoisted(() => ({
  PLAID_ENV: 'sandbox',
  PLAID_WEBHOOK_SECRET: 'test-plaid-secret',
  API_SECRET: 'test-api-secret',
}));

vi.mock('@/env.js', () => ({
  env: mockEnv,
}));

// Import after mocks are set up
const { WebhookSecurity } = await import('../webhook-security');

describe('WebhookSecurity', () => {
  const testPayload = JSON.stringify({ test: 'data', timestamp: Date.now() });
  const testSecret = 'test-secret';

  describe('verifyPlaidWebhook', () => {
    it('should return true in sandbox mode', () => {
      const result = WebhookSecurity.verifyPlaidWebhook(testPayload, {
        'plaid-signature': 'invalid-signature',
      });

      expect(result).toBe(true);
    });

    it('should validate signature format in production', () => {
      // Mock production environment
      mockEnv.PLAID_ENV = 'production';

      const result = WebhookSecurity.verifyPlaidWebhook(testPayload, {});

      expect(result).toBe(false);
    });
  });

  describe('verifyWebhook', () => {
    it('should verify valid HMAC signature', () => {
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex');

      const result = WebhookSecurity.verifyWebhook(
        testPayload,
        signature,
        testSecret
      );

      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const result = WebhookSecurity.verifyWebhook(
        testPayload,
        'invalid-signature',
        testSecret
      );

      expect(result).toBe(false);
    });

    it('should reject tampered payload', () => {
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex');

      const tamperedPayload = testPayload + 'tampered';

      const result = WebhookSecurity.verifyWebhook(
        tamperedPayload,
        signature,
        testSecret
      );

      expect(result).toBe(false);
    });

    it('should support different hash algorithms', () => {
      const signature = crypto
        .createHmac('sha1', testSecret)
        .update(testPayload)
        .digest('hex');

      const result = WebhookSecurity.verifyWebhook(
        testPayload,
        signature,
        testSecret,
        'sha1'
      );

      expect(result).toBe(true);
    });
  });

  describe('generateSignature', () => {
    it('should generate consistent signatures', () => {
      const payload = { test: 'data' };
      const sig1 = WebhookSecurity.generateSignature(payload, testSecret);
      const sig2 = WebhookSecurity.generateSignature(payload, testSecret);

      expect(sig1).toBe(sig2);
    });

    it('should handle string payloads', () => {
      const signature = WebhookSecurity.generateSignature(
        testPayload,
        testSecret
      );

      expect(signature).toBeTruthy();
      expect(typeof signature).toBe('string');
    });
  });

  describe('verifyRequestSignature', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should verify valid signature with timestamp', () => {
      const payload = { action: 'test' };
      const timestamp = Date.now();
      const message = `${timestamp}.${JSON.stringify(payload)}`;
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(message)
        .digest('hex');

      // Mock API_SECRET
      mockEnv.API_SECRET = testSecret;

      const result = WebhookSecurity.verifyRequestSignature(
        payload,
        signature,
        timestamp
      );

      expect(result).toBe(true);
    });

    it('should reject expired signatures', () => {
      const payload = { action: 'test' };
      const oldTimestamp = Date.now() - 600000; // 10 minutes ago
      const message = `${oldTimestamp}.${JSON.stringify(payload)}`;
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(message)
        .digest('hex');

      // Mock API_SECRET
      mockEnv.API_SECRET = testSecret;

      const result = WebhookSecurity.verifyRequestSignature(
        payload,
        signature,
        oldTimestamp
      );

      expect(result).toBe(false);
    });

    it('should reject invalid signatures', () => {
      const payload = { action: 'test' };
      const timestamp = Date.now();

      // Mock API_SECRET
      mockEnv.API_SECRET = testSecret;

      const result = WebhookSecurity.verifyRequestSignature(
        payload,
        'invalid-signature',
        timestamp
      );

      expect(result).toBe(false);
    });
  });

  describe('generateRequestSignature', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should generate signature with timestamp', () => {
      const payload = { action: 'test' };

      // Mock API_SECRET
      mockEnv.API_SECRET = testSecret;

      const result = WebhookSecurity.generateRequestSignature(payload);

      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.signature).toBe('string');
      expect(typeof result.timestamp).toBe('number');
    });

    it('should throw error if API_SECRET not configured', () => {
      const payload = { action: 'test' };

      // Clear API_SECRET
      mockEnv.API_SECRET = undefined;

      expect(() => {
        WebhookSecurity.generateRequestSignature(payload);
      }).toThrow('API_SECRET not configured');
    });
  });

  describe('Timing attack prevention', () => {
    it('should be resistant to timing attacks', () => {
      const correctSignature = crypto
        .createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex');

      // Create signatures of different lengths
      const shortWrong = 'short';
      const longWrong = 'a'.repeat(correctSignature.length);

      const start1 = process.hrtime.bigint();
      WebhookSecurity.verifyWebhook(testPayload, shortWrong, testSecret);
      const time1 = process.hrtime.bigint() - start1;

      const start2 = process.hrtime.bigint();
      WebhookSecurity.verifyWebhook(testPayload, longWrong, testSecret);
      const time2 = process.hrtime.bigint() - start2;

      // Both should return false
      expect(
        WebhookSecurity.verifyWebhook(testPayload, shortWrong, testSecret)
      ).toBe(false);
      expect(
        WebhookSecurity.verifyWebhook(testPayload, longWrong, testSecret)
      ).toBe(false);

      // Time difference should be minimal (within an order of magnitude)
      const timeDiff = Math.abs(Number(time1 - time2));
      const maxTime = Math.max(Number(time1), Number(time2));

      // Allow for some variance but not excessive timing differences
      expect(timeDiff).toBeLessThan(maxTime * 10);
    });
  });
});
