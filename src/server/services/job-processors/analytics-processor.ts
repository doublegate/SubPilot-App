import type { PrismaClient } from '@prisma/client';
import type { Job, JobResult } from '@/server/lib/job-queue';
import { AuditLogger } from '@/server/lib/audit-logger';

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
        } as any;
      }

      // Process different types of analytics events
      const result = await this.processAnalyticsEvent(
        userId || 'anonymous',
        event,
        properties || {},
        timestamp ? new Date(timestamp) : new Date()
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Analytics processing failed',
        } as any;
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
        error: error instanceof Error ? error.message : 'Analytics processing error',
      } as any;
    }
  }

  /**
   * Process analytics aggregation job
   */
  async processAnalyticsAggregation(job: Job): Promise<JobResult> {
    const { type, timeframe, filters } = job.data;

    try {
      let result;

      switch (type) {
        case 'cancellation_stats':
          result = await this.aggregateCancellationStats(timeframe, filters);
          break;
        case 'user_activity':
          result = await this.aggregateUserActivity(timeframe, filters);
          break;
        case 'system_health':
          result = await this.aggregateSystemHealth(timeframe, filters);
          break;
        default:
          return {
            success: false,
            error: `Unknown aggregation type: ${type}`,
          } as any;
      }

      // Store aggregated data
      await this.storeAggregatedData(type, timeframe, result);

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
      console.error('[AnalyticsProcessor] Error processing aggregation:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Aggregation processing error',
      } as any;
    }
  }

  /**
   * Process individual analytics events
   */
  private async processAnalyticsEvent(
    userId: string,
    event: string,
    properties: any,
    timestamp: Date
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Process based on event type
      switch (event) {
        case 'cancellation.initiated':
          return await this.trackCancellationInitiated(userId, properties, timestamp);
        
        case 'cancellation.completed':
          return await this.trackCancellationCompleted(userId, properties, timestamp);
        
        case 'cancellation.failed':
          return await this.trackCancellationFailed(userId, properties, timestamp);
        
        case 'job.queued':
        case 'job.completed':
        case 'job.failed':
          return await this.trackJobEvent(userId, event, properties, timestamp);
        
        case 'workflow.started':
        case 'workflow.completed':
          return await this.trackWorkflowEvent(userId, event, properties, timestamp);
        
        case 'user.login':
        case 'user.logout':
          return await this.trackUserEvent(userId, event, properties, timestamp);
        
        case 'notification.sent':
          return await this.trackNotificationEvent(userId, properties, timestamp);
        
        default:
          return await this.trackGenericEvent(userId, event, properties, timestamp);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Event processing error',
      };
    }
  }

  /**
   * Track cancellation initiated events
   */
  private async trackCancellationInitiated(
    userId: string,
    properties: any,
    timestamp: Date
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Log to audit trail
    await AuditLogger.log({
      userId,
      action: 'create' as any,
      resource: properties.requestId || 'unknown',
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
    properties: any,
    timestamp: Date
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Update cancellation success metrics
    await AuditLogger.log({
      userId,
      action: 'analytics.cancellation_completed',
      resource: properties.requestId || 'unknown',
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
    properties: any,
    timestamp: Date
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    await AuditLogger.log({
      userId,
      action: 'analytics.cancellation_failed',
      resource: properties.requestId || 'unknown',
      result: 'failure',
      error: properties.error,
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
    properties: any,
    timestamp: Date
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    await AuditLogger.log({
      userId,
      action: `analytics.${event}` as any,
      resource: properties.jobId || 'unknown',
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
    properties: any,
    timestamp: Date
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    await AuditLogger.log({
      userId,
      action: `analytics.${event}` as any,
      resource: properties.instanceId || properties.workflowId || 'unknown',
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
    properties: any,
    timestamp: Date
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    await AuditLogger.log({
      userId,
      action: `analytics.${event}` as any,
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
    properties: any,
    timestamp: Date
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    await AuditLogger.log({
      userId,
      action: 'analytics.notification_sent',
      resource: properties.jobId || 'unknown',
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
    properties: any,
    timestamp: Date
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // For unknown events, just log them
    await AuditLogger.log({
      userId,
      action: `analytics.${event}` as any,
      resource: properties.resourceId || 'unknown',
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
    filters: any = {}
  ): Promise<any> {
    const { startDate, endDate } = this.getTimeframeDates(timeframe);

    const where: any = {
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
        where: { ...where, status: 'completed' } 
      }),
      this.db.cancellationRequest.count({ 
        where: { ...where, status: 'failed' } 
      }),
      this.db.cancellationRequest.count({ 
        where: { ...where, status: { in: ['pending', 'processing'] } } 
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
      timeframe,
      total,
      completed,
      failed,
      pending,
      successRate,
      methodBreakdown: methodStats.reduce((acc, stat) => {
        acc[stat.method] = stat._count.method;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Aggregate user activity statistics
   */
  private async aggregateUserActivity(
    timeframe: string,
    filters: any = {}
  ): Promise<any> {
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
      timeframe,
      activeUsers: activeUsers.length,
      newUsers: newUsers.length,
      returningUsers: activeUsers.length - newUsers.length,
    };
  }

  /**
   * Aggregate system health statistics
   */
  private async aggregateSystemHealth(
    timeframe: string,
    filters: any = {}
  ): Promise<any> {
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

    const errorRate = totalOperations > 0 
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
      mostCommonErrors: commonErrors.map(error => ({
        action: error.action,
        count: error._count.action,
      })),
    };
  }

  /**
   * Store aggregated data
   */
  private async storeAggregatedData(
    type: string,
    timeframe: string,
    data: any
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
  private getTimeframeDates(timeframe: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(now);

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