import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../error-boundary';

// Component that throws an error for testing
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="working-component">Working component</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('working-component')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByTestId('working-component')).not.toBeInTheDocument();
  });

  it('displays custom fallback when provided', () => {
    const customFallback = (
      <div data-testid="custom-fallback">Custom error message</div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onErrorMock = vi.fn();

    render(
      <ErrorBoundary onError={onErrorMock}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetryMock = vi.fn();

    render(
      <ErrorBoundary onRetry={onRetryMock}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText('Try again');
    expect(retryButton).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetryMock = vi.fn();

    render(
      <ErrorBoundary onRetry={onRetryMock}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText('Try again');
    retryButton.click();

    expect(onRetryMock).toHaveBeenCalled();
  });

  it('handles multiple children correctly', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('working-component')).toBeInTheDocument();
  });

  it('catches errors from deeply nested components', () => {
    const NestedComponent = () => (
      <div>
        <div>
          <ThrowingComponent shouldThrow={true} />
        </div>
      </div>
    );

    render(
      <ErrorBoundary>
        <NestedComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
