import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMobile } from '../use-mobile';

// Mock window.matchMedia
const mockMatchMedia = vi.fn();

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  });
});

describe('useMobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for mobile screen sizes', () => {
    const mockMediaQueryList = {
      matches: true,
      media: '(max-width: 768px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQueryList);

    const { result } = renderHook(() => useMobile());

    expect(result.current).toBe(true);
    expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 768px)');
  });

  it('returns false for desktop screen sizes', () => {
    const mockMediaQueryList = {
      matches: false,
      media: '(max-width: 768px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQueryList);

    const { result } = renderHook(() => useMobile());

    expect(result.current).toBe(false);
    expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 768px)');
  });

  it('sets up event listener on mount', () => {
    const addEventListener = vi.fn();
    const mockMediaQueryList = {
      matches: false,
      media: '(max-width: 768px)',
      addEventListener,
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQueryList);

    renderHook(() => useMobile());

    expect(addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('removes event listener on unmount', () => {
    const removeEventListener = vi.fn();
    const mockMediaQueryList = {
      matches: false,
      media: '(max-width: 768px)',
      addEventListener: vi.fn(),
      removeEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQueryList);

    const { unmount } = renderHook(() => useMobile());
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('updates state when media query changes', () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | undefined;

    const addEventListener = vi.fn((event, handler) => {
      if (event === 'change') {
        changeHandler = handler;
      }
    });

    const mockMediaQueryList = {
      matches: false,
      media: '(max-width: 768px)',
      addEventListener,
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQueryList);

    const { result, rerender } = renderHook(() => useMobile());

    expect(result.current).toBe(false);

    // Simulate media query change
    if (changeHandler) {
      changeHandler({ matches: true } as MediaQueryListEvent);
    }

    rerender();

    expect(result.current).toBe(true);
  });

  it('falls back gracefully when matchMedia is not supported', () => {
    mockMatchMedia.mockImplementation(() => {
      throw new Error('matchMedia not supported');
    });

    const { result } = renderHook(() => useMobile());

    // Should default to false when matchMedia is not supported
    expect(result.current).toBe(false);
  });

  it('handles undefined matchMedia', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useMobile());

    // Should default to false when matchMedia is undefined
    expect(result.current).toBe(false);
  });
});
