import { createHmac } from 'crypto';

/**
 * Verify webhook signatures for external services
 */
export class WebhookSecurity {
  /**
   * Verify Plaid webhook signature
   */
  static verifyPlaidWebhook(
    body: string | Buffer,
    headers: {
      'plaid-verification'?: string;
      'plaid-signature'?: string;
    }
  ): boolean {
    // Plaid doesn't use webhook signatures in sandbox mode
    if (process.env.PLAID_ENV === 'sandbox') {
      console.warn(
        '⚠️  Plaid webhook signature verification skipped in sandbox mode'
      );
      return true;
    }

    // In production, Plaid will provide webhook verification
    const secret = process.env.PLAID_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ PLAID_WEBHOOK_SECRET not configured');
      return false;
    }

    const signature = headers['plaid-signature'];
    if (!signature) {
      console.error('❌ Missing Plaid webhook signature');
      return false;
    }

    // Compute expected signature
    const expectedSignature = createHmac('sha256', secret)
      .update(typeof body === 'string' ? body : body.toString())
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return timingSafeEqual(signature, expectedSignature);
  }

  /**
   * Generate webhook signature for internal services
   */
  static generateSignature(payload: unknown, secret: string): string {
    const body =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  /**
   * Verify generic webhook signature
   */
  static verifyWebhook(
    body: string | Buffer,
    signature: string,
    secret: string,
    algorithm: 'sha1' | 'sha256' = 'sha256'
  ): boolean {
    const expectedSignature = createHmac(algorithm, secret)
      .update(typeof body === 'string' ? body : body.toString())
      .digest('hex');

    return timingSafeEqual(signature, expectedSignature);
  }

  /**
   * Verify request signature for sensitive operations
   */
  static verifyRequestSignature(
    payload: unknown,
    signature: string,
    timestamp: number,
    maxAge = 300000 // 5 minutes
  ): boolean {
    // Check timestamp to prevent replay attacks
    const now = Date.now();
    if (Math.abs(now - timestamp) > maxAge) {
      console.error('❌ Request signature expired');
      return false;
    }

    const secret = process.env.API_SECRET;
    if (!secret) {
      console.error('❌ API_SECRET not configured');
      return false;
    }

    // Include timestamp in signature to prevent replay
    const message = `${timestamp}.${JSON.stringify(payload)}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    return timingSafeEqual(signature, expectedSignature);
  }

  /**
   * Generate request signature for sensitive operations
   */
  static generateRequestSignature(payload: unknown): {
    signature: string;
    timestamp: number;
  } {
    const secret = process.env.API_SECRET;
    if (!secret) {
      throw new Error('API_SECRET not configured');
    }

    const timestamp = Date.now();
    const message = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    return { signature, timestamp };
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
