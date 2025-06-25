import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

// Extend Vitest matchers with jest-dom matchers
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends jest.Matchers<void, T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining {
    // Add the matchers we need here
  }
}

// Clean up after each test
afterEach(() => {
  cleanup();
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

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement('img', { src, alt, ...props });
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

// Mock database
vi.mock('@/server/db', () => ({
  db: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    plaidItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      markAsRead: vi.fn(),
    },
  },
}));

// Mock Plaid client
vi.mock('@/server/plaid-client', () => ({
  plaid: vi.fn(() => null), // Return null by default (client not configured)
  plaidWithRetry: vi.fn().mockImplementation(async (operation) => operation()),
  isPlaidConfigured: vi.fn(() => false),
  verifyPlaidWebhook: vi.fn().mockResolvedValue(true),
  handlePlaidError: vi.fn((error) => console.error('Plaid error:', error)),
}));

// Mock email service
vi.mock('@/server/services/email.service', () => ({
  EmailService: {
    sendNotification: vi.fn().mockResolvedValue(true),
    sendWelcomeEmail: vi.fn().mockResolvedValue(true),
    sendSubscriptionAlert: vi.fn().mockResolvedValue(true),
    validateEmailTemplate: vi.fn(() => true),
  },
}));

// Mock subscription detector
vi.mock('@/server/services/subscription-detector', () => ({
  SubscriptionDetector: vi.fn().mockImplementation(() => ({
    detectUserSubscriptions: vi.fn().mockResolvedValue([]),
    detectSingleTransaction: vi.fn().mockResolvedValue(null),
    createSubscriptionsFromDetection: vi.fn().mockResolvedValue([]),
  })),
}));

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
