/**
 * Edge Runtime compatibility helpers
 * Provides fallback values for Node.js APIs that aren't available in Edge Runtime
 */

import type { cpus as OsCpus } from 'os';
import type { join as PathJoin } from 'path';

// Type definitions
interface CpuInfo {
  model: string;
  speed: number;
  times: {
    user: number;
    nice: number;
    sys: number;
    idle: number;
    irq: number;
  };
}

type OsModule = {
  cpus: typeof OsCpus;
  totalmem: () => number;
  freemem: () => number;
  tmpdir: () => string;
};

type PathModule = {
  join: typeof PathJoin;
};

// Check if we're in Edge Runtime
export const isEdgeRuntime =
  typeof (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime !== 'undefined';

// Safe process helpers
export const safeProcess = {
  uptime: () => {
    if (!isEdgeRuntime && typeof process !== 'undefined' && process.uptime) {
      return process.uptime();
    }
    // Return a fixed value in Edge Runtime
    return 3600; // 1 hour
  },

  memoryUsage: () => {
    if (
      !isEdgeRuntime &&
      typeof process !== 'undefined' &&
      process.memoryUsage
    ) {
      return process.memoryUsage();
    }
    // Return mock values in Edge Runtime
    return {
      rss: 100 * 1024 * 1024, // 100MB
      heapTotal: 50 * 1024 * 1024, // 50MB
      heapUsed: 30 * 1024 * 1024, // 30MB
      external: 10 * 1024 * 1024, // 10MB
      arrayBuffers: 5 * 1024 * 1024, // 5MB
    };
  },

  version: () => {
    if (!isEdgeRuntime && typeof process !== 'undefined' && process.version) {
      return process.version;
    }
    return 'Edge Runtime';
  },

  env: new Proxy({} as Record<string, string | undefined>, {
    get: (_target, prop: string) => {
      if (!isEdgeRuntime && typeof process !== 'undefined' && process.env) {
        return process.env[prop];
      }
      // In Edge Runtime, try to access env vars directly
      try {
        // Accessing global env in Edge Runtime
        return (globalThis as Record<string, unknown>)[prop] as
          | string
          | undefined;
      } catch {
        return undefined;
      }
    },
  }),

  cwd: () => {
    if (!isEdgeRuntime && typeof process !== 'undefined' && process.cwd) {
      return process.cwd();
    }
    return '/app'; // Default for Edge Runtime
  },
};

// Safe OS helpers
export const safeOs = {
  cpus: (): CpuInfo[] => {
    if (!isEdgeRuntime && typeof require !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const os = require('os') as OsModule;
        return os.cpus() as CpuInfo[];
      } catch {
        // Fall through to mock
      }
    }
    // Return mock CPU info for Edge Runtime
    return [
      {
        model: 'Edge Runtime CPU',
        speed: 2400,
        times: {
          user: 1000000,
          nice: 0,
          sys: 500000,
          idle: 8500000,
          irq: 0,
        },
      },
      {
        model: 'Edge Runtime CPU',
        speed: 2400,
        times: {
          user: 1000000,
          nice: 0,
          sys: 500000,
          idle: 8500000,
          irq: 0,
        },
      },
      {
        model: 'Edge Runtime CPU',
        speed: 2400,
        times: {
          user: 1000000,
          nice: 0,
          sys: 500000,
          idle: 8500000,
          irq: 0,
        },
      },
      {
        model: 'Edge Runtime CPU',
        speed: 2400,
        times: {
          user: 1000000,
          nice: 0,
          sys: 500000,
          idle: 8500000,
          irq: 0,
        },
      },
    ];
  },

  totalmem: (): number => {
    if (!isEdgeRuntime && typeof require !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const os = require('os') as OsModule;
        return os.totalmem();
      } catch {
        // Fall through to mock
      }
    }
    return 8 * 1024 * 1024 * 1024; // 8GB
  },

  freemem: (): number => {
    if (!isEdgeRuntime && typeof require !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const os = require('os') as OsModule;
        return os.freemem();
      } catch {
        // Fall through to mock
      }
    }
    return 4 * 1024 * 1024 * 1024; // 4GB
  },

  tmpdir: (): string => {
    if (!isEdgeRuntime && typeof require !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const os = require('os') as OsModule;
        return os.tmpdir();
      } catch {
        // Fall through to mock
      }
    }
    return '/tmp';
  },
};

// Safe file system helpers
export const safeReadPackageJson = async (): Promise<{
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  version?: string;
}> => {
  if (!isEdgeRuntime) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const packageJsonPath = path.join(safeProcess.cwd(), 'package.json');
      const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
      return JSON.parse(packageJsonContent) as {
        dependencies: Record<string, string>;
        devDependencies?: Record<string, string>;
        version?: string;
      };
    } catch (error) {
      console.error('Failed to read package.json:', error);
    }
  }

  // Return hardcoded versions for Edge Runtime
  return {
    version: '1.8.8',
    dependencies: {
      next: '^15.0.0',
      react: '^19.0.0',
      '@prisma/client': '^6.0.0',
      '@trpc/server': '^11.0.0',
      typescript: '^5.0.0',
    },
  };
};

// Safe path helpers
export const safePath = {
  join: (...paths: string[]): string => {
    if (!isEdgeRuntime && typeof require !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path') as PathModule;
        return path.join(...paths);
      } catch {
        // Fall through to simple join
      }
    }
    // Simple path join for Edge Runtime
    return paths.join('/').replace(/\/+/g, '/');
  },
};

// Format uptime to human-readable string
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '0m';
}

// Get environment variable with Edge Runtime support
export function getEnvVar(key: string): string | undefined {
  return safeProcess.env[key];
}
