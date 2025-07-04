import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NotFound from '../not-found';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

describe('NotFound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders 404 page content', () => {
    render(<NotFound />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('renders back to dashboard link', () => {
    render(<NotFound />);

    const dashboardLink = screen.getByText('Back to Dashboard');
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard');
  });

  it('has proper page structure and styling', () => {
    const { container } = render(<NotFound />);

    expect(container.firstChild).toBeInTheDocument();
    expect(container.querySelector('h1')).toBeInTheDocument();
    expect(container.querySelector('p')).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() => render(<NotFound />)).not.toThrow();
  });
});
