'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { OAuthButton } from './oauth-button';

export function LoginForm() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Credentials login is only available in development for testing
  // This is disabled in production for security
  const isDevelopment = process.env.NODE_ENV === 'development';

  async function onSubmit(provider: string) {
    console.log(`OAuth button clicked: ${provider}`);
    setIsLoading(true);

    try {
      console.log(`Calling signIn for ${provider}...`);
      await signIn(provider, { callbackUrl: '/dashboard' });
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      {/* Development credentials login */}
      {isDevelopment && (
        <>
          <CredentialsForm isLoading={isLoading} />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with OAuth
              </span>
            </div>
          </div>
        </>
      )}

      <OAuthButton provider="google" disabled={isLoading} />
      <OAuthButton provider="github" disabled={isLoading} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <EmailForm isLoading={isLoading} />
    </div>
  );
}

function EmailForm({ isLoading }: { isLoading: boolean }) {
  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await signIn('email', {
        email,
        redirect: false,
        callbackUrl: '/dashboard',
      });

      if (result?.error) {
        console.error('Email sign-in failed:', result.error);
      } else {
        setIsEmailSent(true);
      }
    } catch (error) {
      console.error('Email sign-in error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="font-medium text-green-800">Check your email!</h3>
          <p className="mt-1 text-sm text-green-700">
            We&apos;ve sent a magic link to{' '}
            <span className="font-medium">{email}</span>
          </p>
        </div>
        <p className="text-sm text-gray-600">
          Click the link in your email to sign in. The link will expire in 24
          hours.
        </p>
        <button
          onClick={() => {
            setIsEmailSent(false);
            setEmail('');
          }}
          className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
        >
          Try a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleEmailSubmit} className="grid gap-2">
      <label htmlFor="email-login" className="sr-only">
        Email address
      </label>
      <input
        id="email-login"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        required
        aria-required="true"
        aria-label="Email address for magic link login"
        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading || isSubmitting}
      />
      <button
        type="submit"
        className="text-primary-foreground inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        disabled={isLoading || isSubmitting}
      >
        {isSubmitting ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          'Send magic link'
        )}
      </button>
    </form>
  );
}

function CredentialsForm({ isLoading }: { isLoading: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/dashboard',
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Credentials sign-in error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleCredentialsSubmit} className="grid gap-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <p className="font-medium text-amber-800">Development Mode</p>
        <p className="text-amber-700">
          Test account: test@subpilot.dev / testpassword123
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="test@subpilot.dev"
          required
          aria-required="true"
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading || isSubmitting}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          aria-required="true"
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading || isSubmitting}
        />
      </div>

      <button
        type="submit"
        className="text-primary-foreground inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        disabled={isLoading || isSubmitting}
      >
        {isSubmitting ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          'Sign in with Email'
        )}
      </button>
    </form>
  );
}
