import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../page';

// Mock session
const mockSession = {
  user: { id: 'user1', email: 'test@example.com' },
  expires: '2025-12-31',
};

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

// Mock auth config
vi.mock('@/server/auth', () => ({
  authOptions: {},
}));

// Mock tRPC
vi.mock('@/trpc/server', () => ({
  api: {
    analytics: {
      getSpendingOverview: {
        query: vi.fn(() =>
          Promise.resolve({
            totalSpending: 500,
            activeSubscriptions: 5,
            avgMonthlySpending: 100,
            subscriptionsCount: 10,
          })
        ),
      },
      getUpcomingRenewals: {
        query: vi.fn(() => Promise.resolve({})),
      },
    },
    subscriptions: {
      getSubscriptions: {
        query: vi.fn(() => Promise.resolve([])),
      },
    },
  },
}));

// Mock components
vi.mock('@/components/dashboard-stats', () => ({
  default: vi.fn(() => (
    <div data-testid="dashboard-stats">Dashboard Stats</div>
  )),
}));

vi.mock('@/components/analytics/spending-trends-chart', () => ({
  default: vi.fn(() => (
    <div data-testid="spending-trends-chart">Spending Trends</div>
  )),
}));

vi.mock('@/components/analytics/upcoming-renewals-calendar', () => ({
  default: vi.fn(() => (
    <div data-testid="upcoming-renewals-calendar">Upcoming Renewals</div>
  )),
}));

vi.mock('@/components/subscription-list', () => ({
  default: vi.fn(() => (
    <div data-testid="subscription-list">Subscription List</div>
  )),
}));

vi.mock('@/components/mobile-quick-actions', () => ({
  default: vi.fn(() => (
    <div data-testid="mobile-quick-actions">Quick Actions</div>
  )),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard page components', () => {
    const component = DashboardPage();
    render(component);

    expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument();
    expect(screen.getByTestId('spending-trends-chart')).toBeInTheDocument();
    expect(
      screen.getByTestId('upcoming-renewals-calendar')
    ).toBeInTheDocument();
    expect(screen.getByTestId('subscription-list')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-quick-actions')).toBeInTheDocument();
  });

  it('renders page title', () => {
    const component = DashboardPage();
    render(component);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('has proper page structure', () => {
    const component = DashboardPage();
    const { container } = render(component);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders without errors', () => {
    const component = DashboardPage();
    expect(() => render(component)).not.toThrow();
  });
});
