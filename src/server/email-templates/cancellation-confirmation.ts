import { baseEmailTemplate } from './base-template';

export interface CancellationConfirmationProps {
  userName: string;
  subscription: {
    name: string;
    amount: string;
    endDate: string;
  };
}

export function cancellationConfirmationTemplate({
  userName,
  subscription,
}: CancellationConfirmationProps) {
  const content = `
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 20px;">
      ${subscription.name} has been cancelled ✅
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
      Hi ${userName}, your subscription has been successfully cancelled.
    </p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="color: #166534; font-size: 18px; font-weight: 600; margin: 0 0 16px;">
        Cancellation confirmed
      </h3>
      <table style="width: 100%;">
        <tr>
          <td style="color: #166534; font-size: 14px; padding: 4px 0;">Service:</td>
          <td style="color: #166534; font-size: 16px; font-weight: 600; text-align: right;">
            ${subscription.name}
          </td>
        </tr>
        <tr>
          <td style="color: #166534; font-size: 14px; padding: 4px 0;">Monthly savings:</td>
          <td style="color: #166534; font-size: 16px; font-weight: 600; text-align: right;">
            ${subscription.amount}
          </td>
        </tr>
        <tr>
          <td style="color: #166534; font-size: 14px; padding: 4px 0;">Access until:</td>
          <td style="color: #166534; font-size: 16px; text-align: right;">
            ${subscription.endDate}
          </td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px;">
        What happens next?
      </h4>
      <ul style="color: #374151; font-size: 14px; line-height: 20px; margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">
          You'll continue to have access until ${subscription.endDate}
        </li>
        <li style="margin-bottom: 8px;">
          No more charges will occur after this date
        </li>
        <li style="margin-bottom: 8px;">
          We've updated your subscription tracking accordingly
        </li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://subpilot.com/dashboard/subscriptions" 
         class="btn-primary"
         style="background: linear-gradient(135deg, #06B6D4, #9333EA); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        View All Subscriptions
      </a>
    </div>
    
    <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <h4 style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 4px;">
        Changed your mind?
      </h4>
      <p style="color: #92400e; font-size: 14px; line-height: 20px; margin: 0;">
        You may be able to reactivate your subscription before ${subscription.endDate}. Check with ${subscription.name} directly if you want to continue your service.
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
      Great job managing your subscriptions! You're now saving ${subscription.amount} per month. 🎉
    </p>
  `;

  return baseEmailTemplate({
    preheader: `${subscription.name} successfully cancelled - saving ${subscription.amount}/month`,
    content,
  });
}
