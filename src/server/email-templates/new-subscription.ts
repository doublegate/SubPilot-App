import { baseEmailTemplate } from './base-template';

export interface NewSubscriptionProps {
  userName: string;
  subscription: {
    name: string;
    amount: string;
    frequency: string;
    category: string;
  };
}

export function newSubscriptionTemplate({
  userName,
  subscription,
}: NewSubscriptionProps) {
  const content = `
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 20px;">
      New subscription detected 🔍
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
      Hi ${userName}, we've detected a new subscription in your transactions:
    </p>
    
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
        ${subscription.name}
      </h3>
      <table style="width: 100%;">
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">Amount:</td>
          <td style="color: #1f2937; font-size: 16px; font-weight: 600; text-align: right;">
            ${subscription.amount}
          </td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">Billing cycle:</td>
          <td style="color: #1f2937; font-size: 16px; text-align: right;">
            ${subscription.frequency}
          </td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">Category:</td>
          <td style="color: #1f2937; font-size: 16px; text-align: right;">
            ${subscription.category}
          </td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://subpilot.com/dashboard/subscriptions" 
         class="btn-primary"
         style="background: linear-gradient(135deg, #06B6D4, #9333EA); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        View Subscription
      </a>
    </div>
    
    <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="color: #92400e; font-size: 14px; line-height: 20px; margin: 0;">
        <strong>Not your subscription?</strong> If you don't recognize this charge, you can mark it as "not a subscription" in your dashboard.
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
      We'll track this subscription and notify you about renewals, price changes, or any issues with payments.
    </p>
  `;

  return baseEmailTemplate({
    preheader: `New subscription detected: ${subscription.name} for ${subscription.amount}`,
    content,
  });
}
