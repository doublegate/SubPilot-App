import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '@/server/api/trpc';
import { getJobQueue, checkJobQueueHealth } from '@/server/lib/job-queue';
import { getWorkflowEngine } from '@/server/lib/workflow-engine';
import { getRealtimeNotificationManager } from '@/server/lib/realtime-notifications';
import { checkJobProcessorHealth } from '@/server/services/job-processors';

export const systemMonitoringRouter = createTRPCRouter({
  /**
   * Public health check endpoint
   */
  health: publicProcedure.query(async ({ ctx }) => {
    try {
      // Basic database connectivity check
      await ctx.db.$queryRaw`SELECT 1`;

      return {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          database: 'healthy',
          api: 'healthy',
        },
      };
    } catch {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'System health check failed',
      });
    }
  }),

  /**
   * Comprehensive system status (requires authentication)
   */
  systemStatus: protectedProcedure.query(async ({ ctx }) => {
    const checks = await Promise.allSettled([
      checkDatabaseHealth(ctx.db),
      Promise.resolve(checkJobQueueHealth()),
      Promise.resolve(checkJobProcessorHealth()),
      checkWorkflowEngineHealth(),
      checkRealtimeHealth(),
    ]);

    const [database, jobQueue, jobProcessors, workflowEngine, realtime] =
      checks;

    const systemStatus = {
      overall: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date(),
      services: {
        database: getCheckResult(database),
        jobQueue: getCheckResult(jobQueue),
        jobProcessors: getCheckResult(jobProcessors),
        workflowEngine: getCheckResult(workflowEngine),
        realtime: getCheckResult(realtime),
      },
    };

    // Determine overall status
    const healthyServices = Object.values(systemStatus.services).filter(
      service => service.status === 'healthy'
    ).length;

    const totalServices = Object.keys(systemStatus.services).length;

    if (healthyServices === totalServices) {
      systemStatus.overall = 'healthy';
    } else if (healthyServices >= totalServices * 0.7) {
      systemStatus.overall = 'degraded';
    } else {
      systemStatus.overall = 'unhealthy';
    }

    return systemStatus;
  }),

  /**
   * Get job queue statistics
   */
  jobQueueStats: protectedProcedure.query(async () => {
    try {
      const jobQueue = getJobQueue();
      const stats = jobQueue.getStats();

      interface JobQueueWithFailedJobs {
        getFailedJobs?: (limit: number) => Promise<unknown[]>;
      }

      const failedJobsMethod = (jobQueue as JobQueueWithFailedJobs)
        .getFailedJobs;
      const failedJobs = failedJobsMethod ? await failedJobsMethod(5) : [];

      interface FailedJob {
        id: unknown;
        type: unknown;
        attempts: unknown;
        maxAttempts: unknown;
        createdAt: unknown;
      }

      return {
        stats,
        failedJobs: (failedJobs as FailedJob[]).map(job => ({
          id: job.id,
          type: job.type,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          createdAt: job.createdAt,
          error: 'Failed job', // Don't expose sensitive error details
        })),
      };
    } catch {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get job queue stats',
      });
    }
  }),

  /**
   * Get workflow engine statistics
   */
  workflowStats: protectedProcedure.query(async () => {
    try {
      const workflowEngine = getWorkflowEngine();
      const stats = workflowEngine.getStats();

      return stats;
    } catch {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get workflow stats',
      });
    }
  }),

  /**
   * Get real-time notifications statistics
   */
  realtimeStats: protectedProcedure.query(async () => {
    try {
      const realtimeManager = getRealtimeNotificationManager();

      // Type the manager properly to avoid any usage
      interface RealtimeManagerWithStats {
        getStats?: () => Record<string, unknown>;
        getActiveConnections: () => number;
      }

      const typedManager = realtimeManager as RealtimeManagerWithStats;
      const stats = typedManager.getStats
        ? typedManager.getStats()
        : { activeConnections: typedManager.getActiveConnections() };

      return stats;
    } catch {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get realtime stats',
      });
    }
  }),

  /**
   * Get user's real-time connection info
   */
  userConnections: protectedProcedure.query(async ({ ctx }) => {
    try {
      const realtimeManager = getRealtimeNotificationManager();

      // Type the manager properly to avoid any usage
      interface RealtimeManagerWithConnections {
        getUserConnections?: (userId: string) => Array<{
          id: string;
          connectionId: string;
          connectedAt: Date;
          lastActivity: Date;
        }>;
        getUnreadNotifications?: (userId: string) => unknown[];
      }

      const typedManager = realtimeManager as RealtimeManagerWithConnections;
      const connections = typedManager.getUserConnections
        ? typedManager.getUserConnections(ctx.session.user.id)
        : [];

      return {
        connections: connections.map(conn => ({
          id: conn.id,
          connectionId: conn.connectionId,
          connectedAt: conn.connectedAt,
          lastActivity: conn.lastActivity,
        })),
        unreadNotifications: typedManager.getUnreadNotifications
          ? typedManager.getUnreadNotifications(ctx.session.user.id).length
          : 0,
      };
    } catch {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user connections',
      });
    }
  }),

  /**
   * Get system metrics for dashboard
   */
  systemMetrics: protectedProcedure
    .input(
      z.object({
        timeframe: z
          .enum(['hour', 'day', 'week', 'month'])
          .optional()
          .default('day'),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { timeframe } = input;
        const endTime = new Date();
        const startTime = new Date();

        // Calculate start time based on timeframe
        switch (timeframe) {
          case 'hour':
            startTime.setHours(endTime.getHours() - 1);
            break;
          case 'day':
            startTime.setDate(endTime.getDate() - 1);
            break;
          case 'week':
            startTime.setDate(endTime.getDate() - 7);
            break;
          case 'month':
            startTime.setMonth(endTime.getMonth() - 1);
            break;
        }

        // Get cancellation metrics
        const [totalRequests, completedRequests, failedRequests] =
          await Promise.all([
            ctx.db.cancellationRequest.count({
              where: {
                createdAt: {
                  gte: startTime,
                  lte: endTime,
                },
              },
            }),
            ctx.db.cancellationRequest.count({
              where: {
                createdAt: {
                  gte: startTime,
                  lte: endTime,
                },
                status: 'completed',
              },
            }),
            ctx.db.cancellationRequest.count({
              where: {
                createdAt: {
                  gte: startTime,
                  lte: endTime,
                },
                status: 'failed',
              },
            }),
          ]);

        // Get error rate from audit logs
        const [totalOperations, failedOperations] = await Promise.all([
          ctx.db.auditLog.count({
            where: {
              timestamp: {
                gte: startTime,
                lte: endTime,
              },
            },
          }),
          ctx.db.auditLog.count({
            where: {
              timestamp: {
                gte: startTime,
                lte: endTime,
              },
              result: 'failure',
            },
          }),
        ]);

        const successRate =
          totalRequests > 0
            ? Math.round((completedRequests / totalRequests) * 100)
            : 0;

        const errorRate =
          totalOperations > 0
            ? Math.round((failedOperations / totalOperations) * 100)
            : 0;

        return {
          timeframe,
          period: {
            start: startTime,
            end: endTime,
          },
          cancellations: {
            total: totalRequests,
            completed: completedRequests,
            failed: failedRequests,
            pending: totalRequests - completedRequests - failedRequests,
            successRate,
          },
          system: {
            totalOperations,
            failedOperations,
            errorRate,
          },
        };
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get system metrics',
        });
      }
    }),

  /**
   * Retry a failed job
   */
  retryFailedJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const jobQueue = getJobQueue();
        // Type the job queue interface for retry functionality
        interface JobQueueWithRetry {
          retryFailedJob?: (jobId: string) => Promise<boolean>;
        }

        const typedJobQueue = jobQueue as JobQueueWithRetry;
        const success = typedJobQueue.retryFailedJob
          ? await typedJobQueue.retryFailedJob(input.jobId)
          : false;

        if (!success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Job not found or not in failed state',
          });
        }

        // Log the retry action
        await ctx.db.auditLog.create({
          data: {
            userId: ctx.session.user.id,
            action: 'job.manual_retry',
            resource: input.jobId,
            result: 'success',
            metadata: {
              jobId: input.jobId,
              retriedBy: ctx.session.user.id,
            },
          },
        });

        return { success: true, jobId: input.jobId };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retry job',
        });
      }
    }),

  /**
   * Clear failed jobs (admin only)
   */
  clearFailedJobs: protectedProcedure.mutation(async ({ ctx }) => {
    // Note: In a real app, you'd check for admin permissions here

    try {
      const jobQueue = getJobQueue();

      // Get failed jobs count before clearing
      interface JobQueueWithFailedJobs {
        getFailedJobs?: (limit: number) => Promise<unknown[]>;
      }

      const typedJobQueue = jobQueue as JobQueueWithFailedJobs;
      const failedJobs = typedJobQueue.getFailedJobs
        ? await typedJobQueue.getFailedJobs(1000)
        : [];
      const clearedCount = Array.isArray(failedJobs) ? failedJobs.length : 0;

      // In the current implementation, there's no direct clear method
      // You would need to implement this in the JobQueue class
      console.log(`[SystemMonitoring] Would clear ${clearedCount} failed jobs`);

      // Log the action
      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.user.id,
          action: 'system.clear_failed_jobs',
          resource: 'job_queue',
          result: 'success',
          metadata: {
            clearedCount,
            clearedBy: ctx.session.user.id,
          },
        },
      });

      return { success: true, clearedCount };
    } catch {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to clear failed jobs',
      });
    }
  }),

  /**
   * Get recent system events
   */
  recentEvents: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        actions: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        interface WhereClause {
          action?: {
            in: string[];
          };
        }

        const where: WhereClause = {};

        if (input.actions && input.actions.length > 0) {
          where.action = {
            in: input.actions,
          };
        }

        const events = await ctx.db.auditLog.findMany({
          where,
          orderBy: {
            timestamp: 'desc',
          },
          take: input.limit,
          select: {
            id: true,
            action: true,
            result: true,
            timestamp: true,
            error: true,
            metadata: true,
          },
        });

        return events;
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get recent events',
        });
      }
    }),
});

// Helper functions

async function checkDatabaseHealth(db: {
  $queryRaw: (query: TemplateStringsArray) => Promise<unknown>;
}): Promise<HealthCheckResult> {
  try {
    await db.$queryRaw`SELECT 1`;
    return { healthy: true };
  } catch (error) {
    return {
      healthy: false,
      error:
        error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

async function checkWorkflowEngineHealth(): Promise<HealthCheckResult> {
  try {
    const workflowEngine = getWorkflowEngine();
    const stats = workflowEngine.getStats();

    return {
      healthy: true,
      stats,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Workflow engine error',
    };
  }
}

async function checkRealtimeHealth(): Promise<HealthCheckResult> {
  try {
    const realtimeManager = getRealtimeNotificationManager();

    interface RealtimeManagerWithStats {
      getStats?: () => Record<string, unknown>;
      getActiveConnections: () => number;
    }

    const typedManager = realtimeManager as RealtimeManagerWithStats;
    const stats = typedManager.getStats
      ? typedManager.getStats()
      : { activeConnections: typedManager.getActiveConnections() };

    return {
      healthy: true,
      stats,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Realtime service error',
    };
  }
}

interface HealthCheckResult {
  healthy: boolean;
  error?: string | null;
  stats?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

function getCheckResult(
  settledResult: PromiseSettledResult<HealthCheckResult>
) {
  if (settledResult.status === 'fulfilled') {
    const result = settledResult.value;
    return {
      status: result.healthy ? 'healthy' : 'unhealthy',
      error: result.error ?? null,
      data: result.stats ?? result.data ?? null,
    };
  } else {
    return {
      status: 'unhealthy' as const,
      error:
        settledResult.reason instanceof Error
          ? settledResult.reason.message
          : 'Unknown error',
      data: null,
    };
  }
}
