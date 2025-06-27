import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

// Extend Vitest matchers with jest-dom matchers
declare module 'vitest' {
  // Explicit interface extensions for jest-dom compatibility
  interface Assertion {
    toBeInTheDocument(): void;
    toBeVisible(): void;
    toBeDisabled(): void;
    toBeEnabled(): void;
    toHaveClass(className: string): void;
    toHaveTextContent(text: string | RegExp): void;
    toHaveValue(value: string | number | string[]): void;
    toHaveAttribute(attr: string, value?: string): void;
    toHaveStyle(css: Record<string, unknown>): void;
    toBeChecked(): void;
    toBePartiallyChecked(): void;
    toBeRequired(): void;
    toBeValid(): void;
    toBeInvalid(): void;
    toBeEmpty(): void;
    toHaveDescription(text: string | RegExp): void;
    toHaveErrorMessage(text: string | RegExp): void;
    toHaveDisplayValue(value: string | RegExp | Array<string | RegExp>): void;
    toHaveAccessibleDescription(text: string | RegExp): void;
    toHaveAccessibleName(text: string | RegExp): void;
    toHaveRole(role: string): void;
  }
}

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Suppress React warnings about non-DOM attributes in tests
const originalError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('React does not recognize') ||
        args[0].includes('Received `true` for a non-boolean attribute') ||
        args[0].includes('Warning: validateDOMNesting'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Next.js Image component for testing
vi.mock('next/image', () => ({
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      blurDataURL?: string;
      sizes?: string;
      loading?: string;
      placeholder?: string;
    }
  ) => {
    // Filter out Next.js specific props that don't exist on regular img elements
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fill, ...imgProps } = props;
    return React.createElement('img', imgProps);
  },
}));

// Mock environment variables
vi.mock('@/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    NEXTAUTH_SECRET: 'test-secret',
    NEXTAUTH_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
  },
}));

// Mock tRPC React provider
vi.mock('@/trpc/react', () => ({
  TRPCReactProvider: ({ children }: { children: React.ReactNode }) => children,
  api: {
    useQuery: vi.fn(() => ({ data: null, isLoading: false })),
    useMutation: vi.fn(() => ({ mutate: vi.fn(), isLoading: false })),
  },
}));

// Mock Next Auth React
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock server-side auth
vi.mock('@/server/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
  authConfig: {
    session: { strategy: 'jwt' },
    callbacks: {},
    providers: [],
  },
}));

// Remove global database mock - let tests decide if they need to mock

// Mock Plaid client
vi.mock('@/server/plaid-client', () => ({
  plaid: vi.fn(() => null), // Return null by default (client not configured)
  plaidWithRetry: vi
    .fn()
    .mockImplementation(async (operation: () => Promise<unknown>) =>
      operation()
    ),
  isPlaidConfigured: vi.fn(() => false),
  verifyPlaidWebhook: vi.fn().mockResolvedValue(true),
  handlePlaidError: vi.fn((error: unknown) =>
    console.error('Plaid error:', error)
  ),
}));

// Remove email service mock - let individual tests handle it

// Remove subscription detector mock - let tests handle it

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class IntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserver,
});

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserver,
});

// Mock ResizeObserver
class ResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserver,
});

Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserver,
});

// Mock pointer capture for Radix UI
if (typeof Element !== 'undefined' && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
}

if (typeof Element !== 'undefined' && !Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = vi.fn();
}

if (
  typeof Element !== 'undefined' &&
  !Element.prototype.releasePointerCapture
) {
  Element.prototype.releasePointerCapture = vi.fn();
}

// Mock scrollIntoView for Radix UI Select
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
