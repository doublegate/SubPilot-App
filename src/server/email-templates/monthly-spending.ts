import { baseEmailTemplate } from './base-template';

export interface MonthlySpendingProps {
  userName: string;
  month: string;
  totalSpent: string;
  subscriptionCount: number;
  topCategories: Array<{
    category: string;
    amount: string;
  }>;
  monthlyChange: number;
  changeDirection: 'increased' | 'decreased';
}

export function monthlySpendingTemplate({
  userName,
  month,
  totalSpent,
  subscriptionCount,
  topCategories,
  monthlyChange,
  changeDirection,
}: MonthlySpendingProps) {
  const changeColor = changeDirection === 'increased' ? '#dc2626' : '#059669';
  const changeIcon = changeDirection === 'increased' ? '📈' : '📉';

  const content = `
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 20px;">
      Your ${month} subscription summary 📊
    </h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
      Hi ${userName}, here's how your subscriptions performed last month:
    </p>
    
    <!-- Total Spending Card -->
    <div style="background: linear-gradient(135deg, #06B6D4, #9333EA); border-radius: 8px; padding: 32px; margin: 24px 0; text-align: center;">
      <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 0 0 8px;">Total spent on subscriptions</p>
      <h3 style="color: white; font-size: 36px; font-weight: 700; margin: 0 0 8px;">
        ${totalSpent}
      </h3>
      <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">
        across ${subscriptionCount} active subscriptions
      </p>
    </div>
    
    <!-- Monthly Change -->
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">Compared to last month</p>
      <p style="color: ${changeColor}; font-size: 24px; font-weight: 600; margin: 0;">
        ${changeIcon} ${Math.abs(monthlyChange).toFixed(1)}% ${changeDirection}
      </p>
    </div>
    
    <!-- Top Categories -->
    <div style="margin: 32px 0;">
      <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 16px;">
        Top spending categories
      </h3>
      ${topCategories
        .map(
          (cat, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center;">
            <span style="background-color: #e5e7eb; color: #1f2937; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px;">
              ${index + 1}
            </span>
            <span style="color: #374151; font-size: 16px;">${cat.category}</span>
          </div>
          <span style="color: #1f2937; font-size: 16px; font-weight: 600;">${cat.amount}</span>
        </div>
      `
        )
        .join('')}
    </div>
    
    <!-- Action Buttons -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://subpilot.com/dashboard/analytics" 
         class="btn-primary"
         style="background: linear-gradient(135deg, #06B6D4, #9333EA); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; margin: 0 8px 8px 0;">
        View Detailed Analytics
      </a>
      <a href="https://subpilot.com/dashboard/subscriptions" 
         style="color: #7c3aed; padding: 14px 32px; text-decoration: none; border: 2px solid #7c3aed; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; margin: 0 8px 8px 0;">
        Manage Subscriptions
      </a>
    </div>
    
    <!-- Tips Section -->
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <h4 style="color: #166534; font-size: 16px; font-weight: 600; margin: 0 0 8px;">
        💡 Savings tip
      </h4>
      <p style="color: #166534; font-size: 14px; line-height: 20px; margin: 0;">
        Review your least-used subscriptions. Canceling just 2-3 unused services could save you over $50/month!
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
      We'll send your next summary on the 1st of next month. You can change your notification preferences in your 
      <a href="https://subpilot.com/settings/notifications" style="color: #7c3aed; text-decoration: none;">settings</a>.
    </p>
  `;

  return baseEmailTemplate({
    preheader: `You spent ${totalSpent} on ${subscriptionCount} subscriptions in ${month}`,
    content,
  });
}
