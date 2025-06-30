import type { PrismaClient } from '@prisma/client';
import {
  initializeJobProcessors,
  shutdownJobProcessors,
} from '@/server/services/job-processors';
import { getWorkflowEngine } from './workflow-engine';
import { getRealtimeNotificationManager } from './realtime-notifications';
import { AuditLogger } from './audit-logger';

/**
 * Startup service to initialize the event-driven cancellation system
 */
export class StartupService {
  public static instance: StartupService | null = null;
  private isInitialized = false;
  private shutdownHandlers: Array<() => Promise<void>> = [];

  private constructor(private db: PrismaClient) {}

  /**
   * Get singleton instance
   */
  static getInstance(db: PrismaClient): StartupService {
    if (!StartupService.instance) {
      StartupService.instance = new StartupService(db);
    }
    return StartupService.instance;
  }

  /**
   * Initialize all event-driven systems
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[StartupService] System already initialized');
      return;
    }

    console.log(
      '[StartupService] Initializing event-driven cancellation system...'
    );

    try {
      // 1. Initialize job processors (this starts the job queue)
      console.log('[StartupService] Starting job processors...');
      const jobProcessorRegistry = await initializeJobProcessors(this.db);
      this.shutdownHandlers.push(() => shutdownJobProcessors());

      // 2. Initialize workflow engine
      console.log('[StartupService] Initializing workflow engine...');
      const workflowEngine = getWorkflowEngine();
      // The workflow engine is already initialized and listening for events

      // 3. Initialize real-time notification manager
      console.log('[StartupService] Initializing real-time notifications...');
      const realtimeManager = getRealtimeNotificationManager();
      // The real-time manager is already initialized and listening for events

      // 4. Setup graceful shutdown handlers
      this.setupGracefulShutdown();

      // 5. Run system health checks
      await this.runInitialHealthChecks();

      this.isInitialized = true;

      // Log successful initialization
      await AuditLogger.log({
        userId: 'system',
        action: 'create' as any,
        resource: 'event_driven_cancellation_system',
        result: 'success',
        metadata: {
          timestamp: new Date(),
          jobProcessors: jobProcessorRegistry.getStats(),
          workflowEngine: workflowEngine.getStats(),
          realtimeManager: (realtimeManager as any).getStats
            ? (realtimeManager as any).getStats()
            : { activeConnections: realtimeManager.getActiveConnections() },
        },
      });

      console.log(
        '[StartupService] ✅ Event-driven cancellation system initialized successfully'
      );
    } catch (error) {
      console.error('[StartupService] ❌ Failed to initialize system:', error);

      // Log initialization failure
      await AuditLogger.log({
        userId: 'system',
        action: 'delete' as any,
        resource: 'event_driven_cancellation_system',
        result: 'failure',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: new Date(),
          error: error instanceof Error ? error.stack : undefined,
        },
      });

      // Attempt cleanup
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Gracefully shutdown the system
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    console.log(
      '[StartupService] Shutting down event-driven cancellation system...'
    );

    try {
      // Run shutdown handlers in reverse order
      for (const handler of this.shutdownHandlers.reverse()) {
        await handler();
      }

      this.isInitialized = false;

      // Log successful shutdown
      await AuditLogger.log({
        userId: 'system',
        action: 'update' as any,
        resource: 'event_driven_cancellation_system',
        result: 'success',
        metadata: {
          timestamp: new Date(),
        },
      });

      console.log('[StartupService] ✅ System shutdown completed');
    } catch (error) {
      console.error('[StartupService] ❌ Error during shutdown:', error);

      await AuditLogger.log({
        userId: 'system',
        action: 'delete' as any,
        resource: 'event_driven_cancellation_system',
        result: 'failure',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Setup graceful shutdown on process signals
   */
  private setupGracefulShutdown(): void {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(
          `[StartupService] Received ${signal}, starting graceful shutdown...`
        );

        try {
          await this.shutdown();
          process.exit(0);
        } catch (error) {
          console.error(
            '[StartupService] Error during graceful shutdown:',
            error
          );
          process.exit(1);
        }
      });
    }

    // Handle uncaught exceptions
    process.on('uncaughtException', async error => {
      console.error('[StartupService] Uncaught exception:', error);

      await AuditLogger.log({
        userId: 'system',
        action: 'delete' as any,
        resource: 'event_driven_cancellation_system',
        result: 'failure',
        error: error.message,
        metadata: {
          stack: error.stack,
          timestamp: new Date(),
        },
      });

      try {
        await this.shutdown();
      } catch (shutdownError) {
        console.error(
          '[StartupService] Error during emergency shutdown:',
          shutdownError
        );
      }

      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('[StartupService] Unhandled promise rejection:', reason);

      await AuditLogger.log({
        userId: 'system',
        action: 'delete' as any,
        resource: 'event_driven_cancellation_system',
        result: 'failure',
        error: reason instanceof Error ? reason.message : String(reason),
        metadata: {
          reason: String(reason),
          promise: String(promise),
          timestamp: new Date(),
        },
      });
    });

    console.log('[StartupService] Graceful shutdown handlers registered');
  }

  /**
   * Run initial health checks
   */
  private async runInitialHealthChecks(): Promise<void> {
    console.log('[StartupService] Running initial health checks...');

    const checks = [
      this.checkDatabaseConnectivity(),
      this.checkJobQueueHealth(),
      this.checkEventBusHealth(),
    ];

    const results = await Promise.allSettled(checks);

    let failedChecks = 0;
    results.forEach((result, index) => {
      const checkNames = ['Database', 'Job Queue', 'Event Bus'];
      const checkName = checkNames[index];

      if (result.status === 'fulfilled') {
        console.log(`[StartupService] ✅ ${checkName} health check passed`);
      } else {
        console.error(
          `[StartupService] ❌ ${checkName} health check failed:`,
          result.reason
        );
        failedChecks++;
      }
    });

    if (failedChecks > 0) {
      throw new Error(`${failedChecks} health check(s) failed`);
    }

    console.log('[StartupService] ✅ All health checks passed');
  }

  /**
   * Check database connectivity
   */
  private async checkDatabaseConnectivity(): Promise<void> {
    try {
      await this.db.$queryRaw`SELECT 1`;
    } catch (error) {
      throw new Error(
        `Database connectivity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check job queue health
   */
  private async checkJobQueueHealth(): Promise<void> {
    try {
      const { checkJobQueueHealth } = await import('./job-queue');
      const health = await checkJobQueueHealth();

      if (health.status === 'degraded') {
        throw new Error(`Job queue health check failed: degraded status`);
      }
    } catch (error) {
      throw new Error(
        `Job queue health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check event bus health
   */
  private async checkEventBusHealth(): Promise<void> {
    try {
      const { cancellationEventBus } = await import('./event-bus');

      // Simple check to ensure event bus is responsive
      let testPassed = false;

      const testListener = () => {
        testPassed = true;
      };

      cancellationEventBus.once('system.health_check', testListener);
      cancellationEventBus.emit('system.health_check', { test: true } as any);

      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!testPassed) {
        throw new Error('Event bus not responsive');
      }
    } catch (error) {
      throw new Error(
        `Event bus health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cleanup resources on failure
   */
  private async cleanup(): Promise<void> {
    console.log('[StartupService] Performing cleanup...');

    try {
      // Run cleanup handlers
      for (const handler of this.shutdownHandlers.reverse()) {
        try {
          await handler();
        } catch (error) {
          console.error('[StartupService] Error in cleanup handler:', error);
        }
      }
    } catch (error) {
      console.error('[StartupService] Error during cleanup:', error);
    }

    this.shutdownHandlers = [];
    this.isInitialized = false;
  }

  /**
   * Get system status
   */
  getStatus(): {
    initialized: boolean;
    uptime?: number;
    shutdownHandlers: number;
  } {
    return {
      initialized: this.isInitialized,
      uptime: this.isInitialized ? process.uptime() : undefined,
      shutdownHandlers: this.shutdownHandlers.length,
    };
  }

  /**
   * Restart the system (useful for development/maintenance)
   */
  async restart(): Promise<void> {
    console.log('[StartupService] Restarting system...');

    if (this.isInitialized) {
      await this.shutdown();
    }

    // Clear instance to allow fresh initialization
    StartupService.instance = null;

    // Wait a moment before restarting
    await new Promise(resolve => setTimeout(resolve, 1000));

    await this.initialize();
  }
}

/**
 * Initialize the event-driven cancellation system
 * Call this in your application startup
 */
export const initializeEventDrivenSystem = async (
  db: PrismaClient
): Promise<StartupService> => {
  const startup = StartupService.getInstance(db);
  await startup.initialize();
  return startup;
};

/**
 * Get the startup service instance
 */
export const getStartupService = (db: PrismaClient): StartupService => {
  return StartupService.getInstance(db);
};

/**
 * Gracefully shutdown the event-driven system
 */
export const shutdownEventDrivenSystem = async (): Promise<void> => {
  if (StartupService.instance) {
    await StartupService.instance.shutdown();
  }
};
