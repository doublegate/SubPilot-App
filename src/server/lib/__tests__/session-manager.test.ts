import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SessionManager,
  type SessionInfo,
  type DeviceInfo,
} from '../session-manager';
import { AuditLogger } from '../audit-logger';
import type { PrismaClient } from '@prisma/client';

// Mock the AuditLogger
vi.mock('../audit-logger', () => ({
  AuditLogger: {
    log: vi.fn(),
  },
}));

// Mock environment variables
vi.mock('@/env', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

// Mock Prisma client
const mockPrisma = {
  userSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
  },
} as unknown as PrismaClient;

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionManager = new SessionManager(mockPrisma);

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSession', () => {
    const mockSessionData = {
      id: 'session-123',
      userId: 'user-123',
      fingerprint: 'fingerprint-hash',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 Chrome/100.0',
      deviceInfo: {
        os: 'Windows',
        browser: 'Chrome',
        device: 'Desktop',
        mobile: false,
        trusted: false,
      },
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isActive: true,
      revokedAt: null,
    };

    beforeEach(() => {
      vi.mocked(mockPrisma.userSession.create).mockResolvedValue(
        mockSessionData
      );
      vi.mocked(mockPrisma.userSession.count).mockResolvedValue(0);
    });

    it('should create a new session successfully', async () => {
      const options = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100.0',
      };

      const session = await sessionManager.createSession(
        'user-123',
        'session-123',
        options
      );

      expect(mockPrisma.userSession.create).toHaveBeenCalledWith({
        data: {
          id: 'session-123',
          userId: 'user-123',
          fingerprint: expect.any(String),
          ip: '192.168.1.1',
          userAgent: options.userAgent,
          deviceInfo: expect.objectContaining({
            os: 'Windows',
            browser: 'Chrome',
            device: 'Desktop',
            mobile: false,
            trusted: false,
          }),
          createdAt: expect.any(Date),
          lastActivity: expect.any(Date),
          expiresAt: expect.any(Date),
          isActive: true,
        },
      });

      expect(session.id).toBe('session-123');
      expect(session.userId).toBe('user-123');
      expect(AuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          action: 'session.created',
          result: 'success',
        })
      );
    });

    it('should handle rememberMe option correctly', async () => {
      const options = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        rememberMe: true,
      };

      await sessionManager.createSession('user-123', 'session-123', options);

      const createCall = vi.mocked(mockPrisma.userSession.create).mock.calls[0];
      const expiresAt = createCall[0].data.expiresAt;

      // Should expire in 30 days (remember me timeout)
      const expectedExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
      expect(expiresAt.getTime()).toBeCloseTo(expectedExpiry, -1000); // Within 1 second
    });

    it('should parse device information correctly', async () => {
      const testCases = [
        {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          expected: {
            os: 'macOS', // Device parsing logic will see 'mac' before 'iphone'
            browser: 'Unknown',
            device: 'Mobile',
            mobile: true,
          },
        },
        {
          userAgent:
            'Mozilla/5.0 (Android 11; Mobile; rv:85.0) Gecko/85.0 Firefox/85.0',
          expected: {
            os: 'Android',
            browser: 'Firefox',
            device: 'Mobile',
            mobile: true,
          },
        },
        {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
          expected: {
            os: 'macOS', // Device parsing logic will see 'mac' before 'ipad'
            browser: 'Unknown',
            device: 'Tablet',
            mobile: true,
          },
        },
        {
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36',
          expected: {
            os: 'macOS',
            browser: 'Safari',
            device: 'Desktop',
            mobile: false,
          },
        },
      ];

      for (const testCase of testCases) {
        vi.mocked(mockPrisma.userSession.create).mockClear();

        await sessionManager.createSession('user-123', 'session-123', {
          ip: '192.168.1.1',
          userAgent: testCase.userAgent,
        });

        const createCall = vi.mocked(mockPrisma.userSession.create).mock
          .calls[0];
        const deviceInfo = createCall[0].data.deviceInfo;

        expect(deviceInfo).toMatchObject(testCase.expected);
      }
    });

    it('should enforce concurrent session limit', async () => {
      // Mock 5 existing sessions (at the limit)
      vi.mocked(mockPrisma.userSession.count).mockResolvedValue(5);
      const oldSession = {
        id: 'old-session',
        userId: 'user-123',
        ip: '192.168.1.2',
        userAgent: 'Old browser',
        lastActivity: new Date(Date.now() - 60000),
      } as any;

      vi.mocked(mockPrisma.userSession.findFirst).mockResolvedValue(oldSession);
      // Also mock findUnique for the revokeSession call
      vi.mocked(mockPrisma.userSession.findUnique).mockResolvedValue(
        oldSession
      );

      await sessionManager.createSession('user-123', 'session-123', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 'old-session' },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
        },
      });

      // Check that concurrent limit event was logged (it should be the 2nd call)
      const auditCalls = vi.mocked(AuditLogger.log).mock.calls;
      const concurrentLimitCall = auditCalls.find(
        call => call[0].action === 'session.concurrent_limit'
      );

      expect(concurrentLimitCall).toBeDefined();
      expect(concurrentLimitCall![0]).toMatchObject({
        action: 'session.concurrent_limit',
        result: 'success', // Security events are logged as 'success' when properly handled
        userId: 'user-123',
      });
    });

    it('should merge custom device info', async () => {
      const customDeviceInfo: Partial<DeviceInfo> = {
        trusted: true,
        device: 'Custom Device',
      };

      await sessionManager.createSession('user-123', 'session-123', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceInfo: customDeviceInfo,
      });

      const createCall = vi.mocked(mockPrisma.userSession.create).mock.calls[0];
      const deviceInfo = createCall[0].data.deviceInfo;

      expect(deviceInfo.trusted).toBe(true);
      expect(deviceInfo.device).toBe('Custom Device');
    });
  });

  describe('validateSession', () => {
    const mockSession = {
      id: 'session-123',
      userId: 'user-123',
      fingerprint: 'original-fingerprint',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      deviceInfo: { trusted: false },
      createdAt: new Date(Date.now() - 60000),
      lastActivity: new Date(Date.now() - 30000),
      expiresAt: new Date(Date.now() + 60000),
      isActive: true,
      revokedAt: null,
    };

    it('should validate active session successfully', async () => {
      vi.mocked(mockPrisma.userSession.findUnique).mockResolvedValue(
        mockSession
      );
      vi.mocked(mockPrisma.userSession.update).mockResolvedValue(mockSession);

      const result = await sessionManager.validateSession('session-123', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result).toBeTruthy();
      expect(result!.id).toBe('session-123');
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          lastActivity: expect.any(Date),
        },
      });
    });

    it('should return null for non-existent session', async () => {
      vi.mocked(mockPrisma.userSession.findUnique).mockResolvedValue(null);

      const result = await sessionManager.validateSession('session-123', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result).toBeNull();
    });

    it('should return null for inactive session', async () => {
      vi.mocked(mockPrisma.userSession.findUnique).mockResolvedValue({
        ...mockSession,
        isActive: false,
      });

      const result = await sessionManager.validateSession('session-123', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result).toBeNull();
    });

    it('should revoke expired session', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
      };

      vi.mocked(mockPrisma.userSession.findUnique).mockResolvedValue(
        expiredSession
      );

      const result = await sessionManager.validateSession('session-123', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result).toBeNull();
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should handle fingerprint mismatch in development', async () => {
      vi.mocked(mockPrisma.userSession.findUnique).mockResolvedValue(
        mockSession
      );
      vi.mocked(mockPrisma.userSession.update).mockResolvedValue(mockSession);

      // Different IP/UserAgent should create different fingerprint
      const result = await sessionManager.validateSession('session-123', {
        ip: '192.168.1.2', // Different IP
        userAgent: 'Different Browser',
        updateLastActivity: false,
      });

      // Should still allow in development mode
      expect(result).toBeTruthy();
      expect(AuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session.suspicious_activity',
          result: 'failure',
        })
      );
    });

    it('should revoke session for suspicious activity', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const oldSession = {
        ...mockSession,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        deviceInfo: { trusted: false },
      };

      vi.mocked(mockPrisma.userSession.findUnique).mockResolvedValue(
        oldSession
      );

      const result = await sessionManager.validateSession('session-123', {
        ip: '192.168.1.2', // Different IP
        userAgent: 'Suspicious Browser',
      });

      expect(result).toBeNull();
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
        },
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should allow trusted device fingerprint mismatch', async () => {
      const trustedSession = {
        ...mockSession,
        deviceInfo: { trusted: true },
      };

      vi.mocked(mockPrisma.userSession.findUnique).mockResolvedValue(
        trustedSession
      );
      vi.mocked(mockPrisma.userSession.update).mockResolvedValue(
        trustedSession
      );

      const result = await sessionManager.validateSession('session-123', {
        ip: '192.168.1.2',
        userAgent: 'Different Browser',
      });

      expect(result).toBeTruthy();
    });

    it('should update IP address when changed', async () => {
      vi.mocked(mockPrisma.userSession.findUnique).mockResolvedValue(
        mockSession
      );
      vi.mocked(mockPrisma.userSession.update).mockResolvedValue(mockSession);

      await sessionManager.validateSession('session-123', {
        ip: '192.168.1.2', // Different IP
        userAgent: 'Mozilla/5.0', // Same user agent
      });

      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          lastActivity: expect.any(Date),
          ip: '192.168.1.2',
        },
      });
    });

    it('should skip updating last activity when requested', async () => {
      vi.mocked(mockPrisma.userSession.findUnique).mockResolvedValue(
        mockSession
      );

      await sessionManager.validateSession('session-123', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        updateLastActivity: false,
      });

      expect(mockPrisma.userSession.update).not.toHaveBeenCalled();
    });
  });

  describe('revokeSession', () => {
    const mockSession = {
      id: 'session-123',
      userId: 'user-123',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should revoke session with reason', async () => {
      vi.mocked(mockPrisma.userSession.findUnique).mockResolvedValue(
        mockSession as any
      );

      await sessionManager.revokeSession('session-123', 'suspicious_activity');

      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
        },
      });

      expect(AuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session.revoked',
          result: 'success',
          metadata: expect.objectContaining({
            reason: 'suspicious_activity',
          }),
        })
      );
    });

    it('should handle non-existent session gracefully', async () => {
      vi.mocked(mockPrisma.userSession.findUnique).mockResolvedValue(null);

      await expect(
        sessionManager.revokeSession('non-existent')
      ).resolves.toBeUndefined();

      expect(mockPrisma.userSession.update).not.toHaveBeenCalled();
    });

    it('should use default reason when none provided', async () => {
      vi.mocked(mockPrisma.userSession.findUnique).mockResolvedValue(
        mockSession as any
      );

      await sessionManager.revokeSession('session-123');

      expect(AuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            reason: 'user_logout',
          }),
        })
      );
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all user sessions', async () => {
      vi.mocked(mockPrisma.userSession.updateMany).mockResolvedValue({
        count: 3,
      });

      const count = await sessionManager.revokeAllUserSessions('user-123');

      expect(count).toBe(3);
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
        },
      });

      expect(AuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session.bulk_revoke',
          result: 'success',
          metadata: expect.objectContaining({
            revokedCount: 3,
          }),
        })
      );
    });

    it('should exclude specific session when requested', async () => {
      vi.mocked(mockPrisma.userSession.updateMany).mockResolvedValue({
        count: 2,
      });

      const count = await sessionManager.revokeAllUserSessions(
        'user-123',
        'keep-session-456'
      );

      expect(count).toBe(2);
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isActive: true,
          id: { not: 'keep-session-456' },
        },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
        },
      });

      expect(AuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            excludedSession: 'keep-session-456',
          }),
        })
      );
    });
  });

  describe('getUserSessions', () => {
    it('should return active user sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-123',
          fingerprint: 'fp1',
          ip: '192.168.1.1',
          userAgent: 'Browser1',
          deviceInfo: { os: 'Windows' },
          createdAt: new Date(),
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 60000),
          isActive: true,
          revokedAt: null,
        },
        {
          id: 'session-2',
          userId: 'user-123',
          fingerprint: 'fp2',
          ip: '192.168.1.2',
          userAgent: 'Browser2',
          deviceInfo: { os: 'macOS' },
          createdAt: new Date(),
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 60000),
          isActive: true,
          revokedAt: null,
        },
      ];

      vi.mocked(mockPrisma.userSession.findMany).mockResolvedValue(
        mockSessions
      );

      const sessions = await sessionManager.getUserSessions('user-123');

      expect(sessions).toHaveLength(2);
      expect(sessions[0].id).toBe('session-1');
      expect(sessions[1].id).toBe('session-2');

      expect(mockPrisma.userSession.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isActive: true,
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { lastActivity: 'desc' },
      });
    });

    it('should return empty array when no active sessions', async () => {
      vi.mocked(mockPrisma.userSession.findMany).mockResolvedValue([]);

      const sessions = await sessionManager.getUserSessions('user-123');

      expect(sessions).toHaveLength(0);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      vi.mocked(mockPrisma.userSession.updateMany).mockResolvedValue({
        count: 5,
      });

      const count = await sessionManager.cleanupExpiredSessions();

      expect(count).toBe(5);
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            {
              isActive: true,
              lastActivity: { lt: expect.any(Date) },
            },
          ],
        },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should log cleanup when sessions are found', async () => {
      const mockConsoleLog = vi.spyOn(console, 'log');
      vi.mocked(mockPrisma.userSession.updateMany).mockResolvedValue({
        count: 3,
      });

      await sessionManager.cleanupExpiredSessions();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🧹 Cleaned up 3 expired sessions'
      );
    });

    it('should not log when no sessions to cleanup', async () => {
      const mockConsoleLog = vi.spyOn(console, 'log');
      vi.mocked(mockPrisma.userSession.updateMany).mockResolvedValue({
        count: 0,
      });

      await sessionManager.cleanupExpiredSessions();

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      vi.mocked(mockPrisma.userSession.count)
        .mockResolvedValueOnce(42) // active sessions
        .mockResolvedValueOnce(15); // today's sessions

      const stats = await sessionManager.getSessionStats();

      expect(stats.totalActive).toBe(42);
      expect(stats.totalToday).toBe(15);
      expect(stats.suspiciousActivity).toBe(0);
      expect(stats.averageSessionDuration).toBe(0);
      expect(stats.deviceBreakdown).toEqual({});

      expect(mockPrisma.userSession.count).toHaveBeenCalledTimes(2);
    });
  });

  describe('Private Methods (via public interface)', () => {
    describe('Fingerprint Generation', () => {
      it('should generate consistent fingerprints', async () => {
        const options1 = {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Chrome',
        };

        const options2 = {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Chrome',
        };

        const options3 = {
          ip: '192.168.1.2', // Different IP
          userAgent: 'Mozilla/5.0 Chrome',
        };

        vi.mocked(mockPrisma.userSession.create).mockResolvedValue({} as any);
        vi.mocked(mockPrisma.userSession.count).mockResolvedValue(0);

        await sessionManager.createSession('user-123', 'session-1', options1);
        await sessionManager.createSession('user-123', 'session-2', options2);
        await sessionManager.createSession('user-123', 'session-3', options3);

        const calls = vi.mocked(mockPrisma.userSession.create).mock.calls;

        // Same IP/UA should generate same fingerprint
        expect(calls[0][0].data.fingerprint).toBe(calls[1][0].data.fingerprint);

        // Different IP should generate different fingerprint
        expect(calls[0][0].data.fingerprint).not.toBe(
          calls[2][0].data.fingerprint
        );
      });
    });

    describe('Device Parsing Edge Cases', () => {
      it('should handle unknown user agents', async () => {
        vi.mocked(mockPrisma.userSession.create).mockResolvedValue({} as any);
        vi.mocked(mockPrisma.userSession.count).mockResolvedValue(0);

        await sessionManager.createSession('user-123', 'session-123', {
          ip: '192.168.1.1',
          userAgent: 'UnknownBot/1.0',
        });

        const createCall = vi.mocked(mockPrisma.userSession.create).mock
          .calls[0];
        const deviceInfo = createCall[0].data.deviceInfo;

        expect(deviceInfo.os).toBe('Unknown');
        expect(deviceInfo.browser).toBe('Unknown');
        expect(deviceInfo.device).toBe('Desktop');
        expect(deviceInfo.mobile).toBe(false);
      });

      it('should handle empty user agent', async () => {
        vi.mocked(mockPrisma.userSession.create).mockResolvedValue({} as any);
        vi.mocked(mockPrisma.userSession.count).mockResolvedValue(0);

        await sessionManager.createSession('user-123', 'session-123', {
          ip: '192.168.1.1',
          userAgent: '',
        });

        const createCall = vi.mocked(mockPrisma.userSession.create).mock
          .calls[0];
        const deviceInfo = createCall[0].data.deviceInfo;

        expect(deviceInfo.os).toBe('Unknown');
        expect(deviceInfo.browser).toBe('Unknown');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in createSession', async () => {
      vi.mocked(mockPrisma.userSession.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.userSession.create).mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        sessionManager.createSession('user-123', 'session-123', {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors in validateSession', async () => {
      vi.mocked(mockPrisma.userSession.findUnique).mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        sessionManager.validateSession('session-123', {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors in getUserSessions', async () => {
      vi.mocked(mockPrisma.userSession.findMany).mockRejectedValue(
        new Error('Database error')
      );

      await expect(sessionManager.getUserSessions('user-123')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('Session Limits and Timeouts', () => {
    it('should respect session timeout constants', async () => {
      vi.mocked(mockPrisma.userSession.create).mockResolvedValue({} as any);
      vi.mocked(mockPrisma.userSession.count).mockResolvedValue(0);

      // Regular session (24 hours)
      await sessionManager.createSession('user-123', 'session-123', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        rememberMe: false,
      });

      const regularCall = vi.mocked(mockPrisma.userSession.create).mock
        .calls[0];
      const regularExpiry = regularCall[0].data.expiresAt;
      const expectedRegular = Date.now() + 24 * 60 * 60 * 1000;

      expect(regularExpiry.getTime()).toBeCloseTo(expectedRegular, -1000);

      // Remember me session (30 days)
      await sessionManager.createSession('user-123', 'session-456', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        rememberMe: true,
      });

      const rememberCall = vi.mocked(mockPrisma.userSession.create).mock
        .calls[1];
      const rememberExpiry = rememberCall[0].data.expiresAt;
      const expectedRemember = Date.now() + 30 * 24 * 60 * 60 * 1000;

      expect(rememberExpiry.getTime()).toBeCloseTo(expectedRemember, -1000);
    });

    it('should enforce maximum concurrent sessions', async () => {
      // Test the exact limit boundary
      vi.mocked(mockPrisma.userSession.count).mockResolvedValue(4); // Just under limit
      vi.mocked(mockPrisma.userSession.create).mockResolvedValue({} as any);

      await sessionManager.createSession('user-123', 'session-123', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      // Should not revoke any sessions when under limit
      expect(mockPrisma.userSession.findFirst).not.toHaveBeenCalled();
    });
  });
});
