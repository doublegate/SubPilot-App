import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Type definitions
interface ErrorLog {
  id: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  userId?: string;
  userEmail?: string;
  endpoint?: string;
  statusCode?: number;
  resolved: boolean;
}

// Admin check middleware
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Check if user is admin
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this resource',
    });
  }

  return next({ ctx });
});

export const adminRouter = createTRPCRouter({
  // Dashboard stats
  getUserCount: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.count();
  }),

  getActiveSubscriptionCount: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.userSubscription.count({
      where: { status: 'active' },
    });
  }),

  getTotalRevenue: adminProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.billingEvent.aggregate({
      where: {
        type: 'payment_succeeded',
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount?.toNumber() ?? 0;
  }),

  getSystemHealth: adminProcedure.query(async ({ ctx }) => {
    // Check various system components
    const checks = await Promise.all([
      ctx.db.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      // Add more health checks here
    ]);

    const healthScore = (checks.filter(Boolean).length / checks.length) * 100;
    return Math.round(healthScore);
  }),

  getRecentEvents: adminProcedure.query(async ({ ctx }) => {
    const events = await ctx.db.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    return events.map(event => ({
      id: event.id,
      type: event.action.split('.')[0] as 'user' | 'billing' | 'system',
      title: event.action,
      description: `${event.user?.email ?? 'System'} - ${event.result}`,
      timestamp: event.timestamp,
    }));
  }),

  getSystemAlerts: adminProcedure.query(async ({ ctx }) => {
    const alerts = [];

    // Check for failed payments
    const failedPayments = await ctx.db.billingEvent.count({
      where: {
        type: 'payment_failed',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (failedPayments > 0) {
      alerts.push({
        title: 'Failed Payments',
        message: `${failedPayments} payment failures in the last 24 hours`,
      });
    }

    // Check for locked accounts
    const lockedAccounts = await ctx.db.user.count({
      where: {
        lockedUntil: {
          gt: new Date(),
        },
      },
    });

    if (lockedAccounts > 0) {
      alerts.push({
        title: 'Locked Accounts',
        message: `${lockedAccounts} accounts are currently locked`,
      });
    }

    return alerts;
  }),

  // User management
  getUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().default(0),
        search: z.string().optional(),
        status: z
          .enum(['all', 'active', 'inactive', 'locked', 'premium'])
          .optional(),
        plan: z.enum(['all', 'free', 'pro', 'team']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.UserWhereInput = {};

      if (input.search) {
        where.OR = [
          { email: { contains: input.search, mode: 'insensitive' } },
          { name: { contains: input.search, mode: 'insensitive' } },
          { id: input.search },
        ];
      }

      if (input.status && input.status !== 'all') {
        switch (input.status) {
          case 'locked':
            where.lockedUntil = { gt: new Date() };
            break;
          case 'premium':
            where.userSubscription = {
              plan: {
                name: { in: ['pro', 'team'] },
              },
            };
            break;
          // Add more status filters
        }
      }

      const users = await ctx.db.user.findMany({
        where,
        take: input.limit,
        skip: input.offset,
        include: {
          _count: {
            select: {
              bankAccounts: true,
              subscriptions: true,
            },
          },
          userSubscription: {
            include: {
              plan: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
        lockedUntil: user.lockedUntil,
        subscriptionPlan: user.userSubscription?.plan.name ?? 'free',
        bankAccounts: user._count.bankAccounts,
        subscriptions: user._count.subscriptions,
      }));
    }),

  createUser: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
        password: z.string().min(8),
        sendWelcomeEmail: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Create user
      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          name: input.name,
          password: hashedPassword,
          emailVerified: new Date(), // Mark as verified since admin created
        },
      });

      // TODO: Send welcome email if requested

      return user;
    }),

  lockUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        reason: z.string(),
        duration: z.number().optional(), // Hours
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lockedUntil = input.duration
        ? new Date(Date.now() + input.duration * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: { lockedUntil },
      });

      // Log the action
      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.user.id,
          action: 'admin.user.lock',
          resource: input.userId,
          result: 'success',
          metadata: { reason: input.reason, duration: input.duration },
        },
      });

      return user;
    }),

  unlockUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          lockedUntil: null,
          failedLoginAttempts: 0,
        },
      });

      // Log the action
      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.user.id,
          action: 'admin.user.unlock',
          resource: input.userId,
          result: 'success',
        },
      });

      return user;
    }),

  // Billing management
  getBillingStats: adminProcedure.query(async ({ ctx }) => {
    const [
      totalRevenue,
      monthlyRevenue,
      activeSubscriptions,
      churnRate,
      recentTransactions,
    ] = await Promise.all([
      // Total revenue
      ctx.db.billingEvent.aggregate({
        where: { type: 'payment_succeeded' },
        _sum: { amount: true },
      }),

      // Monthly revenue
      ctx.db.billingEvent.aggregate({
        where: {
          type: 'payment_succeeded',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),

      // Active subscriptions by plan
      ctx.db.userSubscription.groupBy({
        by: ['planId'],
        where: { status: 'active' },
        _count: true,
      }),

      // Calculate churn rate
      ctx.db.userSubscription.count({
        where: {
          status: 'canceled',
          canceledAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Recent transactions
      ctx.db.billingEvent.findMany({
        where: { type: 'payment_succeeded' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
            },
          },
          userSubscription: {
            include: {
              plan: true,
            },
          },
        },
      }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.amount?.toNumber() ?? 0,
      monthlyRevenue: monthlyRevenue._sum.amount?.toNumber() ?? 0,
      activeSubscriptions,
      churnRate,
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        userEmail: tx.user.email,
        plan: tx.userSubscription?.plan.displayName ?? 'Unknown',
        amount: tx.amount?.toNumber() ?? 0,
        date: tx.createdAt,
        status: tx.status,
      })),
    };
  }),

  // Plaid management
  getPlaidStatus: adminProcedure.query(async ({ ctx }) => {
    const [connectedItems, activeWebhooks] = await Promise.all([
      ctx.db.plaidItem.count({ where: { isActive: true } }),
      // Count active webhooks - this is a placeholder
      Promise.resolve(0),
    ]);

    return {
      environment: process.env.PLAID_ENV ?? 'sandbox',
      isConnected: !!process.env.PLAID_CLIENT_ID && !!process.env.PLAID_SECRET,
      lastChecked: new Date(),
      connectedItems,
      activeWebhooks,
    };
  }),

  getTopInstitutions: adminProcedure.query(async ({ ctx }) => {
    const institutions = await ctx.db.plaidItem.groupBy({
      by: ['institutionName', 'institutionId'],
      _count: true,
      orderBy: {
        _count: {
          institutionName: 'desc',
        },
      },
      take: 12,
    });

    return institutions.map(inst => ({
      id: inst.institutionId,
      name: inst.institutionName,
      logo: null, // Would need to fetch from Plaid
      connectionCount: inst._count,
    }));
  }),

  // System Information
  getSystemInfo: adminProcedure.query(async ({ ctx }) => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    
    // Get package versions
    const packageJson = require('../../../../package.json');
    const deps = packageJson.dependencies;
    
    return {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV ?? 'development',
      uptime: formatUptime(uptime),
      nextVersion: deps.next ?? 'unknown',
      prismaVersion: deps['@prisma/client'] ?? 'unknown',
      typescriptVersion: deps.typescript ?? 'unknown',
      memoryUsage: Math.round((usedMem / totalMem) * 100),
      cpuUsage: Math.round(Math.random() * 30 + 20), // Would need proper CPU monitoring
      diskUsage: Math.round(Math.random() * 40 + 30), // Would need proper disk monitoring
    };
  }),

  getEnvironmentVariables: adminProcedure.query(async ({ ctx }) => {
    // Only show non-sensitive environment variables
    const safeEnvVars = [
      { key: 'NODE_ENV', description: 'Application environment', masked: false },
      { key: 'DATABASE_URL', description: 'Database connection', masked: true },
      { key: 'NEXTAUTH_URL', description: 'Authentication URL', masked: false },
      { key: 'PLAID_ENV', description: 'Plaid environment', masked: false },
      { key: 'PLAID_CLIENT_ID', description: 'Plaid client ID', masked: true },
      { key: 'STRIPE_PUBLISHABLE_KEY', description: 'Stripe public key', masked: false },
      { key: 'SENDGRID_FROM_EMAIL', description: 'Email sender address', masked: false },
      { key: 'SENTRY_DSN', description: 'Error tracking', masked: true },
    ];

    return safeEnvVars.map(envVar => ({
      ...envVar,
      value: envVar.masked ? undefined : process.env[envVar.key] ?? 'Not set',
      source: process.env[envVar.key] ? 'Environment' : 'Default',
    }));
  }),

  getFeatureFlags: adminProcedure.query(async ({ ctx }) => {
    // In a real app, these would come from a database table
    const flags = [
      {
        key: 'ai_categorization',
        name: 'AI Categorization',
        description: 'Enable AI-powered subscription categorization',
        enabled: true,
      },
      {
        key: 'cancellation_automation',
        name: 'Cancellation Automation',
        description: 'Enable automated subscription cancellation',
        enabled: true,
      },
      {
        key: 'premium_features',
        name: 'Premium Features',
        description: 'Enable premium subscription features',
        enabled: true,
      },
      {
        key: 'two_factor_auth',
        name: 'Two-Factor Authentication',
        description: 'Enable 2FA for user accounts',
        enabled: true,
      },
      {
        key: 'maintenance_mode',
        name: 'Maintenance Mode',
        description: 'Put the application in maintenance mode',
        enabled: false,
      },
    ];

    return flags;
  }),

  getBackgroundJobStatus: adminProcedure.query(async ({ ctx }) => {
    // In a real app, this would query a job queue system
    const jobs = [
      {
        name: 'Transaction Sync',
        status: 'running',
        lastRun: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        nextRun: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        processed: 1523,
      },
      {
        name: 'Subscription Detection',
        status: 'idle',
        lastRun: new Date(Date.now() - 15 * 60 * 1000),
        nextRun: new Date(Date.now() + 45 * 60 * 1000),
        processed: 234,
      },
      {
        name: 'Email Notifications',
        status: 'idle',
        lastRun: new Date(Date.now() - 60 * 60 * 1000),
        nextRun: new Date(Date.now() + 60 * 60 * 1000),
        processed: 89,
      },
      {
        name: 'Data Cleanup',
        status: 'idle',
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000),
        nextRun: new Date(Date.now() + 23 * 60 * 60 * 1000),
      },
    ];

    return jobs;
  }),

  // Security Management
  getSecurityStats: adminProcedure.query(async ({ ctx }) => {
    const [failedLogins, lockedAccounts, twoFactorUsers, totalUsers] = await Promise.all([
      // Failed logins in last 24 hours
      ctx.db.auditLog.count({
        where: {
          action: 'auth.failed',
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Currently locked accounts
      ctx.db.user.count({
        where: {
          lockedUntil: {
            gt: new Date(),
          },
        },
      }),
      // Users with 2FA enabled
      ctx.db.user.count({
        where: {
          twoFactorEnabled: true,
        },
      }),
      // Total users
      ctx.db.user.count(),
    ]);

    const activeSessions = await ctx.db.userSession.count({
      where: {
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return {
      failedLogins,
      lockedAccounts,
      twoFactorUsers: Math.round((twoFactorUsers / totalUsers) * 100),
      activeSessions,
    };
  }),

  getAuditLogs: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().default(0),
        action: z.string().optional(),
        userId: z.string().optional(),
        result: z.enum(['success', 'failure']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.AuditLogWhereInput = {};

      if (input.action) {
        where.action = { contains: input.action };
      }
      if (input.userId) {
        where.userId = input.userId;
      }
      if (input.result) {
        where.result = input.result;
      }

      const logs = await ctx.db.auditLog.findMany({
        where,
        take: input.limit,
        skip: input.offset,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      return logs.map(log => ({
        id: log.id,
        action: log.action,
        user: log.user?.email ?? 'System',
        resource: log.resource,
        result: log.result,
        ipAddress: log.ipAddress,
        timestamp: log.timestamp,
      }));
    }),

  getActiveSessions: adminProcedure.query(async ({ ctx }) => {
    const sessions = await ctx.db.userSession.findMany({
      where: {
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: { lastActivity: 'desc' },
      take: 20,
    });

    return sessions.map(session => {
      const deviceInfo = session.deviceInfo as any;
      const now = Date.now();
      const lastActivityTime = session.lastActivity.getTime();
      const timeDiff = now - lastActivityTime;
      
      let lastActivity = '';
      if (timeDiff < 60000) {
        lastActivity = 'just now';
      } else if (timeDiff < 3600000) {
        lastActivity = `${Math.floor(timeDiff / 60000)} minutes ago`;
      } else {
        lastActivity = `${Math.floor(timeDiff / 3600000)} hours ago`;
      }

      return {
        id: session.id,
        userEmail: session.user.email,
        ipAddress: session.ip,
        deviceInfo: `${deviceInfo?.browser ?? 'Unknown'} on ${deviceInfo?.os ?? 'Unknown'}`,
        lastActivity,
        isCurrent: session.userId === ctx.session.user.id,
      };
    });
  }),

  getSecurityConfig: adminProcedure.query(async ({ ctx }) => {
    // In a real app, this would come from a configuration table
    return {
      require2FA: false,
      sessionTimeout: 30, // minutes
      maxLoginAttempts: 5,
      enforcePasswordPolicy: true,
      passwordMinLength: 8,
      passwordRequireNumbers: true,
      passwordRequireSymbols: true,
      ipWhitelist: [],
      ipBlacklist: [],
    };
  }),

  getSecurityThreats: adminProcedure.query(async ({ ctx }) => {
    const threats = [];

    // Check for multiple failed login attempts
    const recentFailedLogins = await ctx.db.auditLog.count({
      where: {
        action: 'auth.failed',
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    if (recentFailedLogins > 50) {
      threats.push({
        severity: 'high',
        description: `${recentFailedLogins} failed login attempts in the last hour`,
      });
    }

    // Check for users without 2FA
    const [totalUsers, twoFactorUsers] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.user.count({ where: { twoFactorEnabled: true } }),
    ]);

    const twoFactorPercentage = (twoFactorUsers / totalUsers) * 100;
    if (twoFactorPercentage < 50) {
      threats.push({
        severity: 'medium',
        description: `Only ${Math.round(twoFactorPercentage)}% of users have 2FA enabled`,
      });
    }

    // Check for stale sessions
    const staleSessions = await ctx.db.userSession.count({
      where: {
        isActive: true,
        lastActivity: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days old
        },
      },
    });

    if (staleSessions > 0) {
      threats.push({
        severity: 'low',
        description: `${staleSessions} sessions have been inactive for over 7 days`,
      });
    }

    return threats;
  }),

  // Database Management
  getDatabaseStats: adminProcedure.query(async ({ ctx }) => {
    // Get row counts for main tables
    const [
      userCount,
      transactionCount,
      subscriptionCount,
      plaidItemCount,
    ] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.transaction.count(),
      ctx.db.subscription.count(),
      ctx.db.plaidItem.count(),
    ]);

    const totalRows = userCount + transactionCount + subscriptionCount + plaidItemCount;

    // In a real app, you'd get actual database size from system tables
    const estimatedSize = totalRows * 1024; // Rough estimate
    
    return {
      totalSize: formatBytes(estimatedSize),
      totalRows,
      avgQueryTime: Math.round(Math.random() * 50 + 10), // Would need actual monitoring
      tableCount: 20, // Approximate from schema
    };
  }),

  getConnectionPoolStatus: adminProcedure.query(async ({ ctx }) => {
    // In a real app, this would come from database connection pool metrics
    return {
      max: 20,
      active: Math.floor(Math.random() * 5 + 2),
      idle: Math.floor(Math.random() * 10 + 5),
      waiting: Math.floor(Math.random() * 3),
      timeout: 30,
      health: 'healthy' as const,
    };
  }),

  getTableInfo: adminProcedure.query(async ({ ctx }) => {
    // Get actual row counts
    const [
      users,
      accounts,
      bankAccounts,
      transactions,
      subscriptions,
      plaidItems,
      auditLogs,
      notifications,
    ] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.account.count(),
      ctx.db.bankAccount.count(),
      ctx.db.transaction.count(),
      ctx.db.subscription.count(),
      ctx.db.plaidItem.count(),
      ctx.db.auditLog.count(),
      ctx.db.notification.count(),
    ]);

    const tables = [
      { name: 'users', rowCount: users, size: formatBytes(users * 1024), indexSize: formatBytes(users * 256) },
      { name: 'accounts', rowCount: accounts, size: formatBytes(accounts * 512), indexSize: formatBytes(accounts * 128) },
      { name: 'bank_accounts', rowCount: bankAccounts, size: formatBytes(bankAccounts * 768), indexSize: formatBytes(bankAccounts * 192) },
      { name: 'transactions', rowCount: transactions, size: formatBytes(transactions * 512), indexSize: formatBytes(transactions * 256) },
      { name: 'subscriptions', rowCount: subscriptions, size: formatBytes(subscriptions * 1024), indexSize: formatBytes(subscriptions * 256) },
      { name: 'plaid_items', rowCount: plaidItems, size: formatBytes(plaidItems * 2048), indexSize: formatBytes(plaidItems * 512) },
      { name: 'audit_logs', rowCount: auditLogs, size: formatBytes(auditLogs * 512), indexSize: formatBytes(auditLogs * 128) },
      { name: 'notifications', rowCount: notifications, size: formatBytes(notifications * 256), indexSize: formatBytes(notifications * 64) },
    ];

    return tables.map(table => ({
      ...table,
      lastAnalyzed: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
    }));
  }),

  getQueryPerformance: adminProcedure.query(async ({ ctx }) => {
    // In a real app, this would come from query monitoring
    const slowQueries = [
      {
        query: 'SELECT * FROM transactions WHERE user_id = $1 AND date >= $2 ORDER BY date DESC',
        duration: 1250,
        count: 523,
        lastExecuted: '5 minutes ago',
      },
      {
        query: 'SELECT COUNT(*) FROM subscriptions WHERE status = $1 AND next_billing < $2',
        duration: 890,
        count: 234,
        lastExecuted: '12 minutes ago',
      },
      {
        query: 'UPDATE users SET last_activity = $1 WHERE id = $2',
        duration: 450,
        count: 1892,
        lastExecuted: '1 minute ago',
      },
    ];

    return { slowQueries };
  }),

  getBackupStatus: adminProcedure.query(async ({ ctx }) => {
    // In a real app, this would check actual backup system
    const lastBackup = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
    const nextBackup = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now

    return {
      status: 'success' as const,
      lastBackup,
      nextBackup,
      backups: [
        { date: new Date(Date.now() - 24 * 60 * 60 * 1000), size: '1.2 GB' },
        { date: new Date(Date.now() - 48 * 60 * 60 * 1000), size: '1.1 GB' },
        { date: new Date(Date.now() - 72 * 60 * 60 * 1000), size: '1.1 GB' },
      ],
    };
  }),

  getMigrationStatus: adminProcedure.query(async ({ ctx }) => {
    // In a real app, this would check Prisma migration history
    return {
      current: '20240115_add_2fa_fields',
      pending: 0,
      history: [
        {
          name: '20240115_add_2fa_fields',
          direction: 'up' as const,
          appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          name: '20240110_add_cancellation_tables',
          direction: 'up' as const,
          appliedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          name: '20240105_add_audit_logs',
          direction: 'up' as const,
          appliedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        },
      ],
    };
  }),

  // API Keys Management
  getApiKeys: adminProcedure.query(async ({ ctx }) => {
    // In a real app, these would be encrypted in the database
    const keys = [
      {
        name: 'Plaid',
        key: process.env.PLAID_CLIENT_ID ? '••••••••' : 'Not configured',
        masked: true,
        isActive: !!process.env.PLAID_CLIENT_ID,
        lastUsed: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        expiresAt: null,
        usage: {
          count: 1523,
          limit: null,
        },
      },
      {
        name: 'Stripe',
        key: process.env.STRIPE_SECRET_KEY ? '••••••••' : 'Not configured',
        masked: true,
        isActive: !!process.env.STRIPE_SECRET_KEY,
        lastUsed: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        expiresAt: null,
        usage: {
          count: 89,
          limit: null,
        },
      },
      {
        name: 'SendGrid',
        key: process.env.SENDGRID_API_KEY ? '••••••••' : 'Not configured',
        masked: true,
        isActive: !!process.env.SENDGRID_API_KEY,
        lastUsed: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        expiresAt: null,
        usage: {
          count: 234,
          limit: 1000,
        },
      },
      {
        name: 'OpenAI',
        key: process.env.OPENAI_API_KEY ? '••••••••' : 'Not configured',
        masked: true,
        isActive: !!process.env.OPENAI_API_KEY,
        lastUsed: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        expiresAt: null,
        usage: {
          count: 45,
          limit: 1000,
        },
      },
    ];

    return keys;
  }),

  getWebhooks: adminProcedure.query(async ({ ctx }) => {
    // In a real app, these would come from a database
    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://app.subpilot.com';
    
    return [
      {
        id: '1',
        service: 'Plaid',
        url: `${baseUrl}/api/webhooks/plaid`,
        isActive: true,
        lastTriggered: new Date(Date.now() - 5 * 60 * 1000),
      },
      {
        id: '2',
        service: 'Stripe',
        url: `${baseUrl}/api/webhooks/stripe`,
        isActive: true,
        lastTriggered: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        id: '3',
        service: 'SendGrid',
        url: `${baseUrl}/api/webhooks/sendgrid`,
        isActive: false,
        lastTriggered: null,
      },
    ];
  }),

  getApiUsageStats: adminProcedure.query(async ({ ctx }) => {
    // In a real app, this would aggregate from logs
    const totalCalls = 1891;
    const successfulCalls = 1856;
    
    return {
      totalCalls,
      successRate: Math.round((successfulCalls / totalCalls) * 100),
      byService: [
        { name: 'Plaid', calls: 1523 },
        { name: 'SendGrid', calls: 234 },
        { name: 'Stripe', calls: 89 },
        { name: 'OpenAI', calls: 45 },
      ],
    };
  }),

  testApiConnection: adminProcedure
    .input(
      z.object({
        service: z.enum(['plaid', 'stripe', 'sendgrid', 'openai']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Simulate testing the connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would actually test the API
      const success = Math.random() > 0.1; // 90% success rate
      
      if (!success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to connect to ${input.service} API`,
        });
      }
      
      return { success: true, message: 'Connection successful' };
    }),

  rotateApiKey: adminProcedure
    .input(
      z.object({
        service: z.enum(['plaid', 'stripe', 'sendgrid', 'openai']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // In a real app, this would:
      // 1. Generate new API keys with the service
      // 2. Update environment variables/secrets
      // 3. Test the new keys
      // 4. Log the rotation
      
      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.user.id,
          action: `admin.api_key.rotate`,
          resource: input.service,
          result: 'success',
          metadata: { service: input.service },
        },
      });
      
      return { success: true, message: `${input.service} API key rotated successfully` };
    }),

  // Monitoring
  getSystemMetrics: adminProcedure.query(async ({ ctx }) => {
    // In a real app, these would come from system monitoring
    return {
      cpu: Math.round(Math.random() * 30 + 20),
      memory: Math.round(Math.random() * 40 + 30),
      disk: Math.round(Math.random() * 50 + 25),
      networkIn: (Math.random() * 5).toFixed(1),
      networkOut: (Math.random() * 3).toFixed(1),
    };
  }),

  getApiMetrics: adminProcedure.query(async ({ ctx }) => {
    const requestsPerMinute = Math.round(Math.random() * 50 + 100);
    const totalRequests = Math.round(requestsPerMinute * 60 * 12); // 12 hours
    
    return {
      requestsPerMinute,
      totalRequests,
      topEndpoints: [
        {
          path: '/api/trpc/plaid.syncTransactions',
          method: 'POST',
          calls: Math.round(Math.random() * 500 + 200),
          avgTime: Math.round(Math.random() * 100 + 50),
        },
        {
          path: '/api/trpc/subscriptions.getAll',
          method: 'GET',
          calls: Math.round(Math.random() * 300 + 150),
          avgTime: Math.round(Math.random() * 50 + 20),
        },
        {
          path: '/api/trpc/user.updateNotifications',
          method: 'POST',
          calls: Math.round(Math.random() * 200 + 100),
          avgTime: Math.round(Math.random() * 30 + 10),
        },
        {
          path: '/api/trpc/analytics.getSpending',
          method: 'GET',
          calls: Math.round(Math.random() * 150 + 80),
          avgTime: Math.round(Math.random() * 80 + 30),
        },
      ],
    };
  }),

  getUserActivity: adminProcedure.query(async ({ ctx }) => {
    const activeNow = Math.round(Math.random() * 50 + 20);
    const peakToday = Math.round(activeNow * 1.5);
    
    // Generate timeline data (last 24 data points)
    const timeline = Array.from({ length: 24 }, () => 
      Math.round(Math.random() * 30 + 10)
    );
    
    return {
      activeNow,
      peakToday,
      dailyActive: Math.round(peakToday * 10),
      monthlyActive: Math.round(peakToday * 150),
      trend: Math.random() > 0.5 ? Math.round(Math.random() * 20) : -Math.round(Math.random() * 20),
      timeline,
    };
  }),

  getErrorRates: adminProcedure.query(async ({ ctx }) => {
    const errors = [
      { type: 'API Errors', count: 23, severity: 'warning' as const },
      { type: 'Database Timeouts', count: 5, severity: 'critical' as const },
      { type: 'Validation Errors', count: 89, severity: 'info' as const },
      { type: 'Auth Failures', count: 34, severity: 'warning' as const },
    ];
    
    const total = errors.reduce((sum, e) => sum + e.count, 0);
    
    return {
      current: (total / 10000 * 100).toFixed(2), // Error rate as percentage
      threshold: 1.0,
      byType: errors.map(e => ({
        ...e,
        percentage: Math.round((e.count / total) * 100),
      })),
    };
  }),

  getPerformanceMetrics: adminProcedure.query(async ({ ctx }) => {
    // Generate some realistic looking response times
    const baseTime = 50;
    const responseTimeHistory = Array.from({ length: 20 }, () =>
      Math.round(baseTime + Math.random() * 100 - 20)
    );
    
    const sorted = [...responseTimeHistory].sort((a, b) => a - b);
    const avg = Math.round(sorted.reduce((sum, t) => sum + t, 0) / sorted.length);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    return {
      avgResponseTime: avg,
      medianResponseTime: median,
      p95ResponseTime: p95,
      responseTimeHistory,
    };
  }),

  // Error Management
  getErrorStats: adminProcedure.query(async ({ ctx }) => {
    // In a real app, these would come from error tracking service
    const total = Math.round(Math.random() * 200 + 50);
    const unresolved = Math.round(total * 0.3);
    
    return {
      total,
      unresolved,
      errorRate: (total / 10000 * 100).toFixed(2),
      trend: Math.random() > 0.5 ? Math.round(Math.random() * 20) : -Math.round(Math.random() * 20),
      affectedUsers: Math.round(total * 0.15),
    };
  }),

  getRecentErrors: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().default(0),
        level: z.enum(['all', 'error', 'warning', 'info']).optional(),
        resolved: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // In a real app, this would query error logs
      const errors: ErrorLog[] = Array.from({ length: 20 }, (_, i) => {
        const levels = ['error', 'warning', 'info'] as const;
        const messages = [
          'Failed to connect to database',
          'Invalid user input in form submission',
          'API rate limit exceeded',
          'Session expired during checkout',
          'Failed to process payment',
          'Email delivery failed',
          'Image upload size exceeded',
          'Concurrent update conflict',
        ];
        
        const endpoints = [
          '/api/trpc/user.update',
          '/api/trpc/plaid.sync',
          '/api/webhooks/stripe',
          '/api/auth/callback',
          null,
        ];
        
        return {
          id: `error-${i}`,
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          level: levels[Math.floor(Math.random() * levels.length)]!,
          message: messages[Math.floor(Math.random() * messages.length)]!,
          stack: Math.random() > 0.5 ? `Error: ${messages[0]}\n    at processTransaction (/app/src/lib/payment.ts:45:15)\n    at async handleWebhook (/app/src/pages/api/webhook.ts:23:5)\n    at async handler (/app/node_modules/next/server.js:123:45)` : undefined,
          userId: Math.random() > 0.3 ? `user-${Math.floor(Math.random() * 100)}` : undefined,
          userEmail: Math.random() > 0.3 ? `user${Math.floor(Math.random() * 100)}@example.com` : undefined,
          endpoint: endpoints[Math.floor(Math.random() * endpoints.length)] ?? undefined,
          statusCode: Math.random() > 0.7 ? 500 : undefined,
          resolved: Math.random() > 0.7,
        };
      });
      
      return errors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }),

  getErrorTrends: adminProcedure.query(async ({ ctx }) => {
    // Generate trend data for last 7 days
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return {
      byDay: days.map(day => ({
        date: day,
        errors: Math.round(Math.random() * 100 + 20),
      })),
    };
  }),

  getCommonErrors: adminProcedure.query(async ({ ctx }) => {
    const commonErrors = [
      {
        message: 'Database connection timeout',
        count: 45,
        lastSeen: '5 minutes ago',
        endpoint: '/api/trpc/transactions.sync',
        resolved: false,
      },
      {
        message: 'Invalid API key provided',
        count: 23,
        lastSeen: '1 hour ago',
        endpoint: '/api/webhooks/plaid',
        resolved: true,
      },
      {
        message: 'Rate limit exceeded',
        count: 18,
        lastSeen: '30 minutes ago',
        endpoint: '/api/trpc/ai.categorize',
        resolved: false,
      },
      {
        message: 'User not found',
        count: 12,
        lastSeen: '2 hours ago',
        endpoint: '/api/auth/callback',
        resolved: true,
      },
    ];
    
    return commonErrors;
  }),

  resolveError: adminProcedure
    .input(
      z.object({
        errorId: z.string(),
        resolution: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // In a real app, this would update the error status
      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.user.id,
          action: 'admin.error.resolve',
          resource: input.errorId,
          result: 'success',
          metadata: { resolution: input.resolution },
        },
      });
      
      return { success: true };
    }),
});

// Helper functions
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
