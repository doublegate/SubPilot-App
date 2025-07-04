import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CancellationService } from '../cancellation.service';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@prisma/client';

// Mock Prisma client
const mockPrismaClient = {
  subscription: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  cancellationProvider: {
    findFirst: vi.fn(),
  },
  cancellationRequest: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  cancellationLog: {
    create: vi.fn(),
  },
} as unknown as PrismaClient;

// Mock audit logger
vi.mock('@/server/lib/audit-logger', () => ({
  AuditLogger: {
    log: vi.fn(),
  },
}));

describe('CancellationService', () => {
  let service: CancellationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CancellationService(mockPrismaClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initiateCancellation', () => {
    const mockUserId = 'user123';
    const mockSubscriptionId = 'sub123';
    const mockSubscription = {
      id: mockSubscriptionId,
      userId: mockUserId,
      name: 'Netflix',
      status: 'active',
      amount: 15.99,
      currency: 'USD',
      frequency: 'monthly',
      user: { id: mockUserId },
    };

    it('should initiate cancellation successfully', async () => {
      const mockProvider = {
        id: 'provider123',
        name: 'Netflix',
        normalizedName: 'netflix',
        type: 'api',
        apiEndpoint: 'https://api.netflix.com/cancel',
        isActive: true,
      };

      const mockRequest = {
        id: 'req123',
        userId: mockUserId,
        subscriptionId: mockSubscriptionId,
        method: 'api',
        status: 'pending',
      };

      const mockResult = {
        requestId: 'req123',
        status: 'completed',
        confirmationCode: 'CONF123',
        effectiveDate: new Date(),
        refundAmount: null,
        manualInstructions: null,
        error: null,
      };

      vi.mocked(mockPrismaClient.subscription.findFirst).mockResolvedValueOnce(
        mockSubscription as any
      );
      vi.mocked(
        mockPrismaClient.cancellationProvider.findFirst
      ).mockResolvedValueOnce(mockProvider as any);
      vi.mocked(
        mockPrismaClient.cancellationRequest.create
      ).mockResolvedValueOnce(mockRequest as any);
      vi.mocked(mockPrismaClient.cancellationLog.create).mockResolvedValueOnce(
        {} as any
      );

      // Mock the processCancellation method
      const processSpy = vi
        .spyOn(service, 'processCancellation')
        .mockResolvedValueOnce(mockResult as any);

      const result = await service.initiateCancellation(mockUserId, {
        subscriptionId: mockSubscriptionId,
        priority: 'normal',
      });

      expect(result).toEqual(mockResult);
      expect(mockPrismaClient.subscription.findFirst).toHaveBeenCalledWith({
        where: { id: mockSubscriptionId, userId: mockUserId },
        include: { user: true },
      });
      expect(processSpy).toHaveBeenCalledWith('req123');
    });

    it('should throw error if subscription not found', async () => {
      vi.mocked(mockPrismaClient.subscription.findFirst).mockResolvedValueOnce(
        null
      );

      await expect(
        service.initiateCancellation(mockUserId, {
          subscriptionId: mockSubscriptionId,
          priority: 'normal',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should throw error if subscription already cancelled', async () => {
      const cancelledSubscription = {
        ...mockSubscription,
        status: 'cancelled',
      };
      vi.mocked(mockPrismaClient.subscription.findFirst).mockResolvedValueOnce(
        cancelledSubscription as any
      );

      await expect(
        service.initiateCancellation(mockUserId, {
          subscriptionId: mockSubscriptionId,
          priority: 'normal',
        })
      ).rejects.toThrow('Subscription is already cancelled');
    });
  });

  describe('getCancellationStatus', () => {
    it('should return cancellation status', async () => {
      const mockRequest = {
        id: 'req123',
        userId: 'user123',
        status: 'completed',
        confirmationCode: 'CONF123',
        effectiveDate: new Date(),
        refundAmount: 10.5,
        manualInstructions: {},
        errorCode: null,
        errorMessage: null,
        errorDetails: {},
      };

      vi.mocked(
        mockPrismaClient.cancellationRequest.findFirst
      ).mockResolvedValueOnce(mockRequest as any);

      const result = await service.getCancellationStatus('user123', 'req123');

      expect(result).toEqual({
        requestId: 'req123',
        status: 'completed',
        confirmationCode: 'CONF123',
        effectiveDate: mockRequest.effectiveDate,
        refundAmount: 10.5,
        manualInstructions: {},
        error: null,
      });
    });

    it('should throw error if request not found', async () => {
      vi.mocked(
        mockPrismaClient.cancellationRequest.findFirst
      ).mockResolvedValueOnce(null);

      await expect(
        service.getCancellationStatus('user123', 'req123')
      ).rejects.toThrow('Cancellation request not found');
    });
  });

  describe('retryCancellation', () => {
    it('should retry failed cancellation', async () => {
      const mockFailedRequest = {
        id: 'req123',
        userId: 'user123',
        status: 'failed',
      };

      vi.mocked(
        mockPrismaClient.cancellationRequest.findFirst
      ).mockResolvedValueOnce(mockFailedRequest as any);
      vi.mocked(
        mockPrismaClient.cancellationRequest.update
      ).mockResolvedValueOnce({} as any);

      const processSpy = vi
        .spyOn(service, 'processCancellation')
        .mockResolvedValueOnce({
          requestId: 'req123',
          status: 'processing',
          confirmationCode: null,
          effectiveDate: null,
          refundAmount: null,
          manualInstructions: null,
          error: null,
        } as any);

      const result = await service.retryCancellation('user123', 'req123');

      expect(mockPrismaClient.cancellationRequest.update).toHaveBeenCalledWith({
        where: { id: 'req123' },
        data: {
          status: 'pending',
          errorCode: null,
          errorMessage: null,
          errorDetails: {},
          nextRetryAt: null,
        },
      });
      expect(processSpy).toHaveBeenCalledWith('req123');
      expect(result.status).toBe('processing');
    });

    it('should throw error if request not found or not failed', async () => {
      vi.mocked(
        mockPrismaClient.cancellationRequest.findFirst
      ).mockResolvedValueOnce(null);

      await expect(
        service.retryCancellation('user123', 'req123')
      ).rejects.toThrow('Failed cancellation request not found');
    });
  });

  describe('confirmManualCancellation', () => {
    it('should confirm manual cancellation', async () => {
      const mockRequest = {
        id: 'req123',
        userId: 'user123',
        subscriptionId: 'sub123',
        method: 'manual',
        subscription: { id: 'sub123' },
      };

      const confirmationData = {
        confirmationCode: 'MANUAL123',
        effectiveDate: new Date(),
        notes: 'Cancelled via phone call',
      };

      vi.mocked(
        mockPrismaClient.cancellationRequest.findFirst
      ).mockResolvedValueOnce(mockRequest as any);
      vi.mocked(
        mockPrismaClient.cancellationRequest.update
      ).mockResolvedValueOnce({
        ...mockRequest,
        status: 'completed',
        ...confirmationData,
      } as any);
      vi.mocked(mockPrismaClient.subscription.update).mockResolvedValueOnce(
        {} as any
      );
      vi.mocked(mockPrismaClient.cancellationLog.create).mockResolvedValueOnce(
        {} as any
      );

      const result = await service.confirmManualCancellation(
        'user123',
        'req123',
        confirmationData
      );

      expect(result).toEqual({
        requestId: 'req123',
        status: 'completed',
        confirmationCode: 'MANUAL123',
        effectiveDate: confirmationData.effectiveDate,
        refundAmount: null,
        manualInstructions: null,
        error: null,
      });

      expect(mockPrismaClient.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub123' },
        data: {
          status: 'cancelled',
          isActive: false,
          cancellationInfo: expect.objectContaining({
            requestId: 'req123',
            confirmationCode: 'MANUAL123',
            manualConfirmation: true,
          }),
        },
      });
    });
  });

  describe('getCancellationHistory', () => {
    it('should return user cancellation history', async () => {
      const mockRequests = [
        {
          id: 'req1',
          subscription: { id: 'sub1', name: 'Netflix', amount: 15.99 },
          provider: { name: 'Netflix', logo: 'netflix.svg' },
          status: 'completed',
          method: 'api',
          confirmationCode: 'CONF1',
          effectiveDate: new Date(),
          createdAt: new Date(),
          completedAt: new Date(),
        },
        {
          id: 'req2',
          subscription: { id: 'sub2', name: 'Spotify', amount: 9.99 },
          provider: { name: 'Spotify', logo: 'spotify.svg' },
          status: 'failed',
          method: 'manual',
          confirmationCode: null,
          effectiveDate: null,
          createdAt: new Date(),
          completedAt: null,
        },
      ];

      vi.mocked(
        mockPrismaClient.cancellationRequest.findMany
      ).mockResolvedValueOnce(mockRequests as any);

      const result = await service.getCancellationHistory('user123', 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'req1',
        subscription: mockRequests[0]?.subscription,
        provider: mockRequests[0]?.provider,
        status: 'completed',
        method: 'api',
        confirmationCode: 'CONF1',
        effectiveDate: mockRequests[0]?.effectiveDate,
        createdAt: mockRequests[0]?.createdAt,
        completedAt: mockRequests[0]?.completedAt,
      });
    });
  });
});
