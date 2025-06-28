import { PrismaClient } from '@prisma/client';

import { env } from '~/env.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure Prisma with optimized connection pool settings
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Graceful shutdown handling
if (env.NODE_ENV === 'production') {
  process.on('beforeExit', () => {
    void db.$disconnect();
  });
}

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
