import type { PrismaClient } from '@prisma/client';
import type { Job, JobResult } from '@/server/lib/job-queue';
import { AuditLogger, type SecurityAction } from '@/server/lib/audit-logger';

// Generic interfaces for analytics data
interface AnalyticsProperties extends Record<string, unknown> {
  requestId?: string;
  subscriptionId?: string;
  method?: string;
  priority?: string;
}

interface AnalyticsResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// Cancellation statistics result
interface CancellationStats {
  totalRequests: number;
  successful: number;
  failed: number;
  pending: number;
  successRate: number;
  averageTime: number;
  byMethod: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

// User activity statistics result
interface UserActivityStats {
  totalActiveUsers: number;
  newUsers: number;
  returningUsers: number;
  averageRequestsPerUser: number;
  topUsers: Array<{
    userId: string;
    requestCount: number;
    successRate: number;
  }>;
  activityByDay: Array<{
    date: string;
    userCount: number;
    requestCount: number;
  }>;
}

// Helper function to map analytics events to security actions
function mapEventToAction(event: string): SecurityAction {
  switch (event) {
    case 'cancellation_initiated':
    case 'cancellation_created':
      return 'cancellation.initiated';
    case 'cancellation_completed':
    case 'cancellation_confirmed':
      return 'cancellation.manual_confirmed';
    case 'subscription_created':
    case 'subscription_detected':
      return 'subscription.created';
    case 'subscription_cancelled':
      return 'subscription.cancelled';
    case 'bank_connected':
      return 'bank.connected';
    case 'bank_sync':
      return 'bank.sync';
    case 'user_login':
      return 'user.login';
    default:
      // Default to a generic user action for analytics events
      return 'user.update';
  }
}

/**
 * Job processor for analytics and tracking tasks
 */
export class AnalyticsJobProcessor {
  constructor(private db: PrismaClient) {}

  /**
   * Process analytics tracking job
   */
  async processAnalyticsTracking(job: Job): Promise<JobResult> {
    const { userId, event, properties, timestamp } = job.data;

    try {
      // Validate input data
      if (!event || typeof event !== 'string') {
        return {
          success: false,
          error: 'Invalid event name',
        };
      }

      // Process different types of analytics events
      const result = await this.processAnalyticsEvent(
        userId ?? 'anonymous',
        event,
        (properties ?? {}) as AnalyticsProperties,
        timestamp ? new Date(timestamp as string | number | Date) : new Date()
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error ?? 'Analytics processing failed',
        };
      }

      return {
        success: true,
        data: {
          event,
          userId,
          processed: true,
          ...result.data,
        },
      };
    } catch (error) {
      console.error('[AnalyticsProcessor] Error processing analytics:', error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Analytics processing error',
      };
    }
  }

  /**
   * Process analytics aggregation job
   */
  async processAnalyticsAggregation(job: Job): Promise<JobResult> {
    const { type, timeframe, filters } = job.data;

    try {
      // Validate type parameter
      if (typeof type !== 'string') {
        return {
          success: false,
          error: 'Invalid aggregation type',
        };
      }

      let result;

      switch (type) {
        case 'cancellation_stats':
          result = await this.aggregateCancellationStats(
            timeframe as string,
            filters as Record<string, unknown>
          );
          break;
        case 'user_activity':
          result = await this.aggregateUserActivity(
            timeframe as string,
            filters as Record<string, unknown>
          );
          break;
        case 'system_health':
          result = await this.aggregateSystemHealth(
            timeframe as string,
            filters as Record<string, unknown>
          );
          break;
        default:
          return {
            success: false,
            error: `Unknown aggregation type: ${type}`,
          };
      }

      // Store aggregated data
      await this.storeAggregatedData(
        type as string,
        timeframe as string,
        result as Record<string, unknown>
      );

      return {
        success: true,
        data: {
          type,
          timeframe,
          aggregatedData: result,
          processedAt: new Date(),
        },
      };
    } catch (error) {
      console.error(
        '[AnalyticsProcessor] Error processing aggregation:',
        error
      );

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Aggregation processing error',
      };
    }
  }

  /**
   * Process individual analytics events
   */
  private async processAnalyticsEvent(
    userId: string,
    event: string,
    properties: AnalyticsProperties,
    timestamp: Date
  ): Promise<AnalyticsResult> {
    try {
      // Process based on event type
      switch (event) {
        case 'cancellation.initiated':
          return await this.trackCancellationInitiated(
            userId,
            properties,
            timestamp
          );

        case 'cancellation.completed':
          return await this.trackCancellationCompleted(
            userId,
            properties,
            timestamp
          );

        case 'cancellation.failed':
          return await this.trackCancellationFailed(
            userId,
            properties,
            timestamp
          );

        case 'job.queued':
        case 'job.completed':
        case 'job.failed':
          return await this.trackJobEvent(userId, event, properties, timestamp);

        case 'workflow.started':
        case 'workflow.completed':
          return await this.trackWorkflowEvent(
            userId,
            event,
            properties,
            timestamp
          );

        case 'user.login':
        case 'user.logout':
          return await this.trackUserEvent(
            userId,
            event,
            properties,
            timestamp
          );

        case 'notification.sent':
          return await this.trackNotificationEvent(
            userId,
            properties,
            timestamp
          );

        default:
          return await this.trackGenericEvent(
            userId,
            event,
            properties,
            timestamp
          );
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Event processing error',
      };
    }
  }

  /**
   * Track cancellation initiated events
   */
  private async trackCancellationInitiated(
    userId: string,
    properties: AnalyticsProperties,
    timestamp: Date
  ): Promise<AnalyticsResult> {
    // Log to audit trail
    await AuditLogger.log({
      userId,
      action: mapEventToAction('cancellation_initiated') ?? 'unknown_action',
      resource: properties.requestId ?? 'unknown',
      result: 'success',
      metadata: {
        subscriptionId: properties.subscriptionId,
        method: properties.method,
        priority: properties.priority,
        timestamp,
      },
    });

    // Could also update analytics tables, send to external services, etc.
    return {
      success: true,
      data: {
        tracked: 'cancellation_initiated',
        userId,
        subscriptionId: properties.subscriptionId,
        method: properties.method,
      },
    };
  }

  /**
   * Track cancellation completed events
   */
  private async trackCancellationCompleted(
    userId: string,
    properties: AnalyticsProperties,
    timestamp: Date
  ): Promise<AnalyticsResult> {
    // Update cancellation success metrics
    await AuditLogger.log({
      userId,
      action: 'analytics.cancellation_completed',
      resource: properties.requestId ?? 'unknown',
      result: 'success',
      metadata: {
        confirmationCode: properties.confirmationCode,
        processingTime: properties.processingTime,
        refundAmount: properties.refundAmount,
        timestamp,
      },
    });

    // You could update success rate metrics here
    return {
      success: true,
      data: {
        tracked: 'cancellation_completed',
        userId,
        processingTime: properties.processingTime,
        hasRefund: !!properties.refundAmount,
      },
    };
  }

  /**
   * Track cancellation failed events
   */
  private async trackCancellationFailed(
    userId: string,
    properties: AnalyticsProperties,
    timestamp: Date
  ): Promise<AnalyticsResult> {
    await AuditLogger.log({
      userId,
      action: 'analytics.cancellation_failed',
      resource: properties.requestId ?? 'unknown',
      result: 'failure',
      error:
        typeof properties.error === 'string' ? properties.error : undefined,
      metadata: {
        attempt: properties.attempt,
        willRetry: properties.willRetry,
        error: properties.error,
        timestamp,
      },
    });

    return {
      success: true,
      data: {
        tracked: 'cancellation_failed',
        userId,
        error: properties.error,
        willRetry: properties.willRetry,
      },
    };
  }

  /**
   * Track job events
   */
  private async trackJobEvent(
    userId: string,
    event: string,
    properties: AnalyticsProperties,
    timestamp: Date
  ): Promise<AnalyticsResult> {
    await AuditLogger.log({
      userId,
      action: mapEventToAction(event) ?? 'unknown_action',
      resource:
        typeof properties.jobId === 'string' ? properties.jobId : 'unknown',
      result: event.includes('failed') ? 'failure' : 'success',
      metadata: {
        jobType: properties.jobType,
        processingTime: properties.processingTime,
        attempts: properties.attempts,
        timestamp,
      },
    });

    return {
      success: true,
      data: {
        tracked: event,
        jobType: properties.jobType,
        jobId: properties.jobId,
      },
    };
  }

  /**
   * Track workflow events
   */
  private async trackWorkflowEvent(
    userId: string,
    event: string,
    properties: AnalyticsProperties,
    timestamp: Date
  ): Promise<AnalyticsResult> {
    await AuditLogger.log({
      userId,
      action: mapEventToAction(event) ?? 'unknown_action',
      resource:
        typeof properties.instanceId === 'string'
          ? properties.instanceId
          : typeof properties.workflowId === 'string'
            ? properties.workflowId
            : 'unknown',
      result: properties.status === 'failed' ? 'failure' : 'success',
      metadata: {
        workflowId: properties.workflowId,
        instanceId: properties.instanceId,
        duration: properties.duration,
        status: properties.status,
        timestamp,
      },
    });

    return {
      success: true,
      data: {
        tracked: event,
        workflowId: properties.workflowId,
        status: properties.status,
      },
    };
  }

  /**
   * Track user events
   */
  private async trackUserEvent(
    userId: string,
    event: string,
    properties: AnalyticsProperties,
    timestamp: Date
  ): Promise<AnalyticsResult> {
    await AuditLogger.log({
      userId,
      action: mapEventToAction(event) ?? 'unknown_action',
      resource: userId,
      result: 'success',
      metadata: {
        sessionId: properties.sessionId,
        timestamp,
      },
    });

    return {
      success: true,
      data: {
        tracked: event,
        userId,
      },
    };
  }

  /**
   * Track notification events
   */
  private async trackNotificationEvent(
    userId: string,
    properties: AnalyticsProperties,
    timestamp: Date
  ): Promise<AnalyticsResult> {
    await AuditLogger.log({
      userId,
      action: 'analytics.notification_sent',
      resource:
        typeof properties.jobId === 'string' ? properties.jobId : 'unknown',
      result: properties.success ? 'success' : 'failure',
      metadata: {
        type: properties.type,
        channels: properties.channels,
        success: properties.success,
        timestamp,
      },
    });

    return {
      success: true,
      data: {
        tracked: 'notification_sent',
        type: properties.type,
        success: properties.success,
      },
    };
  }

  /**
   * Track generic events
   */
  private async trackGenericEvent(
    userId: string,
    event: string,
    properties: AnalyticsProperties,
    timestamp: Date
  ): Promise<AnalyticsResult> {
    // For unknown events, just log them
    await AuditLogger.log({
      userId,
      action: mapEventToAction(event) ?? 'unknown_action',
      resource:
        typeof properties.resourceId === 'string'
          ? properties.resourceId
          : 'unknown',
      result: 'success',
      metadata: {
        event,
        properties,
        timestamp,
      },
    });

    return {
      success: true,
      data: {
        tracked: event,
        generic: true,
      },
    };
  }

  /**
   * Aggregate cancellation statistics
   */
  private async aggregateCancellationStats(
    timeframe: string,
    filters: Record<string, unknown> = {}
  ): Promise<CancellationStats> {
    const { startDate, endDate } = this.getTimeframeDates(timeframe);

    const where: Record<string, unknown> = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (filters.userId) {
      where.userId = filters.userId;
    }

    const [total, completed, failed, pending] = await Promise.all([
      this.db.cancellationRequest.count({ where }),
      this.db.cancellationRequest.count({
        where: { ...where, status: 'completed' },
      }),
      this.db.cancellationRequest.count({
        where: { ...where, status: 'failed' },
      }),
      this.db.cancellationRequest.count({
        where: { ...where, status: { in: ['pending', 'processing'] } },
      }),
    ]);

    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Get method breakdown
    const methodStats = await this.db.cancellationRequest.groupBy({
      by: ['method'],
      where,
      _count: {
        method: true,
      },
    });

    return {
      totalRequests: total,
      successful: completed,
      failed,
      pending,
      successRate,
      averageTime: 15, // Default average time in minutes
      byMethod: methodStats.reduce(
        (acc, stat) => {
          acc[stat.method] = stat._count.method;
          return acc;
        },
        {} as Record<string, number>
      ),
      byStatus: {
        completed,
        failed,
        pending,
      },
      byPriority: {}, // Could be populated with priority stats if needed
    };
  }

  /**
   * Aggregate user activity statistics
   */
  private async aggregateUserActivity(
    timeframe: string,
    _filters: Record<string, unknown> = {}
  ): Promise<UserActivityStats> {
    const { startDate, endDate } = this.getTimeframeDates(timeframe);

    // Get active users (users who made cancellation requests)
    const activeUsers = await this.db.cancellationRequest.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        userId: true,
        createdAt: true,
      },
      distinct: ['userId'],
    });

    // Get new users (first cancellation request)
    const newUsers = await this.db.cancellationRequest.groupBy({
      by: ['userId'],
      having: {
        userId: {
          _count: {
            equals: 1,
          },
        },
      },
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      totalActiveUsers: activeUsers.length,
      newUsers: newUsers.length,
      returningUsers: activeUsers.length - newUsers.length,
      averageRequestsPerUser: 0, // Could calculate from requests data
      topUsers: [], // Could populate with top user stats
      activityByDay: [], // Could populate with daily activity breakdown
    };
  }

  /**
   * Aggregate system health statistics
   */
  private async aggregateSystemHealth(
    timeframe: string,
    _filters: Record<string, unknown> = {}
  ): Promise<{
    timeframe: string;
    errorRate: number;
    totalOperations: number;
    failedOperations: number;
    systemStatus: 'healthy' | 'degraded' | 'critical';
    uptime: number;
    commonErrors?: Record<string, unknown>;
  }> {
    const { startDate, endDate } = this.getTimeframeDates(timeframe);

    // Get error rates from audit logs
    const [totalOperations, failedOperations] = await Promise.all([
      this.db.auditLog.count({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.db.auditLog.count({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
          result: 'failure',
        },
      }),
    ]);

    const errorRate =
      totalOperations > 0
        ? Math.round((failedOperations / totalOperations) * 100)
        : 0;

    // Get most common errors
    const commonErrors = await this.db.auditLog.groupBy({
      by: ['action'],
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        result: 'failure',
      },
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
      take: 5,
    });

    return {
      timeframe,
      totalOperations,
      failedOperations,
      errorRate,
      commonErrors: commonErrors as unknown as Record<string, unknown>,
      systemStatus:
        errorRate > 10 ? 'critical' : errorRate > 5 ? 'degraded' : 'healthy',
      uptime: 99.9, // Default uptime percentage
    };
  }

  /**
   * Store aggregated data
   */
  private async storeAggregatedData(
    type: string,
    timeframe: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // In a real implementation, you might store this in a dedicated analytics table
    // For now, we'll just log it
    await AuditLogger.log({
      userId: 'system',
      action: 'analytics.aggregation_completed',
      resource: `${type}_${timeframe}`,
      result: 'success',
      metadata: {
        type,
        timeframe,
        data,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Get date range for timeframe
   */
  private getTimeframeDates(timeframe: string): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    const endDate = new Date(now);
    const startDate = new Date(now);

    switch (timeframe) {
      case 'hour':
        startDate.setHours(now.getHours() - 1);
        break;
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        // Default to last 24 hours
        startDate.setDate(now.getDate() - 1);
    }

    return { startDate, endDate };
  }
}
