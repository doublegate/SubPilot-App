import type { PrismaClient } from '@prisma/client';
import { getJobQueue } from '@/server/lib/job-queue';
import { getWorkflowEngine } from '@/server/lib/workflow-engine';
import {
  emitCancellationEvent,
  onCancellationEvent,
} from '@/server/lib/event-bus';
import { sendRealtimeNotification } from '@/server/lib/realtime-notifications';
import { AuditLogger } from '@/server/lib/audit-logger';
import { z } from 'zod';
import type {
  CancellationRequestWithSubscription,
  WorkflowStatus,
  CancellationTimeline,
  AutoRetryData,
  FinalFailureData,
  MethodStatistic,
  MethodData,
} from '@/types/cancellation';
import type { CancellationEventData } from '@/server/lib/event-bus';

// Analytics response interfaces
interface EventDrivenAnalyticsSummary {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  pendingRequests: number;
  averageCompletionTime: number;
  successRate: number;
}

interface EventDrivenTrend {
  date: string;
  requests: number;
  completions: number;
  failures: number;
}

type EventDrivenMethodEffectiveness = Record<
  string,
  {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    averageTime: number;
    successRate: number;
  }
>;

// Enhanced type definitions for event data
interface AnalyticsEventData extends CancellationEventData {
  event: string;
  properties: {
    jobType?: string;
    status?: string;
    workflowId?: string;
    instanceId?: string;
    duration?: number;
    [key: string]: unknown;
  };
}

interface RetryEventData extends CancellationEventData {
  willRetry: boolean;
  attempt?: number;
  nextRetryAt?: string | Date;
}

// Type guards for event data
function isAnalyticsEventData(
  data: CancellationEventData
): data is AnalyticsEventData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'event' in data &&
    'properties' in data
  );
}

function isRetryEventData(data: CancellationEventData): data is RetryEventData {
  return typeof data === 'object' && data !== null && 'willRetry' in data;
}

// Safe property accessors
function safeStringAccess(obj: unknown, property: string): string | undefined {
  if (typeof obj === 'object' && obj !== null && property in obj) {
    const value = (obj as Record<string, unknown>)[property];
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}

// Input validation schemas
export const EventDrivenCancellationRequestInput = z.object({
  subscriptionId: z.string(),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  notes: z.string().optional(),
  preferredMethod: z.enum(['api', 'webhook', 'manual']).optional(),
  scheduleFor: z.date().optional(), // For delayed cancellations
  notificationPreferences: z
    .object({
      realtime: z.boolean().optional().default(true),
      email: z.boolean().optional().default(true),
      sms: z.boolean().optional().default(false),
    })
    .optional(),
});

export type EventDrivenCancellationRequest = z.infer<
  typeof EventDrivenCancellationRequestInput
>;

/**
 * Event-driven cancellation service that uses background jobs and workflows
 */
export class EventDrivenCancellationService {
  private jobQueue = getJobQueue();
  private workflowEngine = getWorkflowEngine();

  constructor(private db: PrismaClient) {
    this.setupEventListeners();
  }

  /**
   * Initiate an event-driven cancellation process
   */
  async initiateCancellation(
    userId: string,
    input: EventDrivenCancellationRequest
  ): Promise<{
    requestId: string;
    workflowId?: string;
    status: string;
    estimatedCompletion?: Date;
  }> {
    const validatedInput = EventDrivenCancellationRequestInput.parse(input);

    // Verify subscription exists and belongs to user
    const subscription = await this.db.subscription.findFirst({
      where: {
        id: validatedInput.subscriptionId,
        userId,
      },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status === 'cancelled') {
      throw new Error('Subscription is already cancelled');
    }

    // Check for existing pending cancellation
    const existingRequest = await this.db.cancellationRequest.findFirst({
      where: {
        subscriptionId: validatedInput.subscriptionId,
        userId,
        status: { in: ['pending', 'processing'] },
      },
    });

    if (existingRequest) {
      throw new Error('Cancellation request already in progress');
    }

    // Create cancellation request record
    const request = await this.db.cancellationRequest.create({
      data: {
        userId,
        subscriptionId: validatedInput.subscriptionId,
        method:
          (validatedInput.preferredMethod === 'webhook'
            ? 'automation'
            : validatedInput.preferredMethod) ?? 'api',
        priority: validatedInput.priority,
        status: validatedInput.scheduleFor ? 'scheduled' : 'pending',
        attempts: 0,
        userNotes: validatedInput.notes,
      },
    });

    // Calculate estimated completion time
    const estimatedCompletion = this.calculateEstimatedCompletion(
      validatedInput.priority,
      (validatedInput.preferredMethod === 'webhook'
        ? 'automation'
        : validatedInput.preferredMethod) ?? 'api'
    );

    // Log the initiation
    await AuditLogger.log({
      userId,
      action: 'cancellation.initiated',
      resource: request.id,
      result: 'success',
      metadata: {
        subscriptionId: validatedInput.subscriptionId,
        priority: validatedInput.priority,
        preferredMethod: validatedInput.preferredMethod,
        scheduleFor: validatedInput.scheduleFor,
      },
    });

    let workflowId: string | undefined;

    if (validatedInput.scheduleFor) {
      // Schedule the cancellation for later
      await this.scheduleDelayedCancellation(
        request.id,
        validatedInput.scheduleFor
      );

      // Send real-time notification about scheduling
      sendRealtimeNotification(userId, {
        type: 'cancellation.status',
        title: 'Cancellation Scheduled',
        message: `Your cancellation has been scheduled for ${validatedInput.scheduleFor.toLocaleString()}`,
        priority: 'normal',
        data: {
          requestId: request.id,
          scheduledFor: validatedInput.scheduleFor,
          subscriptionName: subscription.name,
        },
      });
    } else {
      // Start the cancellation workflow immediately
      workflowId = await this.startCancellationWorkflow(
        request.id,
        userId,
        validatedInput
      );

      // Emit the cancellation requested event
      emitCancellationEvent('cancellation.requested', {
        requestId: request.id,
        userId,
        subscriptionId: validatedInput.subscriptionId,
        method:
          (validatedInput.preferredMethod === 'webhook'
            ? 'automation'
            : validatedInput.preferredMethod) ?? 'api',
        priority: validatedInput.priority,
        metadata: {
          workflowId,
          notificationPreferences: validatedInput.notificationPreferences,
        },
      });

      // Send immediate real-time notification
      sendRealtimeNotification(userId, {
        type: 'cancellation.progress',
        title: 'Cancellation Started',
        message: `We're processing your ${subscription.name} cancellation`,
        priority: 'normal',
        data: {
          requestId: request.id,
          workflowId,
          subscriptionName: subscription.name,
          estimatedCompletion,
        },
      });
    }

    return {
      requestId: request.id,
      workflowId,
      status: request.status,
      estimatedCompletion,
    };
  }

  /**
   * Start the cancellation workflow
   */
  private async startCancellationWorkflow(
    requestId: string,
    userId: string,
    input: EventDrivenCancellationRequest
  ): Promise<string> {
    const workflowData = {
      requestId,
      subscriptionId: input.subscriptionId,
      method:
        (input.preferredMethod === 'webhook'
          ? 'automation'
          : input.preferredMethod) ?? 'api',
      priority: input.priority,
      notificationPreferences: input.notificationPreferences,
    };

    const workflowId = await this.workflowEngine.startWorkflow(
      'cancellation.full_process',
      userId,
      workflowData
    );

    // Update request with workflow ID
    await this.db.cancellationRequest.update({
      where: { id: requestId },
      data: {
        status: 'processing',
      },
    });

    return workflowId;
  }

  /**
   * Schedule a delayed cancellation
   */
  private async scheduleDelayedCancellation(
    requestId: string,
    scheduleFor: Date
  ): Promise<void> {
    const delay = scheduleFor.getTime() - Date.now();

    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    // Schedule a job to start the cancellation at the specified time
    await this.jobQueue.addJob(
      'cancellation.scheduled_start',
      {
        requestId,
        originalScheduleTime: scheduleFor,
      },
      {
        delay,
        priority: 1, // High priority for scheduled cancellations
        maxAttempts: 1, // Don't retry scheduled jobs
      }
    );

    console.log(
      `[EventDrivenCancellation] Scheduled cancellation ${requestId} for ${scheduleFor.toISOString()}`
    );
  }

  /**
   * Cancel a scheduled cancellation
   */
  async cancelScheduledCancellation(
    userId: string,
    requestId: string
  ): Promise<boolean> {
    const request = await this.db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId,
        status: 'scheduled',
      },
    });

    if (!request) {
      return false;
    }

    // Update the request status
    await this.db.cancellationRequest.update({
      where: { id: requestId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        userNotes: 'Cancelled by user before execution',
      },
    });

    // Note: In a production system, you'd also need to cancel the scheduled job
    // This would require additional job queue functionality

    // Log the cancellation
    await AuditLogger.log({
      userId,
      action: 'cancellation.confirmed',
      resource: requestId,
      result: 'success',
      metadata: {
        cancelledAt: new Date(),
      },
    });

    // Send notification
    sendRealtimeNotification(userId, {
      type: 'cancellation.status',
      title: 'Scheduled Cancellation Cancelled',
      message: 'Your scheduled cancellation has been cancelled',
      priority: 'normal',
      data: {
        requestId,
        action: 'cancelled',
      },
    });

    return true;
  }

  /**
   * Get enhanced cancellation status with real-time updates
   */
  async getCancellationStatus(
    userId: string,
    requestId: string
  ): Promise<{
    request: CancellationRequestWithSubscription;
    workflow?: WorkflowStatus;
    timeline: CancellationTimeline[];
    estimatedCompletion?: Date;
    nextSteps: string[];
  }> {
    const request = await this.db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
      include: {
        subscription: {
          select: {
            id: true,
            name: true,
            amount: true,
            frequency: true,
          },
        },
        logs: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!request) {
      throw new Error('Cancellation request not found');
    }

    // Get workflow status if available
    let workflowStatus;
    const errorDetails = request.errorDetails;
    const workflowId =
      errorDetails &&
      typeof errorDetails === 'object' &&
      'workflowId' in errorDetails
        ? (errorDetails.workflowId as string | undefined)
        : undefined;
    if (workflowId) {
      workflowStatus = this.workflowEngine.getWorkflowStatus(workflowId);
    }

    // Build timeline from logs
    const timeline = request.logs.map(log => ({
      timestamp: log.createdAt,
      action: log.action,
      status: log.status,
      message: log.message,
      metadata: log.metadata,
    }));

    // Calculate estimated completion
    const estimatedCompletion = this.calculateEstimatedCompletion(
      request.priority,
      request.method
    );

    // Determine next steps
    const nextSteps = this.determineNextSteps(
      request as unknown as CancellationRequestWithSubscription,
      workflowStatus as unknown as WorkflowStatus
    );

    return {
      request: {
        ...request,
        refundAmount: request.refundAmount
          ? parseFloat(request.refundAmount.toString())
          : null,
      } as unknown as CancellationRequestWithSubscription,
      workflow: workflowStatus as unknown as WorkflowStatus,
      timeline: timeline as unknown as CancellationTimeline[],
      estimatedCompletion,
      nextSteps,
    };
  }

  /**
   * Setup event listeners for enhanced functionality
   */
  private setupEventListeners(): void {
    // Listen for workflow progress updates
    onCancellationEvent('analytics.track', data => {
      if (
        isAnalyticsEventData(data) &&
        data.event === 'workflow.completed' &&
        data.properties.workflowId &&
        data.userId
      ) {
        void this.handleWorkflowCompletion(data.userId, data.properties);
      }
    });

    // Listen for job completion to provide progress updates
    onCancellationEvent('analytics.track', data => {
      if (isAnalyticsEventData(data)) {
        const jobType = safeStringAccess(data.properties, 'jobType');
        if (
          data.event === 'job.completed' &&
          jobType?.startsWith('cancellation.') &&
          data.userId
        ) {
          void this.handleJobCompletion(data.userId, data.properties);
        }
      }
    });

    // Enhanced failure handling with automatic retry logic
    onCancellationEvent('cancellation.failed', data => {
      void (async () => {
        if (isRetryEventData(data) && data.userId) {
          if (data.willRetry) {
            await this.handleAutomaticRetry(data as AutoRetryData);
          } else {
            await this.handleFinalFailure(data as unknown as FinalFailureData);
          }
        }
      })();
    });

    console.log(
      '[EventDrivenCancellationService] Event listeners setup complete'
    );
  }

  /**
   * Handle workflow completion events
   */
  private async handleWorkflowCompletion(
    userId: string,
    properties: Record<string, unknown>
  ): Promise<void> {
    try {
      // Send completion notification with workflow summary
      sendRealtimeNotification(userId, {
        type: 'workflow.update',
        title: 'Cancellation Workflow Complete',
        message: `Your cancellation workflow has ${safeStringAccess(properties, 'status') ?? 'completed'}`,
        priority: properties.status === 'completed' ? 'high' : 'normal',
        data: {
          workflowId: properties.workflowId,
          instanceId: properties.instanceId,
          status: properties.status,
          duration: properties.duration,
        },
      });
    } catch (error) {
      console.error(
        '[EventDrivenCancellationService] Error handling workflow completion:',
        error
      );
    }
  }

  /**
   * Handle job completion for progress updates
   */
  private async handleJobCompletion(
    userId: string,
    properties: Record<string, unknown>
  ): Promise<void> {
    try {
      const jobType = safeStringAccess(properties, 'jobType');
      const title = (() => {
        if (!jobType) return 'Processing Complete';
        switch (jobType) {
          case 'cancellation.api':
            return 'API Cancellation Complete';
          case 'cancellation.webhook':
            return 'Webhook Cancellation Complete';
          case 'cancellation.manual_instructions':
            return 'Instructions Generated';
          case 'cancellation.confirm':
            return 'Cancellation Confirmed';
          default:
            return 'Processing Complete';
        }
      })();

      sendRealtimeNotification(userId, {
        type: 'job.status',
        title,
        message: `Step completed in ${safeStringAccess(properties, 'processingTime') ?? 'unknown time'}ms`,
        priority: 'low',
        data: {
          jobId: properties.jobId,
          jobType: properties.jobType,
          processingTime: properties.processingTime,
          attempts: properties.attempts,
        },
      });
    } catch (error) {
      console.error(
        '[EventDrivenCancellationService] Error handling job completion:',
        error
      );
    }
  }

  /**
   * Handle automatic retry with enhanced notifications
   */
  private async handleAutomaticRetry(data: AutoRetryData): Promise<void> {
    try {
      // Send retry notification with context
      sendRealtimeNotification(data.userId, {
        type: 'cancellation.status',
        title: 'Automatic Retry Scheduled',
        message: `We'll retry your cancellation automatically in a few minutes`,
        priority: 'normal',
        data: {
          requestId: data.requestId,
          error: data.error,
          attempt: data.attempt,
          nextRetryAt: data.nextRetryAt,
          autoRetry: true,
        },
      });

      // Log retry scheduling
      await AuditLogger.log({
        userId: data.userId,
        action: 'subscription.cancelled',
        resource: data.requestId,
        result: 'success',
        metadata: {
          attempt: data.attempt,
          nextRetryAt: data.nextRetryAt,
          error: data.error,
        },
      });
    } catch (error) {
      console.error(
        '[EventDrivenCancellationService] Error handling automatic retry:',
        error
      );
    }
  }

  /**
   * Handle final failure with escalation options
   */
  private async handleFinalFailure(data: FinalFailureData): Promise<void> {
    try {
      // Send failure notification with options
      sendRealtimeNotification(data.userId, {
        type: 'cancellation.status',
        title: 'Cancellation Assistance Needed',
        message:
          'We encountered an issue with automatic cancellation. Manual options are available.',
        priority: 'high',
        data: {
          requestId: data.requestId,
          error: data.error,
          finalAttempt: true,
          manualOptionsAvailable: true,
        },
      });

      // Schedule a manual instructions job
      await this.jobQueue.addJob(
        'cancellation.manual_instructions',
        {
          requestId: data.requestId,
          userId: data.userId,
          fallbackReason: data.error,
        },
        {
          priority: 2, // High priority for fallback
          maxAttempts: 2,
        }
      );

      // Log final failure
      await AuditLogger.log({
        userId: data.userId,
        action: 'subscription.cancelled',
        resource: data.requestId,
        result: 'failure',
        error: data.error,
        metadata: {
          finalAttempt: data.attempt,
          fallbackInitiated: true,
        },
      });
    } catch (error) {
      console.error(
        '[EventDrivenCancellationService] Error handling final failure:',
        error
      );
    }
  }

  /**
   * Calculate estimated completion time based on method and priority
   */
  private calculateEstimatedCompletion(priority: string, method: string): Date {
    const now = new Date();
    let estimatedMinutes = 15; // Default 15 minutes

    // Adjust based on method
    switch (method) {
      case 'api':
        estimatedMinutes = 5;
        break;
      case 'webhook':
        estimatedMinutes = 10;
        break;
      case 'manual':
        estimatedMinutes = 30;
        break;
    }

    // Adjust based on priority
    switch (priority) {
      case 'high':
        estimatedMinutes = Math.max(estimatedMinutes * 0.5, 2);
        break;
      case 'low':
        estimatedMinutes = estimatedMinutes * 1.5;
        break;
    }

    now.setMinutes(now.getMinutes() + estimatedMinutes);
    return now;
  }

  /**
   * Determine next steps based on current status
   */
  private determineNextSteps(
    request: CancellationRequestWithSubscription,
    workflowStatus?: WorkflowStatus
  ): string[] {
    const nextSteps: string[] = [];

    switch (request.status) {
      case 'pending':
        nextSteps.push('Validation in progress');
        nextSteps.push('Attempting automatic cancellation');
        break;
      case 'processing':
        if (workflowStatus?.currentStep) {
          nextSteps.push(`Current step: ${workflowStatus.currentStep}`);
        }
        nextSteps.push('Processing cancellation request');
        break;
      case 'completed':
        nextSteps.push('Cancellation completed successfully');
        if (request.effectiveDate && request.effectiveDate > new Date()) {
          nextSteps.push(
            `Effective on: ${request.effectiveDate.toLocaleDateString()}`
          );
        }
        break;
      case 'failed':
        nextSteps.push('Manual cancellation instructions available');
        nextSteps.push('Contact support if needed');
        break;
      default:
        nextSteps.push('Status unknown - contact support');
    }

    return nextSteps;
  }

  /**
   * Get aggregated cancellation analytics
   */
  async getAnalytics(
    userId: string,
    timeframe: 'day' | 'week' | 'month' = 'month'
  ): Promise<{
    summary: EventDrivenAnalyticsSummary;
    trends: EventDrivenTrend[];
    methodEffectiveness: EventDrivenMethodEffectiveness;
  }> {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    // Get summary statistics
    const [total, completed, failed, pending] = await Promise.all([
      this.db.cancellationRequest.count({
        where: { userId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.db.cancellationRequest.count({
        where: {
          userId,
          status: 'completed',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.db.cancellationRequest.count({
        where: {
          userId,
          status: 'failed',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.db.cancellationRequest.count({
        where: {
          userId,
          status: { in: ['pending', 'processing'] },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Get method effectiveness
    const methodStats = await this.db.cancellationRequest.groupBy({
      by: ['method', 'status'],
      where: { userId, createdAt: { gte: startDate, lte: endDate } },
      _count: { method: true },
    });

    // Calculate trends (simplified - you'd want more sophisticated trending)
    const trends = await this.db.cancellationRequest.findMany({
      where: { userId, createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true, status: true, method: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      summary: {
        totalRequests: total,
        completedRequests: completed,
        failedRequests: failed,
        pendingRequests: pending,
        averageCompletionTime: 0, // TODO: Calculate from data
        successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      trends: trends.map(t => {
        const fallbackDate = new Date().toISOString().split('T')[0]!;
        const dateString =
          t.createdAt?.toISOString().split('T')[0] ?? fallbackDate;
        return {
          date: dateString,
          requests: 1,
          completions: t.status === 'completed' ? 1 : 0,
          failures: t.status === 'failed' ? 1 : 0,
        } as EventDrivenTrend;
      }),
      methodEffectiveness: this.processMethodStats(
        methodStats as MethodStatistic[]
      ),
    };
  }

  /**
   * Process method statistics for analytics
   */
  private processMethodStats(
    stats: MethodStatistic[]
  ): EventDrivenMethodEffectiveness {
    const methodData: Record<string, MethodData> = {};

    for (const stat of stats) {
      methodData[stat.method] ??= {
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0,
      };

      methodData[stat.method]!.total += stat._count.method;
      methodData[stat.method]![stat.status as keyof MethodData] +=
        stat._count.method;
    }

    // Transform to EventDrivenMethodEffectiveness format
    const result: EventDrivenMethodEffectiveness = {};
    for (const method in methodData) {
      const data = methodData[method]!;
      result[method] = {
        totalAttempts: data.total,
        successfulAttempts: data.completed,
        failedAttempts: data.failed,
        averageTime: 0, // TODO: Calculate from actual time data
        successRate:
          data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      };
    }

    return result;
  }
}
