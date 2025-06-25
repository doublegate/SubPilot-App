/**
 * Production email templates for SendGrid
 * These templates should be created in the SendGrid dashboard
 * and referenced by their template IDs in production
 */

export const SENDGRID_TEMPLATES = {
  // Welcome email template
  WELCOME: {
    id: 'd-welcome-template-id', // Replace with actual SendGrid template ID
    subject: 'Welcome to SubPilot! 🎉',
    dynamicData: {
      user_name: 'string',
      login_url: 'string',
      dashboard_url: 'string',
    },
  },

  // Magic link authentication
  MAGIC_LINK: {
    id: 'd-magic-link-template-id', // Replace with actual SendGrid template ID
    subject: 'Sign in to SubPilot',
    dynamicData: {
      user_name: 'string',
      magic_link: 'string',
      expires_at: 'string',
    },
  },

  // Password reset
  PASSWORD_RESET: {
    id: 'd-password-reset-template-id', // Replace with actual SendGrid template ID
    subject: 'Reset your SubPilot password',
    dynamicData: {
      user_name: 'string',
      reset_link: 'string',
      expires_at: 'string',
    },
  },

  // Subscription alert
  SUBSCRIPTION_ALERT: {
    id: 'd-subscription-alert-template-id', // Replace with actual SendGrid template ID
    subject: 'New subscription detected: {{subscription_name}}',
    dynamicData: {
      user_name: 'string',
      subscription_name: 'string',
      amount: 'string',
      next_billing: 'string',
      cancel_url: 'string',
    },
  },

  // Weekly summary
  WEEKLY_SUMMARY: {
    id: 'd-weekly-summary-template-id', // Replace with actual SendGrid template ID
    subject: 'Your weekly subscription summary',
    dynamicData: {
      user_name: 'string',
      total_subscriptions: 'number',
      monthly_total: 'string',
      new_subscriptions: 'array',
      upcoming_renewals: 'array',
    },
  },

  // Cancellation confirmation
  CANCELLATION_CONFIRMATION: {
    id: 'd-cancellation-confirmation-template-id', // Replace with actual SendGrid template ID
    subject: 'Subscription cancelled: {{subscription_name}}',
    dynamicData: {
      user_name: 'string',
      subscription_name: 'string',
      cancellation_date: 'string',
      final_billing_date: 'string',
    },
  },
} as const;

/**
 * HTML email templates for fallback/development
 * Use these when SendGrid templates are not available
 */
export const HTML_TEMPLATES = {
  welcome: (data: { userName: string; loginUrl: string }) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Welcome to SubPilot</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #06B6D4; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #06B6D4; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SubPilot</div>
          </div>
          
          <h1>Welcome to SubPilot, ${data.userName}! 🎉</h1>
          
          <p>We're excited to help you take control of your recurring subscriptions and save money.</p>
          
          <p>Get started by:</p>
          <ul>
            <li>Connecting your first bank account</li>
            <li>Reviewing detected subscriptions</li>
            <li>Setting up cancellation alerts</li>
          </ul>
          
          <a href="${data.loginUrl}" class="button">Get Started</a>
          
          <p>If you have any questions, feel free to reach out to our support team.</p>
          
          <div class="footer">
            <p>Best regards,<br>The SubPilot Team</p>
            <p>
              <a href="https://subpilot.com">subpilot.com</a> | 
              <a href="https://subpilot.com/support">Support</a> | 
              <a href="https://subpilot.com/unsubscribe">Unsubscribe</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `,

  magicLink: (data: {
    userName: string;
    magicLink: string;
    expiresAt: string;
  }) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Sign in to SubPilot</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #06B6D4; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #06B6D4; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .warning { background: #FEF3C7; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SubPilot</div>
          </div>
          
          <h1>Sign in to SubPilot</h1>
          
          <p>Hi ${data.userName},</p>
          
          <p>Click the link below to sign in to your SubPilot account:</p>
          
          <a href="${data.magicLink}" class="button">Sign In to SubPilot</a>
          
          <div class="warning">
            <p><strong>Security note:</strong> This link expires at ${data.expiresAt}. If you didn't request this sign-in link, you can safely ignore this email.</p>
          </div>
          
          <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all;">${data.magicLink}</p>
          
          <div class="footer">
            <p>Best regards,<br>The SubPilot Team</p>
            <p>
              <a href="https://subpilot.com">subpilot.com</a> | 
              <a href="https://subpilot.com/support">Support</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `,

  subscriptionAlert: (data: {
    userName: string;
    subscriptionName: string;
    amount: string;
    nextBilling: string;
    cancelUrl: string;
  }) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>New Subscription Detected</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #06B6D4; }
          .alert { background: #FEF3C7; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .subscription-details { background: #F3F4F6; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #EF4444; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 10px 5px;
          }
          .button-secondary { background: #06B6D4; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SubPilot</div>
          </div>
          
          <div class="alert">
            <h1>🚨 New Subscription Detected</h1>
          </div>
          
          <p>Hi ${data.userName},</p>
          
          <p>We've detected a new recurring subscription on your connected accounts:</p>
          
          <div class="subscription-details">
            <h3>${data.subscriptionName}</h3>
            <p><strong>Amount:</strong> ${data.amount}</p>
            <p><strong>Next billing:</strong> ${data.nextBilling}</p>
          </div>
          
          <p>If this subscription is unexpected or unwanted, you can take action:</p>
          
          <div style="text-align: center;">
            <a href="${data.cancelUrl}" class="button">Help Me Cancel</a>
            <a href="https://subpilot.com/dashboard" class="button button-secondary">View Dashboard</a>
          </div>
          
          <p><em>This alert was sent because you have subscription monitoring enabled. You can adjust your notification preferences in your dashboard.</em></p>
          
          <div class="footer">
            <p>Best regards,<br>The SubPilot Team</p>
            <p>
              <a href="https://subpilot.com/dashboard">Dashboard</a> | 
              <a href="https://subpilot.com/settings">Settings</a> | 
              <a href="https://subpilot.com/support">Support</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `,
};

/**
 * Text-only email templates for fallback
 */
export const TEXT_TEMPLATES = {
  welcome: (data: { userName: string; loginUrl: string }) => `
Welcome to SubPilot, ${data.userName}!

We're excited to help you take control of your recurring subscriptions and save money.

Get started by:
- Connecting your first bank account
- Reviewing detected subscriptions  
- Setting up cancellation alerts

Get started: ${data.loginUrl}

If you have any questions, feel free to reach out to our support team.

Best regards,
The SubPilot Team

--
SubPilot - Your command center for recurring finances
https://subpilot.com
  `,

  magicLink: (data: {
    userName: string;
    magicLink: string;
    expiresAt: string;
  }) => `
Sign in to SubPilot

Hi ${data.userName},

Click the link below to sign in to your SubPilot account:

${data.magicLink}

This link expires at ${data.expiresAt}. If you didn't request this sign-in link, you can safely ignore this email.

Best regards,
The SubPilot Team

--
SubPilot - Your command center for recurring finances
https://subpilot.com
  `,

  subscriptionAlert: (data: {
    userName: string;
    subscriptionName: string;
    amount: string;
    nextBilling: string;
    cancelUrl: string;
  }) => `
🚨 New Subscription Detected

Hi ${data.userName},

We've detected a new recurring subscription on your connected accounts:

${data.subscriptionName}
Amount: ${data.amount}
Next billing: ${data.nextBilling}

If this subscription is unexpected or unwanted, you can take action:
- Get cancellation help: ${data.cancelUrl}
- View dashboard: https://subpilot.com/dashboard

This alert was sent because you have subscription monitoring enabled. You can adjust your notification preferences in your dashboard.

Best regards,
The SubPilot Team

--
SubPilot - Your command center for recurring finances
https://subpilot.com
  `,
};
