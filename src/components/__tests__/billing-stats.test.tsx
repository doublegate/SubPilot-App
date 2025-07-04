import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BillingStats } from '../admin/billing-stats';

const mockStats = {
  totalRevenue: 150000, // $1,500.00 in cents
  monthlyRevenue: 25000, // $250.00 in cents
  activeSubscriptions: [
    { planId: 'pro', _count: 45 },
    { planId: 'team', _count: 15 },
    { planId: 'enterprise', _count: 5 },
  ],
  churnRate: 3, // 3 customers churned
};

const emptyStats = {
  totalRevenue: 0,
  monthlyRevenue: 0,
  activeSubscriptions: [],
  churnRate: 0,
};

const singlePlanStats = {
  totalRevenue: 50000,
  monthlyRevenue: 10000,
  activeSubscriptions: [{ planId: 'pro', _count: 10 }],
  churnRate: 1,
};

describe('BillingStats', () => {
  it('renders all stat cards', () => {
    render(<BillingStats stats={mockStats} />);

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
    expect(screen.getByText('Active Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Churn Rate')).toBeInTheDocument();
  });

  it('formats revenue correctly', () => {
    render(<BillingStats stats={mockStats} />);

    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });

  it('calculates total active subscriptions correctly', () => {
    render(<BillingStats stats={mockStats} />);

    // 45 + 15 + 5 = 65
    expect(screen.getByText('65')).toBeInTheDocument();
  });

  it('calculates churn rate percentage correctly', () => {
    render(<BillingStats stats={mockStats} />);

    // 3 / 65 * 100 = 4.6%
    expect(screen.getByText('4.6%')).toBeInTheDocument();
  });

  it('displays trend indicators', () => {
    render(<BillingStats stats={mockStats} />);

    expect(screen.getByText('+23%')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
    expect(screen.getByText('-2%')).toBeInTheDocument();
  });

  it('shows correct trend colors', () => {
    render(<BillingStats stats={mockStats} />);

    const positiveTrends = screen.getAllByText(/^\+/);
    positiveTrends.forEach(trend => {
      expect(trend).toHaveClass('text-green-600');
    });

    const negativeTrend = screen.getByText('-2%');
    expect(negativeTrend).toHaveClass('text-red-600');
  });

  it('handles empty stats gracefully', () => {
    render(<BillingStats stats={emptyStats} />);

    // Should have multiple $0.00 values (total and monthly revenue)
    const zeroAmounts = screen.getAllByText('$0.00');
    expect(zeroAmounts.length).toBeGreaterThanOrEqual(1);

    // Find the active subscriptions count
    const activeSubscriptionsElement = screen
      .getByText('Active Subscriptions')
      .closest('.rounded-lg');
    expect(activeSubscriptionsElement).toBeInTheDocument();

    // Churn rate with zero active subscriptions should show NaN as 0.0%
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('handles single plan stats', () => {
    render(<BillingStats stats={singlePlanStats} />);

    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('10.0%')).toBeInTheDocument(); // 1/10 * 100
  });

  it('formats large revenue numbers correctly', () => {
    const largeStats = {
      ...mockStats,
      totalRevenue: 123456789, // $1,234,567.89
      monthlyRevenue: 9876543, // $98,765.43
    };

    render(<BillingStats stats={largeStats} />);

    expect(screen.getByText('$1,234,567.89')).toBeInTheDocument();
    expect(screen.getByText('$98,765.43')).toBeInTheDocument();
  });

  it('handles zero monthly revenue', () => {
    const zeroMonthlyStats = {
      ...mockStats,
      monthlyRevenue: 0,
    };

    render(<BillingStats stats={zeroMonthlyStats} />);

    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('handles high churn rate', () => {
    const highChurnStats = {
      ...mockStats,
      churnRate: 20, // 20 customers churned out of 65
    };

    render(<BillingStats stats={highChurnStats} />);

    expect(screen.getByText('30.8%')).toBeInTheDocument(); // 20/65 * 100
  });

  it('displays correct card structure', () => {
    render(<BillingStats stats={mockStats} />);

    // Should have 4 stat cards by checking for card titles
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
    expect(screen.getByText('Active Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Churn Rate')).toBeInTheDocument();
  });

  it('shows appropriate descriptions for each stat', () => {
    render(<BillingStats stats={mockStats} />);

    expect(screen.getByText('All-time revenue')).toBeInTheDocument();
    expect(screen.getByText('Current month')).toBeInTheDocument();
    expect(screen.getByText('Paid accounts')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('handles fractional cents correctly', () => {
    const fractionalStats = {
      ...mockStats,
      totalRevenue: 12345, // $123.45
      monthlyRevenue: 6789, // $67.89
    };

    render(<BillingStats stats={fractionalStats} />);

    expect(screen.getByText('$123.45')).toBeInTheDocument();
    expect(screen.getByText('$67.89')).toBeInTheDocument();
  });

  it('handles very small churn rate', () => {
    const lowChurnStats = {
      ...mockStats,
      activeSubscriptions: [{ planId: 'pro', _count: 1000 }],
      churnRate: 1,
    };

    render(<BillingStats stats={lowChurnStats} />);

    expect(screen.getByText('0.1%')).toBeInTheDocument(); // 1/1000 * 100
  });

  it('handles multiple subscription plans with different counts', () => {
    const multiPlanStats = {
      ...mockStats,
      activeSubscriptions: [
        { planId: 'starter', _count: 100 },
        { planId: 'pro', _count: 50 },
        { planId: 'team', _count: 20 },
        { planId: 'enterprise', _count: 5 },
      ],
    };

    render(<BillingStats stats={multiPlanStats} />);

    // 100 + 50 + 20 + 5 = 175
    expect(screen.getByText('175')).toBeInTheDocument();
  });

  it('displays icons for each stat card', () => {
    render(<BillingStats stats={mockStats} />);

    // Icons are SVG elements, check for their presence via class or selector
    const container = document.querySelector('.grid');
    expect(container).toBeInTheDocument();

    // Check that icons exist by looking for SVG elements with specific classes
    const svgIcons = container?.querySelectorAll('svg');
    expect(svgIcons?.length).toBe(4);
  });

  it('does not crash with missing trend data', () => {
    // Total Revenue card has no trend
    render(<BillingStats stats={mockStats} />);

    // Should render without trend for Total Revenue - just check it exists
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('All-time revenue')).toBeInTheDocument();
  });
});
