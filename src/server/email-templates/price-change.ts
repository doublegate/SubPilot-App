import { baseEmailTemplate } from './base-template';

export interface PriceChangeProps {
  userName: string;
  subscription: {
    name: string;
    oldAmount: string;
    newAmount: string;
    percentageChange: string;
    isIncrease: boolean;
  };
}

export function priceChangeTemplate({
  userName,
  subscription,
}: PriceChangeProps) {
  const changeIcon = subscription.isIncrease ? '📈' : '📉';
  const changeColor = subscription.isIncrease ? '#dc2626' : '#059669';
  const changeText = subscription.isIncrease ? 'increased' : 'decreased';

  const content = `
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 20px;">
      Price ${changeText} for ${subscription.name} ${changeIcon}
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
      Hi ${userName}, we noticed a price change for one of your subscriptions:
    </p>
    
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
        ${subscription.name}
      </h3>
      
      <div style="display: flex; align-items: center; justify-content: space-between; margin: 16px 0;">
        <div style="text-align: center; flex: 1;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px;">Previous price</p>
          <p style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0;">
            ${subscription.oldAmount}
          </p>
        </div>
        
        <div style="text-align: center; padding: 0 16px;">
          <span style="color: ${changeColor}; font-size: 24px;">→</span>
        </div>
        
        <div style="text-align: center; flex: 1;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px;">New price</p>
          <p style="color: ${changeColor}; font-size: 20px; font-weight: 600; margin: 0;">
            ${subscription.newAmount}
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <p style="color: ${changeColor}; font-size: 16px; font-weight: 600; margin: 0;">
          ${subscription.percentageChange}% ${subscription.isIncrease ? 'increase' : 'decrease'}
        </p>
      </div>
    </div>
    
    ${
      subscription.isIncrease
        ? `
      <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <h4 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 8px;">
          Want to cancel?
        </h4>
        <p style="color: #92400e; font-size: 14px; line-height: 20px; margin: 0;">
          If this price increase is too much, we can help you cancel this subscription or find alternatives.
        </p>
      </div>
    `
        : ''
    }
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://subpilot.com/dashboard/subscriptions" 
         class="btn-primary"
         style="background: linear-gradient(135deg, #06B6D4, #9333EA); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        View Subscription Details
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
      This price change will apply to your next billing cycle. We'll continue monitoring this subscription for any future changes.
    </p>
  `;

  return baseEmailTemplate({
    preheader: `${subscription.name} price ${changeText} by ${subscription.percentageChange}%`,
    content,
  });
}
