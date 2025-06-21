import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { DashboardStats } from '@/components/dashboard-stats';

describe('DashboardStats', () => {
  const mockStats = {
    totalActive: 8,
    monthlySpend: 125.5,
    yearlySpend: 1506.0,
    percentageChange: 5.2,
    upcomingRenewals: 3,
    unusedSubscriptions: 1,
  };

  it('renders all stat cards', () => {
    render(<DashboardStats stats={mockStats} />);

    expect(screen.getByText('Active Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Monthly Spend')).toBeInTheDocument();
    expect(screen.getByText('Yearly Projection')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Renewals')).toBeInTheDocument();
  });

  it('displays correct values', () => {
    render(<DashboardStats stats={mockStats} />);

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('$126')).toBeInTheDocument();
    expect(screen.getByText('$1,506')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('handles zero values gracefully', () => {
    const zeroStats = {
      totalActive: 0,
      monthlySpend: 0,
      yearlySpend: 0,
      upcomingRenewals: 0,
    };

    render(<DashboardStats stats={zeroStats} />);

    expect(screen.getByText('$0')).toBeInTheDocument();
  });

  it('handles missing optional properties gracefully', () => {
    const minimalStats = {
      totalActive: 5,
      monthlySpend: 100,
      yearlySpend: 1200,
    };

    render(<DashboardStats stats={minimalStats} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
  });

  it('shows percentage change indicator', () => {
    const statsWithPositiveChange = {
      totalActive: 8,
      monthlySpend: 125.5,
      yearlySpend: 1506.0,
      percentageChange: 15.5,
      upcomingRenewals: 3,
    };

    render(<DashboardStats stats={statsWithPositiveChange} />);
    expect(screen.getByText('+15.5%')).toBeInTheDocument();
  });

  it('formats currency correctly for different amounts', () => {
    const largeAmountStats = {
      totalActive: 8,
      monthlySpend: 1234.56,
      yearlySpend: 14814.72,
      upcomingRenewals: 3,
    };

    render(<DashboardStats stats={largeAmountStats} />);

    expect(screen.getByText('$1,235')).toBeInTheDocument();
    expect(screen.getByText('$14,815')).toBeInTheDocument();
  });

  it('handles very large numbers with appropriate formatting', () => {
    const massiveStats = {
      totalActive: 1000,
      monthlySpend: 83333.33,
      yearlySpend: 999999.99,
      upcomingRenewals: 50,
    };

    render(<DashboardStats stats={massiveStats} />);

    expect(screen.getByText('1000')).toBeInTheDocument();
    expect(screen.getByText('$1,000,000')).toBeInTheDocument();
  });

  it('shows unused subscriptions warning when present', () => {
    const statsWithUnused = {
      totalActive: 8,
      monthlySpend: 125.5,
      yearlySpend: 1506.0,
      upcomingRenewals: 3,
      unusedSubscriptions: 2,
    };

    render(<DashboardStats stats={statsWithUnused} />);
    expect(screen.getByText('Optimization Opportunity')).toBeInTheDocument();
    expect(screen.getByText('2 unused subscriptions')).toBeInTheDocument();
  });

  it('does not show unused subscriptions warning when zero', () => {
    const statsWithoutUnused = {
      totalActive: 8,
      monthlySpend: 125.5,
      yearlySpend: 1506.0,
      upcomingRenewals: 3,
      unusedSubscriptions: 0,
    };

    render(<DashboardStats stats={statsWithoutUnused} />);
    expect(
      screen.queryByText('Optimization Opportunity')
    ).not.toBeInTheDocument();
  });

  it('handles negative percentage change', () => {
    const negativeChangeStats = {
      totalActive: 8,
      monthlySpend: 125.5,
      yearlySpend: 1506.0,
      percentageChange: -10.5,
      upcomingRenewals: 3,
    };

    render(<DashboardStats stats={negativeChangeStats} />);
    expect(screen.getByText('-10.5%')).toBeInTheDocument();
  });
});
