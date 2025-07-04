import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

// Mock database
const mockDb = {
  $queryRaw: vi.fn(),
};

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variables
    delete process.env.DOCKER_HEALTH_CHECK_MODE;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.PLAID_CLIENT_ID;
    delete process.env.PLAID_SECRET;
    delete process.env.SENTRY_DSN;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns healthy status when database is accessible', async () => {
      mockDb.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        service: 'subpilot-app',
        version: expect.any(String),
        environment: expect.any(String),
        checks: {
          database: 'healthy',
          email: 'not-configured',
          plaid: 'not-configured',
          sentry: 'not-configured',
        },
        responseTime: expect.any(Number),
      });
    });

    it('returns degraded status when database is inaccessible', async () => {
      mockDb.$queryRaw.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.checks.database).toBe('unhealthy');
    });

    it('skips database check in basic Docker mode', async () => {
      process.env.DOCKER_HEALTH_CHECK_MODE = 'basic';

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checks.database).toBe('skipped-basic-mode');
      expect(mockDb.$queryRaw).not.toHaveBeenCalled();
    });

    it('detects email service configuration', async () => {
      process.env.SENDGRID_API_KEY = 'test-key';
      mockDb.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(data.checks.email).toBe('configured');
    });

    it('detects SMTP configuration', async () => {
      process.env.SMTP_HOST = 'localhost';
      mockDb.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(data.checks.email).toBe('smtp-configured');
    });

    it('detects Plaid configuration', async () => {
      process.env.PLAID_CLIENT_ID = 'test-id';
      process.env.PLAID_SECRET = 'test-secret';
      mockDb.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(data.checks.plaid).toBe('configured');
    });

    it('detects Sentry configuration', async () => {
      process.env.SENTRY_DSN = 'test-dsn';
      mockDb.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(data.checks.sentry).toBe('configured');
    });

    it('includes response time', async () => {
      mockDb.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(data.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('handles general errors', async () => {
      // Force an error by mocking import to fail
      vi.doMock('@/server/db', () => {
        throw new Error('Import failed');
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.error).toBe('Health check failed');
    });
  });
});
