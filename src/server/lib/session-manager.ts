import type { PrismaClient, UserSession } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { AuditLogger } from './audit-logger';

export interface SessionInfo {
  id: string;
  userId: string;
  fingerprint: string;
  ip: string;
  userAgent: string;
  deviceInfo: DeviceInfo;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  revokedAt?: Date;
}

export interface DeviceInfo {
  os: string;
  browser: string;
  device: string;
  mobile: boolean;
  trusted: boolean;
}

// Define security event types as union types for better type safety
type SessionSecurityEventType =
  | 'created'
  | 'expired'
  | 'revoked'
  | 'suspicious_activity'
  | 'concurrent_limit';

// Define specific event detail types for different event types
type SessionEventDetails =
  | { rememberMe: boolean; deviceInfo: DeviceInfo; expiresAt: Date } // created
  | { reason: string } // revoked
  | {
      originalIp: string;
      originalUserAgent: string;
      originalFingerprint: string;
      currentFingerprint: string;
      timeSinceCreation: number;
    } // suspicious_activity
  | { maxSessions: number; activeCount: number } // concurrent_limit
  | Record<string, unknown>; // fallback

export interface SessionSecurityEvent {
  type: SessionSecurityEventType;
  sessionId: string;
  userId: string;
  ip: string;
  userAgent: string;
  details: SessionEventDetails;
}

/**
 * Enhanced session management with security features
 */
export class SessionManager {
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly REMEMBER_ME_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 days
  private static readonly MAX_CONCURRENT_SESSIONS = 5;
  private static readonly FINGERPRINT_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(private db: PrismaClient) {}

  /**
   * Create a new session with security fingerprinting
   */
  async createSession(
    userId: string,
    sessionToken: string,
    options: {
      ip: string;
      userAgent: string;
      rememberMe?: boolean;
      deviceInfo?: Partial<DeviceInfo>;
    }
  ): Promise<SessionInfo> {
    const { ip, userAgent, rememberMe = false, deviceInfo } = options;

    // Generate session fingerprint
    const fingerprint = this.generateFingerprint(ip, userAgent);

    // Parse device information
    const parsedDeviceInfo = this.parseDeviceInfo(userAgent, deviceInfo);

    // Calculate expiration time
    const timeout = rememberMe
      ? SessionManager.REMEMBER_ME_TIMEOUT
      : SessionManager.SESSION_TIMEOUT;
    const expiresAt = new Date(Date.now() + timeout);

    // Check for concurrent session limit
    await this.enforceConcurrentSessionLimit(userId);

    // Create session record
    const session = await this.db.userSession.create({
      data: {
        id: sessionToken,
        userId,
        fingerprint,
        ip,
        userAgent,
        deviceInfo: parsedDeviceInfo as unknown as Prisma.InputJsonValue,
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt,
        isActive: true,
      },
    });

    // Log session creation
    await this.logSecurityEvent({
      type: 'created',
      sessionId: sessionToken,
      userId,
      ip,
      userAgent,
      details: {
        rememberMe,
        deviceInfo: parsedDeviceInfo as unknown as Prisma.InputJsonValue,
        expiresAt,
      },
    });

    return this.mapToSessionInfo(session);
  }

  /**
   * Validate and update session
   */
  async validateSession(
    sessionToken: string,
    options: {
      ip: string;
      userAgent: string;
      updateLastActivity?: boolean;
    }
  ): Promise<SessionInfo | null> {
    const { ip, userAgent, updateLastActivity = true } = options;

    // Get session from database
    const session = await this.db.userSession.findUnique({
      where: { id: sessionToken },
    });

    if (!session?.isActive) {
      return null;
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      await this.revokeSession(sessionToken, 'expired');
      return null;
    }

    // Generate current fingerprint
    const currentFingerprint = this.generateFingerprint(ip, userAgent);

    // Check for suspicious activity (fingerprint mismatch)
    if (session.fingerprint !== currentFingerprint) {
      await this.handleSuspiciousActivity(session, {
        currentIp: ip,
        currentUserAgent: userAgent,
        currentFingerprint,
      });

      // Decide whether to allow or block based on security policy
      if (!this.shouldAllowFingerprintMismatch(session, currentFingerprint)) {
        await this.revokeSession(sessionToken, 'suspicious_activity');
        return null;
      }
    }

    // Update last activity if requested
    if (updateLastActivity) {
      await this.db.userSession.update({
        where: { id: sessionToken },
        data: {
          lastActivity: new Date(),
          // Update IP if changed (for mobile users)
          ...(session.ip !== ip && { ip }),
        },
      });

      session.lastActivity = new Date();
      if (session.ip !== ip) {
        session.ip = ip;
      }
    }

    return this.mapToSessionInfo(session);
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(
    sessionToken: string,
    reason:
      | 'user_logout'
      | 'expired'
      | 'suspicious_activity'
      | 'admin_action' = 'user_logout'
  ): Promise<void> {
    const session = await this.db.userSession.findUnique({
      where: { id: sessionToken },
    });

    if (!session) {
      return;
    }

    // Mark session as revoked
    await this.db.userSession.update({
      where: { id: sessionToken },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    // Log session revocation
    await this.logSecurityEvent({
      type: 'revoked',
      sessionId: sessionToken,
      userId: session.userId,
      ip: session.ip,
      userAgent: session.userAgent,
      details: { reason },
    });
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(
    userId: string,
    excludeSessionId?: string
  ): Promise<number> {
    const whereCondition: {
      userId: string;
      isActive: boolean;
      id?: { not: string };
    } = {
      userId,
      isActive: true,
    };

    if (excludeSessionId) {
      whereCondition.id = { not: excludeSessionId };
    }

    const { count } = await this.db.userSession.updateMany({
      where: whereCondition,
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    // Log bulk session revocation
    await AuditLogger.log({
      userId,
      action: 'session.bulk_revoke',
      result: 'success',
      metadata: {
        revokedCount: count,
        excludedSession: excludeSessionId,
      },
    });

    return count;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await this.db.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivity: 'desc' },
    });

    return sessions.map(session => this.mapToSessionInfo(session));
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const { count } = await this.db.userSession.updateMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            isActive: true,
            lastActivity: {
              lt: new Date(Date.now() - SessionManager.SESSION_TIMEOUT * 2),
            },
          },
        ],
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    if (count > 0) {
      console.log(`🧹 Cleaned up ${count} expired sessions`);
    }

    return count;
  }

  /**
   * Generate session fingerprint
   */
  private generateFingerprint(ip: string, userAgent: string): string {
    // Create a hash of IP and User-Agent for basic fingerprinting
    // In production, you might want to include more sophisticated fingerprinting
    const data = `${ip}:${userAgent}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Parse device information from User-Agent
   */
  private parseDeviceInfo(
    userAgent: string,
    deviceInfo?: Partial<DeviceInfo>
  ): DeviceInfo {
    // Simple User-Agent parsing (in production, use a library like ua-parser-js)
    const ua = userAgent.toLowerCase();

    const mobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);

    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad'))
      os = 'iOS';

    let browser = 'Unknown';
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';

    let device = mobile ? 'Mobile' : 'Desktop';
    if (ua.includes('tablet') || ua.includes('ipad')) device = 'Tablet';

    return {
      os,
      browser,
      device,
      mobile,
      trusted: false, // Devices become trusted over time
      ...deviceInfo,
    };
  }

  /**
   * Enforce concurrent session limit
   */
  private async enforceConcurrentSessionLimit(userId: string): Promise<void> {
    const activeSessions = await this.db.userSession.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeSessions >= SessionManager.MAX_CONCURRENT_SESSIONS) {
      // Revoke the oldest session
      const oldestSession = await this.db.userSession.findFirst({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        orderBy: { lastActivity: 'asc' },
      });

      if (oldestSession) {
        await this.revokeSession(oldestSession.id, 'admin_action');

        await this.logSecurityEvent({
          type: 'concurrent_limit',
          sessionId: oldestSession.id,
          userId,
          ip: oldestSession.ip,
          userAgent: oldestSession.userAgent,
          details: {
            maxSessions: SessionManager.MAX_CONCURRENT_SESSIONS,
            activeCount: activeSessions,
          },
        });
      }
    }
  }

  /**
   * Handle suspicious activity detection
   */
  private async handleSuspiciousActivity(
    session: UserSession,
    current: {
      currentIp: string;
      currentUserAgent: string;
      currentFingerprint: string;
    }
  ): Promise<void> {
    await this.logSecurityEvent({
      type: 'suspicious_activity',
      sessionId: session.id,
      userId: session.userId,
      ip: current.currentIp,
      userAgent: current.currentUserAgent,
      details: {
        originalIp: session.ip,
        originalUserAgent: session.userAgent,
        originalFingerprint: session.fingerprint,
        currentFingerprint: current.currentFingerprint,
        timeSinceCreation: Date.now() - session.createdAt.getTime(),
      },
    });
  }

  /**
   * Determine if fingerprint mismatch should be allowed
   */
  private shouldAllowFingerprintMismatch(
    session: UserSession,
    _currentFingerprint: string
  ): boolean {
    // Allow fingerprint changes if:
    // 1. Session is recent (within 1 hour)
    // 2. This is a trusted device
    // 3. User has explicitly allowed flexible sessions

    const sessionAge = Date.now() - session.createdAt.getTime();
    const oneHour = 60 * 60 * 1000;

    const deviceInfo = session.deviceInfo as unknown as DeviceInfo;
    return (
      sessionAge < oneHour ||
      deviceInfo.trusted ||
      process.env.NODE_ENV === 'development'
    );
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(event: SessionSecurityEvent): Promise<void> {
    await AuditLogger.log({
      userId: event.userId,
      action: `session.${event.type}`,
      result: event.type === 'suspicious_activity' ? 'failure' : 'success',
      metadata: {
        sessionId: event.sessionId,
        ip: event.ip,
        userAgent: event.userAgent,
        ...event.details,
      },
    });
  }

  /**
   * Map database record to SessionInfo
   */
  private mapToSessionInfo(session: UserSession): SessionInfo {
    return {
      id: session.id,
      userId: session.userId,
      fingerprint: session.fingerprint,
      ip: session.ip,
      userAgent: session.userAgent,
      deviceInfo: session.deviceInfo as unknown as DeviceInfo,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      expiresAt: session.expiresAt,
      isActive: session.isActive,
      revokedAt: session.revokedAt ?? undefined,
    };
  }

  /**
   * Get session statistics for admin dashboard
   */
  async getSessionStats(): Promise<{
    totalActive: number;
    totalToday: number;
    suspiciousActivity: number;
    averageSessionDuration: number;
    deviceBreakdown: Record<string, number>;
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get active sessions
    const activeSessions = await this.db.userSession.count({
      where: {
        isActive: true,
        expiresAt: { gt: now },
      },
    });

    // Get sessions created today
    const todaySessions = await this.db.userSession.count({
      where: {
        createdAt: { gte: today },
      },
    });

    // This would typically query audit logs for suspicious activity
    const suspiciousActivity = 0; // Placeholder

    return {
      totalActive: activeSessions,
      totalToday: todaySessions,
      suspiciousActivity,
      averageSessionDuration: 0, // Would calculate from actual data
      deviceBreakdown: {}, // Would aggregate device info
    };
  }
}
