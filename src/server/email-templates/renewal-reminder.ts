import { baseEmailTemplate } from './base-template';

export interface RenewalReminderProps {
  userName: string;
  subscription: {
    name: string;
    amount: string;
    renewalDate: string;
    daysUntilRenewal: number;
  };
}

export function renewalReminderTemplate({
  userName,
  subscription,
}: RenewalReminderProps) {
  const urgencyColor =
    subscription.daysUntilRenewal <= 3 ? '#dc2626' : '#f59e0b';
  const urgencyBg = subscription.daysUntilRenewal <= 3 ? '#fee2e2' : '#fef3c7';
  const urgencyBorder =
    subscription.daysUntilRenewal <= 3 ? '#fca5a5' : '#fbbf24';

  const content = `
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 20px;">
      ${subscription.name} renews in ${subscription.daysUntilRenewal} days ⏰
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
      Hi ${userName}, just a reminder that your subscription is coming up for renewal:
    </p>
    
    <div style="background-color: ${urgencyBg}; border: 1px solid ${urgencyBorder}; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="color: ${urgencyColor}; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
        ${subscription.name}
      </h3>
      <table style="width: 100%;">
        <tr>
          <td style="color: #92400e; font-size: 14px; padding: 4px 0;">Renewal date:</td>
          <td style="color: ${urgencyColor}; font-size: 16px; font-weight: 600; text-align: right;">
            ${subscription.renewalDate}
          </td>
        </tr>
        <tr>
          <td style="color: #92400e; font-size: 14px; padding: 4px 0;">Amount:</td>
          <td style="color: ${urgencyColor}; font-size: 16px; font-weight: 600; text-align: right;">
            ${subscription.amount}
          </td>
        </tr>
        <tr>
          <td style="color: #92400e; font-size: 14px; padding: 4px 0;">Days until renewal:</td>
          <td style="color: ${urgencyColor}; font-size: 16px; font-weight: 600; text-align: right;">
            ${subscription.daysUntilRenewal} ${subscription.daysUntilRenewal === 1 ? 'day' : 'days'}
          </td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px;">
        What would you like to do?
      </h4>
      <div style="text-align: center; margin-top: 20px;">
        <a href="https://subpilot.com/dashboard/subscriptions/${subscription.name}" 
           style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 14px; margin: 0 8px 8px 0;">
          Keep Subscription
        </a>
        <a href="https://subpilot.com/dashboard/subscriptions/${subscription.name}/cancel" 
           style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 14px; margin: 0 8px 8px 0;">
          Cancel Before Renewal
        </a>
      </div>
    </div>
    
    ${
      subscription.daysUntilRenewal <= 3
        ? `
    <div style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="color: #dc2626; font-size: 14px; line-height: 20px; margin: 0;">
        <strong>⚠️ Time is running out!</strong> If you want to cancel this subscription, you should do it now to avoid being charged.
      </p>
    </div>
    `
        : ''
    }
    
    <div style="margin: 32px 0;">
      <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px;">
        Not sure if you need this subscription?
      </h4>
      <p style="color: #374151; font-size: 14px; line-height: 20px; margin: 0 0 8px;">
        Ask yourself:
      </p>
      <ul style="color: #374151; font-size: 14px; line-height: 20px; margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 4px;">Have you used it in the last 30 days?</li>
        <li style="margin-bottom: 4px;">Does it provide unique value you can't get elsewhere?</li>
        <li style="margin-bottom: 4px;">Is the price worth the value you're getting?</li>
      </ul>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
      You can manage your renewal reminders in your 
      <a href="https://subpilot.com/settings/notifications" style="color: #7c3aed; text-decoration: none;">notification settings</a>.
    </p>
  `;

  return baseEmailTemplate({
    preheader: `${subscription.name} renews in ${subscription.daysUntilRenewal} days for ${subscription.amount}`,
    content,
  });
}
