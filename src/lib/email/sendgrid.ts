import sgMail from '@sendgrid/mail';
import { env } from '@/env.js';
import {
  SENDGRID_TEMPLATES,
  HTML_TEMPLATES,
  TEXT_TEMPLATES,
} from '@/lib/email-templates/production';

// Initialize SendGrid
if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export type EmailData = Record<string, unknown>;

/**
 * Production email service using SendGrid
 */
export class SendGridEmailService {
  private fromEmail: string;
  private isProduction: boolean;

  constructor() {
    this.fromEmail = env.FROM_EMAIL ?? 'noreply@subpilot.com';
    this.isProduction = env.NODE_ENV === 'production';
  }

  /**
   * Send email using SendGrid dynamic template
   */
  async sendTemplateEmail(
    templateKey: keyof typeof SENDGRID_TEMPLATES,
    recipients: EmailRecipient[],
    dynamicData: EmailData,
    options?: {
      replyTo?: string;
      categories?: string[];
      customArgs?: Record<string, string>;
    }
  ): Promise<void> {
    if (!env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured, email not sent');
      return;
    }

    const template = SENDGRID_TEMPLATES[templateKey];

    try {
      const msg = {
        to: recipients,
        from: {
          email: this.fromEmail,
          name: 'SubPilot',
        },
        replyTo: options?.replyTo,
        templateId: template.id,
        dynamicTemplateData: dynamicData,
        categories: options?.categories,
        customArgs: options?.customArgs,
        // Track clicks and opens in production
        trackingSettings: {
          clickTracking: { enable: this.isProduction },
          openTracking: { enable: this.isProduction },
        },
      };

      await sgMail.send(msg);

      console.log(
        `Email sent successfully: ${templateKey} to ${recipients.length} recipients`
      );
    } catch (error) {
      console.error(`Failed to send ${templateKey} email:`, error);
      throw new Error(`Email delivery failed: ${templateKey}`);
    }
  }

  /**
   * Send plain HTML email (fallback when templates are not available)
   */
  async sendHtmlEmail(
    subject: string,
    htmlContent: string,
    textContent: string,
    recipients: EmailRecipient[],
    options?: {
      replyTo?: string;
      categories?: string[];
      customArgs?: Record<string, string>;
    }
  ): Promise<void> {
    if (!env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured, email not sent');
      return;
    }

    try {
      const msg = {
        to: recipients,
        from: {
          email: this.fromEmail,
          name: 'SubPilot',
        },
        replyTo: options?.replyTo,
        subject,
        html: htmlContent,
        text: textContent,
        categories: options?.categories,
        customArgs: options?.customArgs,
        trackingSettings: {
          clickTracking: { enable: this.isProduction },
          openTracking: { enable: this.isProduction },
        },
      };

      await sgMail.send(msg);

      console.log(
        `HTML email sent successfully to ${recipients.length} recipients`
      );
    } catch (error) {
      console.error('Failed to send HTML email:', error);
      throw new Error('HTML email delivery failed');
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(user: {
    id: string;
    email: string;
    name: string | null;
  }): Promise<void> {
    const recipient = {
      email: user.email,
      name: user.name || undefined,
    };

    const dynamicData = {
      user_name: user.name || 'there',
      login_url: `${env.NEXTAUTH_URL}/login`,
      dashboard_url: `${env.NEXTAUTH_URL}/dashboard`,
    };

    try {
      await this.sendTemplateEmail('WELCOME', [recipient], dynamicData, {
        categories: ['welcome', 'onboarding'],
        customArgs: { user_id: user.id },
      });
    } catch (error) {
      // Fallback to HTML email
      console.log('Falling back to HTML email for welcome message');

      const htmlContent = HTML_TEMPLATES.welcome({
        userName: user.name || 'there',
        loginUrl: dynamicData.login_url,
      });

      const textContent = TEXT_TEMPLATES.welcome({
        userName: user.name || 'there',
        loginUrl: dynamicData.login_url,
      });

      await this.sendHtmlEmail(
        'Welcome to SubPilot! 🎉',
        htmlContent,
        textContent,
        [recipient],
        {
          categories: ['welcome', 'onboarding'],
          customArgs: { user_id: user.id },
        }
      );
    }
  }

  /**
   * Send magic link for passwordless authentication
   */
  async sendMagicLink(
    user: { email: string; name?: string | null },
    magicLink: string,
    expiresAt: Date
  ): Promise<void> {
    const recipient = {
      email: user.email,
      name: user.name || undefined,
    };

    const dynamicData = {
      user_name: user.name || 'there',
      magic_link: magicLink,
      expires_at: expiresAt.toLocaleString(),
    };

    try {
      await this.sendTemplateEmail('MAGIC_LINK', [recipient], dynamicData, {
        categories: ['auth', 'magic-link'],
      });
    } catch (error) {
      // Fallback to HTML email
      console.log('Falling back to HTML email for magic link');

      const htmlContent = HTML_TEMPLATES.magicLink({
        userName: user.name || 'there',
        magicLink,
        expiresAt: expiresAt.toLocaleString(),
      });

      const textContent = TEXT_TEMPLATES.magicLink({
        userName: user.name || 'there',
        magicLink,
        expiresAt: expiresAt.toLocaleString(),
      });

      await this.sendHtmlEmail(
        'Sign in to SubPilot',
        htmlContent,
        textContent,
        [recipient],
        {
          categories: ['auth', 'magic-link'],
        }
      );
    }
  }

  /**
   * Send subscription alert notification
   */
  async sendSubscriptionAlert(
    user: { id: string; email: string; name: string | null },
    subscription: {
      name: string;
      amount: number;
      nextBilling: Date;
    }
  ): Promise<void> {
    const recipient = {
      email: user.email,
      name: user.name || undefined,
    };

    const dynamicData = {
      user_name: user.name || 'there',
      subscription_name: subscription.name,
      amount: `$${subscription.amount.toFixed(2)}`,
      next_billing: subscription.nextBilling.toLocaleDateString(),
      cancel_url: `${env.NEXTAUTH_URL}/dashboard/subscriptions?highlight=${encodeURIComponent(subscription.name)}`,
    };

    try {
      await this.sendTemplateEmail(
        'SUBSCRIPTION_ALERT',
        [recipient],
        dynamicData,
        {
          categories: ['alert', 'subscription'],
          customArgs: {
            user_id: user.id,
            subscription_name: subscription.name,
          },
        }
      );
    } catch (error) {
      // Fallback to HTML email
      console.log('Falling back to HTML email for subscription alert');

      const htmlContent = HTML_TEMPLATES.subscriptionAlert({
        userName: user.name || 'there',
        subscriptionName: subscription.name,
        amount: `$${subscription.amount.toFixed(2)}`,
        nextBilling: subscription.nextBilling.toLocaleDateString(),
        cancelUrl: dynamicData.cancel_url,
      });

      const textContent = TEXT_TEMPLATES.subscriptionAlert({
        userName: user.name || 'there',
        subscriptionName: subscription.name,
        amount: `$${subscription.amount.toFixed(2)}`,
        nextBilling: subscription.nextBilling.toLocaleDateString(),
        cancelUrl: dynamicData.cancel_url,
      });

      await this.sendHtmlEmail(
        `New subscription detected: ${subscription.name}`,
        htmlContent,
        textContent,
        [recipient],
        {
          categories: ['alert', 'subscription'],
          customArgs: {
            user_id: user.id,
            subscription_name: subscription.name,
          },
        }
      );
    }
  }

  /**
   * Send weekly summary email
   */
  async sendWeeklySummary(
    user: { id: string; email: string; name: string | null },
    summary: {
      totalSubscriptions: number;
      monthlyTotal: number;
      newSubscriptions: Array<{ name: string; amount: number }>;
      upcomingRenewals: Array<{ name: string; amount: number; date: Date }>;
    }
  ): Promise<void> {
    const recipient = {
      email: user.email,
      name: user.name || undefined,
    };

    const dynamicData = {
      user_name: user.name || 'there',
      total_subscriptions: summary.totalSubscriptions,
      monthly_total: `$${summary.monthlyTotal.toFixed(2)}`,
      new_subscriptions: summary.newSubscriptions,
      upcoming_renewals: summary.upcomingRenewals.map(renewal => ({
        ...renewal,
        date: renewal.date.toLocaleDateString(),
      })),
    };

    await this.sendTemplateEmail('WEEKLY_SUMMARY', [recipient], dynamicData, {
      categories: ['summary', 'weekly'],
      customArgs: { user_id: user.id },
    });
  }

  /**
   * Test email configuration
   */
  async testEmailDelivery(testEmail: string): Promise<boolean> {
    try {
      await this.sendHtmlEmail(
        'SubPilot Email Test',
        '<h1>Email Test Successful</h1><p>This is a test email from SubPilot production environment.</p>',
        'Email Test Successful\n\nThis is a test email from SubPilot production environment.',
        [{ email: testEmail }],
        {
          categories: ['test'],
        }
      );

      return true;
    } catch (error) {
      console.error('Email test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const sendGridEmailService = new SendGridEmailService();
