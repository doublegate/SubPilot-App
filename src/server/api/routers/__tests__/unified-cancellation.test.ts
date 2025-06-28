import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTRPCMsw } from 'msw-trpc';
import { unifiedCancellationRouter } from '../unified-cancellation';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

// Mock the orchestrator service
vi.mock('@/server/services/unified-cancellation-orchestrator.service', () => {
  const mockOrchestrator = {
    initiateCancellation: vi.fn(),
    getCancellationStatus: vi.fn(),
    retryCancellation: vi.fn(),
    cancelCancellationRequest: vi.fn(),
    getUnifiedAnalytics: vi.fn(),
  };

  return {
    UnifiedCancellationOrchestratorService: vi.fn(() => mockOrchestrator),
  };
});

const mockDb = mockDeep<PrismaClient>();

// Test constants
const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  name: 'Test User',
};

const mockSession = {
  user: mockUser,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

const mockSubscription = {
  id: 'sub123',
  userId: 'user123',
  name: 'Netflix',
  amount: 15.99,
  currency: 'USD',
  frequency: 'monthly',
  status: 'active',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProvider = {
  id: 'provider123',
  name: 'Netflix',
  normalizedName: 'netflix',
  type: 'api',
  category: 'streaming',
  logo: 'https://netflix.com/logo.png',
  apiEndpoint: 'https://api.netflix.com/cancel',
  successRate: 0.9,
  averageTime: 5,
  difficulty: 'easy',
  isActive: true,
  requires2FA: false,
  requiresRetention: false,
  supportsRefunds: false,
};

describe('unifiedCancellationRouter', () => {
  let caller: ReturnType<typeof unifiedCancellationRouter.createCaller>;

  beforeEach(() => {
    mockReset(mockDb);
    
    const ctx = createInnerTRPCContext({
      session: mockSession,
      db: mockDb,
    });
    
    caller = unifiedCancellationRouter.createCaller(ctx);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initiate', () => {
    it('should initiate cancellation successfully', async () => {
      const mockResult = {
        requestId: 'req123',
        orchestrationId: 'orch123',
        status: 'pending' as const,
        method: 'api' as const,
        currentStep: 'Validating request',
        totalSteps: 4,
        completedSteps: 0,
        fallbackAvailable: true,
        subscriptionUrl: '/api/cancellation/stream/req123?orchestration=orch123',
      };

      const { UnifiedCancellationOrchestratorService } = await import(
        '@/server/services/unified-cancellation-orchestrator.service'
      );
      const mockOrchestrator = new UnifiedCancellationOrchestratorService(mockDb);
      (mockOrchestrator.initiateCancellation as any).mockResolvedValue(mockResult);

      const input = {
        subscriptionId: 'sub123',
        priority: 'normal' as const,
        notes: 'Test cancellation',
        preferredMethod: 'auto' as const,
      };

      const result = await caller.initiate(input);

      expect(result).toEqual(mockResult);
      expect(mockOrchestrator.initiateCancellation).toHaveBeenCalledWith(
        mockUser.id,
        input
      );
    });

    it('should handle validation errors', async () => {
      const input = {
        subscriptionId: '', // Invalid empty string
        priority: 'normal' as const,
        preferredMethod: 'auto' as const,
      };

      await expect(caller.initiate(input)).rejects.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return unified cancellation status', async () => {
      const mockStatus = {
        status: {
          requestId: 'req123',
          orchestrationId: 'orch123',
          status: 'processing' as const,
          method: 'api' as const,
          currentStep: 'Executing API cancellation',
          totalSteps: 4,
          completedSteps: 2,
          fallbackAvailable: true,
        },
        timeline: [
          {
            timestamp: new Date(),
            action: 'initiated',
            status: 'success',
            message: 'Cancellation started',
          },
        ],
        nextSteps: ['Processing cancellation request'],
        alternativeOptions: ['Cancel request', 'Wait for completion'],
      };

      const { UnifiedCancellationOrchestratorService } = await import(
        '@/server/services/unified-cancellation-orchestrator.service'
      );
      const mockOrchestrator = new UnifiedCancellationOrchestratorService(mockDb);
      (mockOrchestrator.getCancellationStatus as any).mockResolvedValue(mockStatus);

      const result = await caller.getStatus({
        requestId: 'req123',
        orchestrationId: 'orch123',
      });

      expect(result).toEqual(mockStatus);
      expect(mockOrchestrator.getCancellationStatus).toHaveBeenCalledWith(
        mockUser.id,
        'req123',
        'orch123'
      );
    });
  });

  describe('retry', () => {
    it('should retry failed cancellation', async () => {
      const mockRetryResult = {
        requestId: 'req124',
        orchestrationId: 'orch124',
        status: 'pending' as const,
        method: 'event_driven' as const,
        currentStep: 'Starting retry',
        totalSteps: 6,
        completedSteps: 0,
        fallbackAvailable: true,
      };

      const { UnifiedCancellationOrchestratorService } = await import(
        '@/server/services/unified-cancellation-orchestrator.service'
      );
      const mockOrchestrator = new UnifiedCancellationOrchestratorService(mockDb);
      (mockOrchestrator.retryCancellation as any).mockResolvedValue(mockRetryResult);

      const result = await caller.retry({
        requestId: 'req123',
        escalate: true,
        forceMethod: 'event_driven',
      });

      expect(result).toEqual(mockRetryResult);
      expect(mockOrchestrator.retryCancellation).toHaveBeenCalledWith(
        mockUser.id,
        'req123',
        { forceMethod: 'event_driven', escalate: true }
      );
    });
  });

  describe('cancel', () => {
    it('should cancel active cancellation request', async () => {
      const mockCancelResult = {
        success: true,
        message: 'Cancellation request has been cancelled successfully',
      };

      const { UnifiedCancellationOrchestratorService } = await import(
        '@/server/services/unified-cancellation-orchestrator.service'
      );
      const mockOrchestrator = new UnifiedCancellationOrchestratorService(mockDb);
      (mockOrchestrator.cancelCancellationRequest as any).mockResolvedValue(mockCancelResult);

      const result = await caller.cancel({
        requestId: 'req123',
        reason: 'User changed mind',
      });

      expect(result).toEqual(mockCancelResult);
      expect(mockOrchestrator.cancelCancellationRequest).toHaveBeenCalledWith(
        mockUser.id,
        'req123',
        'User changed mind'
      );
    });
  });

  describe('getAnalytics', () => {
    it('should return unified analytics', async () => {
      const mockAnalytics = {
        summary: {
          total: 10,
          completed: 8,
          failed: 1,
          pending: 1,
          successRate: 80,
          averageTime: 12,
        },
        methodComparison: {
          api: {
            total: 5,
            completed: 5,
            failed: 0,
            pending: 0,
            successRate: 100,
            averageTime: 5,
          },
          lightweight: {
            total: 3,
            completed: 2,
            failed: 1,
            pending: 0,
            successRate: 67,
            averageTime: 20,
          },
          event_driven: {
            total: 2,
            completed: 1,
            failed: 0,
            pending: 1,
            successRate: 50,
            averageTime: 15,
          },
        },
        trends: [],
        recommendations: [
          'API method shows highest success rate (100%)',
          'Keep confirmation codes and take screenshots for your records',
        ],
      };

      const { UnifiedCancellationOrchestratorService } = await import(
        '@/server/services/unified-cancellation-orchestrator.service'
      );
      const mockOrchestrator = new UnifiedCancellationOrchestratorService(mockDb);
      (mockOrchestrator.getUnifiedAnalytics as any).mockResolvedValue(mockAnalytics);

      const result = await caller.getAnalytics({ timeframe: 'month' });

      expect(result).toEqual(mockAnalytics);
      expect(mockOrchestrator.getUnifiedAnalytics).toHaveBeenCalledWith(
        mockUser.id,
        'month'
      );
    });
  });

  describe('getProviderCapabilities', () => {
    it('should return provider capabilities for known provider', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationProvider.findFirst.mockResolvedValue(mockProvider as any);

      const result = await caller.getProviderCapabilities({
        subscriptionId: 'sub123',
      });

      expect(result.subscription.name).toBe('Netflix');
      expect(result.provider?.name).toBe('Netflix');
      expect(result.capabilities.supportsApi).toBe(true);
      expect(result.capabilities.estimatedSuccessRate).toBe(0.9);
      expect(result.recommendedMethod).toBe('api');
      expect(result.availableMethods).toContain('api');
      expect(result.availableMethods).toContain('lightweight');
    });

    it('should return default capabilities for unknown provider', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationProvider.findFirst.mockResolvedValue(null);

      const result = await caller.getProviderCapabilities({
        subscriptionId: 'sub123',
      });

      expect(result.subscription.name).toBe('Netflix');
      expect(result.provider).toBeNull();
      expect(result.capabilities.supportsApi).toBe(false);
      expect(result.capabilities.estimatedSuccessRate).toBe(0.6);
      expect(result.recommendedMethod).toBe('lightweight');
      expect(result.availableMethods).toEqual(['lightweight']);
    });

    it('should throw error for non-existent subscription', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(null);

      await expect(
        caller.getProviderCapabilities({ subscriptionId: 'invalid' })
      ).rejects.toThrow('Subscription not found');
    });
  });

  describe('canCancel', () => {
    it('should return true for cancellable subscription', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationRequest.findFirst.mockResolvedValue(null);

      const result = await caller.canCancel({ subscriptionId: 'sub123' });

      expect(result.canCancel).toBe(true);
      expect(result.message).toBe('Subscription can be cancelled');
    });

    it('should return false for already cancelled subscription', async () => {
      const cancelledSubscription = {
        ...mockSubscription,
        status: 'cancelled',
      };
      mockDb.subscription.findFirst.mockResolvedValue(cancelledSubscription as any);

      const result = await caller.canCancel({ subscriptionId: 'sub123' });

      expect(result.canCancel).toBe(false);
      expect(result.reason).toBe('already_cancelled');
      expect(result.message).toBe('This subscription is already cancelled');
    });

    it('should return false for subscription with pending cancellation', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationRequest.findFirst.mockResolvedValue({
        id: 'req123',
        status: 'pending',
      } as any);

      const result = await caller.canCancel({ subscriptionId: 'sub123' });

      expect(result.canCancel).toBe(false);
      expect(result.reason).toBe('cancellation_in_progress');
      expect(result.message).toBe('A cancellation request is already in progress');
      expect(result.requestId).toBe('req123');
    });

    it('should throw error for non-existent subscription', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(null);

      await expect(
        caller.canCancel({ subscriptionId: 'invalid' })
      ).rejects.toThrow('Subscription not found');
    });
  });

  describe('getAvailableMethods', () => {
    it('should return available cancellation methods', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationProvider.findFirst.mockResolvedValue(mockProvider as any);

      const result = await caller.getAvailableMethods({
        subscriptionId: 'sub123',
      });

      expect(result.subscription.name).toBe('Netflix');
      expect(result.methods).toHaveLength(3); // auto, api, lightweight
      expect(result.methods[0].id).toBe('auto');
      expect(result.methods[0].isRecommended).toBe(true);
      expect(result.methods.find(m => m.id === 'api')).toBeDefined();
      expect(result.methods.find(m => m.id === 'lightweight')).toBeDefined();
      expect(result.provider?.name).toBe('Netflix');
    });

    it('should return limited methods for unknown provider', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationProvider.findFirst.mockResolvedValue(null);

      const result = await caller.getAvailableMethods({
        subscriptionId: 'sub123',
      });

      expect(result.methods).toHaveLength(2); // auto, lightweight
      expect(result.methods.find(m => m.id === 'api')).toBeUndefined();
      expect(result.provider).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('should return cancellation history', async () => {
      const mockHistoryRequests = [
        {
          id: 'req1',
          userId: 'user123',
          subscriptionId: 'sub123',
          method: 'api',
          status: 'completed',
          priority: 'normal',
          confirmationCode: 'CONF123',
          effectiveDate: new Date(),
          createdAt: new Date(),
          completedAt: new Date(),
          errorMessage: null,
          subscription: {
            id: 'sub123',
            name: 'Netflix',
            amount: 15.99,
          },
          provider: {
            name: 'Netflix',
            logo: 'https://netflix.com/logo.png',
            type: 'api',
          },
        },
        {
          id: 'req2',
          userId: 'user123',
          subscriptionId: 'sub124',
          method: 'manual',
          status: 'failed',
          priority: 'high',
          confirmationCode: null,
          effectiveDate: null,
          createdAt: new Date(),
          completedAt: new Date(),
          errorMessage: 'Manual cancellation failed',
          subscription: {
            id: 'sub124',
            name: 'Spotify',
            amount: 9.99,
          },
          provider: null,
        },
      ];

      mockDb.cancellationRequest.findMany.mockResolvedValue(mockHistoryRequests as any);

      const result = await caller.getHistory({ limit: 10 });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('req1');
      expect(result[0].subscription.name).toBe('Netflix');
      expect(result[0].method).toBe('api'); // Transformed by orchestrator
      expect(result[0].status).toBe('completed');
      expect(result[0].confirmationCode).toBe('CONF123');
      expect(result[1].id).toBe('req2');
      expect(result[1].error).toBe('Manual cancellation failed');
    });

    it('should filter by status', async () => {
      const mockCompletedRequests = [
        {
          id: 'req1',
          status: 'completed',
          subscription: { id: 'sub123', name: 'Netflix', amount: 15.99 },
          provider: null,
          method: 'api',
          priority: 'normal',
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ];

      mockDb.cancellationRequest.findMany.mockResolvedValue(mockCompletedRequests as any);

      const result = await caller.getHistory({ status: 'completed' });

      expect(mockDb.cancellationRequest.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: expect.any(Object),
      });
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health status', async () => {
      const mockRecentRequests = [
        { method: 'api', status: 'completed' },
        { method: 'api', status: 'completed' },
        { method: 'api', status: 'failed' },
        { method: 'manual', status: 'completed' },
        { method: 'web_automation', status: 'completed' },
      ];

      mockDb.cancellationRequest.findMany.mockResolvedValue(mockRecentRequests as any);

      const result = await caller.getSystemHealth();

      expect(result.status).toMatch(/healthy|degraded|unhealthy/);
      expect(result.methods).toHaveProperty('api');
      expect(result.methods).toHaveProperty('event_driven');
      expect(result.methods).toHaveProperty('lightweight');
      expect(result.overall.totalRecentRequests).toBe(5);
      expect(typeof result.overall.averageSuccessRate).toBe('number');
    });
  });

  describe('confirmManual', () => {
    it('should confirm manual cancellation', async () => {
      const mockRequest = {
        id: 'req123',
        userId: 'user123',
        method: 'manual',
        status: 'pending',
      };

      mockDb.cancellationRequest.findFirst.mockResolvedValue(mockRequest as any);

      const { UnifiedCancellationOrchestratorService } = await import(
        '@/server/services/unified-cancellation-orchestrator.service'
      );
      const mockOrchestrator = new UnifiedCancellationOrchestratorService(mockDb);
      const mockLightweightService = {
        confirmCancellation: vi.fn().mockResolvedValue({
          requestId: 'req123',
          status: 'completed',
          confirmationCode: 'MANUAL123',
          effectiveDate: new Date(),
        }),
      };
      (mockOrchestrator as any).lightweightService = mockLightweightService;

      const result = await caller.confirmManual({
        requestId: 'req123',
        wasSuccessful: true,
        confirmationCode: 'MANUAL123',
        notes: 'Successfully cancelled manually',
      });

      expect(result.status).toBe('completed');
      expect(result.confirmationCode).toBe('MANUAL123');
    });

    it('should throw error for non-manual cancellation', async () => {
      const mockRequest = {
        id: 'req123',
        userId: 'user123',
        method: 'api', // Not manual
        status: 'pending',
      };

      mockDb.cancellationRequest.findFirst.mockResolvedValue(mockRequest as any);

      await expect(
        caller.confirmManual({
          requestId: 'req123',
          wasSuccessful: true,
        })
      ).rejects.toThrow('Manual cancellation request not found');
    });
  });
});