import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LightweightCancellationService } from '../lightweight-cancellation.service';
import {
  type PrismaClient,
  type Subscription,
  type CancellationRequest,
  type CancellationLog,
} from '@prisma/client';
import { TRPCError } from '@trpc/server';

// Mock Prisma client
const mockDb = {
  subscription: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  cancellationRequest: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  cancellationLog: {
    create: vi.fn(),
  },
} as unknown as PrismaClient;

const mockSubscription = {
  id: 'sub_123',
  userId: 'user_123',
  name: 'Netflix',
  amount: 15.99,
  status: 'active',
  category: 'streaming',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  notes: null,
  description: null,
  aiCategory: null,
  aiCategoryConfidence: null,
  categoryOverride: null,
  currency: 'USD',
  frequency: 'monthly',
  nextBilling: null,
  lastBilling: null,
  provider: {},
  cancellationInfo: {},
  detectionConfidence: 0.85,
  detectedAt: new Date(),
} as Subscription;

describe('LightweightCancellationService', () => {
  let service: LightweightCancellationService;

  beforeEach(() => {
    service = new LightweightCancellationService(mockDb);
    vi.clearAllMocks();
  });

  describe('provideCancellationInstructions', () => {
    it('should provide instructions for Netflix subscription', async () => {
      // Mock subscription exists
      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(
        mockSubscription
      );

      // Mock no existing cancellation request
      vi.mocked(mockDb.cancellationRequest.findFirst).mockResolvedValue(null);

      // Mock request creation
      const mockRequest = {
        id: 'req_123',
        userId: 'user_123',
        subscriptionId: 'sub_123',
        method: 'manual',
        status: 'pending',
      };
      vi.mocked(mockDb.cancellationRequest.create).mockResolvedValue(
        mockRequest as CancellationRequest
      );

      // Mock log creation
      vi.mocked(mockDb.cancellationLog.create).mockResolvedValue(
        {} as CancellationLog
      );

      const result = await service.provideCancellationInstructions('user_123', {
        subscriptionId: 'sub_123',
        notes: 'Test cancellation',
      });

      expect(result.status).toBe('instructions_provided');
      expect(result.requestId).toBe('req_123');
      expect(result.instructions).toBeDefined();
      expect(result.instructions?.provider.name).toBe('Netflix');
      expect(result.instructions?.instructions.steps).toHaveLength(6);
      expect(result.instructions?.instructions.difficulty).toBe('easy');
    });

    it('should use default template for unknown service', async () => {
      const unknownSubscription = {
        ...mockSubscription,
        name: 'Unknown Service XYZ',
      };

      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(
        unknownSubscription
      );
      vi.mocked(mockDb.cancellationRequest.findFirst).mockResolvedValue(null);
      vi.mocked(mockDb.cancellationRequest.create).mockResolvedValue({
        id: 'req_123',
        userId: 'user_123',
        subscriptionId: 'sub_123',
        method: 'manual',
        status: 'pending',
      } as any);
      vi.mocked(mockDb.cancellationLog.create).mockResolvedValue(
        {} as CancellationLog
      );

      const result = await service.provideCancellationInstructions('user_123', {
        subscriptionId: 'sub_123',
      });

      expect(result.instructions?.provider.name).toBe('Unknown Service XYZ');
      expect(result.instructions?.provider.id).toBe('default');
      expect(result.instructions?.instructions.difficulty).toBe('medium');
    });

    it('should throw error if subscription not found', async () => {
      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(null);

      await expect(
        service.provideCancellationInstructions('user_123', {
          subscriptionId: 'sub_123',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should throw error if subscription already cancelled', async () => {
      const cancelledSubscription = {
        ...mockSubscription,
        status: 'cancelled',
      };

      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(
        cancelledSubscription
      );

      await expect(
        service.provideCancellationInstructions('user_123', {
          subscriptionId: 'sub_123',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should throw error if cancellation already in progress', async () => {
      vi.mocked(mockDb.subscription.findFirst).mockResolvedValue(
        mockSubscription
      );

      // Mock existing cancellation request
      vi.mocked(mockDb.cancellationRequest.findFirst).mockResolvedValue({
        id: 'existing_req',
        status: 'pending',
      } as any);

      await expect(
        service.provideCancellationInstructions('user_123', {
          subscriptionId: 'sub_123',
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('confirmCancellation', () => {
    const mockRequest = {
      id: 'req_123',
      userId: 'user_123',
      subscriptionId: 'sub_123',
      method: 'manual',
      status: 'pending',
      subscription: mockSubscription,
    };

    it('should confirm successful cancellation', async () => {
      vi.mocked(mockDb.cancellationRequest.findFirst).mockResolvedValue(
        mockRequest as any
      );
      vi.mocked(mockDb.cancellationRequest.update).mockResolvedValue({} as any);
      vi.mocked(mockDb.subscription.update).mockResolvedValue({} as any);
      vi.mocked(mockDb.cancellationLog.create).mockResolvedValue(
        {} as CancellationLog
      );

      const result = await service.confirmCancellation('user_123', 'req_123', {
        wasSuccessful: true,
        confirmationCode: 'CANCEL123',
        notes: 'Successfully cancelled',
      });

      expect(result.status).toBe('completed');
      expect(result.confirmationCode).toBe('CANCEL123');
      expect(mockDb.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_123' },
        data: expect.objectContaining({
          status: 'cancelled',
          isActive: false,
        }),
      });
    });

    it('should handle failed cancellation', async () => {
      vi.mocked(mockDb.cancellationRequest.findFirst).mockResolvedValue(
        mockRequest as any
      );
      vi.mocked(mockDb.cancellationRequest.update).mockResolvedValue({} as any);
      vi.mocked(mockDb.cancellationLog.create).mockResolvedValue(
        {} as CancellationLog
      );

      const result = await service.confirmCancellation('user_123', 'req_123', {
        wasSuccessful: false,
        notes: 'Could not find cancellation option',
      });

      expect(result.status).toBe('failed');
      expect(mockDb.subscription.update).not.toHaveBeenCalled();
    });

    it('should throw error if request not found', async () => {
      vi.mocked(mockDb.cancellationRequest.findFirst).mockResolvedValue(null);

      await expect(
        service.confirmCancellation('user_123', 'req_123', {
          wasSuccessful: true,
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getCancellationHistory', () => {
    it('should return cancellation history', async () => {
      const mockHistory = [
        {
          id: 'req_1',
          status: 'completed',
          method: 'manual',
          createdAt: new Date(),
          completedAt: new Date(),
          confirmationCode: 'CANCEL123',
          effectiveDate: new Date(),
          subscription: {
            id: 'sub_1',
            name: 'Netflix',
            amount: 15.99,
          },
        },
      ];

      vi.mocked(mockDb.cancellationRequest.findMany).mockResolvedValue(
        mockHistory as any
      );

      const result = await service.getCancellationHistory('user_123', 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'req_1',
        status: 'completed',
        method: 'manual',
        confirmationCode: 'CANCEL123',
        subscription: {
          id: 'sub_1',
          name: 'Netflix',
          amount: 15.99,
        },
      });
    });
  });

  describe('getAvailableProviders', () => {
    it('should return all available providers', () => {
      const providers = service.getAvailableProviders();

      expect(providers.length).toBeGreaterThan(0);
      expect(providers.every(p => p.id !== 'default')).toBe(true);
      expect(providers.find(p => p.name === 'Netflix')).toBeDefined();
      expect(providers.find(p => p.name === 'Spotify')).toBeDefined();
    });

    it('should filter providers by search term', () => {
      const providers = service.getAvailableProviders('netflix');

      expect(providers.length).toBe(1);
      const firstProvider = providers[0];
      expect(firstProvider?.name).toBe('Netflix');
    });

    it('should filter providers by category', () => {
      const providers = service.getAvailableProviders('streaming');

      expect(providers.length).toBeGreaterThan(0);
      expect(providers.every(p => p.category === 'streaming')).toBe(true);
    });
  });
});
