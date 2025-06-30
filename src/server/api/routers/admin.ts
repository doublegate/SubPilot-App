import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
    
    return result._sum.amount?.toNumber() || 0;
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
      description: `${event.user?.email || 'System'} - ${event.result}`,
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
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().default(0),
      search: z.string().optional(),
      status: z.enum(['all', 'active', 'inactive', 'locked', 'premium']).optional(),
      plan: z.enum(['all', 'free', 'pro', 'team']).optional(),
    }))
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
        subscriptionPlan: user.userSubscription?.plan.name || 'free',
        bankAccounts: user._count.bankAccounts,
        subscriptions: user._count.subscriptions,
      }));
    }),

  createUser: adminProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      password: z.string().min(8),
      sendWelcomeEmail: z.boolean().default(true),
    }))
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
    .input(z.object({
      userId: z.string(),
      reason: z.string(),
      duration: z.number().optional(), // Hours
    }))
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
    .input(z.object({
      userId: z.string(),
    }))
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
      totalRevenue: totalRevenue._sum.amount?.toNumber() || 0,
      monthlyRevenue: monthlyRevenue._sum.amount?.toNumber() || 0,
      activeSubscriptions,
      churnRate,
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        userEmail: tx.user.email,
        plan: tx.userSubscription?.plan.displayName || 'Unknown',
        amount: tx.amount?.toNumber() || 0,
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
      environment: process.env.PLAID_ENV || 'sandbox',
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
});