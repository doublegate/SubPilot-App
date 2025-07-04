import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { signOut } from 'next-auth/react';
import { SignOutButton } from '../sign-out-button';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

describe('SignOutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render sign out button', () => {
    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button).toBeInTheDocument();
  });

  it('should call signOut when clicked', () => {
    const mockSignOut = vi.mocked(signOut);

    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(button);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });

  it('should have correct CSS classes for styling', () => {
    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });

    // Check for key styling classes
    expect(button).toHaveClass('hover:text-accent-foreground');
    expect(button).toHaveClass('inline-flex');
    expect(button).toHaveClass('h-9');
    expect(button).toHaveClass('items-center');
    expect(button).toHaveClass('justify-center');
    expect(button).toHaveClass('rounded-md');
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('border-input');
    expect(button).toHaveClass('bg-background');
    expect(button).toHaveClass('px-4');
    expect(button).toHaveClass('text-sm');
    expect(button).toHaveClass('font-medium');
  });

  it('should handle multiple clicks without issues', () => {
    const mockSignOut = vi.mocked(signOut);

    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });

    // Click multiple times
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockSignOut).toHaveBeenCalledTimes(3);
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });

  it('should be accessible with keyboard navigation', () => {
    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });

    // Focus the button
    button.focus();
    expect(button).toHaveFocus();

    // Should be able to trigger with Enter key
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(vi.mocked(signOut)).toHaveBeenCalled();
  });

  it('should have proper focus styles', () => {
    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });

    // Check for focus styling classes
    expect(button).toHaveClass('focus-visible:outline-none');
    expect(button).toHaveClass('focus-visible:ring-2');
    expect(button).toHaveClass('focus-visible:ring-ring');
    expect(button).toHaveClass('focus-visible:ring-offset-2');
  });

  it('should have hover and transition styles', () => {
    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });

    // Check for hover and transition classes
    expect(button).toHaveClass('hover:bg-accent');
    expect(button).toHaveClass('transition-colors');
    expect(button).toHaveClass('ring-offset-background');
  });

  it('should have disabled state styles', () => {
    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });

    // Check for disabled state classes (even though button isn't disabled)
    expect(button).toHaveClass('disabled:pointer-events-none');
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('should handle signOut errors gracefully', () => {
    const mockSignOut = vi.mocked(signOut);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    // Mock signOut to throw an error
    mockSignOut.mockRejectedValueOnce(new Error('Sign out failed'));

    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(button);

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' });

    consoleError.mockRestore();
  });

  it('should use correct button text', () => {
    render(<SignOutButton />);

    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('should be a button element with correct type', () => {
    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
  });
});
