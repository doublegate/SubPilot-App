import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { systemMonitoringRouter } from '../system-monitoring';
import type { Session } from 'next-auth';
import { TRPCError } from '@trpc/server';

// Mock dependencies
const mockJobQueueStats = {
  active: 5,
  waiting: 12,
  completed: 150,
  failed: 3,
  delayed: 1,
};

const mockFailedJobs = [
  {
    id: 'job_1',
    type: 'email_notification',
    attempts: 3,
    maxAttempts: 3,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'job_2',
    type: 'subscription_sync',
    attempts: 2,
    maxAttempts: 3,
    createdAt: new Date('2024-01-02'),
  },
];

const mockWorkflowStats = {
  activeWorkflows: 8,
  completedWorkflows: 42,
  failedWorkflows: 2,
  averageExecutionTime: 1200,
};

const mockRealtimeStats = {
  activeConnections: 15,
  totalMessages: 350,
  lastActivity: new Date(),
};

const mockUserConnections = [
  {
    id: 'conn_1',
    connectionId: 'ws_123',
    connectedAt: new Date('2024-01-01T10:00:00Z'),
    lastActivity: new Date('2024-01-01T10:30:00Z'),
  },
  {
    id: 'conn_2',
    connectionId: 'ws_456',
    connectedAt: new Date('2024-01-01T09:00:00Z'),
    lastActivity: new Date('2024-01-01T10:25:00Z'),
  },
];

const mockAuditEvents = [
  {
    id: 'audit_1',
    action: 'subscription.cancel',
    result: 'success',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    error: null,
    metadata: { subscriptionId: 'sub_123' },
  },
  {
    id: 'audit_2',
    action: 'user.login',
    result: 'success',
    timestamp: new Date('2024-01-01T09:45:00Z'),
    error: null,
    metadata: { method: 'oauth' },
  },
];

// Mock external dependencies
vi.mock('@/server/lib/job-queue', () => ({
  getJobQueue: vi.fn(() => ({
    getStats: vi.fn().mockReturnValue(mockJobQueueStats),
    getFailedJobs: vi.fn().mockResolvedValue(mockFailedJobs),
    retryFailedJob: vi.fn().mockResolvedValue(true),
  })),
  checkJobQueueHealth: vi.fn().mockResolvedValue({ healthy: true }),
}));

vi.mock('@/server/lib/workflow-engine', () => ({
  getWorkflowEngine: vi.fn(() => ({
    getStats: vi.fn().mockReturnValue(mockWorkflowStats),
  })),
}));

vi.mock('@/server/lib/realtime-notifications', () => ({
  getRealtimeNotificationManager: vi.fn(() => ({
    getStats: vi.fn().mockReturnValue(mockRealtimeStats),
    getActiveConnections: vi.fn().mockReturnValue(15),
    getUserConnections: vi.fn().mockReturnValue(mockUserConnections),
    getUnreadNotifications: vi.fn().mockReturnValue([1, 2, 3]), // 3 unread
  })),
}));

vi.mock('@/server/services/job-processors', () => ({
  checkJobProcessorHealth: vi.fn().mockResolvedValue({ healthy: true }),
}));

// Mock Prisma database
const mockDb = {
  $queryRaw: vi.fn().mockResolvedValue([{ '1': 1 }]),
  cancellationRequest: {
    count: vi.fn(),
  },
  auditLog: {
    count: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
};

describe('systemMonitoringRouter', () => {
  let mockCtx: {
    session: Session | null;
    db: typeof mockDb;
  };

  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockSession: Session = {
    user: mockUser,
    expires: '2025-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCtx = {
      session: mockSession,
      db: mockDb,
    };
  });

  describe('health (public endpoint)', () => {
    it('should return healthy status when database is accessible', async () => {
      const publicCtx = createInnerTRPCContext({ session: null });
      publicCtx.db = mockDb as any;
      const caller = systemMonitoringRouter.createCaller(publicCtx);

      const result = await caller.health();

      expect(result.status).toBe('healthy');
      expect(result.services.database).toBe('healthy');
      expect(result.services.api).toBe('healthy');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockDb.$queryRaw).toHaveBeenCalledWith(['SELECT 1']);
    });

    it('should throw error when database is inaccessible', async () => {
      mockDb.$queryRaw.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const publicCtx = createInnerTRPCContext({ session: null });
      publicCtx.db = mockDb as any;
      const caller = systemMonitoringRouter.createCaller(publicCtx);

      await expect(caller.health()).rejects.toThrow(
        'System health check failed'
      );
    });

    it('should work without authentication', async () => {
      const publicCtx = createInnerTRPCContext({ session: null });
      publicCtx.db = mockDb as any;
      const caller = systemMonitoringRouter.createCaller(publicCtx);

      const result = await caller.health();
      expect(result.status).toBe('healthy');
    });
  });

  describe('systemStatus (protected endpoint)', () => {
    it('should return comprehensive system status when all services healthy', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.systemStatus();

      expect(result.overall).toBe('healthy');
      expect(result.services.database.status).toBe('healthy');
      expect(result.services.jobQueue.status).toBe('healthy');
      expect(result.services.jobProcessors.status).toBe('healthy');
      expect(result.services.workflowEngine.status).toBe('healthy');
      expect(result.services.realtime.status).toBe('healthy');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return degraded status when some services fail', async () => {
      // Mock one service failure
      const { checkJobQueueHealth } = await import('@/server/lib/job-queue');
      vi.mocked(checkJobQueueHealth).mockResolvedValueOnce({
        healthy: false,
        error: 'Redis unavailable',
      });

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.systemStatus();

      // With 4/5 services healthy (80%), should be degraded (>=70%)
      expect(result.overall).toBe('degraded');
      expect(result.services.jobQueue.status).toBe('unhealthy');
      expect(result.services.jobQueue.error).toBe('Redis unavailable');
    });

    it('should return unhealthy status when most services fail', async () => {
      // Mock multiple service failures
      mockDb.$queryRaw.mockRejectedValueOnce(new Error('DB failed'));
      const { checkJobQueueHealth } = await import('@/server/lib/job-queue');
      const { checkJobProcessorHealth } = await import(
        '@/server/services/job-processors'
      );
      vi.mocked(checkJobQueueHealth).mockResolvedValueOnce({
        healthy: false,
        error: 'Redis down',
      });
      vi.mocked(checkJobProcessorHealth).mockResolvedValueOnce({
        healthy: false,
        error: 'Workers down',
      });

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.systemStatus();

      // With only 2/5 services healthy (40%), should be unhealthy (<70%)
      expect(result.overall).toBe('unhealthy');
    });

    it('should require authentication', async () => {
      const unauthenticatedCtx = createInnerTRPCContext({ session: null });
      const unauthenticatedCaller =
        systemMonitoringRouter.createCaller(unauthenticatedCtx);

      await expect(unauthenticatedCaller.systemStatus()).rejects.toThrow(
        TRPCError
      );
    });
  });
  describe('jobQueueStats', () => {
    it('should return job queue statistics with failed jobs', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.jobQueueStats();

      expect(result.stats).toEqual(mockJobQueueStats);
      expect(result.failedJobs).toHaveLength(2);
      expect(result.failedJobs[0]).toEqual({
        id: 'job_1',
        type: 'email_notification',
        attempts: 3,
        maxAttempts: 3,
        createdAt: expect.any(Date),
        error: 'Failed job', // Sanitized error message
      });
    });

    it('should handle job queue without getFailedJobs method', async () => {
      const { getJobQueue } = await import('@/server/lib/job-queue');
      vi.mocked(getJobQueue).mockReturnValueOnce({
        getStats: vi.fn().mockReturnValue(mockJobQueueStats),
        // No getFailedJobs method
      } as any);

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.jobQueueStats();

      expect(result.stats).toEqual(mockJobQueueStats);
      expect(result.failedJobs).toEqual([]);
    });

    it('should handle job queue errors', async () => {
      const { getJobQueue } = await import('@/server/lib/job-queue');
      vi.mocked(getJobQueue).mockImplementationOnce(() => {
        throw new Error('Job queue unavailable');
      });

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      await expect(caller.jobQueueStats()).rejects.toThrow(
        'Failed to get job queue stats'
      );
    });

    it('should require authentication', async () => {
      const unauthenticatedCtx = createInnerTRPCContext({ session: null });
      const unauthenticatedCaller =
        systemMonitoringRouter.createCaller(unauthenticatedCtx);

      await expect(unauthenticatedCaller.jobQueueStats()).rejects.toThrow(
        TRPCError
      );
    });
  });

  describe('workflowStats', () => {
    it('should return workflow engine statistics', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.workflowStats();

      expect(result).toEqual(mockWorkflowStats);
    });

    it('should handle workflow engine errors', async () => {
      const { getWorkflowEngine } = await import(
        '@/server/lib/workflow-engine'
      );
      vi.mocked(getWorkflowEngine).mockImplementationOnce(() => {
        throw new Error('Workflow engine error');
      });

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      await expect(caller.workflowStats()).rejects.toThrow(
        'Failed to get workflow stats'
      );
    });
  });

  describe('realtimeStats', () => {
    it('should return realtime statistics with getStats method', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.realtimeStats();

      expect(result).toEqual(mockRealtimeStats);
    });

    it('should fallback to getActiveConnections when getStats unavailable', async () => {
      const { getRealtimeNotificationManager } = await import(
        '@/server/lib/realtime-notifications'
      );
      vi.mocked(getRealtimeNotificationManager).mockReturnValueOnce({
        getActiveConnections: vi.fn().mockReturnValue(25),
        // No getStats method
      } as any);

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.realtimeStats();

      expect(result).toEqual({ activeConnections: 25 });
    });

    it('should handle realtime manager errors', async () => {
      const { getRealtimeNotificationManager } = await import(
        '@/server/lib/realtime-notifications'
      );
      vi.mocked(getRealtimeNotificationManager).mockImplementationOnce(() => {
        throw new Error('Realtime manager error');
      });

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      await expect(caller.realtimeStats()).rejects.toThrow(
        'Failed to get realtime stats'
      );
    });
  });

  describe('userConnections', () => {
    it('should return user connections and unread notifications count', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.userConnections();

      expect(result.connections).toEqual(
        mockUserConnections.map(conn => ({
          id: conn.id,
          connectionId: conn.connectionId,
          connectedAt: conn.connectedAt,
          lastActivity: conn.lastActivity,
        }))
      );
      expect(result.unreadNotifications).toBe(3);
    });

    it('should handle manager without getUserConnections method', async () => {
      const { getRealtimeNotificationManager } = await import(
        '@/server/lib/realtime-notifications'
      );
      vi.mocked(getRealtimeNotificationManager).mockReturnValueOnce({
        // No getUserConnections or getUnreadNotifications methods
      } as any);

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.userConnections();

      expect(result.connections).toEqual([]);
      expect(result.unreadNotifications).toBe(0);
    });

    it('should handle errors', async () => {
      const { getRealtimeNotificationManager } = await import(
        '@/server/lib/realtime-notifications'
      );
      vi.mocked(getRealtimeNotificationManager).mockImplementationOnce(() => {
        throw new Error('Manager error');
      });

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      await expect(caller.userConnections()).rejects.toThrow(
        'Failed to get user connections'
      );
    });
  });

  describe('systemMetrics', () => {
    beforeEach(() => {
      // Setup mock data for metrics
      mockDb.cancellationRequest.count
        .mockResolvedValueOnce(50) // total requests
        .mockResolvedValueOnce(40) // completed requests
        .mockResolvedValueOnce(5); // failed requests

      mockDb.auditLog.count
        .mockResolvedValueOnce(1000) // total operations
        .mockResolvedValueOnce(25); // failed operations
    });

    it('should return system metrics for day timeframe (default)', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.systemMetrics({});

      expect(result.timeframe).toBe('day');
      expect(result.period.start).toBeInstanceOf(Date);
      expect(result.period.end).toBeInstanceOf(Date);
      expect(result.cancellations.total).toBe(50);
      expect(result.cancellations.completed).toBe(40);
      expect(result.cancellations.failed).toBe(5);
      expect(result.cancellations.pending).toBe(5); // 50 - 40 - 5
      expect(result.cancellations.successRate).toBe(80); // 40/50 * 100
      expect(result.system.totalOperations).toBe(1000);
      expect(result.system.failedOperations).toBe(25);
      expect(result.system.errorRate).toBe(3); // 25/1000 * 100, rounded
    });

    it('should return metrics for hour timeframe', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.systemMetrics({ timeframe: 'hour' });

      expect(result.timeframe).toBe('hour');
      // Verify date calculations (should be 1 hour ago)
      const timeDiff =
        result.period.end.getTime() - result.period.start.getTime();
      expect(timeDiff).toBeCloseTo(60 * 60 * 1000, -3); // 1 hour in ms
    });

    it('should return metrics for week timeframe', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.systemMetrics({ timeframe: 'week' });

      expect(result.timeframe).toBe('week');
      // Verify date calculations (should be 7 days ago)
      const timeDiff =
        result.period.end.getTime() - result.period.start.getTime();
      expect(timeDiff).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -3); // 7 days in ms
    });

    it('should return metrics for month timeframe', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.systemMetrics({ timeframe: 'month' });

      expect(result.timeframe).toBe('month');
      // Month calculation is more complex due to varying month lengths
      expect(result.period.start).toBeInstanceOf(Date);
      expect(result.period.end).toBeInstanceOf(Date);
    });

    it('should handle zero values gracefully', async () => {
      // Reset the specific mocks and set zeros
      mockDb.cancellationRequest.count.mockReset();
      mockDb.auditLog.count.mockReset();

      mockDb.cancellationRequest.count
        .mockResolvedValueOnce(0) // total requests
        .mockResolvedValueOnce(0) // completed requests
        .mockResolvedValueOnce(0); // failed requests

      mockDb.auditLog.count
        .mockResolvedValueOnce(0) // total operations
        .mockResolvedValueOnce(0); // failed operations

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.systemMetrics({});

      expect(result.cancellations.successRate).toBe(0);
      expect(result.system.errorRate).toBe(0);
    });

    it('should handle database errors', async () => {
      // Reset and set up error scenario for the first database call
      mockDb.cancellationRequest.count.mockReset();
      mockDb.auditLog.count.mockReset();

      mockDb.cancellationRequest.count.mockRejectedValueOnce(
        new Error('Database error')
      );

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      await expect(caller.systemMetrics({})).rejects.toThrow(
        'Failed to get system metrics'
      );
    });
  });
  describe('retryFailedJob', () => {
    beforeEach(() => {
      mockDb.auditLog.create.mockResolvedValue({
        id: 'audit_123',
        userId: 'user_123',
        action: 'job.manual_retry',
        result: 'success',
      });
    });

    it('should retry failed job successfully', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.retryFailedJob({ jobId: 'job_123' });

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('job_123');

      // Verify audit log creation
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_123',
          action: 'job.manual_retry',
          resource: 'job_123',
          result: 'success',
          metadata: {
            jobId: 'job_123',
            retriedBy: 'user_123',
          },
        },
      });
    });

    it('should handle job not found or not retryable', async () => {
      const { getJobQueue } = await import('@/server/lib/job-queue');
      const mockJobQueue = vi.mocked(getJobQueue()).retryFailedJob as any;
      mockJobQueue.mockResolvedValueOnce(false);

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.retryFailedJob({ jobId: 'invalid_job' });

      // Status-object pattern returns success even when job not found
      expect(result.success).toBe(true);
      expect(result.jobId).toBe('invalid_job');
    });

    it('should handle job queue without retryFailedJob method', async () => {
      const { getJobQueue } = await import('@/server/lib/job-queue');
      vi.mocked(getJobQueue).mockReturnValueOnce({
        // No retryFailedJob method
      } as any);

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      await expect(caller.retryFailedJob({ jobId: 'job_123' })).rejects.toThrow(
        'Job not found or not in failed state'
      );
    });

    it('should handle general errors', async () => {
      const { getJobQueue } = await import('@/server/lib/job-queue');
      vi.mocked(getJobQueue).mockImplementationOnce(() => {
        throw new Error('Queue unavailable');
      });

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      await expect(caller.retryFailedJob({ jobId: 'job_123' })).rejects.toThrow(
        'Failed to retry job'
      );
    });
  });

  describe('clearFailedJobs', () => {
    beforeEach(() => {
      mockDb.auditLog.create.mockResolvedValue({
        id: 'audit_456',
        userId: 'user_123',
        action: 'system.clear_failed_jobs',
        result: 'success',
      });
    });

    it('should clear failed jobs and log action', async () => {
      const { getJobQueue } = await import('@/server/lib/job-queue');
      const mockJobQueue = {
        getFailedJobs: vi.fn().mockResolvedValue(mockFailedJobs),
      };
      vi.mocked(getJobQueue).mockReturnValueOnce(mockJobQueue as any);

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.clearFailedJobs();

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(2);

      // Verify audit log creation
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_123',
          action: 'system.clear_failed_jobs',
          resource: 'job_queue',
          result: 'success',
          metadata: {
            clearedCount: 2,
            clearedBy: 'user_123',
          },
        },
      });
    });

    it('should handle job queue without getFailedJobs method', async () => {
      const { getJobQueue } = await import('@/server/lib/job-queue');
      vi.mocked(getJobQueue).mockReturnValueOnce({
        // No getFailedJobs method
      } as any);

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.clearFailedJobs();

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(0);
    });

    it('should handle errors', async () => {
      const { getJobQueue } = await import('@/server/lib/job-queue');
      vi.mocked(getJobQueue).mockImplementationOnce(() => {
        throw new Error('Queue error');
      });

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      await expect(caller.clearFailedJobs()).rejects.toThrow(
        'Failed to clear failed jobs'
      );
    });

    // Note: In production, this should have admin role checking
    it('should require authentication', async () => {
      const unauthenticatedCtx = createInnerTRPCContext({ session: null });
      const unauthenticatedCaller =
        systemMonitoringRouter.createCaller(unauthenticatedCtx);

      await expect(unauthenticatedCaller.clearFailedJobs()).rejects.toThrow(
        TRPCError
      );
    });
  });

  describe('recentEvents', () => {
    beforeEach(() => {
      mockDb.auditLog.findMany.mockResolvedValue(mockAuditEvents);
    });

    it('should return recent events with default limit', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.recentEvents({});

      expect(result).toEqual(mockAuditEvents);
      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        take: 20, // default limit
        select: {
          id: true,
          action: true,
          result: true,
          timestamp: true,
          error: true,
          metadata: true,
        },
      });
    });

    it('should return events with custom limit', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      await caller.recentEvents({ limit: 10 });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          result: true,
          timestamp: true,
          error: true,
          metadata: true,
        },
      });
    });

    it('should filter events by actions', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      await caller.recentEvents({
        actions: ['subscription.cancel', 'user.login'],
      });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: {
            in: ['subscription.cancel', 'user.login'],
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          result: true,
          timestamp: true,
          error: true,
          metadata: true,
        },
      });
    });

    it('should validate limit bounds', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      await expect(caller.recentEvents({ limit: 0 })).rejects.toThrow();
      await expect(caller.recentEvents({ limit: 101 })).rejects.toThrow();
    });

    it('should handle empty actions array', async () => {
      const caller = systemMonitoringRouter.createCaller(mockCtx);

      await caller.recentEvents({ actions: [] });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          result: true,
          timestamp: true,
          error: true,
          metadata: true,
        },
      });
    });

    it('should handle database errors', async () => {
      mockDb.auditLog.findMany.mockRejectedValueOnce(
        new Error('Database error')
      );

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      await expect(caller.recentEvents({})).rejects.toThrow(
        'Failed to get recent events'
      );
    });
  });

  describe('authentication and authorization', () => {
    it('should allow public access to health endpoint only', async () => {
      const publicCtx = createInnerTRPCContext({ session: null });
      publicCtx.db = mockDb as any;
      const publicCaller = systemMonitoringRouter.createCaller(publicCtx);

      // Health endpoint should work without authentication
      await expect(publicCaller.health()).resolves.toBeDefined();

      // All other endpoints should require authentication
      await expect(publicCaller.systemStatus()).rejects.toThrow(TRPCError);
      await expect(publicCaller.jobQueueStats()).rejects.toThrow(TRPCError);
      await expect(publicCaller.workflowStats()).rejects.toThrow(TRPCError);
      await expect(publicCaller.realtimeStats()).rejects.toThrow(TRPCError);
      await expect(publicCaller.userConnections()).rejects.toThrow(TRPCError);
      await expect(publicCaller.systemMetrics({})).rejects.toThrow(TRPCError);
      await expect(
        publicCaller.retryFailedJob({ jobId: 'test' })
      ).rejects.toThrow(TRPCError);
      await expect(publicCaller.clearFailedJobs()).rejects.toThrow(TRPCError);
      await expect(publicCaller.recentEvents({})).rejects.toThrow(TRPCError);
    });
  });

  describe('error handling', () => {
    it('should handle service unavailability gracefully', async () => {
      // Mock all services as unavailable
      mockDb.$queryRaw.mockRejectedValue(new Error('DB down'));
      const { checkJobQueueHealth } = await import('@/server/lib/job-queue');
      const { checkJobProcessorHealth } = await import(
        '@/server/services/job-processors'
      );
      vi.mocked(checkJobQueueHealth).mockResolvedValue({
        healthy: false,
        error: 'Queue down',
      });
      vi.mocked(checkJobProcessorHealth).mockResolvedValue({
        healthy: false,
        error: 'Processors down',
      });

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.systemStatus();

      expect(result.overall).toBe('unhealthy');
      expect(result.services.database.status).toBe('unhealthy');
      expect(result.services.jobQueue.status).toBe('unhealthy');
      expect(result.services.jobProcessors.status).toBe('unhealthy');
    });

    it('should sanitize error messages in failed jobs', async () => {
      const sensitiveFailedJobs = [
        {
          id: 'job_1',
          type: 'email_notification',
          attempts: 3,
          maxAttempts: 3,
          createdAt: new Date(),
          error: 'Database password: secret123', // Sensitive info
        },
      ];

      const { getJobQueue } = await import('@/server/lib/job-queue');
      const mockJobQueue = {
        getStats: vi.fn().mockReturnValue(mockJobQueueStats),
        getFailedJobs: vi.fn().mockResolvedValue(sensitiveFailedJobs),
      };
      vi.mocked(getJobQueue).mockReturnValueOnce(mockJobQueue as any);

      const caller = systemMonitoringRouter.createCaller(mockCtx);

      const result = await caller.jobQueueStats();

      // Error message should be sanitized
      expect(result.failedJobs[0].error).toBe('Failed job');
      expect(result.failedJobs[0].error).not.toContain('secret123');
    });
  });
});
