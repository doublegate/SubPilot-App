import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTRPCMsw } from 'msw-trpc';
import { unifiedCancellationEnhancedRouter } from '../unified-cancellation-enhanced';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

// Mock the database
vi.mock('@/server/db', () => ({
  db: vi.fn(),
}));

// Mock the enhanced orchestrator service
vi.mock(
  '@/server/services/unified-cancellation-orchestrator-enhanced.service',
  () => {
    const mockOrchestrator = {
      initiateCancellation: vi.fn(),
      getOrchestrationStatus: vi.fn(),
      assessProviderCapabilities: vi.fn(),
      getUnifiedAnalytics: vi.fn(),
    };

    return {
      UnifiedCancellationOrchestratorEnhancedService: vi.fn(
        () => mockOrchestrator
      ),
      UnifiedCancellationRequestInput: {
        parse: vi.fn().mockImplementation(input => input),
        safeParse: vi
          .fn()
          .mockImplementation(input => ({ success: true, data: input })),
      },
    };
  }
);

// Mock the helper functions from enhanced router
vi.mock('../unified-cancellation-enhanced', async () => {
  const actual = await vi.importActual('../unified-cancellation-enhanced');
  return {
    ...actual,
    getStatusBreakdown: vi.fn().mockResolvedValue({
      completed: 5,
      failed: 1,
      pending: 1,
    }),
    getMethodBreakdown: vi.fn().mockResolvedValue({
      api: 3,
      automation: 2,
      manual: 2,
    }),
    generateAnalyticsInsights: vi.fn().mockReturnValue([
      {
        type: 'info',
        title: 'Good Success Rate',
        message: 'Your cancellation success rate is above average.',
      },
    ]),
    analyzeErrorBreakdown: vi.fn().mockReturnValue({
      TIMEOUT: 1,
      NETWORK_ERROR: 1,
    }),
    calculatePercentile: vi.fn().mockReturnValue(5000), // 5 seconds
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

describe('unifiedCancellationEnhancedRouter', () => {
  let caller: ReturnType<typeof unifiedCancellationEnhancedRouter.createCaller>;

  beforeEach(() => {
    mockReset(mockDb);

    // Mock groupBy methods for helper functions - properly typed
    const mockGroupBy = vi.fn().mockResolvedValue([
      { status: 'completed', _count: { status: 5 } },
      { status: 'failed', _count: { status: 1 } },
      { status: 'pending', _count: { status: 1 } },
    ] as any);
    mockDb.cancellationRequest.groupBy = mockGroupBy;

    // Mock the db import to return our mockDb
    vi.doMock('@/server/db', () => ({
      db: mockDb,
    }));

    const ctx = createInnerTRPCContext({
      session: mockSession,
    });

    // Override the db with our mock
    const ctxWithMockDb = {
      ...ctx,
      db: mockDb,
    };

    caller = unifiedCancellationEnhancedRouter.createCaller(ctxWithMockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initiate', () => {
    it('should initiate cancellation successfully', async () => {
      const mockResult = {
        success: true,
        requestId: 'req123',
        orchestrationId: 'orch123',
        status: 'pending' as const,
        method: 'api' as const,
        message: 'Cancellation initiated successfully',
        metadata: {
          attemptsUsed: 1,
          realTimeUpdatesEnabled: true,
        },
        tracking: {
          sseEndpoint: '/api/sse/cancellation/orch123',
          statusCheckUrl: '/api/trpc/unifiedCancellation.getStatus?input=...',
        },
      };

      const { UnifiedCancellationOrchestratorEnhancedService } = await import(
        '@/server/services/unified-cancellation-orchestrator-enhanced.service'
      );
      const mockOrchestrator =
        new UnifiedCancellationOrchestratorEnhancedService(mockDb);
      (mockOrchestrator.initiateCancellation as any).mockResolvedValue(
        mockResult
      );

      const input = {
        subscriptionId: 'sub123',
        reason: 'Test cancellation',
        priority: 'normal' as const,
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
    it('should return orchestration status when orchestrationId provided', async () => {
      const mockOrchestrationStatus = {
        orchestrationId: 'orch123',
        status: 'processing',
        method: 'api',
        startTime: new Date(),
        lastUpdate: new Date(),
        progress: {
          currentStep: 'Executing API cancellation',
          totalSteps: 4,
          completedSteps: 2,
        },
      };

      const { UnifiedCancellationOrchestratorEnhancedService } = await import(
        '@/server/services/unified-cancellation-orchestrator-enhanced.service'
      );
      const mockOrchestrator =
        new UnifiedCancellationOrchestratorEnhancedService(mockDb);
      (mockOrchestrator.getOrchestrationStatus as any).mockResolvedValue(
        mockOrchestrationStatus
      );

      const result = await caller.getStatus({
        orchestrationId: 'orch123',
      });

      expect(result).toEqual({
        type: 'orchestration',
        orchestration: mockOrchestrationStatus,
        realTimeEnabled: true,
        sseEndpoint: '/api/sse/cancellation/orch123',
      });
      expect(mockOrchestrator.getOrchestrationStatus).toHaveBeenCalledWith(
        'orch123'
      );
    });

    it('should return request status when requestId provided', async () => {
      const mockRequest = {
        id: 'req123',
        userId: 'user123',
        status: 'processing',
        method: 'api',
        priority: 'normal',
        attempts: 1,
        maxAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        lastAttemptAt: new Date(),
        nextRetryAt: null,
        confirmationCode: null,
        effectiveDate: null,
        refundAmount: null,
        errorCode: null,
        errorMessage: null,
        userNotes: null,
        errorDetails: null,
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
        logs: [],
      };

      mockDb.cancellationRequest.findFirst.mockResolvedValue(
        mockRequest as any
      );

      const result = await caller.getStatus({
        requestId: 'req123',
      });

      expect(result.type).toBe('request');
      expect(result.request?.id).toBe('req123');
      expect(result.realTimeEnabled).toBe(false);
    });
  });

  describe('retry', () => {
    it('should retry failed cancellation', async () => {
      const mockOriginalRequest = {
        id: 'req123',
        userId: 'user123',
        subscriptionId: 'sub123',
        status: 'failed',
        priority: 'normal',
        errorDetails: {},
        subscription: mockSubscription,
      };

      const mockRetryResult = {
        success: true,
        requestId: 'req124',
        orchestrationId: 'orch124',
        status: 'pending' as const,
        method: 'automation' as const,
        message: 'Retry initiated successfully',
        metadata: {
          attemptsUsed: 1,
          realTimeUpdatesEnabled: true,
        },
        tracking: {
          sseEndpoint: '/api/sse/cancellation/orch124',
          statusCheckUrl: '/api/trpc/unifiedCancellation.getStatus?input=...',
        },
      };

      mockDb.cancellationRequest.findFirst.mockResolvedValue(
        mockOriginalRequest as any
      );
      mockDb.cancellationRequest.update.mockResolvedValue(
        mockOriginalRequest as any
      );
      mockDb.cancellationLog.create.mockResolvedValue({} as any);

      const { UnifiedCancellationOrchestratorEnhancedService } = await import(
        '@/server/services/unified-cancellation-orchestrator-enhanced.service'
      );
      const mockOrchestrator =
        new UnifiedCancellationOrchestratorEnhancedService(mockDb);
      (mockOrchestrator.initiateCancellation as any).mockResolvedValue(
        mockRetryResult
      );

      const result = await caller.retry({
        requestId: 'req123',
        escalate: true,
        forceMethod: 'automation',
      });

      expect(result).toEqual({
        ...mockRetryResult,
        isRetry: true,
        originalRequestId: 'req123',
      });
      expect(mockOrchestrator.initiateCancellation).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          subscriptionId: 'sub123',
          preferredMethod: 'automation',
        })
      );
    });
  });

  describe('cancel', () => {
    it('should cancel active cancellation request', async () => {
      const mockRequest = {
        id: 'req123',
        userId: 'user123',
        status: 'pending',
      };

      mockDb.cancellationRequest.findFirst.mockResolvedValue(
        mockRequest as any
      );
      mockDb.cancellationRequest.update.mockResolvedValue(mockRequest as any);
      mockDb.cancellationLog.create.mockResolvedValue({} as any);

      const result = await caller.cancel({
        requestId: 'req123',
        reason: 'User changed mind',
      });

      expect(result).toEqual({
        success: true,
        requestId: 'req123',
        orchestrationId: undefined,
        message: 'Cancellation request has been cancelled',
        cancelledAt: expect.any(Date),
      });

      expect(mockDb.cancellationRequest.update).toHaveBeenCalledWith({
        where: { id: 'req123' },
        data: {
          status: 'cancelled',
          completedAt: expect.any(Date),
          userNotes: 'User changed mind',
        },
      });
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

      const { UnifiedCancellationOrchestratorEnhancedService } = await import(
        '@/server/services/unified-cancellation-orchestrator-enhanced.service'
      );
      const mockOrchestrator =
        new UnifiedCancellationOrchestratorEnhancedService(mockDb);
      (mockOrchestrator.getUnifiedAnalytics as any).mockResolvedValue(
        mockAnalytics
      );

      const result = await caller.getAnalytics({ timeframe: 'month' });

      expect(result).toEqual(
        expect.objectContaining({
          ...mockAnalytics,
          insights: expect.any(Array),
          timeframe: 'month',
          generatedAt: expect.any(Date),
        })
      );
      expect(mockOrchestrator.getUnifiedAnalytics).toHaveBeenCalledWith(
        mockUser.id,
        'month'
      );
    });
  });

  describe('getProviderCapabilities', () => {
    it('should return provider capabilities for known provider', async () => {
      const mockCapabilities = {
        providerId: 'provider123',
        providerName: 'Netflix',
        supportsApi: true,
        supportsAutomation: true,
        supportsManual: true,
        apiSuccessRate: 0.9,
        automationSuccessRate: 0.8,
        manualSuccessRate: 0.95,
        apiEstimatedTime: 5,
        automationEstimatedTime: 15,
        manualEstimatedTime: 30,
        difficulty: 'easy' as const,
        requires2FA: false,
        hasRetentionOffers: false,
        requiresHumanIntervention: false,
        lastAssessed: new Date(),
        dataSource: 'database' as const,
      };

      mockDb.subscription.findFirst.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationProvider.findFirst.mockResolvedValue(
        mockProvider as any
      );

      const { UnifiedCancellationOrchestratorEnhancedService } = await import(
        '@/server/services/unified-cancellation-orchestrator-enhanced.service'
      );
      const mockOrchestrator =
        new UnifiedCancellationOrchestratorEnhancedService(mockDb);
      (mockOrchestrator.assessProviderCapabilities as any).mockResolvedValue(
        mockCapabilities
      );

      const result = await caller.getProviderCapabilities({
        subscriptionId: 'sub123',
      });

      expect(result.subscription.name).toBe('Netflix');
      expect(result.provider?.name).toBe('Netflix');
      expect(result.capabilities.difficulty).toBe('easy');
      expect(result.methods).toHaveLength(3); // auto, api, manual (automation filtered out as unavailable)
      expect(result.methods.find(m => m.id === 'auto')?.isRecommended).toBe(
        true
      );
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
      mockDb.cancellationProvider.findFirst.mockResolvedValue(
        mockProvider as any
      );

      const result = await caller.canCancel({ subscriptionId: 'sub123' });

      expect(result.canCancel).toBe(true);
      expect(result.message).toBe('Subscription can be cancelled');
      expect(result.provider?.name).toBe('Netflix');
      expect(result.subscription?.name).toBe('Netflix');
    });

    it('should return false for already cancelled subscription', async () => {
      const cancelledSubscription = {
        ...mockSubscription,
        status: 'cancelled',
      };
      mockDb.subscription.findFirst.mockResolvedValue(
        cancelledSubscription as any
      );

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
      expect(result.message).toBe(
        'A cancellation request is already in progress'
      );
      expect(result.existingRequestId).toBe('req123');
    });

    it('should return false for non-existent subscription', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(null);

      const result = await caller.canCancel({ subscriptionId: 'invalid' });

      expect(result.canCancel).toBe(false);
      expect(result.reason).toBe('not_found');
      expect(result.message).toBe(
        'Subscription not found or you do not have permission to cancel it'
      );
    });
  });

  // Note: getAvailableMethods is not in the enhanced router, using getProviderCapabilities instead

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
          attempts: 1,
          maxAttempts: 3,
          confirmationCode: 'CONF123',
          effectiveDate: new Date(),
          refundAmount: null,
          errorCode: null,
          errorMessage: null,
          userNotes: null,
          userConfirmed: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
          lastAttemptAt: new Date(),
          nextRetryAt: null,
          metadata: null,
          subscription: {
            id: 'sub123',
            name: 'Netflix',
            amount: 15.99,
            frequency: 'monthly',
          },
          provider: {
            name: 'Netflix',
            logo: 'https://netflix.com/logo.png',
            type: 'api',
          },
        },
      ];

      mockDb.cancellationRequest.findMany.mockResolvedValue(
        mockHistoryRequests as any
      );
      mockDb.cancellationRequest.count.mockResolvedValue(1);

      const result = await caller.getHistory({ limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.hasMore).toBe(false);

      const firstRequest = result.items[0];
      expect(firstRequest?.id).toBe('req1');
      expect(firstRequest?.subscription.name).toBe('Netflix');
      expect(firstRequest?.method).toBe('api');
      expect(firstRequest?.status).toBe('completed');
      expect(firstRequest?.confirmationCode).toBe('CONF123');
    });

    it('should filter by status', async () => {
      const mockCompletedRequests = [
        {
          id: 'req1',
          status: 'completed',
          method: 'api',
          priority: 'normal',
          attempts: 1,
          maxAttempts: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
          lastAttemptAt: new Date(),
          nextRetryAt: null,
          confirmationCode: null,
          effectiveDate: null,
          refundAmount: null,
          errorCode: null,
          errorMessage: null,
          userNotes: null,
          userConfirmed: true,
          metadata: null,
          subscription: {
            id: 'sub123',
            name: 'Netflix',
            amount: 15.99,
            frequency: 'monthly',
          },
          provider: null,
        },
      ];

      mockDb.cancellationRequest.findMany.mockResolvedValue(
        mockCompletedRequests as any
      );
      mockDb.cancellationRequest.count.mockResolvedValue(1);

      const result = await caller.getHistory({ status: 'completed' });

      expect(mockDb.cancellationRequest.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 20, // Default limit
        skip: 0, // Default offset
        include: expect.any(Object),
      });
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health status', async () => {
      const mockRecentRequests = [
        {
          method: 'api',
          status: 'completed',
          createdAt: new Date(),
          completedAt: new Date(),
        },
        {
          method: 'api',
          status: 'completed',
          createdAt: new Date(),
          completedAt: new Date(),
        },
        {
          method: 'api',
          status: 'failed',
          createdAt: new Date(),
          completedAt: null,
        },
        {
          method: 'manual',
          status: 'completed',
          createdAt: new Date(),
          completedAt: new Date(),
        },
        {
          method: 'web_automation',
          status: 'completed',
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ];

      const mockRecentFailures = [
        { method: 'api', errorCode: 'TIMEOUT', createdAt: new Date() },
      ];

      mockDb.cancellationRequest.findMany
        .mockResolvedValueOnce(mockRecentRequests as any) // First call for recent requests
        .mockResolvedValueOnce(mockRecentFailures as any); // Second call for recent failures

      const result = await caller.getSystemHealth({});

      expect(result.status).toMatch(/healthy|degraded|unhealthy/);
      expect(result.methods).toHaveProperty('api');
      expect(result.methods).toHaveProperty('automation');
      expect(result.methods).toHaveProperty('manual');
      expect(result.overall.totalRecentRequests).toBe(5);
      expect(typeof result.overall.successRate).toBe('number');
      expect(result.system).toHaveProperty('cpu');
      expect(result.system).toHaveProperty('memory');
    });
  });

  describe('confirmManual', () => {
    it('should confirm manual cancellation', async () => {
      const mockRequest = {
        id: 'req123',
        userId: 'user123',
        subscriptionId: 'sub123',
        method: 'manual',
        status: 'pending',
        subscription: mockSubscription,
      };

      mockDb.cancellationRequest.findFirst.mockResolvedValue(
        mockRequest as any
      );
      mockDb.cancellationRequest.update.mockResolvedValue(mockRequest as any);
      mockDb.subscription.update.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationLog.create.mockResolvedValue({} as any);

      const result = await caller.confirmManual({
        requestId: 'req123',
        wasSuccessful: true,
        confirmationCode: 'MANUAL123',
        notes: 'Successfully cancelled manually',
      });

      expect(result.success).toBe(true);
      expect(result.requestId).toBe('req123');
      expect(result.status).toBe('completed');
      expect(result.confirmationCode).toBe('MANUAL123');
      expect(result.subscription.name).toBe('Netflix');
      expect(result.subscription.status).toBe('cancelled');
      expect(result.message).toBe('Manual cancellation confirmed successfully');
    });

    it('should throw error for non-manual cancellation', async () => {
      mockDb.cancellationRequest.findFirst.mockResolvedValue(null);

      await expect(
        caller.confirmManual({
          requestId: 'req123',
          wasSuccessful: true,
        })
      ).rejects.toThrow(
        'Manual cancellation request not found or not eligible for confirmation'
      );
    });
  });
});
