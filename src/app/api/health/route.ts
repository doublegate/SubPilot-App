import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();

  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'subpilot-app',
      version: process.env.npm_package_version ?? '1.2.0',
      environment: process.env.NODE_ENV ?? 'production',
      checks: {
        database: 'unknown',
        email: 'unknown',
        plaid: 'unknown',
        sentry: 'unknown',
      },
      responseTime: 0,
    };

    // Database health check (skip in basic Docker health check mode)
    try {
      if (process.env.DOCKER_HEALTH_CHECK_MODE === 'basic') {
        health.checks.database = 'skipped-basic-mode';
      } else {
        // Lazy load database client only when needed
        const { db } = await import('@/server/db');
        await db.$queryRaw`SELECT 1`;
        health.checks.database = 'healthy';
      }
    } catch (error) {
      health.checks.database = 'unhealthy';
      health.status = 'degraded';
      console.error('Database health check failed:', error);
    }

    // Email service health check
    try {
      if (process.env.SENDGRID_API_KEY) {
        health.checks.email = 'configured';
      } else if (process.env.SMTP_HOST) {
        health.checks.email = 'smtp-configured';
      } else {
        health.checks.email = 'not-configured';
      }
    } catch (error) {
      health.checks.email = 'error';
      console.error('Email health check failed:', error);
    }

    // Plaid service health check
    try {
      if (process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET) {
        health.checks.plaid = 'configured';
      } else {
        health.checks.plaid = 'not-configured';
      }
    } catch (error) {
      health.checks.plaid = 'error';
      console.error('Plaid health check failed:', error);
    }

    // Sentry health check
    try {
      if (process.env.SENTRY_DSN) {
        health.checks.sentry = 'configured';
      } else {
        health.checks.sentry = 'not-configured';
      }
    } catch (error) {
      health.checks.sentry = 'error';
      console.error('Sentry health check failed:', error);
    }

    // Calculate response time
    health.responseTime = Date.now() - startTime;

    // Return appropriate status code
    const statusCode =
      health.status === 'healthy'
        ? 200
        : health.status === 'degraded'
          ? 200
          : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        responseTime: Date.now() - startTime,
      },
      { status: 503 }
    );
  }
}

// Also handle HEAD requests for basic uptime checks
export async function HEAD() {
  try {
    // Skip database check in basic Docker health check mode
    if (process.env.DOCKER_HEALTH_CHECK_MODE === 'basic') {
      return new NextResponse(null, { status: 200 });
    }
    
    // Quick database ping
    const { db } = await import('@/server/db');
    await db.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
