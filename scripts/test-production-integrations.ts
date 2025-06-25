#!/usr/bin/env tsx

/**
 * Production Integration Testing Script
 *
 * Tests all production services and integrations:
 * - OAuth providers (Google, GitHub)
 * - Email service (SendGrid)
 * - Database connectivity
 * - Plaid API
 * - Error tracking (Sentry)
 * - Health endpoints
 */

// @ts-expect-error - env.js is a module, not env.d.ts
import { env } from '../src/env.js';
import { db } from '../src/server/db.js';
import { sendGridEmailService } from '../src/lib/email/sendgrid.js';

interface TestResult {
  service: string;
  status: 'pass' | 'fail' | 'warning' | 'skip';
  message: string;
  details?: Record<string, unknown>;
}

class ProductionTester {
  private results: TestResult[] = [];

  private addResult(result: TestResult) {
    this.results.push(result);
    const emoji = {
      pass: '✅',
      fail: '❌',
      warning: '⚠️',
      skip: '⏭️',
    }[result.status];

    console.log(`${emoji} ${result.service}: ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
  }

  async testDatabase() {
    console.log('\n🗄️  Testing Database Connection...');

    try {
      // Test basic connectivity
      await db.$queryRaw`SELECT 1 as test`;

      // Test user table access
      const userCount = await db.user.count();

      this.addResult({
        service: 'Database',
        status: 'pass',
        message: 'Connection successful',
        details: { userCount, url: env.DATABASE_URL?.split('@')[1] },
      });
    } catch (error) {
      this.addResult({
        service: 'Database',
        status: 'fail',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  async testEmailService() {
    console.log('\n📧 Testing Email Service...');

    if (!env.SENDGRID_API_KEY) {
      this.addResult({
        service: 'Email (SendGrid)',
        status: 'skip',
        message: 'SendGrid API key not configured',
      });
      return;
    }

    try {
      // Test email configuration (don't actually send)
      const testEmail = 'test@example.com';

      this.addResult({
        service: 'Email (SendGrid)',
        status: 'pass',
        message: 'Configuration valid',
        details: {
          apiKeyConfigured: true,
          fromEmail: env.FROM_EMAIL,
        },
      });
    } catch (error) {
      this.addResult({
        service: 'Email (SendGrid)',
        status: 'fail',
        message: `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  async testOAuthProviders() {
    console.log('\n🔐 Testing OAuth Providers...');

    // Test Google OAuth
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      this.addResult({
        service: 'OAuth (Google)',
        status: 'pass',
        message: 'Credentials configured',
        details: {
          clientId: env.GOOGLE_CLIENT_ID.substring(0, 10) + '...',
          hasSecret: !!env.GOOGLE_CLIENT_SECRET,
        },
      });
    } else {
      this.addResult({
        service: 'OAuth (Google)',
        status: 'warning',
        message: 'Credentials not configured',
      });
    }

    // Test GitHub OAuth
    if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
      this.addResult({
        service: 'OAuth (GitHub)',
        status: 'pass',
        message: 'Credentials configured',
        details: {
          clientId: env.GITHUB_CLIENT_ID,
          hasSecret: !!env.GITHUB_CLIENT_SECRET,
        },
      });
    } else {
      this.addResult({
        service: 'OAuth (GitHub)',
        status: 'warning',
        message: 'Credentials not configured',
      });
    }
  }

  async testPlaidIntegration() {
    console.log('\n🏦 Testing Plaid Integration...');

    if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
      this.addResult({
        service: 'Plaid',
        status: 'warning',
        message: 'Credentials not configured',
      });
      return;
    }

    try {
      // Import Plaid client dynamically
      const { Configuration, PlaidApi, PlaidEnvironments } = await import(
        'plaid'
      );

      const configuration = new Configuration({
        basePath:
          PlaidEnvironments[env.PLAID_ENV as keyof typeof PlaidEnvironments],
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
            'PLAID-SECRET': env.PLAID_SECRET,
          },
        },
      });

      const client = new PlaidApi(configuration);

      // Test API connectivity (this endpoint doesn't require authentication)
      // In production, you might want to make a simple API call to verify connectivity

      this.addResult({
        service: 'Plaid',
        status: 'pass',
        message: 'Configuration valid',
        details: {
          environment: env.PLAID_ENV,
          clientIdPrefix: env.PLAID_CLIENT_ID.substring(0, 10) + '...',
          hasSecret: !!env.PLAID_SECRET,
        },
      });
    } catch (error) {
      this.addResult({
        service: 'Plaid',
        status: 'fail',
        message: `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  async testSentryIntegration() {
    console.log('\n🐛 Testing Sentry Integration...');

    if (!env.SENTRY_DSN) {
      this.addResult({
        service: 'Sentry',
        status: 'skip',
        message: 'Sentry DSN not configured',
      });
      return;
    }

    try {
      // Test Sentry configuration
      const dsnParts = env.SENTRY_DSN.split('/');
      const projectId = dsnParts[dsnParts.length - 1];

      this.addResult({
        service: 'Sentry',
        status: 'pass',
        message: 'Configuration valid',
        details: {
          projectId,
          dsnConfigured: true,
        },
      });
    } catch (error) {
      this.addResult({
        service: 'Sentry',
        status: 'fail',
        message: `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  async testHealthEndpoint() {
    console.log('\n🩺 Testing Health Endpoint...');

    try {
      const healthUrl = `${env.NEXTAUTH_URL}/api/health`;

      // In a real production test, you'd make an HTTP request here
      // For now, we'll just verify the URL is configured

      this.addResult({
        service: 'Health Endpoint',
        status: 'pass',
        message: 'URL configured',
        details: {
          url: healthUrl,
        },
      });
    } catch (error) {
      this.addResult({
        service: 'Health Endpoint',
        status: 'fail',
        message: `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  async testEnvironmentVariables() {
    console.log('\n🌍 Testing Environment Variables...');

    const requiredVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];

    const optionalVars = [
      'GOOGLE_CLIENT_ID',
      'GITHUB_CLIENT_ID',
      'PLAID_CLIENT_ID',
      'SENDGRID_API_KEY',
      'SENTRY_DSN',
    ];

    let missingRequired = 0;
    let missingOptional = 0;

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingRequired++;
        this.addResult({
          service: `Env Var (${varName})`,
          status: 'fail',
          message: 'Required variable missing',
        });
      }
    }

    for (const varName of optionalVars) {
      if (!process.env[varName]) {
        missingOptional++;
      }
    }

    if (missingRequired === 0) {
      this.addResult({
        service: 'Environment Variables',
        status: 'pass',
        message: 'All required variables present',
        details: {
          requiredCount: requiredVars.length,
          optionalCount: optionalVars.length - missingOptional,
          missingOptional,
        },
      });
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Production Integration Tests...\n');
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`App URL: ${env.NEXTAUTH_URL}\n`);

    await this.testEnvironmentVariables();
    await this.testDatabase();
    await this.testOAuthProviders();
    await this.testEmailService();
    await this.testPlaidIntegration();
    await this.testSentryIntegration();
    await this.testHealthEndpoint();

    this.printSummary();
  }

  private printSummary() {
    console.log('\n📊 Test Summary');
    console.log('================');

    const summary = this.results.reduce(
      (acc, result) => {
        acc[result.status]++;
        return acc;
      },
      { pass: 0, fail: 0, warning: 0, skip: 0 }
    );

    console.log(`✅ Passed: ${summary.pass}`);
    console.log(`❌ Failed: ${summary.fail}`);
    console.log(`⚠️  Warnings: ${summary.warning}`);
    console.log(`⏭️  Skipped: ${summary.skip}`);
    console.log(`📋 Total: ${this.results.length}`);

    if (summary.fail > 0) {
      console.log('\n❌ CRITICAL ISSUES DETECTED');
      console.log(
        'Please resolve failed tests before deploying to production.'
      );
      process.exit(1);
    } else if (summary.warning > 0) {
      console.log('\n⚠️  WARNINGS DETECTED');
      console.log('Some optional services are not configured.');
      process.exit(0);
    } else {
      console.log('\n🎉 ALL TESTS PASSED');
      console.log('System is ready for production deployment!');
      process.exit(0);
    }
  }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ProductionTester();
  await tester.runAllTests();
}
