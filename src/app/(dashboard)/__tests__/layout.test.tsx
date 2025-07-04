import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardLayout from '../layout';

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

// Mock the DashboardProviders component
vi.mock('../dashboard-providers', () => ({
  default: vi.fn(({ children }) => (
    <div data-testid="dashboard-providers">{children}</div>
  )),
}));

// Mock navigation components
vi.mock('@/components/layout/nav-header', () => ({
  default: vi.fn(() => <nav data-testid="nav-header">Navigation</nav>),
}));

vi.mock('@/components/layout/mobile-nav', () => ({
  default: vi.fn(() => <nav data-testid="mobile-nav">Mobile Navigation</nav>),
}));

describe('DashboardLayout', () => {
  const mockChildren = <div data-testid="test-children">Test Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard layout with children', async () => {
    const component = await DashboardLayout({ children: mockChildren });
    render(component);

    expect(screen.getByTestId('dashboard-providers')).toBeInTheDocument();
    expect(screen.getByTestId('nav-header')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
    expect(screen.getByTestId('test-children')).toBeInTheDocument();
  });

  it('has proper layout structure', async () => {
    const component = await DashboardLayout({ children: mockChildren });
    const { container } = render(component);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders without errors', async () => {
    const component = await DashboardLayout({ children: mockChildren });
    expect(() => render(component)).not.toThrow();
  });
});
