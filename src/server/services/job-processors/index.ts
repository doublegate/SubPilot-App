import type { PrismaClient } from '@prisma/client';
import { getJobQueue, type Job, type JobResult } from '@/server/lib/job-queue';
import { CancellationJobProcessor } from './cancellation-processor';
import { NotificationJobProcessor } from './notification-processor';
import { WebhookJobProcessor } from './webhook-processor';
import { AnalyticsJobProcessor } from './analytics-processor';
import { AuditLogger } from '@/server/lib/audit-logger';

// Advanced Generic Types for Job Processing
type JobProcessor<T = unknown> = (job: Job<T>) => Promise<JobResult>;

// Template Literal Types for Job Type Safety
type JobTypePrefix = 'cancellation' | 'notification' | 'webhook' | 'analytics';
type JobAction = 'validate' | 'process' | 'send' | 'track' | 'aggregate' | 'api' | 'manual_instructions' | 'confirm' | 'update_status' | 'bulk_send' | 'process_data';
type JobType = `${JobTypePrefix}.${JobAction}`;

// Conditional Types for Job Data Validation
type JobDataFor<T extends JobType> = 
  T extends `cancellation.${string}` ? CancellationJobData :
  T extends `notification.${string}` ? NotificationJobData :
  T extends `webhook.${string}` ? WebhookJobData :
  T extends `analytics.${string}` ? AnalyticsJobData :
  Record<string, unknown>;

// Branded Job Types for Type Safety
interface CancellationJobData {
  subscriptionId: string;
  userId: string;
  method?: string;
  reason?: string;
}

interface NotificationJobData {
  userId: string;
  type: string;
  message: string;
  title: string;
}

interface WebhookJobData {
  signature: string;
  payload: Record<string, unknown>;
  source: string;
}

interface AnalyticsJobData {
  userId: string;
  event: string;
  properties: Record<string, unknown>;
}

// Mapped Types for Processor Registry
type ProcessorRegistry = {
  [K in JobType]: JobProcessor<JobDataFor<K>>;
};

/**
 * Central registry for all job processors
 */
export class JobProcessorRegistry {
  private processors = new Map<JobType, JobProcessor>();
  private isStarted = false;

  constructor(private db: PrismaClient) {
    this.setupProcessors();
  }

  /**
   * Setup all job processors
   */
  private setupProcessors(): void {
    const cancellationProcessor = new CancellationJobProcessor(this.db);
    const notificationProcessor = new NotificationJobProcessor(this.db);
    const webhookProcessor = new WebhookJobProcessor(this.db);
    const analyticsProcessor = new AnalyticsJobProcessor(this.db);

    // Register cancellation processors
    this.register('cancellation.validate', job =>
      cancellationProcessor.processCancellationValidation(job)
    );
    this.register('cancellation.api', job =>
      cancellationProcessor.processApiCancellation(job)
    );
    this.register('cancellation.webhook', job =>
      cancellationProcessor.processWebhookCancellation(job)
    );
    this.register('cancellation.manual_instructions', job =>
      cancellationProcessor.processManualInstructions(job)
    );
    this.register('cancellation.confirm', job =>
      cancellationProcessor.processCancellationConfirmation(job)
    );
    this.register('cancellation.update_status', job =>
      cancellationProcessor.processStatusUpdate(job)
    );

    // Register notification processors
    this.register('notification.send', job =>
      notificationProcessor.processNotificationSend(job)
    );
    this.register('notification.bulk_send', job =>
      notificationProcessor.processBulkNotification(job)
    );

    // Register webhook processors
    this.register('webhook.validate', job =>
      webhookProcessor.processWebhookValidation(job)
    );
    this.register('webhook.process_data', job =>
      webhookProcessor.processWebhookData(job)
    );

    // Register analytics processors
    this.register('analytics.track', job =>
      analyticsProcessor.processAnalyticsTracking(job)
    );
    this.register('analytics.aggregate', job =>
      analyticsProcessor.processAnalyticsAggregation(job)
    );

    console.log(
      `[JobProcessorRegistry] Registered ${this.processors.size} job processors`
    );
  }

  /**
   * Register a job processor with type safety
   */
  register<T extends JobType>(
    jobType: T, 
    processor: JobProcessor<JobDataFor<T>>
  ): void {
    this.processors.set(jobType, processor as JobProcessor);
    console.log(`[JobProcessorRegistry] Registered processor for: ${jobType}`);
  }

  /**
   * Start all job processors
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      console.warn('[JobProcessorRegistry] Already started');
      return;
    }

    const jobQueue = getJobQueue();

    // Register all processors with the job queue
    for (const [jobType, processor] of this.processors.entries()) {
      jobQueue.registerProcessor(jobType, async (job: Job) => {
        const startTime = Date.now();

        try {
          console.log(
            `[JobProcessorRegistry] Processing job ${job.id} of type ${jobType}`
          );

          const result = await processor(job);
          const processingTime = Date.now() - startTime;

          // Log successful processing
          await AuditLogger.log({
            userId: job.data?.userId ?? 'system',
            action: 'job.processed',
            resource: job.id,
            result: result.success ? 'success' : 'failure',
            error: result.error,
            metadata: {
              jobType,
              processingTime,
              attempts: job.attempts,
              ...result.data,
            },
          });

          console.log(
            `[JobProcessorRegistry] Job ${job.id} ${result.success ? 'completed' : 'failed'} in ${processingTime}ms`
          );

          return result;
        } catch (error) {
          const processingTime = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          console.error(
            `[JobProcessorRegistry] Error processing job ${job.id}:`,
            error
          );

          // Log processing error
          await AuditLogger.log({
            userId: job.data?.userId ?? 'system',
            action: 'job.error',
            resource: job.id,
            result: 'failure',
            error: errorMessage,
            metadata: {
              jobType,
              processingTime,
              attempts: job.attempts,
              stack: error instanceof Error ? error.stack : undefined,
            },
          });

          return {
            success: false,
            error: errorMessage,
            retry: {
              delay: Math.min(1000 * Math.pow(2, job.attempts), 300000), // Exponential backoff, max 5 minutes
            },
          };
        }
      });
    }

    // Job queue starts automatically in its constructor
    this.isStarted = true;
    console.log('[JobProcessorRegistry] All job processors started');

    // Log startup
    await AuditLogger.log({
      userId: 'system',
      action: 'job_processors.started',
      resource: 'job_processor_registry',
      result: 'success',
      metadata: {
        processorsCount: this.processors.size,
        processors: Array.from(this.processors.keys()),
      },
    });
  }

  /**
   * Stop all job processors
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    const jobQueue = getJobQueue();
    jobQueue.stopProcessing();

    this.isStarted = false;
    console.log('[JobProcessorRegistry] All job processors stopped');

    // Log shutdown
    await AuditLogger.log({
      userId: 'system',
      action: 'job_processors.stopped',
      resource: 'job_processor_registry',
      result: 'success',
      metadata: {
        processorsCount: this.processors.size,
      },
    });
  }

  /**
   * Get processor statistics
   */
  getStats(): {
    registered: number;
    isStarted: boolean;
    processors: string[];
  } {
    return {
      registered: this.processors.size,
      isStarted: this.isStarted,
      processors: Array.from(this.processors.keys()),
    };
  }

  /**
   * Check if a processor is registered for a job type
   */
  hasProcessor(jobType: JobType): boolean {
    return this.processors.has(jobType);
  }

  /**
   * Get all registered job types with type safety
   */
  getJobTypes(): JobType[] {
    return Array.from(this.processors.keys());
  }
}

// Create singleton instance
let registryInstance: JobProcessorRegistry | null = null;

export const getJobProcessorRegistry = (
  db: PrismaClient
): JobProcessorRegistry => {
  registryInstance ??= new JobProcessorRegistry(db);
  return registryInstance;
};

/**
 * Initialize and start all job processors
 */
export const initializeJobProcessors = async (
  db: PrismaClient
): Promise<JobProcessorRegistry> => {
  const registry = getJobProcessorRegistry(db);
  await registry.start();
  return registry;
};

/**
 * Gracefully shutdown all job processors
 */
export const shutdownJobProcessors = async (): Promise<void> => {
  if (registryInstance) {
    await registryInstance.stop();
    registryInstance = null;
  }
};

// Advanced Health Check Types
interface JobProcessorStats {
  registered: number;
  isStarted: boolean;
  processors: JobType[];
}

interface QueueStats {
  pending: number;
  active: number;
  completed: number;
  failed: number;
}

interface HealthCheckResult {
  healthy: boolean;
  stats?: {
    processors: JobProcessorStats;
    queue: QueueStats;
  };
  error?: string;
}

// Health check for job processors with type safety
export const checkJobProcessorHealth = async (): Promise<HealthCheckResult> => {
  try {
    if (!registryInstance) {
      return {
        healthy: false,
        error: 'Job processors not initialized',
      };
    }

    const stats = registryInstance.getStats();
    const jobQueue = getJobQueue();
    const queueStats = jobQueue.getStats();

    return {
      healthy: stats.isStarted,
      stats: {
        processors: stats,
        queue: queueStats,
      },
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
