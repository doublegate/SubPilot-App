#!/usr/bin/env tsx

/**
 * Email Integration Testing Script
 *
 * Tests email service configuration and delivery:
 * - SendGrid API connectivity
 * - Template availability
 * - Email delivery (with user confirmation)
 * - Fallback HTML email functionality
 * 
 * Usage:
 *   npm run test:email              # Interactive mode
 *   npm run test:email -- --check   # Non-interactive mode (config check only)
 */

import { env } from '../src/env.js';
import { sendGridEmailService } from '../src/lib/email/sendgrid.js';
import * as readline from 'readline';

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  details?: Record<string, unknown>;
}

class EmailIntegrationTester {
  private results: TestResult[] = [];
  private rl: readline.Interface;
  private isInteractive: boolean;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    // Check if running in interactive mode
    // Non-interactive if --check flag is passed or no TTY
    const checkOnly = process.argv.includes('--check');
    this.isInteractive = process.stdin.isTTY === true && !checkOnly;
    
    if (checkOnly) {
      console.log('🔍 Running in check-only mode (non-interactive)\n');
    }
  }

  private async prompt(question: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if readline is still available
      if (!this.rl) {
        reject(new Error('Readline interface is not available'));
        return;
      }
      
      this.rl.question(question, answer => {
        resolve(answer.trim());
      });
    });
  }

  private addResult(result: TestResult) {
    this.results.push(result);
    const emoji = {
      pass: '✅',
      fail: '❌',
      skip: '⏭️',
    }[result.status];

    console.log(`${emoji} ${result.test}: ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
  }

  async testConfiguration() {
    console.log('\n📧 Testing Email Configuration...');

    // Check SendGrid API key
    if (!env.SENDGRID_API_KEY) {
      this.addResult({
        test: 'SendGrid API Key',
        status: 'fail',
        message: 'SENDGRID_API_KEY not configured',
        details: {
          recommendation: 'Set SENDGRID_API_KEY in .env.local',
        },
      });
      return false;
    }

    if (!env.SENDGRID_API_KEY.startsWith('SG.')) {
      this.addResult({
        test: 'SendGrid API Key Format',
        status: 'fail',
        message: 'Invalid API key format (should start with SG.)',
      });
      return false;
    }

    this.addResult({
      test: 'SendGrid API Key',
      status: 'pass',
      message: 'Valid API key format detected',
      details: {
        keyPrefix: env.SENDGRID_API_KEY.substring(0, 6) + '...',
      },
    });

    // Check FROM_EMAIL
    if (!env.FROM_EMAIL) {
      this.addResult({
        test: 'FROM_EMAIL',
        status: 'fail',
        message: 'FROM_EMAIL not configured',
        details: {
          recommendation: 'Set FROM_EMAIL in .env.local',
          default: 'noreply@subpilot.com',
        },
      });
    } else {
      this.addResult({
        test: 'FROM_EMAIL',
        status: 'pass',
        message: 'From email configured',
        details: {
          email: env.FROM_EMAIL,
        },
      });
    }

    return true;
  }

  async testSendGridConnection() {
    console.log('\n🔌 Testing SendGrid Connection...');

    try {
      // Import SendGrid client directly to test connection
      const sgMailModule = await import('@sendgrid/mail');
      const sgMail = sgMailModule.default;
      
      if (env.SENDGRID_API_KEY) {
        sgMail.setApiKey(env.SENDGRID_API_KEY);
        
        // Test API key validity by attempting to verify sender
        // This doesn't actually send an email but validates the API key
        try {
          await sgMail.send({
            to: 'test@example.com',
            from: env.FROM_EMAIL || 'noreply@subpilot.com',
            subject: 'Test',
            text: 'Test',
            mailSettings: {
              sandboxMode: {
                enable: true, // This prevents actual sending
              },
            },
          });

          this.addResult({
            test: 'SendGrid API Connection',
            status: 'pass',
            message: 'API key validated successfully',
          });
        } catch (error: any) {
          if (error.code === 401) {
            this.addResult({
              test: 'SendGrid API Connection',
              status: 'fail',
              message: 'Invalid API key',
              details: { error: error.message },
            });
          } else if (error.code === 403) {
            this.addResult({
              test: 'SendGrid API Connection',
              status: 'fail',
              message: 'API key lacks required permissions',
              details: { error: error.message },
            });
          } else {
            this.addResult({
              test: 'SendGrid API Connection',
              status: 'fail',
              message: 'Connection failed',
              details: { error: error.message },
            });
          }
          return false;
        }
      }
    } catch (error) {
      this.addResult({
        test: 'SendGrid Module',
        status: 'fail',
        message: 'Failed to load SendGrid module',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      return false;
    }

    return true;
  }

  async testEmailDelivery() {
    console.log('\n📬 Testing Email Delivery...');

    if (!this.isInteractive) {
      this.addResult({
        test: 'Email Delivery',
        status: 'skip',
        message: 'Skipped (non-interactive mode)',
      });
      return;
    }

    const shouldTest = await this.prompt(
      '\nDo you want to test actual email delivery? (y/N): '
    );

    if (shouldTest.toLowerCase() !== 'y') {
      this.addResult({
        test: 'Email Delivery',
        status: 'skip',
        message: 'Skipped by user',
      });
      return;
    }

    const testEmail = await this.prompt(
      'Enter email address to receive test email: '
    );

    if (!testEmail || !testEmail.includes('@')) {
      this.addResult({
        test: 'Email Delivery',
        status: 'skip',
        message: 'Invalid email address provided',
      });
      return;
    }

    console.log(`\n📤 Sending test email to ${testEmail}...`);

    try {
      const success = await sendGridEmailService.testEmailDelivery(testEmail);

      if (success) {
        this.addResult({
          test: 'Email Delivery',
          status: 'pass',
          message: 'Test email sent successfully',
          details: {
            recipient: testEmail,
            fromEmail: env.FROM_EMAIL || 'noreply@subpilot.com',
          },
        });

        console.log('\n📥 Please check your email inbox (and spam folder).');
        
        const received = await this.prompt(
          'Did you receive the test email? (y/N): '
        );

        if (received.toLowerCase() === 'y') {
          this.addResult({
            test: 'Email Receipt',
            status: 'pass',
            message: 'Email received by recipient',
          });
        } else {
          this.addResult({
            test: 'Email Receipt',
            status: 'fail',
            message: 'Email not received',
            details: {
              recommendation: 'Check spam folder, sender verification, or SendGrid logs',
            },
          });
        }
      } else {
        this.addResult({
          test: 'Email Delivery',
          status: 'fail',
          message: 'Failed to send test email',
        });
      }
    } catch (error) {
      this.addResult({
        test: 'Email Delivery',
        status: 'fail',
        message: 'Error during email delivery',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }

  async testEmailTemplates() {
    console.log('\n📝 Testing Email Templates...');

    if (!this.isInteractive) {
      this.addResult({
        test: 'Email Templates',
        status: 'skip',
        message: 'Skipped (non-interactive mode)',
      });
      return;
    }

    const shouldTest = await this.prompt(
      '\nDo you want to test email templates? (y/N): '
    );

    if (shouldTest.toLowerCase() !== 'y') {
      this.addResult({
        test: 'Email Templates',
        status: 'skip',
        message: 'Skipped by user',
      });
      return;
    }

    const testEmail = await this.prompt(
      'Enter email address for template tests: '
    );

    if (!testEmail || !testEmail.includes('@')) {
      this.addResult({
        test: 'Email Templates',
        status: 'skip',
        message: 'Invalid email address provided',
      });
      return;
    }

    // Test welcome email
    console.log('\n1️⃣ Testing Welcome Email...');
    try {
      await sendGridEmailService.sendWelcomeEmail({
        id: 'test-user-id',
        email: testEmail,
        name: 'Test User',
      });

      this.addResult({
        test: 'Welcome Email Template',
        status: 'pass',
        message: 'Welcome email sent successfully',
      });
    } catch (error) {
      this.addResult({
        test: 'Welcome Email Template',
        status: 'fail',
        message: 'Failed to send welcome email',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }

    // Test magic link email
    console.log('\n2️⃣ Testing Magic Link Email...');
    try {
      const magicLink = `${env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify?token=test-token`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await sendGridEmailService.sendMagicLink(
        { email: testEmail, name: 'Test User' },
        magicLink,
        expiresAt
      );

      this.addResult({
        test: 'Magic Link Email Template',
        status: 'pass',
        message: 'Magic link email sent successfully',
      });
    } catch (error) {
      this.addResult({
        test: 'Magic Link Email Template',
        status: 'fail',
        message: 'Failed to send magic link email',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }

    // Test subscription alert email
    console.log('\n3️⃣ Testing Subscription Alert Email...');
    try {
      await sendGridEmailService.sendSubscriptionAlert(
        {
          id: 'test-user-id',
          email: testEmail,
          name: 'Test User',
        },
        {
          name: 'Netflix Premium',
          amount: 19.99,
          nextBilling: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
      );

      this.addResult({
        test: 'Subscription Alert Email Template',
        status: 'pass',
        message: 'Subscription alert email sent successfully',
      });
    } catch (error) {
      this.addResult({
        test: 'Subscription Alert Email Template',
        status: 'fail',
        message: 'Failed to send subscription alert email',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }

    console.log('\n📥 Please check your email for the template tests.');
  }

  async runAllTests() {
    console.log('🚀 Starting Email Integration Tests...\n');
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`App URL: ${env.NEXTAUTH_URL}\n`);

    try {
      const hasConfig = await this.testConfiguration();
      
      if (hasConfig) {
        const hasConnection = await this.testSendGridConnection();
        
        if (hasConnection) {
          await this.testEmailDelivery();
          await this.testEmailTemplates();
        }
      }

      this.printSummary();
    } catch (error) {
      console.error('\n❌ Test error:', error);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  private printSummary() {
    console.log('\n📊 Test Summary');
    console.log('================');

    const summary = this.results.reduce(
      (acc, result) => {
        acc[result.status]++;
        return acc;
      },
      { pass: 0, fail: 0, skip: 0 }
    );

    console.log(`✅ Passed: ${summary.pass}`);
    console.log(`❌ Failed: ${summary.fail}`);
    console.log(`⏭️  Skipped: ${summary.skip}`);
    console.log(`📋 Total: ${this.results.length}`);

    if (summary.fail > 0) {
      console.log('\n❌ EMAIL INTEGRATION ISSUES DETECTED');
      console.log('Please resolve failed tests before using email features.');
      process.exit(1);
    } else if (summary.pass > 0) {
      console.log('\n🎉 EMAIL INTEGRATION WORKING');
      console.log('Email service is properly configured!');
      process.exit(0);
    } else {
      console.log('\n⏭️  NO TESTS COMPLETED');
      console.log('Run actual tests to verify email integration.');
      process.exit(0);
    }
  }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new EmailIntegrationTester();
  
  // Handle process termination gracefully
  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Test interrupted by user');
    process.exit(0);
  });
  
  void tester.runAllTests();
}