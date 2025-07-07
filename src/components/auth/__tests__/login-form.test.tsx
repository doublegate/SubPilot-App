import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from 'next-auth/react';
import { LoginForm } from '../login-form';
import type { AuthProvider } from '@/lib/auth-providers';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

// Mock window.location.href
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('LoginForm', () => {
  // Default available providers for testing
  const defaultProviders: AuthProvider[] = [
    'google',
    'github',
    'email',
    'credentials',
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment to development by default
    vi.stubEnv('NODE_ENV', 'development');
  });

  describe('Rendering', () => {
    it('should render OAuth buttons', () => {
      render(<LoginForm availableProviders={defaultProviders} />);

      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
    });

    it('should render email form', () => {
      render(<LoginForm availableProviders={defaultProviders} />);

      expect(
        screen.getByLabelText('Email address for magic link login')
      ).toBeInTheDocument();
      expect(screen.getByText('Send magic link')).toBeInTheDocument();
    });

    it('should render credentials form in development', () => {
      render(<LoginForm availableProviders={defaultProviders} />);

      expect(screen.getByText('Development Mode')).toBeInTheDocument();
      expect(
        screen.getByText('Test account: test@subpilot.dev / testpassword123')
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should not render credentials form in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const productionProviders: AuthProvider[] = ['google', 'github', 'email'];

      render(<LoginForm availableProviders={productionProviders} />);

      expect(screen.queryByText('Development Mode')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    });

    it('should not render OAuth buttons when not available', () => {
      const emailOnlyProviders: AuthProvider[] = ['email'];

      render(<LoginForm availableProviders={emailOnlyProviders} />);

      expect(
        screen.queryByText('Continue with Google')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Continue with GitHub')
      ).not.toBeInTheDocument();
      expect(screen.getByText('Send magic link')).toBeInTheDocument();
    });
  });

  describe('Google OAuth', () => {
    it('should call signIn with google provider when Google button is clicked', async () => {
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValueOnce({ ok: true } as any);

      render(<LoginForm availableProviders={defaultProviders} />);

      const googleButton = screen.getByText('Continue with Google');
      fireEvent.click(googleButton);

      expect(mockSignIn).toHaveBeenCalledWith('google', {
        callbackUrl: '/dashboard',
      });
    });

    it('should show loading state when Google sign-in is in progress', async () => {
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<LoginForm availableProviders={defaultProviders} />);

      const googleButton = screen.getByText('Continue with Google');
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(googleButton).toBeDisabled();
      });
    });

    it('should handle Google sign-in errors', async () => {
      const mockSignIn = vi.mocked(signIn);
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockSignIn.mockRejectedValueOnce(new Error('Google auth failed'));

      render(<LoginForm availableProviders={defaultProviders} />);

      const googleButton = screen.getByText('Continue with Google');
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          new Error('Google auth failed')
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('GitHub OAuth', () => {
    it('should call signIn with github provider when GitHub button is clicked', async () => {
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValueOnce({ ok: true } as any);

      render(<LoginForm availableProviders={defaultProviders} />);

      const githubButton = screen.getByText('Continue with GitHub');
      fireEvent.click(githubButton);

      expect(mockSignIn).toHaveBeenCalledWith('github', {
        callbackUrl: '/dashboard',
      });
    });

    it('should show loading state when GitHub sign-in is in progress', async () => {
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<LoginForm availableProviders={defaultProviders} />);

      const githubButton = screen.getByText('Continue with GitHub');
      fireEvent.click(githubButton);

      await waitFor(() => {
        expect(githubButton).toBeDisabled();
      });
    });
  });

  describe('Email Magic Link', () => {
    it('should send magic link when email form is submitted', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValueOnce({ ok: true } as any);

      render(<LoginForm availableProviders={defaultProviders} />);

      const emailInput = screen.getByLabelText(
        'Email address for magic link login'
      );
      const submitButton = screen.getByText('Send magic link');

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      expect(mockSignIn).toHaveBeenCalledWith('email', {
        email: 'test@example.com',
        redirect: false,
        callbackUrl: '/dashboard',
      });
    });

    it('should show success message after email is sent', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValueOnce({ ok: true } as any);

      render(<LoginForm availableProviders={defaultProviders} />);

      const emailInput = screen.getByLabelText(
        'Email address for magic link login'
      );
      const submitButton = screen.getByText('Send magic link');

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Check your email!')).toBeInTheDocument();
        expect(
          screen.getByText(/We've sent a magic link to/)
        ).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should allow trying different email after success', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValueOnce({ ok: true } as any);

      render(<LoginForm availableProviders={defaultProviders} />);

      const emailInput = screen.getByLabelText(
        'Email address for magic link login'
      );
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByText('Send magic link'));

      await waitFor(() => {
        expect(screen.getByText('Check your email!')).toBeInTheDocument();
      });

      const tryDifferentButton = screen.getByText('Try a different email');
      await user.click(tryDifferentButton);

      expect(screen.queryByText('Check your email!')).not.toBeInTheDocument();
      expect(
        screen.getByLabelText('Email address for magic link login')
      ).toBeInTheDocument();
    });

    it('should handle email sign-in errors', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.mocked(signIn);
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockSignIn.mockResolvedValueOnce({
        error: 'Email sending failed',
      } as any);

      render(<LoginForm availableProviders={defaultProviders} />);

      const emailInput = screen.getByLabelText(
        'Email address for magic link login'
      );
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByText('Send magic link'));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Email sign-in failed:',
          'Email sending failed'
        );
      });

      consoleError.mockRestore();
    });

    it('should validate email format', async () => {
      render(<LoginForm availableProviders={defaultProviders} />);

      const emailInput = screen.getByLabelText(
        'Email address for magic link login'
      );
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
    });
  });

  describe('Credentials Form (Development Only)', () => {
    it('should handle credentials login successfully', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValueOnce({
        ok: true,
        url: '/dashboard',
      } as any);

      render(<LoginForm availableProviders={defaultProviders} />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByText('Sign in with Email');

      await user.type(emailInput, 'test@subpilot.dev');
      await user.type(passwordInput, 'testpassword123');
      await user.click(submitButton);

      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@subpilot.dev',
        password: 'testpassword123',
        redirect: false,
        callbackUrl: '/dashboard',
      });

      await waitFor(() => {
        expect(mockLocation.href).toBe('/dashboard');
      });
    });

    it('should show error for invalid credentials', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValueOnce({ error: 'CredentialsSignin' } as any);

      render(<LoginForm availableProviders={defaultProviders} />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByText('Sign in with Email');

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Invalid email or password')
        ).toBeInTheDocument();
      });
    });

    it('should handle credentials sign-in exceptions', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.mocked(signIn);
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockSignIn.mockRejectedValueOnce(new Error('Network error'));

      render(<LoginForm availableProviders={defaultProviders} />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByText('Sign in with Email');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('An error occurred. Please try again.')
        ).toBeInTheDocument();
        expect(consoleError).toHaveBeenCalledWith(
          'Credentials sign-in error:',
          new Error('Network error')
        );
      });

      consoleError.mockRestore();
    });

    it('should clear error when submitting again', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.mocked(signIn);

      // First call fails
      mockSignIn.mockResolvedValueOnce({ error: 'CredentialsSignin' } as any);

      render(<LoginForm availableProviders={defaultProviders} />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByText('Sign in with Email');

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Invalid email or password')
        ).toBeInTheDocument();
      });

      // Second call succeeds
      mockSignIn.mockResolvedValueOnce({ ok: true, url: '/dashboard' } as any);

      await user.clear(emailInput);
      await user.clear(passwordInput);
      await user.type(emailInput, 'correct@example.com');
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.queryByText('Invalid email or password')
        ).not.toBeInTheDocument();
      });
    });

    it('should validate credentials form fields', () => {
      render(<LoginForm availableProviders={defaultProviders} />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
    });
  });

  describe('Loading States', () => {
    it('should disable all buttons when loading', async () => {
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<LoginForm availableProviders={defaultProviders} />);

      const googleButton = screen.getByText('Continue with Google');
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(googleButton).toBeDisabled();
        expect(screen.getByText('Continue with GitHub')).toBeDisabled();
        expect(screen.getByText('Send magic link')).toBeDisabled();

        // In development mode, credentials form should also be disabled
        if (process.env.NODE_ENV === 'development') {
          expect(screen.getByText('Sign in with Email')).toBeDisabled();
        }
      });
    });

    it('should show loading spinners when submitting', async () => {
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<LoginForm availableProviders={defaultProviders} />);

      const googleButton = screen.getByText('Continue with Google');
      fireEvent.click(googleButton);

      await waitFor(() => {
        // Should show loading spinner instead of Google icon
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<LoginForm availableProviders={defaultProviders} />);

      const emailInput = screen.getByLabelText(
        'Email address for magic link login'
      );
      expect(emailInput).toHaveAttribute(
        'aria-label',
        'Email address for magic link login'
      );
      expect(emailInput).toHaveAttribute('aria-required', 'true');

      // In development mode
      if (process.env.NODE_ENV === 'development') {
        const credEmailInput = screen.getByLabelText('Email');
        const passwordInput = screen.getByLabelText('Password');

        expect(credEmailInput).toHaveAttribute('aria-required', 'true');
        expect(passwordInput).toHaveAttribute('aria-required', 'true');
      }
    });

    it('should have proper form structure', () => {
      render(<LoginForm availableProviders={defaultProviders} />);

      // Should have form elements
      const forms = screen.getAllByRole('form');
      expect(forms.length).toBeGreaterThan(0);

      // Should have proper labels
      expect(
        screen.getByLabelText('Email address for magic link login')
      ).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should log errors to console when OAuth fails', async () => {
      const mockSignIn = vi.mocked(signIn);
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const error = new Error('OAuth failed');
      mockSignIn.mockRejectedValueOnce(error);

      render(<LoginForm availableProviders={defaultProviders} />);

      const googleButton = screen.getByText('Continue with Google');
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(error);
      });

      consoleError.mockRestore();
    });
  });
});
