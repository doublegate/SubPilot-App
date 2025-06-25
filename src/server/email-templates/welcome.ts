import { baseEmailTemplate } from './base-template';

export interface WelcomeEmailProps {
  userName: string;
}

export function welcomeEmailTemplate({ userName }: WelcomeEmailProps) {
  const content = `
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 20px;">
      Welcome to SubPilot, ${userName}! 🎉
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
      We're thrilled to have you on board! SubPilot is here to help you take control of your recurring expenses and never miss a subscription again.
    </p>
    
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 16px;">
        Here's what you can do with SubPilot:
      </h3>
      <ul style="color: #374151; font-size: 16px; line-height: 24px; margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">
          <strong>Connect your bank accounts</strong> - We'll automatically detect your subscriptions
        </li>
        <li style="margin-bottom: 8px;">
          <strong>Track spending</strong> - See exactly where your money goes each month
        </li>
        <li style="margin-bottom: 8px;">
          <strong>Get alerts</strong> - Never be surprised by price changes or renewals
        </li>
        <li style="margin-bottom: 8px;">
          <strong>Cancel easily</strong> - We'll help you cancel unwanted subscriptions
        </li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://subpilot.com/dashboard" 
         class="btn-primary"
         style="background: linear-gradient(135deg, #06B6D4, #9333EA); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        Get Started
      </a>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 24px;">
      <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px;">
        Next steps:
      </h4>
      <ol style="color: #374151; font-size: 16px; line-height: 24px; margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Connect your first bank account</li>
        <li style="margin-bottom: 8px;">Let us scan for subscriptions (takes ~30 seconds)</li>
        <li style="margin-bottom: 8px;">Review and organize your subscriptions</li>
      </ol>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
      If you have any questions, just reply to this email or visit our 
      <a href="https://subpilot.com/help" style="color: #7c3aed; text-decoration: none;">help center</a>.
    </p>
  `;

  return baseEmailTemplate({
    preheader:
      'Welcome to SubPilot! Get started with managing your subscriptions.',
    content,
  });
}
