import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ServiceWorkerRegistration from '../service-worker-registration';

// Mock navigator.serviceWorker
const mockServiceWorker = {
  register: vi.fn(),
  ready: Promise.resolve({
    unregister: vi.fn(),
  }),
  controller: null,
  getRegistration: vi.fn(),
  getRegistrations: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Mock window object
Object.defineProperty(window, 'navigator', {
  value: {
    serviceWorker: mockServiceWorker,
  },
  writable: true,
});

describe('ServiceWorkerRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
  });

  it('registers service worker when supported', async () => {
    mockServiceWorker.register.mockResolvedValue({
      installing: null,
      waiting: null,
      active: { scriptURL: '/sw.js' },
      scope: '/',
      addEventListener: vi.fn(),
    });

    render(<ServiceWorkerRegistration />);

    // Wait for useEffect to run
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
  });

  it('handles service worker registration failure', async () => {
    const error = new Error('Registration failed');
    mockServiceWorker.register.mockRejectedValue(error);

    render(<ServiceWorkerRegistration />);

    // Wait for useEffect to run
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
    expect(console.error).toHaveBeenCalledWith(
      'Service worker registration failed:',
      error
    );
  });

  it('does not register when service worker is not supported', () => {
    // Temporarily remove service worker support
    const originalServiceWorker = window.navigator.serviceWorker;
    // @ts-expect-error - Temporarily removing service worker for testing
    delete window.navigator.serviceWorker;

    render(<ServiceWorkerRegistration />);

    expect(mockServiceWorker.register).not.toHaveBeenCalled();

    // Restore service worker
    window.navigator.serviceWorker = originalServiceWorker;
  });

  it('handles service worker updates', async () => {
    const mockRegistration = {
      installing: null,
      waiting: { scriptURL: '/sw.js' },
      active: { scriptURL: '/sw.js' },
      scope: '/',
      addEventListener: vi.fn(),
      update: vi.fn(),
    };

    mockServiceWorker.register.mockResolvedValue(mockRegistration);

    render(<ServiceWorkerRegistration />);

    // Wait for useEffect to run
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
  });

  it('logs successful registration', async () => {
    const mockRegistration = {
      installing: null,
      waiting: null,
      active: { scriptURL: '/sw.js' },
      scope: '/',
      addEventListener: vi.fn(),
    };

    mockServiceWorker.register.mockResolvedValue(mockRegistration);

    render(<ServiceWorkerRegistration />);

    // Wait for useEffect to run
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(console.log).toHaveBeenCalledWith(
      'Service worker registered successfully'
    );
  });

  it('handles network errors gracefully', async () => {
    const networkError = new Error('Network error');
    mockServiceWorker.register.mockRejectedValue(networkError);

    render(<ServiceWorkerRegistration />);

    // Wait for useEffect to run
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(console.error).toHaveBeenCalledWith(
      'Service worker registration failed:',
      networkError
    );
  });
});
