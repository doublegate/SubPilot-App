#!/usr/bin/env tsx

/**
 * Production Environment Validation Script
 *
 * Validates that all required environment variables are properly configured
 * for production deployment. Checks for common configuration issues and
 * provides actionable feedback.
 */

import { env } from '../src/env.js';

interface ValidationResult {
  category: string;
  variable: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  recommendation?: string;
}

class ProductionEnvironmentValidator {
  private results: ValidationResult[] = [];

  private addResult(result: ValidationResult) {
    this.results.push(result);
    const emoji = {
      pass: '✅',
      fail: '❌',
      warning: '⚠️',
    }[result.status];

    console.log(
      `${emoji} ${result.category} - ${result.variable}: ${result.message}`
    );
    if (result.recommendation) {
      console.log(`   💡 ${result.recommendation}`);
    }
  }

  private validateRequired(
    category: string,
    variable: string,
    value: string | undefined,
    message: string
  ) {
    if (!value || value === '') {
      this.addResult({
        category,
        variable,
        status: 'fail',
        message: 'Missing required variable',
        recommendation: message,
      });
      return false;
    }

    this.addResult({
      category,
      variable,
      status: 'pass',
      message: 'Configured',
    });
    return true;
  }

  private validateOptional(
    category: string,
    variable: string,
    value: string | undefined,
    message: string
  ) {
    if (!value || value === '') {
      this.addResult({
        category,
        variable,
        status: 'warning',
        message: 'Not configured (optional)',
        recommendation: message,
      });
      return false;
    }

    this.addResult({
      category,
      variable,
      status: 'pass',
      message: 'Configured',
    });
    return true;
  }

  private validatePattern(
    category: string,
    variable: string,
    value: string | undefined,
    pattern: RegExp,
    message: string
  ) {
    if (!value) {
      this.addResult({
        category,
        variable,
        status: 'fail',
        message: 'Missing required variable',
      });
      return false;
    }

    if (!pattern.test(value)) {
      this.addResult({
        category,
        variable,
        status: 'fail',
        message: 'Invalid format',
        recommendation: message,
      });
      return false;
    }

    this.addResult({
      category,
      variable,
      status: 'pass',
      message: 'Valid format',
    });
    return true;
  }

  validateCoreApplication() {
    console.log('\n🚀 Core Application Configuration');
    console.log('='.repeat(40));

    this.validateRequired(
      'Core',
      'NODE_ENV',
      env.NODE_ENV,
      'Should be "production" for production deployment'
    );

    this.validateRequired(
      'Core',
      'NEXTAUTH_SECRET',
      env.NEXTAUTH_SECRET,
      'Generate a secure 64-character random string'
    );

    this.validatePattern(
      'Core',
      'NEXTAUTH_URL',
      env.NEXTAUTH_URL,
      /^https:\/\/[a-zA-Z0-9.-]+$/,
      'Should be https://subpilot.app for production'
    );

    // Check NEXTAUTH_SECRET strength
    if (env.NEXTAUTH_SECRET) {
      if (env.NEXTAUTH_SECRET.length < 32) {
        this.addResult({
          category: 'Core',
          variable: 'NEXTAUTH_SECRET',
          status: 'warning',
          message: 'Secret may be too short',
          recommendation: 'Use at least 32 characters for security',
        });
      }

      if (
        env.NEXTAUTH_SECRET.includes('your-super-secret-key') ||
        env.NEXTAUTH_SECRET.includes('change-this')
      ) {
        this.addResult({
          category: 'Core',
          variable: 'NEXTAUTH_SECRET',
          status: 'fail',
          message: 'Using default/example secret',
          recommendation: 'Generate a unique production secret',
        });
      }
    }
  }

  validateDatabase() {
    console.log('\n🗄️  Database Configuration');
    console.log('='.repeat(40));

    this.validatePattern(
      'Database',
      'DATABASE_URL',
      env.DATABASE_URL,
      /^postgresql:\/\/.*$/,
      'Should be a PostgreSQL connection string'
    );

    // Check for production database indicators
    if (env.DATABASE_URL) {
      if (
        env.DATABASE_URL.includes('localhost') ||
        env.DATABASE_URL.includes('127.0.0.1')
      ) {
        this.addResult({
          category: 'Database',
          variable: 'DATABASE_URL',
          status: 'warning',
          message: 'Using localhost database',
          recommendation: 'Use a production database service like Neon',
        });
      }

      if (!env.DATABASE_URL.includes('sslmode=require')) {
        this.addResult({
          category: 'Database',
          variable: 'DATABASE_URL',
          status: 'warning',
          message: 'SSL not enforced',
          recommendation: 'Add ?sslmode=require for production security',
        });
      }
    }
  }

  validateOAuthProviders() {
    console.log('\n🔐 OAuth Providers');
    console.log('='.repeat(40));

    // Google OAuth
    const hasGoogleId = this.validateOptional(
      'OAuth',
      'GOOGLE_CLIENT_ID',
      env.GOOGLE_CLIENT_ID,
      'Set up Google OAuth for Google sign-in'
    );

    if (hasGoogleId) {
      this.validatePattern(
        'OAuth',
        'GOOGLE_CLIENT_ID',
        env.GOOGLE_CLIENT_ID,
        /^[0-9]+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$/,
        'Should end with .apps.googleusercontent.com'
      );

      this.validateRequired(
        'OAuth',
        'GOOGLE_CLIENT_SECRET',
        env.GOOGLE_CLIENT_SECRET,
        'Required when GOOGLE_CLIENT_ID is set'
      );

      if (env.GOOGLE_CLIENT_SECRET?.startsWith('GOCSPX-')) {
        this.addResult({
          category: 'OAuth',
          variable: 'GOOGLE_CLIENT_SECRET',
          status: 'pass',
          message: 'Valid Google client secret format',
        });
      }
    }

    // GitHub OAuth
    const hasGitHubId = this.validateOptional(
      'OAuth',
      'GITHUB_CLIENT_ID',
      env.GITHUB_CLIENT_ID,
      'Set up GitHub OAuth for GitHub sign-in'
    );

    if (hasGitHubId) {
      this.validateRequired(
        'OAuth',
        'GITHUB_CLIENT_SECRET',
        env.GITHUB_CLIENT_SECRET,
        'Required when GITHUB_CLIENT_ID is set'
      );
    }
  }

  validatePlaidIntegration() {
    console.log('\n🏦 Plaid Integration');
    console.log('='.repeat(40));

    const hasPlaidId = this.validateRequired(
      'Plaid',
      'PLAID_CLIENT_ID',
      env.PLAID_CLIENT_ID,
      'Required for bank account connections'
    );

    if (hasPlaidId) {
      this.validateRequired(
        'Plaid',
        'PLAID_SECRET',
        env.PLAID_SECRET,
        'Required when PLAID_CLIENT_ID is set'
      );

      this.validateRequired(
        'Plaid',
        'PLAID_ENV',
        env.PLAID_ENV,
        'Should be "production" for production deployment'
      );

      if (env.PLAID_ENV === 'sandbox') {
        this.addResult({
          category: 'Plaid',
          variable: 'PLAID_ENV',
          status: 'warning',
          message: 'Using sandbox environment',
          recommendation: 'Change to "production" for live deployment',
        });
      }

      this.validatePattern(
        'Plaid',
        'PLAID_WEBHOOK_URL',
        env.PLAID_WEBHOOK_URL,
        /^https:\/\/.*\/api\/webhooks\/plaid$/,
        'Should be https://subpilot.app/api/webhooks/plaid'
      );
    }
  }

  validateEmailService() {
    console.log('\n📧 Email Service');
    console.log('='.repeat(40));

    const hasSendGrid = this.validateOptional(
      'Email',
      'SENDGRID_API_KEY',
      env.SENDGRID_API_KEY,
      'Required for production email delivery'
    );

    if (hasSendGrid) {
      if (env.SENDGRID_API_KEY?.startsWith('SG.')) {
        this.addResult({
          category: 'Email',
          variable: 'SENDGRID_API_KEY',
          status: 'pass',
          message: 'Valid SendGrid API key format',
        });
      } else {
        this.addResult({
          category: 'Email',
          variable: 'SENDGRID_API_KEY',
          status: 'warning',
          message: 'Unexpected API key format',
          recommendation: 'Verify this is a valid SendGrid API key',
        });
      }

      this.validatePattern(
        'Email',
        'FROM_EMAIL',
        env.FROM_EMAIL,
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Should be a valid email address like noreply@subpilot.app'
      );
    } else {
      // Check for SMTP fallback
      this.validateOptional(
        'Email',
        'SMTP_HOST',
        env.SMTP_HOST,
        'Configure SMTP or SendGrid for email delivery'
      );
    }
  }

  validateMonitoring() {
    console.log('\n🐛 Monitoring & Error Tracking');
    console.log('='.repeat(40));

    const hasSentry = this.validateOptional(
      'Monitoring',
      'SENTRY_DSN',
      env.SENTRY_DSN,
      'Recommended for production error tracking'
    );

    if (hasSentry) {
      this.validatePattern(
        'Monitoring',
        'SENTRY_DSN',
        env.SENTRY_DSN,
        /^https:\/\/[a-f0-9]+@[a-zA-Z0-9.-]+\/[0-9]+$/,
        'Should be a valid Sentry DSN URL'
      );
    }
  }

  validateSecurity() {
    console.log('\n🔒 Security Configuration');
    console.log('='.repeat(40));

    // Check for production-only settings
    if (env.NODE_ENV === 'production') {
      if (env.NEXTAUTH_URL?.startsWith('http://')) {
        this.addResult({
          category: 'Security',
          variable: 'NEXTAUTH_URL',
          status: 'fail',
          message: 'Using HTTP in production',
          recommendation: 'Use HTTPS for production security',
        });
      }

      if (env.DATABASE_URL?.includes('password')) {
        this.addResult({
          category: 'Security',
          variable: 'DATABASE_URL',
          status: 'warning',
          message: 'Plain text password in connection string',
          recommendation:
            'Consider using connection string with encoded credentials',
        });
      }
    }

    // Check webhook security
    this.validateOptional(
      'Security',
      'WEBHOOK_SECRET',
      process.env.WEBHOOK_SECRET,
      'Recommended for webhook security'
    );
  }

  async runValidation() {
    console.log('🔍 Production Environment Validation');
    console.log('=====================================');
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`Validation Time: ${new Date().toISOString()}\n`);

    this.validateCoreApplication();
    this.validateDatabase();
    this.validateOAuthProviders();
    this.validatePlaidIntegration();
    this.validateEmailService();
    this.validateMonitoring();
    this.validateSecurity();

    this.printSummary();
    this.generateActionPlan();
  }

  private printSummary() {
    console.log('\n📊 Validation Summary');
    console.log('=====================');

    const summary = this.results.reduce(
      (acc, result) => {
        acc[result.status]++;
        return acc;
      },
      { pass: 0, fail: 0, warning: 0 }
    );

    console.log(`✅ Passed: ${summary.pass}`);
    console.log(`❌ Failed: ${summary.fail}`);
    console.log(`⚠️  Warnings: ${summary.warning}`);
    console.log(`📋 Total: ${this.results.length}`);

    const passRate = Math.round((summary.pass / this.results.length) * 100);
    console.log(`📈 Pass Rate: ${passRate}%`);
  }

  private generateActionPlan() {
    const failures = this.results.filter(r => r.status === 'fail');
    const warnings = this.results.filter(r => r.status === 'warning');

    if (failures.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES (Must Fix Before Production)');
      console.log('='.repeat(50));
      failures.forEach((result, index) => {
        console.log(`${index + 1}. ${result.category} - ${result.variable}`);
        console.log(`   Issue: ${result.message}`);
        if (result.recommendation) {
          console.log(`   Action: ${result.recommendation}`);
        }
        console.log('');
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  RECOMMENDATIONS (Should Address)');
      console.log('='.repeat(40));
      warnings.forEach((result, index) => {
        console.log(`${index + 1}. ${result.category} - ${result.variable}`);
        console.log(`   Issue: ${result.message}`);
        if (result.recommendation) {
          console.log(`   Recommendation: ${result.recommendation}`);
        }
        console.log('');
      });
    }

    console.log('\n🎯 Next Steps');
    console.log('='.repeat(15));

    if (failures.length > 0) {
      console.log('❌ PRODUCTION NOT READY');
      console.log('   Fix all critical issues before deploying to production.');
      process.exit(1);
    } else if (warnings.length > 0) {
      console.log('⚠️  PRODUCTION READY WITH WARNINGS');
      console.log(
        '   Consider addressing warnings for optimal production setup.'
      );
      process.exit(0);
    } else {
      console.log('🎉 PRODUCTION READY');
      console.log('   All environment variables are properly configured!');
      process.exit(0);
    }
  }
}

// Run validation if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ProductionEnvironmentValidator();
  void validator.runValidation();
}
