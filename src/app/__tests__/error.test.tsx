import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorPage from '../error';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

describe('ErrorPage', () => {
  const mockReset = vi.fn();
  const mockError = new Error('Test error message');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders error page with error message', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders try again button', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    const tryAgainButton = screen.getByText('Try again');
    expect(tryAgainButton).toBeInTheDocument();
  });

  it('calls reset function when try again button is clicked', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    const tryAgainButton = screen.getByText('Try again');
    fireEvent.click(tryAgainButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('renders back to dashboard link', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    const dashboardLink = screen.getByText('Back to Dashboard');
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard');
  });

  it('handles error without message', () => {
    const errorWithoutMessage = new Error();
    render(<ErrorPage error={errorWithoutMessage} reset={mockReset} />);

    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
  });

  it('handles non-Error objects', () => {
    const stringError = 'String error' as any;
    render(<ErrorPage error={stringError} reset={mockReset} />);

    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
  });
});
