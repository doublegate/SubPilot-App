/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { authRouter } from '../auth';
import { db } from '@/server/db';
import type { Session } from 'next-auth';
// import { TRPCError } from '@trpc/server';

// Mock Prisma client
vi.mock('@/server/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    notification: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Auth Router', () => {
  const mockSession: Session = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: new Date(),
    image: null,
    password: null, // Required by Prisma schema
    createdAt: new Date(),
    updatedAt: new Date(),
    notificationPreferences: {
      emailAlerts: true,
      pushNotifications: false,
      weeklyReports: true,
      renewalReminders: true,
      priceChangeAlerts: true,
      cancelledServiceAlerts: true,
      digestFrequency: 'weekly',
      quietHoursStart: null,
      quietHoursEnd: null,
    },
  };

  let ctx: ReturnType<typeof createInnerTRPCContext>;
  let caller: ReturnType<typeof authRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createInnerTRPCContext({ session: mockSession });
    caller = authRouter.createCaller(ctx);
  });

  describe('getUser', () => {
    it('should return current authenticated user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValueOnce(mockUser);

      const result = await caller.getUser();

      expect(result).toEqual(mockUser);
      expect(vi.mocked(db.user.findUnique)).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          notificationPreferences: true,
        },
      });
    });

    it('should throw error when user not found', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValueOnce(null);

      await expect(caller.getUser()).rejects.toThrow('User not found');
    });

    it('should require authentication', async () => {
      const unauthenticatedCtx = createInnerTRPCContext({ session: null });
      const unauthenticatedCaller = authRouter.createCaller(unauthenticatedCtx);

      await expect(unauthenticatedCaller.getUser()).rejects.toThrow();
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      vi.mocked(db.user.update).mockResolvedValueOnce(updatedUser);

      const result = await caller.updateProfile({
        name: 'Updated Name',
      });

      expect(result).toEqual(updatedUser);
      expect(vi.mocked(db.user.update)).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          name: 'Updated Name',
          updatedAt: expect.any(Date) as Date,
        },
      });
    });

    it('should update notification preferences', async () => {
      const notificationPreferences = {
        emailAlerts: false,
        pushNotifications: true,
        weeklyReports: false,
        renewalReminders: true,
        priceChangeAlerts: false,
        cancelledServiceAlerts: true,
        digestFrequency: 'monthly' as const,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };

      vi.mocked(db.user.update).mockResolvedValueOnce(mockUser);

      await caller.updateProfile({
        notificationPreferences,
      });

      expect(vi.mocked(db.user.update)).toHaveBeenNthCalledWith(2, {
        where: { id: 'user-1' },
        data: {
          notificationPreferences,
        },
      });
    });
  });

  describe('getNotificationPreferences', () => {
    it('should return user notification preferences', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        ...mockUser,
        notificationPreferences: mockUser.notificationPreferences,
      });

      const result = await caller.getNotificationPreferences();

      expect(result).toEqual(mockUser.notificationPreferences);
    });

    it('should return default preferences if not set', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        ...mockUser,
        notificationPreferences: null,
      });

      const result = await caller.getNotificationPreferences();

      expect(result).toEqual({
        emailAlerts: true,
        pushNotifications: false,
        weeklyReports: true,
        renewalReminders: true,
        priceChangeAlerts: true,
        cancelledServiceAlerts: true,
        digestFrequency: 'weekly',
        quietHoursStart: null,
        quietHoursEnd: null,
      });
    });
  });

  describe('getSessions', () => {
    it('should return user sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          sessionToken: 'token-1',
          expires: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(db.session.findMany).mockResolvedValueOnce(mockSessions);

      const result = await caller.getSessions();

      expect(result).toEqual([
        {
          ...mockSessions[0],
          isCurrent: false,
        },
      ]);
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        sessionToken: 'token-1',
        expires: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.session.findUnique).mockResolvedValueOnce(mockSession);
      vi.mocked(db.session.delete).mockResolvedValueOnce(mockSession);

      const result = await caller.revokeSession({
        sessionId: 'session-1',
      });

      expect(result).toEqual({ success: true });
      expect(vi.mocked(db.session.delete)).toHaveBeenCalledWith({
        where: {
          id: 'session-1',
          userId: 'user-1',
        },
      });
    });

    it('should throw error if session not found', async () => {
      vi.mocked(db.session.findUnique).mockResolvedValueOnce(null);

      await expect(
        caller.revokeSession({ sessionId: 'nonexistent' })
      ).rejects.toThrow('Session not found');
    });
  });

  describe('deleteAccount', () => {
    it('should delete user account with correct email confirmation', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(db.user.delete).mockResolvedValueOnce(mockUser);

      const result = await caller.deleteAccount({
        confirmationEmail: 'test@example.com',
      });

      expect(result).toEqual({ success: true });
      expect(vi.mocked(db.user.delete)).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should throw error with incorrect email confirmation', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValueOnce(mockUser);

      await expect(
        caller.deleteAccount({
          confirmationEmail: 'wrong@example.com',
        })
      ).rejects.toThrow('Email confirmation does not match');
    });
  });
});
