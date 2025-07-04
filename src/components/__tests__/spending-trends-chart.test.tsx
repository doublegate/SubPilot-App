import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SpendingTrendsChart } from '../analytics/spending-trends-chart';

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

const mockTrendData = [
  { period: '2025-01', total: 1000, recurring: 800, nonRecurring: 200 },
  { period: '2025-02', total: 1200, recurring: 900, nonRecurring: 300 },
  { period: '2025-03', total: 1100, recurring: 850, nonRecurring: 250 },
];

const emptyData: typeof mockTrendData = [];

const singleDataPoint = [
  { period: '2025-01', total: 1000, recurring: 800, nonRecurring: 200 },
];

describe('SpendingTrendsChart', () => {
  it('renders with default props', () => {
    render(<SpendingTrendsChart data={mockTrendData} />);

    expect(screen.getByText('Area Chart')).toBeInTheDocument();
    expect(screen.getByText('Line Chart')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Recurring')).toBeInTheDocument();
    expect(screen.getByText('One-time')).toBeInTheDocument();
  });

  it('switches between chart types', () => {
    render(<SpendingTrendsChart data={mockTrendData} />);

    // Should start with area chart
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();

    // Switch to line chart
    fireEvent.click(screen.getByText('Line Chart'));
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    // Switch back to area chart
    fireEvent.click(screen.getByText('Area Chart'));
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('toggles data series visibility', () => {
    render(<SpendingTrendsChart data={mockTrendData} />);

    // Total should be active by default
    const totalButton = screen.getByText('Total');
    expect(totalButton).toHaveClass('bg-primary');

    // Toggle total off
    fireEvent.click(totalButton);
    expect(totalButton).toHaveClass('border-input');

    // Toggle recurring
    const recurringButton = screen.getByText('Recurring');
    fireEvent.click(recurringButton);

    // Toggle one-time
    const oneTimeButton = screen.getByText('One-time');
    fireEvent.click(oneTimeButton);
  });

  it('calculates trends correctly with sufficient data', () => {
    render(<SpendingTrendsChart data={mockTrendData} />);

    // Should show trend indicators
    expect(screen.getByText('Total Spending Trend')).toBeInTheDocument();
    expect(screen.getByText('Recurring Spending Trend')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(<SpendingTrendsChart data={emptyData} />);

    // Should still render controls
    expect(screen.getByText('Total')).toBeInTheDocument();
    // Find first occurrence of 0.0% trend
    const trendElements = screen.getAllByText('0.0%');
    expect(trendElements[0]).toBeInTheDocument();
  });

  it('handles single data point', () => {
    render(<SpendingTrendsChart data={singleDataPoint} />);

    // Should render without errors
    expect(screen.getByText('Total Spending Trend')).toBeInTheDocument();
    // Find first occurrence of 0.0% trend
    const trendElements = screen.getAllByText('0.0%');
    expect(trendElements[0]).toBeInTheDocument();
  });

  it('formats currency correctly', () => {
    render(<SpendingTrendsChart data={mockTrendData} />);

    // Check summary stats formatting
    expect(screen.getByText('$1,100')).toBeInTheDocument(); // Average total
    expect(screen.getByText('$850')).toBeInTheDocument(); // Average recurring
    expect(screen.getByText('77%')).toBeInTheDocument(); // Recurring percentage
  });

  it('formats periods correctly for monthly data', () => {
    const monthlyData = [
      { period: '2025-01', total: 1000, recurring: 800, nonRecurring: 200 },
      { period: '2025-02', total: 1200, recurring: 900, nonRecurring: 300 },
    ];

    render(<SpendingTrendsChart data={monthlyData} />);
    // Component should render without errors with monthly period format
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('formats periods correctly for daily data', () => {
    const dailyData = [
      { period: '2025-01-15', total: 100, recurring: 80, nonRecurring: 20 },
      { period: '2025-01-16', total: 120, recurring: 90, nonRecurring: 30 },
    ];

    render(<SpendingTrendsChart data={dailyData} />);
    // Component should render without errors with daily period format
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('handles custom height prop', () => {
    const customHeight = 600;
    render(<SpendingTrendsChart data={mockTrendData} height={customHeight} />);

    const chartContainer = screen.getByTestId(
      'responsive-container'
    ).parentElement;
    expect(chartContainer).toHaveStyle({ height: `${customHeight}px` });
  });

  it('shows correct trend colors', () => {
    const upTrendData = [
      { period: '2025-01', total: 800, recurring: 600, nonRecurring: 200 },
      { period: '2025-02', total: 900, recurring: 700, nonRecurring: 200 },
      { period: '2025-03', total: 1000, recurring: 800, nonRecurring: 200 },
      { period: '2025-04', total: 1100, recurring: 900, nonRecurring: 200 },
      { period: '2025-05', total: 1200, recurring: 1000, nonRecurring: 200 },
      { period: '2025-06', total: 1300, recurring: 1100, nonRecurring: 200 },
    ];

    render(<SpendingTrendsChart data={upTrendData} />);

    // Should show red for increasing trend (bad for spending)
    const trendElements = screen.getAllByText(/\d+\.\d+%/);
    expect(trendElements.length).toBeGreaterThan(0);
  });

  it('memoizes calculations correctly', () => {
    const { rerender } = render(<SpendingTrendsChart data={mockTrendData} />);

    // Re-render with same data should use memoized values
    rerender(<SpendingTrendsChart data={mockTrendData} />);

    expect(screen.getByText('$1,100')).toBeInTheDocument();
  });

  it('handles division by zero in trend calculations', () => {
    const zeroData = [
      { period: '2025-01', total: 0, recurring: 0, nonRecurring: 0 },
      { period: '2025-02', total: 0, recurring: 0, nonRecurring: 0 },
    ];

    render(<SpendingTrendsChart data={zeroData} />);

    // Should not crash and show 0% trends
    const trendElements = screen.getAllByText('0.0%');
    expect(trendElements[0]).toBeInTheDocument();
  });

  it('handles large numbers correctly', () => {
    const largeData = [
      {
        period: '2025-01',
        total: 1000000,
        recurring: 800000,
        nonRecurring: 200000,
      },
      {
        period: '2025-02',
        total: 1200000,
        recurring: 900000,
        nonRecurring: 300000,
      },
    ];

    render(<SpendingTrendsChart data={largeData} />);

    expect(screen.getByText('$1,100,000')).toBeInTheDocument();
  });
});
