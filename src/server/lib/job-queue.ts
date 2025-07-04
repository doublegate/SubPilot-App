import { emitCancellationEvent } from './event-bus';

/**
 * Mock Job Queue System for Cancellation Processing
 *
 * In a production environment, this would be replaced with a real job queue
 * system like Bull/BullMQ, Agenda, or cloud-based solutions like AWS SQS.
 */

// Define job data types
export interface JobData {
  requestId?: string;
  orchestrationId?: string;
  userId?: string;
  subscriptionId?: string;
  method?: 'api' | 'automation' | 'manual';
  [key: string]: unknown;
}

export interface JobOptions {
  delay?: number;
  priority?: number;
  maxAttempts?: number;
  backoff?: 'exponential' | 'fixed';
  timeout?: number;
}

export interface Job<T = JobData> {
  id: string;
  type: string;
  data: T;
  options: JobOptions;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'delayed';
  attempts: number;
  createdAt: Date;
  processingStartedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface JobResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  duration?: number;
  retry?: boolean | { delay?: number; attempts?: number };
}

/**
 * Mock Job Queue Implementation
 */
class MockJobQueue {
  private jobs = new Map<string, Job>();
  private processors = new Map<string, (job: Job) => Promise<JobResult>>();
  public isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    this.startProcessing();
  }

  /**
   * Add a job to the queue
   */
  async addJob<T = JobData>(
    type: string,
    data: T,
    options: JobOptions = {}
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: Job<T> = {
      id: jobId,
      type,
      data,
      options: {
        delay: 0,
        priority: 0,
        maxAttempts: 3,
        backoff: 'exponential',
        timeout: 30000, // 30 seconds
        ...options,
      },
      status: options.delay && options.delay > 0 ? 'delayed' : 'pending',
      attempts: 0,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // If job is delayed, schedule it
    if (options.delay && options.delay > 0) {
      setTimeout(() => {
        const delayedJob = this.jobs.get(jobId);
        if (delayedJob && delayedJob.status === 'delayed') {
          delayedJob.status = 'pending';
        }
      }, options.delay);
    }

    // Emit job created event
    emitCancellationEvent('job.created', {
      jobId,
      type,
      priority: job.options.priority,
    });

    console.log(`[JobQueue] Added job ${jobId} of type ${type}`);
    return jobId;
  }

  /**
   * Register a job processor
   */
  registerProcessor<T = JobData>(
    type: string,
    processor: (job: Job<T>) => Promise<JobResult>
  ): void {
    this.processors.set(type, processor as (job: Job) => Promise<JobResult>);
    console.log(`[JobQueue] Registered processor for job type: ${type}`);
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: Job['status']): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  /**
   * Get jobs by type
   */
  getJobsByType(type: string): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.type === type);
  }

  /**
   * Start processing jobs
   */
  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      void this.processNextJob();
    }, 1000); // Check for jobs every second

    console.log('[JobQueue] Started job processing');
  }

  /**
   * Stop processing jobs
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.isProcessing = false;
    console.log('[JobQueue] Stopped job processing');
  }

  /**
   * Process the next pending job
   */
  private async processNextJob(): Promise<void> {
    // Get next pending job (highest priority first)
    const pendingJobs = this.getJobsByStatus('pending').sort(
      (a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0)
    );

    if (pendingJobs.length === 0) return;

    const job = pendingJobs[0];
    if (!job) return;
    const processor = this.processors.get(job.type);

    if (!processor) {
      console.warn(`[JobQueue] No processor found for job type: ${job.type}`);
      return;
    }

    // Update job status
    job.status = 'processing';
    job.processingStartedAt = new Date();
    job.attempts++;

    // Emit job started event
    emitCancellationEvent('job.started', {
      jobId: job.id,
      type: job.type,
      attempt: job.attempts,
    });

    console.log(
      `[JobQueue] Processing job ${job.id} (attempt ${job.attempts})`
    );

    try {
      // Set timeout for job processing
      const timeoutPromise = new Promise<JobResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Job timeout after ${job.options.timeout}ms`));
        }, job.options.timeout);
      });

      // Process job with timeout
      const result = await Promise.race([processor(job), timeoutPromise]);

      if (result.success) {
        // Job completed successfully
        job.status = 'completed';
        job.completedAt = new Date();

        emitCancellationEvent('job.completed', {
          jobId: job.id,
          type: job.type,
          result: result.data,
          duration:
            job.completedAt.getTime() - job.processingStartedAt.getTime(),
          attempts: job.attempts,
        });

        console.log(`[JobQueue] Job ${job.id} completed successfully`);
      } else {
        throw new Error(result.error ?? 'Job failed without error message');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      job.error = errorMessage;

      // Check if we should retry
      if (job.attempts < (job.options.maxAttempts ?? 3)) {
        // Schedule retry
        job.status = 'pending';

        // Calculate backoff delay
        const backoffDelay = this.calculateBackoffDelay(job);
        if (backoffDelay > 0) {
          job.status = 'delayed';
          setTimeout(() => {
            if (job.status === 'delayed') {
              job.status = 'pending';
            }
          }, backoffDelay);
        }

        emitCancellationEvent('job.retry_scheduled', {
          jobId: job.id,
          type: job.type,
          attempt: job.attempts,
          nextAttempt: job.attempts + 1,
          backoffDelay,
          error: errorMessage,
        });

        console.log(
          `[JobQueue] Job ${job.id} failed, scheduling retry (attempt ${job.attempts + 1})`
        );
      } else {
        // Max attempts reached, mark as failed
        job.status = 'failed';
        job.completedAt = new Date();

        emitCancellationEvent('job.failed', {
          jobId: job.id,
          type: job.type,
          error: errorMessage,
          attempts: job.attempts,
          finalFailure: true,
        });

        console.error(
          `[JobQueue] Job ${job.id} failed permanently after ${job.attempts} attempts:`,
          errorMessage
        );
      }
    }
  }

  /**
   * Calculate backoff delay for retries
   */
  private calculateBackoffDelay(job: Job): number {
    const baseDelay = 1000; // 1 second
    const attempt = job.attempts;

    switch (job.options.backoff) {
      case 'exponential':
        return baseDelay * Math.pow(2, attempt - 1);
      case 'fixed':
      default:
        return baseDelay;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    delayed: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      delayed: jobs.filter(j => j.status === 'delayed').length,
    };
  }

  /**
   * Clear completed and failed jobs older than specified time
   */
  cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = new Date(Date.now() - olderThanMs);
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        job.completedAt < cutoff
      ) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[JobQueue] Cleaned up ${cleaned} old jobs`);
    }

    return cleaned;
  }

  /**
   * Remove a specific job
   */
  removeJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status !== 'processing') {
      this.jobs.delete(jobId);
      console.log(`[JobQueue] Removed job ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all jobs
   */
  clear(): void {
    const processing = this.getJobsByStatus('processing');
    if (processing.length > 0) {
      console.warn(
        `[JobQueue] Cannot clear queue with ${processing.length} jobs still processing`
      );
      return;
    }

    this.jobs.clear();
    console.log('[JobQueue] Cleared all jobs');
  }
}

// Global job queue instance
let jobQueue: MockJobQueue | null = null;

/**
 * Get the global job queue instance
 */
export function getJobQueue(): MockJobQueue {
  if (!jobQueue) {
    jobQueue = new MockJobQueue();

    // Register default cancellation job processors
    registerDefaultProcessors(jobQueue);
  }
  return jobQueue;
}

/**
 * Register default job processors for cancellation workflows
 */
function registerDefaultProcessors(queue: MockJobQueue): void {
  // Validation job processor
  queue.registerProcessor('cancellation.validate', async job => {
    console.log(`[JobProcessor] Validating cancellation request:`, job.data);

    // Simulate validation logic
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      data: {
        validated: true,
        subscriptionId: job.data.subscriptionId,
      },
    };
  });

  // API cancellation processor
  queue.registerProcessor('cancellation.api', async job => {
    console.log(`[JobProcessor] Processing API cancellation:`, job.data);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate 80% success rate
    const success = Math.random() > 0.2;

    if (success) {
      return {
        success: true,
        data: {
          confirmationCode: `API-${Date.now().toString().slice(-6)}`,
          effectiveDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        },
      };
    } else {
      return {
        success: false,
        error: 'API cancellation failed - provider error',
      };
    }
  });

  // Manual instructions generator
  queue.registerProcessor('cancellation.manual_instructions', async job => {
    console.log(`[JobProcessor] Generating manual instructions:`, job.data);

    // Simulate instruction generation
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      data: {
        instructions: {
          steps: [
            'Log into your account',
            'Navigate to subscription settings',
            'Click cancel subscription',
            'Confirm cancellation',
          ],
          estimatedTime: 10,
          difficulty: 'medium',
        },
      },
    };
  });

  // Scheduled cancellation starter
  queue.registerProcessor('cancellation.scheduled_start', async job => {
    console.log(`[JobProcessor] Starting scheduled cancellation:`, job.data);

    // Emit event to start the actual cancellation process
    emitCancellationEvent('cancellation.scheduled_triggered', {
      requestId: job.data.requestId,
      originalScheduleTime: job.data.originalScheduleTime,
    });

    return {
      success: true,
      data: {
        triggered: true,
        requestId: job.data.requestId,
      },
    };
  });

  console.log('[JobQueue] Registered default cancellation processors');
}

/**
 * Cleanup job queue periodically
 */
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const queue = getJobQueue();
      queue.cleanup();
    },
    60 * 60 * 1000
  ); // Cleanup every hour
}

/**
 * Check job queue health status
 */
export function checkJobQueueHealth() {
  const queue = getJobQueue();
  const stats = queue.getStats();

  const isHealthy = stats.failed <= stats.completed * 0.1;

  return {
    healthy: isHealthy,
    status: isHealthy ? 'healthy' : 'degraded',
    stats,
    isProcessing: queue.isProcessing,
    lastProcessed: new Date(),
  };
}
