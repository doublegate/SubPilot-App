import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../use-auth';

// Mock next-auth/react
const mockSession = {
  user: {
    id: 'user1',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: '2025-12-31',
};

const mockUseSession = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  signIn: mockSignIn,
  signOut: mockSignOut,
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('returns authenticated state with user data', () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockSession.user);
    expect(result.current.session).toEqual(mockSession);
  });

  it('returns unauthenticated state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('provides signin function', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.signin).toBe(mockSignIn);
  });

  it('provides signout function', () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.signout).toBe(mockSignOut);
  });

  it('handles session updates', async () => {
    // Start with loading
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    });

    const { result, rerender } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);

    // Update to authenticated
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });

    rerender();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockSession.user);
    });
  });

  it('handles user with missing id', () => {
    const sessionWithoutId = {
      ...mockSession,
      user: {
        email: 'test@example.com',
        name: 'Test User',
      },
    };

    mockUseSession.mockReturnValue({
      data: sessionWithoutId,
      status: 'authenticated',
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(sessionWithoutId.user);
  });

  it('handles session errors', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      error: 'Authentication error',
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
