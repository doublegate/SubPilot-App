import { baseEmailTemplate } from './base-template';

export interface PaymentFailedProps {
  userName: string;
  subscription: {
    name: string;
    amount: string;
    errorMessage: string;
  };
}

export function paymentFailedTemplate({
  userName,
  subscription,
}: PaymentFailedProps) {
  const content = `
    <h2 style="color: #dc2626; font-size: 24px; font-weight: 600; margin: 0 0 20px;">
      Payment failed for ${subscription.name} ❌
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
      Hi ${userName}, we noticed a payment issue with one of your subscriptions:
    </p>
    
    <div style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="color: #dc2626; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
        Payment unsuccessful
      </h3>
      <table style="width: 100%;">
        <tr>
          <td style="color: #dc2626; font-size: 14px; padding: 4px 0;">Service:</td>
          <td style="color: #dc2626; font-size: 16px; font-weight: 600; text-align: right;">
            ${subscription.name}
          </td>
        </tr>
        <tr>
          <td style="color: #dc2626; font-size: 14px; padding: 4px 0;">Amount:</td>
          <td style="color: #dc2626; font-size: 16px; text-align: right;">
            ${subscription.amount}
          </td>
        </tr>
        <tr>
          <td style="color: #dc2626; font-size: 14px; padding: 4px 0;">Issue:</td>
          <td style="color: #dc2626; font-size: 14px; text-align: right;">
            ${subscription.errorMessage}
          </td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px;">
        What should you do?
      </h4>
      <ol style="color: #374151; font-size: 14px; line-height: 20px; margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">
          <strong>Check your payment method</strong> - Make sure your card hasn't expired and has sufficient funds
        </li>
        <li style="margin-bottom: 8px;">
          <strong>Update payment details</strong> - Log into ${subscription.name} to update your billing information
        </li>
        <li style="margin-bottom: 8px;">
          <strong>Contact support</strong> - If the issue persists, reach out to ${subscription.name}'s support team
        </li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://subpilot.com/dashboard/subscriptions/${subscription.name}" 
         class="btn-primary"
         style="background: linear-gradient(135deg, #06B6D4, #9333EA); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        View Subscription Details
      </a>
    </div>
    
    <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <h4 style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 4px;">
        ⚠️ Service may be interrupted
      </h4>
      <p style="color: #92400e; font-size: 14px; line-height: 20px; margin: 0;">
        If you don't resolve this payment issue, ${subscription.name} may suspend or cancel your service. Most services give you a few days to update your payment method.
      </p>
    </div>
    
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <h4 style="color: #166534; font-size: 14px; font-weight: 600; margin: 0 0 4px;">
        Don't need this subscription anymore?
      </h4>
      <p style="color: #166534; font-size: 14px; line-height: 20px; margin: 0;">
        This might be a good opportunity to cancel if you're not using ${subscription.name} regularly. You can always resubscribe later if needed.
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
      We'll update you once this payment issue is resolved. If you need help managing this subscription, just reply to this email.
    </p>
  `;

  return baseEmailTemplate({
    preheader: `Action required: Payment failed for ${subscription.name}`,
    content,
  });
}
