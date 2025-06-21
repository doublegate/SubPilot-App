import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { DashboardStats } from '@/components/dashboard-stats';

describe('DashboardStats', () => {
  const mockStats = {
    totalSubscriptions: 8,
    activeSubscriptions: 6,
    totalMonthlySpend: 125.50,
    totalYearlySpend: 1506.00,
    upcomingRenewals: 3,
  };

  it('renders all stat cards', () => {
    render(<DashboardStats stats={mockStats} />);

    expect(screen.getByText('Total Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Active Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Monthly Spend')).toBeInTheDocument();
    expect(screen.getByText('Yearly Spend')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Renewals')).toBeInTheDocument();
  });

  it('displays correct values', () => {
    render(<DashboardStats stats={mockStats} />);

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('$125.50')).toBeInTheDocument();
    expect(screen.getByText('$1,506.00')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('handles zero values gracefully', () => {
    const zeroStats = {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalMonthlySpend: 0,
      totalYearlySpend: 0,
      upcomingRenewals: 0,
    };

    render(<DashboardStats stats={zeroStats} />);

    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('shows loading state when stats are undefined', () => {
    render(<DashboardStats stats={undefined} />);

    // Should show skeleton loaders
    expect(screen.getAllByTestId('stat-skeleton')).toHaveLength(5);
  });

  it('shows trend indicators for changes', () => {
    const statsWithTrends = {
      ...mockStats,
      monthlySpendChange: 15.5,
      activeSubscriptionsChange: -1,
    };

    render(<DashboardStats stats={statsWithTrends} />);

    // Should show up arrow for positive change
    expect(screen.getByTestId('trend-up')).toBeInTheDocument();
    // Should show down arrow for negative change
    expect(screen.getByTestId('trend-down')).toBeInTheDocument();
  });

  it('formats currency correctly for different amounts', () => {
    const largeAmountStats = {
      ...mockStats,
      totalMonthlySpend: 1234.56,
      totalYearlySpend: 14814.72,
    };

    render(<DashboardStats stats={largeAmountStats} />);

    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    expect(screen.getByText('$14,814.72')).toBeInTheDocument();
  });

  it('handles very large numbers with appropriate formatting', () => {
    const massiveStats = {
      ...mockStats,
      totalSubscriptions: 1000,
      totalYearlySpend: 999999.99,
    };

    render(<DashboardStats stats={massiveStats} />);

    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('$999,999.99')).toBeInTheDocument();
  });

  it('shows appropriate icons for each stat', () => {
    render(<DashboardStats stats={mockStats} />);

    // Test for presence of icons (these would be specific to your implementation)
    expect(screen.getByTestId('subscriptions-icon')).toBeInTheDocument();
    expect(screen.getByTestId('active-icon')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-spend-icon')).toBeInTheDocument();
    expect(screen.getByTestId('yearly-spend-icon')).toBeInTheDocument();
    expect(screen.getByTestId('upcoming-icon')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(<DashboardStats stats={mockStats} />);

    const statsContainer = screen.getByTestId('dashboard-stats');
    expect(statsContainer).toHaveClass('grid', 'gap-4');
  });

  it('handles negative values appropriately', () => {
    const negativeStats = {
      ...mockStats,
      monthlySpendChange: -25.75,
    };

    render(<DashboardStats stats={negativeStats} />);

    // Should show decrease styling for negative changes
    expect(screen.getByTestId('trend-down')).toHaveClass('text-red-500');
  });
});