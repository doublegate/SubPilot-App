import { baseEmailTemplate } from './base-template';

export interface TrialEndingProps {
  userName: string;
  subscription: {
    name: string;
    trialEndDate: string;
    daysUntilEnd: number;
    amount: string;
  };
}

export function trialEndingTemplate({
  userName,
  subscription,
}: TrialEndingProps) {
  const urgencyColor = subscription.daysUntilEnd <= 3 ? '#dc2626' : '#f59e0b';

  const content = `
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 20px;">
      Your ${subscription.name} trial ends in ${subscription.daysUntilEnd} days 🔔
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
      Hi ${userName}, your free trial is about to end. Here's what you need to know:
    </p>
    
    <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="color: #92400e; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
        Trial ending soon
      </h3>
      <table style="width: 100%;">
        <tr>
          <td style="color: #92400e; font-size: 14px; padding: 4px 0;">Service:</td>
          <td style="color: #92400e; font-size: 16px; font-weight: 600; text-align: right;">
            ${subscription.name}
          </td>
        </tr>
        <tr>
          <td style="color: #92400e; font-size: 14px; padding: 4px 0;">Trial ends:</td>
          <td style="color: ${urgencyColor}; font-size: 16px; font-weight: 600; text-align: right;">
            ${subscription.trialEndDate}
          </td>
        </tr>
        <tr>
          <td style="color: #92400e; font-size: 14px; padding: 4px 0;">Price after trial:</td>
          <td style="color: #92400e; font-size: 16px; font-weight: 600; text-align: right;">
            ${subscription.amount}
          </td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px;">
        What happens when the trial ends?
      </h4>
      <p style="color: #374151; font-size: 14px; line-height: 20px; margin: 0 0 12px;">
        You'll automatically be charged ${subscription.amount} and your subscription will continue unless you cancel before ${subscription.trialEndDate}.
      </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://subpilot.com/dashboard/subscriptions/${subscription.name}" 
         class="btn-primary"
         style="background: linear-gradient(135deg, #06B6D4, #9333EA); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; margin: 0 8px 8px 0;">
        Review Subscription
      </a>
      <a href="https://subpilot.com/dashboard/subscriptions/${subscription.name}/cancel" 
         style="color: #dc2626; padding: 14px 32px; text-decoration: none; border: 2px solid #dc2626; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; margin: 0 8px 8px 0;">
        Cancel Trial
      </a>
    </div>
    
    ${
      subscription.daysUntilEnd <= 3
        ? `
    <div style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="color: #dc2626; font-size: 14px; line-height: 20px; margin: 0;">
        <strong>⚠️ Urgent:</strong> Your trial ends in just ${subscription.daysUntilEnd} ${subscription.daysUntilEnd === 1 ? 'day' : 'days'}! Cancel now if you don't want to be charged ${subscription.amount}.
      </p>
    </div>
    `
        : ''
    }
    
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <h4 style="color: #166534; font-size: 14px; font-weight: 600; margin: 0 0 4px;">
        💡 Pro tip
      </h4>
      <p style="color: #166534; font-size: 14px; line-height: 20px; margin: 0;">
        Not sure if you want to continue? Many services offer discounts if you cancel and then re-subscribe later. It might be worth canceling now and waiting for a better deal!
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
      We'll keep tracking this subscription for you. If you decide to continue, we'll monitor for price changes and send renewal reminders.
    </p>
  `;

  return baseEmailTemplate({
    preheader: `${subscription.name} trial ends in ${subscription.daysUntilEnd} days - ${subscription.amount} charge coming`,
    content,
  });
}
