import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Get NODE_ENV with fallback to development
const nodeEnv = process.env.NODE_ENV ?? 'development';

// Configure Prisma with optimized connection pool settings
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Graceful shutdown handling
if (nodeEnv === 'production') {
  process.on('beforeExit', () => {
    void db.$disconnect();
  });
}

if (nodeEnv !== 'production') globalForPrisma.prisma = db;
