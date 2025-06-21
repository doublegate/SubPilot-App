import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { authRouter } from '@/server/api/routers/auth';
import type { Session } from 'next-auth';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/db';

// Mock Prisma client
vi.mock('@/server/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockSession: Session = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  emailVerified: null,
  password: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  notificationPreferences: null,
};

describe('authRouter', () => {
  let ctx: ReturnType<typeof createInnerTRPCContext>;
  let caller: ReturnType<typeof authRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();

    ctx = createInnerTRPCContext({
      session: mockSession,
    });

    caller = authRouter.createCaller(ctx);
  });

  describe('getUser', () => {
    it('returns the current user', async () => {
      (db.user.findUnique as Mock).mockResolvedValueOnce(mockUser);

      const result = await caller.getUser();

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        select: expect.objectContaining({}),
      });
      expect(result).toEqual(mockUser);
    });

    it("throws NOT_FOUND error when user doesn't exist", async () => {
      (db.user.findUnique as Mock).mockResolvedValueOnce(null);

      await expect(caller.getUser()).rejects.toThrow(TRPCError);
      await expect(caller.getUser()).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    it('updates user profile successfully', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      (db.user.update as Mock).mockResolvedValueOnce(updatedUser);

      const result = await caller.updateProfile({
        name: 'Updated Name',
      });

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        data: {
          name: 'Updated Name',
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedUser);
    });

    it('updates notification preferences when provided', async () => {
      const updatedUserWithPrefs = {
        ...mockUser,
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
      (db.user.update as Mock).mockResolvedValueOnce(updatedUserWithPrefs);

      await caller.updateProfile({
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
      });

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        data: {
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
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getSessions', () => {
    it('returns user sessions with current session marked', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          sessionToken: 'test-session-token',
          userId: 'test-user-id',
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'session-2',
          sessionToken: 'other-session-token',
          userId: 'test-user-id',
          expires: new Date(Date.now() + 48 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (db.session.findMany as Mock).mockResolvedValueOnce(mockSessions);

      const result = await caller.getSessions();

      expect(result).toHaveLength(2);
      expect(result[0]?.isCurrent).toBe(false); // TODO: Implement current session detection
      expect(result[1]?.isCurrent).toBe(false);
    });
  });

  describe('deleteAccount', () => {
    it('deletes account when email confirmation matches', async () => {
      (db.user.findUnique as Mock).mockResolvedValueOnce(mockUser);
      (db.user.delete as Mock).mockResolvedValueOnce(mockUser);

      const result = await caller.deleteAccount({
        confirmationEmail: 'test@example.com',
      });

      expect(db.user.delete).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
      });
      expect(result).toEqual({ success: true });
    });

    it("throws error when email confirmation doesn't match", async () => {
      (db.user.findUnique as Mock).mockResolvedValueOnce(mockUser);

      await expect(
        caller.deleteAccount({
          confirmationEmail: 'wrong@example.com',
        })
      ).rejects.toThrow('Email confirmation does not match');
    });
  });
});
