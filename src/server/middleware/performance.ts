import { type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import { env } from '@/env.js';

interface PerformanceMetrics {
  procedure: string;
  duration: number;
  timestamp: Date;
  error?: string;
}

// Store recent performance metrics in memory
const recentMetrics: PerformanceMetrics[] = [];
const MAX_METRICS = 1000;

/**
 * TRPC Performance Monitoring Link
 * Tracks API call performance and logs slow queries
 */
export const performanceLink: TRPCLink<any> = () => {
  return ({ next, op }) => {
    return observable(observer => {
      const start = Date.now();

      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          const duration = Date.now() - start;

          // Log error metrics
          const metric: PerformanceMetrics = {
            procedure: op.path,
            duration,
            timestamp: new Date(),
            error: err.message,
          };

          addMetric(metric);

          // Log slow errors
          if (duration > 1000) {
            console.error(
              `[PERF] Slow error: ${op.path} failed after ${duration}ms`,
              err
            );
          }

          observer.error(err);
        },
        complete() {
          const duration = Date.now() - start;

          // Log performance metrics
          const metric: PerformanceMetrics = {
            procedure: op.path,
            duration,
            timestamp: new Date(),
          };

          addMetric(metric);

          // Log slow queries (> 200ms in production, > 500ms in dev)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const nodeEnv: string = env.NODE_ENV;
          const threshold = nodeEnv === 'production' ? 200 : 500;
          if (duration > threshold) {
            console.warn(`[PERF] Slow API call: ${op.path} took ${duration}ms`);
          }

          observer.complete?.();
        },
      });

      return unsubscribe;
    });
  };
};

/**
 * Add metric to recent metrics array
 */
function addMetric(metric: PerformanceMetrics): void {
  recentMetrics.push(metric);

  // Keep only recent metrics
  if (recentMetrics.length > MAX_METRICS) {
    recentMetrics.shift();
  }
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(minutes = 5): {
  totalCalls: number;
  averageDuration: number;
  slowCalls: number;
  errorRate: number;
  byProcedure: Record<
    string,
    {
      count: number;
      averageDuration: number;
      errorCount: number;
    }
  >;
} {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  const relevantMetrics = recentMetrics.filter(m => m.timestamp > cutoff);

  if (relevantMetrics.length === 0) {
    return {
      totalCalls: 0,
      averageDuration: 0,
      slowCalls: 0,
      errorRate: 0,
      byProcedure: {},
    };
  }

  const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
  const errorCount = relevantMetrics.filter(m => m.error).length;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const nodeEnv: string = env.NODE_ENV;
  const slowThreshold = nodeEnv === 'production' ? 200 : 500;
  const slowCalls = relevantMetrics.filter(
    m => m.duration > slowThreshold
  ).length;

  // Group by procedure
  const byProcedure: Record<string, PerformanceMetrics[]> = {};
  for (const metric of relevantMetrics) {
    byProcedure[metric.procedure] ??= [];
    byProcedure[metric.procedure]!.push(metric);
  }

  // Calculate stats by procedure
  const procedureStats: Record<
    string,
    {
      count: number;
      averageDuration: number;
      errorCount: number;
    }
  > = {};

  for (const [procedure, metrics] of Object.entries(byProcedure)) {
    const procDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const procErrors = metrics.filter(m => m.error).length;

    procedureStats[procedure] = {
      count: metrics.length,
      averageDuration: Math.round(procDuration / metrics.length),
      errorCount: procErrors,
    };
  }

  return {
    totalCalls: relevantMetrics.length,
    averageDuration: Math.round(totalDuration / relevantMetrics.length),
    slowCalls,
    errorRate: errorCount / relevantMetrics.length,
    byProcedure: procedureStats,
  };
}

/**
 * Performance monitoring middleware for server-side
 */
export const performanceMiddleware = () => {
  return async (opts: {
    path: string;
    type: string;
    next: () => Promise<unknown>;
    ctx: unknown;
  }) => {
    const start = Date.now();

    try {
      const result = await opts.next();
      const duration = Date.now() - start;

      // Add metric
      addMetric({
        procedure: opts.path,
        duration,
        timestamp: new Date(),
      });

      // Log slow queries
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const nodeEnv: string = env.NODE_ENV;
      const threshold = nodeEnv === 'production' ? 200 : 500;
      if (duration > threshold) {
        console.warn(`[PERF] Slow procedure: ${opts.path} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      // Add error metric
      addMetric({
        procedure: opts.path,
        duration,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Log slow errors
      if (duration > 1000) {
        console.error(
          `[PERF] Slow error: ${opts.path} failed after ${duration}ms`,
          error
        );
      }

      throw error;
    }
  };
};
