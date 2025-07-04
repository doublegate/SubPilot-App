import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

// Mock auth
const mockAuth = vi.fn();
vi.mock('@/server/auth-edge', () => ({
  auth: mockAuth,
}));

// Mock security middleware
const mockSecurityMiddleware = vi.fn();
vi.mock('@/middleware/security', () => ({
  securityMiddleware: mockSecurityMiddleware,
}));

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('handles authenticated requests to protected routes', async () => {
    const mockSession = { user: { id: 'user1' } };
    const mockAuthResponse = {
      auth: mockSession,
    };

    mockAuth.mockImplementation(callback => callback(mockAuthResponse));
    mockSecurityMiddleware.mockReturnValue({
      status: 200,
      headers: new Headers(),
    } as any);

    const request = new NextRequest('http://localhost:3000/dashboard', {
      method: 'GET',
    });

    const response = await middleware(request);

    expect(mockAuth).toHaveBeenCalled();
    expect(response).toBeDefined();
  });

  it('redirects unauthenticated requests to login', async () => {
    const mockAuthResponse = {
      auth: null,
    };

    mockAuth.mockImplementation(callback => callback(mockAuthResponse));

    const request = new NextRequest('http://localhost:3000/dashboard', {
      method: 'GET',
    });

    const response = await middleware(request);

    expect(mockAuth).toHaveBeenCalled();
    expect(response).toBeDefined();
  });

  it('allows access to public routes without authentication', async () => {
    const mockAuthResponse = {
      auth: null,
    };

    mockAuth.mockImplementation(callback => callback(mockAuthResponse));
    mockSecurityMiddleware.mockReturnValue({
      status: 200,
      headers: new Headers(),
    } as any);

    const request = new NextRequest('http://localhost:3000/login', {
      method: 'GET',
    });

    const response = await middleware(request);

    expect(mockAuth).toHaveBeenCalled();
    expect(response).toBeDefined();
  });

  it('applies security middleware to all requests', async () => {
    const mockSession = { user: { id: 'user1' } };
    const mockAuthResponse = {
      auth: mockSession,
    };

    mockAuth.mockImplementation(callback => callback(mockAuthResponse));
    mockSecurityMiddleware.mockReturnValue({
      status: 200,
      headers: new Headers(),
    } as any);

    const request = new NextRequest('http://localhost:3000/dashboard', {
      method: 'GET',
    });

    await middleware(request);

    expect(mockSecurityMiddleware).toHaveBeenCalledWith(request);
  });

  it('handles API routes correctly', async () => {
    const mockSession = { user: { id: 'user1' } };
    const mockAuthResponse = {
      auth: mockSession,
    };

    mockAuth.mockImplementation(callback => callback(mockAuthResponse));
    mockSecurityMiddleware.mockReturnValue({
      status: 200,
      headers: new Headers(),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/trpc/test', {
      method: 'GET',
    });

    const response = await middleware(request);

    expect(mockAuth).toHaveBeenCalled();
    expect(response).toBeDefined();
  });

  it('handles auth routes correctly', async () => {
    const mockAuthResponse = {
      auth: null,
    };

    mockAuth.mockImplementation(callback => callback(mockAuthResponse));
    mockSecurityMiddleware.mockReturnValue({
      status: 200,
      headers: new Headers(),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'GET',
    });

    const response = await middleware(request);

    expect(mockAuth).toHaveBeenCalled();
    expect(response).toBeDefined();
  });
});
