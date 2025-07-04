import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '../page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}));

// Mock the ThemeToggleStandalone component
vi.mock('@/components/theme-toggle-standalone', () => ({
  ThemeToggleStandalone: vi.fn(() => (
    <div data-testid="theme-toggle">Theme Toggle</div>
  )),
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the home page correctly', () => {
    render(<HomePage />);

    expect(screen.getByText('SubPilot')).toBeInTheDocument();
    expect(screen.getByText('Get Started →')).toBeInTheDocument();
    expect(screen.getByText('Sign In →')).toBeInTheDocument();
  });

  it('renders theme toggle', () => {
    render(<HomePage />);

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('has correct navigation links', () => {
    render(<HomePage />);

    const dashboardLink = screen.getByText('Get Started →').closest('a');
    const loginLink = screen.getByText('Sign In →').closest('a');

    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('has correct page structure', () => {
    const { container } = render(<HomePage />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() => render(<HomePage />)).not.toThrow();
  });
});
