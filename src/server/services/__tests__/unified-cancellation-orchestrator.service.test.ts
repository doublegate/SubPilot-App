import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { UnifiedCancellationOrchestratorService } from '../unified-cancellation-orchestrator.service';
import { mockDeep, mockReset } from 'vitest-mock-extended';

// Mock dependencies
vi.mock('@/server/lib/event-bus', () => ({
  emitCancellationEvent: vi.fn(),
  onCancellationEvent: vi.fn(),
}));

vi.mock('@/server/lib/realtime-notifications', () => ({
  sendRealtimeNotification: vi.fn(),
}));

vi.mock('@/server/lib/audit-logger', () => ({
  AuditLogger: {
    log: vi.fn(),
  },
}));

const mockDb = mockDeep<PrismaClient>();

describe('UnifiedCancellationOrchestratorService', () => {
  let service: UnifiedCancellationOrchestratorService;

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
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
    apiEndpoint: 'https://api.netflix.com/cancel',
    successRate: 0.9,
    averageTime: 5,
    difficulty: 'easy',
    isActive: true,
    requires2FA: false,
    requiresRetention: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockReset(mockDb);
    service = new UnifiedCancellationOrchestratorService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initiateCancellation', () => {
    it('should successfully initiate cancellation with auto method selection', async () => {
      // Setup mocks
      mockDb.subscription.findFirst.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationRequest.findFirst.mockResolvedValue(null);
      mockDb.cancellationProvider.findFirst.mockResolvedValue(
        mockProvider as any
      );

      const mockRequest = {
        id: 'req123',
        userId: 'user123',
        subscriptionId: 'sub123',
        method: 'api',
        status: 'pending',
        createdAt: new Date(),
      };

      mockDb.cancellationRequest.create.mockResolvedValue(mockRequest as any);

      // Mock the API service response
      const mockApiResult = {
        requestId: 'req123',
        status: 'pending',
        confirmationCode: null,
        effectiveDate: null,
        refundAmount: null,
        manualInstructions: null,
        error: null,
      };

      // Mock the private method by creating a spy
      const mockApiService = {
        initiateCancellation: vi.fn().mockResolvedValue(mockApiResult),
      };

      (service as any).apiService = mockApiService;

      const input = {
        subscriptionId: 'sub123',
        priority: 'normal' as const,
        notes: 'Test cancellation',
        preferredMethod: 'auto' as const,
      };

      const result = await service.initiateCancellation('user123', input);

      expect(result.requestId).toBe('req123');
      expect(result.method).toBe('api');
      expect(result.success).toBe(true);
      expect(mockDb.subscription.findFirst).toHaveBeenCalledWith({
        where: { id: 'sub123', userId: 'user123' },
        include: { user: true },
      });
    });

    it('should throw error for non-existent subscription', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(null);

      const input = {
        subscriptionId: 'invalid',
        priority: 'normal' as const,
        preferredMethod: 'auto' as const,
      };

      await expect(
        service.initiateCancellation('user123', input)
      ).rejects.toThrow('Subscription not found');
    });

    it('should throw error for already cancelled subscription', async () => {
      const cancelledSubscription = {
        ...mockSubscription,
        status: 'cancelled',
      };

      mockDb.subscription.findFirst.mockResolvedValue(
        cancelledSubscription as any
      );

      const input = {
        subscriptionId: 'sub123',
        priority: 'normal' as const,
        preferredMethod: 'auto' as const,
      };

      await expect(
        service.initiateCancellation('user123', input)
      ).rejects.toThrow('Subscription is already cancelled');
    });

    it('should throw error for existing pending cancellation', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationRequest.findFirst.mockResolvedValue({
        id: 'existing123',
        status: 'pending',
      } as any);

      const input = {
        subscriptionId: 'sub123',
        priority: 'normal' as const,
        preferredMethod: 'auto' as const,
      };

      await expect(
        service.initiateCancellation('user123', input)
      ).rejects.toThrow('Cancellation request already in progress');
    });

    it('should select lightweight method when no provider found', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationRequest.findFirst.mockResolvedValue(null);
      mockDb.cancellationProvider.findFirst.mockResolvedValue(null);

      const mockLightweightResult = {
        requestId: 'req123',
        status: 'instructions_provided',
        instructions: {
          provider: { id: 'default', name: 'Netflix' },
          instructions: {
            overview: 'Manual cancellation required',
            steps: ['Step 1', 'Step 2'],
            tips: ['Tip 1'],
            warnings: ['Warning 1'],
            contactInfo: {},
            estimatedTime: '10 minutes',
            difficulty: 'medium',
          },
        },
      };

      const mockLightweightService = {
        provideCancellationInstructions: vi
          .fn()
          .mockResolvedValue(mockLightweightResult),
      };

      (service as any).lightweightService = mockLightweightService;

      const input = {
        subscriptionId: 'sub123',
        priority: 'normal' as const,
        preferredMethod: 'auto' as const,
      };

      const result = await service.initiateCancellation('user123', input);

      expect(result.method).toBe('lightweight');
      expect(
        mockLightweightService.provideCancellationInstructions
      ).toHaveBeenCalled();
    });

    it('should respect user preferred method', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationRequest.findFirst.mockResolvedValue(null);
      mockDb.cancellationProvider.findFirst.mockResolvedValue(
        mockProvider as any
      );

      const mockEventDrivenResult = {
        requestId: 'req123',
        workflowId: 'workflow123',
        status: 'running',
        estimatedCompletion: new Date(Date.now() + 300000),
      };

      const mockEventDrivenService = {
        initiateCancellation: vi.fn().mockResolvedValue(mockEventDrivenResult),
      };

      (service as any).eventDrivenService = mockEventDrivenService;

      const input = {
        subscriptionId: 'sub123',
        priority: 'high' as const,
        preferredMethod: 'event_driven' as const,
        scheduleFor: new Date(Date.now() + 86400000), // Tomorrow
      };

      const result = await service.initiateCancellation('user123', input);

      expect(result.method).toBe('event_driven');
      expect(mockEventDrivenService.initiateCancellation).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          subscriptionId: 'sub123',
          priority: 'high',
          scheduleFor: expect.any(Date),
        })
      );
    });
  });

  describe('getCancellationStatus', () => {
    it('should return unified status for API method', async () => {
      const mockRequest = {
        id: 'req123',
        userId: 'user123',
        subscriptionId: 'sub123',
        method: 'api',
        status: 'completed',
        confirmationCode: 'CONF123',
        effectiveDate: new Date(),
        createdAt: new Date(),
        logs: [
          {
            id: 'log1',
            action: 'initiated',
            status: 'success',
            message: 'Cancellation started',
            createdAt: new Date(),
          },
        ],
        subscription: {
          id: 'sub123',
          name: 'Netflix',
          amount: 15.99,
        },
      };

      mockDb.cancellationRequest.findFirst.mockResolvedValue(
        mockRequest as any
      );

      const mockApiStatus = {
        requestId: 'req123',
        status: 'completed',
        confirmationCode: 'CONF123',
        effectiveDate: mockRequest.effectiveDate,
        refundAmount: null,
        manualInstructions: null,
        error: null,
      };

      const mockApiService = {
        getCancellationStatus: vi.fn().mockResolvedValue(mockApiStatus),
      };

      (service as any).apiService = mockApiService;

      const result = await service.getCancellationStatus('user123', 'req123');

      expect(result.status.requestId).toBe('req123');
      expect(result.status.status).toBe('completed');
      expect(result.status.method).toBe('api');
      expect(result.status.confirmationCode).toBe('CONF123');
      expect(result.timeline).toHaveLength(1);
      expect(result.nextSteps).toContain('Cancellation completed successfully');
    });

    it('should throw error for non-existent request', async () => {
      mockDb.cancellationRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.getCancellationStatus('user123', 'invalid')
      ).rejects.toThrow('Cancellation request not found');
    });
  });

  describe('retryCancellation', () => {
    it('should retry failed cancellation with different method', async () => {
      const mockFailedRequest = {
        id: 'req123',
        userId: 'user123',
        subscriptionId: 'sub123',
        method: 'api',
        status: 'failed',
        subscription: mockSubscription,
      };

      mockDb.cancellationRequest.findFirst.mockResolvedValue(
        mockFailedRequest as any
      );

      // Mock the initiateCancellation method
      const initiateSpy = vi
        .spyOn(service, 'initiateCancellation')
        .mockResolvedValue({
          requestId: 'req124',
          orchestrationId: 'orch124',
          status: 'pending',
          method: 'event_driven',
          currentStep: 'Starting retry',
          totalSteps: 4,
          completedSteps: 0,
          fallbackAvailable: true,
        } as any);

      const result = await service.retryCancellation('user123', 'req123', {
        escalate: true,
      });

      expect(result.requestId).toBe('req124');
      expect(result.method).toBe('event_driven');
      expect(initiateSpy).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          subscriptionId: 'sub123',
          preferredMethod: 'event_driven',
          notes: expect.stringContaining('Retry of failed request'),
        })
      );
    });

    it('should throw error for non-existent failed request', async () => {
      mockDb.cancellationRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.retryCancellation('user123', 'invalid')
      ).rejects.toThrow('Failed cancellation request not found');
    });
  });

  describe('cancelCancellationRequest', () => {
    it('should cancel active request', async () => {
      const mockActiveRequest = {
        id: 'req123',
        userId: 'user123',
        status: 'processing',
        method: 'api',
      };

      mockDb.cancellationRequest.findFirst.mockResolvedValue(
        mockActiveRequest as any
      );
      mockDb.cancellationRequest.update.mockResolvedValue({
        ...mockActiveRequest,
        status: 'cancelled',
        completedAt: new Date(),
      } as any);

      const mockApiService = {
        cancelRequest: vi.fn().mockResolvedValue({ success: true }),
      };

      (service as any).apiService = mockApiService;

      await service.cancelCancellationRequest(
        'user123',
        'req123',
        'User changed mind'
      );

      expect(mockDb.cancellationRequest.update).toHaveBeenCalledWith({
        where: { id: 'req123' },
        data: {
          status: 'cancelled',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw error for non-existent active request', async () => {
      mockDb.cancellationRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelCancellationRequest('user123', 'invalid')
      ).rejects.toThrow('Cancellation request not found or not cancellable');
    });
  });

  describe('getUnifiedAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      const mockRequests = [
        {
          id: 'req1',
          userId: 'user123',
          method: 'api',
          status: 'completed',
          createdAt: new Date('2023-01-01'),
          completedAt: new Date('2023-01-01T00:05:00'),
          subscription: { name: 'Netflix', amount: 15.99 },
        },
        {
          id: 'req2',
          userId: 'user123',
          method: 'lightweight',
          status: 'failed',
          createdAt: new Date('2023-01-02'),
          completedAt: new Date('2023-01-02T00:15:00'),
          subscription: { name: 'Spotify', amount: 9.99 },
        },
      ];

      mockDb.cancellationRequest.findMany.mockResolvedValue(
        mockRequests as any
      );

      const result = await service.getUnifiedAnalytics('user123', 'month');

      expect(result.summary.total).toBe(2);
      expect(result.summary.completed).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.successRate).toBe(50);
      expect(result.methodComparison).toHaveProperty('api');
      expect(result.methodComparison).toHaveProperty('lightweight');
      expect(result.trends).toHaveLength(2);
      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('method selection logic', () => {
    it('should select API method for high priority with API support', async () => {
      const highApiProvider = {
        ...mockProvider,
        type: 'api',
        successRate: 0.95,
      };

      const method = (service as any).determineOptimalMethod(
        'auto',
        {
          id: 'provider123',
          name: 'Netflix',
          type: 'api',
          supportsApi: true,
          supportsAutomation: false,
          estimatedSuccessRate: 0.95,
          averageTimeMinutes: 3,
          difficulty: 'easy',
          requiresInteraction: false,
        },
        { priority: 'high' }
      );

      expect(method).toBe('api');
    });

    it('should select event-driven method for complex scenarios', async () => {
      const method = (service as any).determineOptimalMethod(
        'auto',
        {
          id: 'provider123',
          name: 'Complex Service',
          type: 'web_automation',
          supportsApi: false,
          supportsAutomation: true,
          estimatedSuccessRate: 0.8,
          averageTimeMinutes: 15,
          difficulty: 'hard',
          requiresInteraction: true,
        },
        { priority: 'normal' }
      );

      expect(method).toBe('event_driven');
    });

    it('should select lightweight method as fallback', async () => {
      const method = (service as any).determineOptimalMethod(
        'auto',
        null, // No provider capability
        { priority: 'normal' }
      );

      expect(method).toBe('lightweight');
    });

    it('should respect user preference when not auto', async () => {
      const method = (service as any).determineOptimalMethod(
        'lightweight',
        {
          id: 'provider123',
          name: 'Netflix',
          type: 'api',
          supportsApi: true,
          supportsAutomation: false,
          estimatedSuccessRate: 0.95,
          averageTimeMinutes: 3,
          difficulty: 'easy',
          requiresInteraction: false,
        },
        { priority: 'high' }
      );

      expect(method).toBe('lightweight');
    });

    it('should select event-driven for scheduled cancellations', async () => {
      const method = (service as any).determineOptimalMethod(
        'auto',
        {
          id: 'provider123',
          name: 'Netflix',
          type: 'api',
          supportsApi: true,
          supportsAutomation: false,
          estimatedSuccessRate: 0.95,
          averageTimeMinutes: 3,
          difficulty: 'easy',
          requiresInteraction: false,
        },
        {
          priority: 'normal',
          scheduleFor: new Date(Date.now() + 86400000), // Tomorrow
        }
      );

      expect(method).toBe('event_driven');
    });
  });

  describe('error handling and fallback', () => {
    it('should execute fallback when primary method fails', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationRequest.findFirst.mockResolvedValue(null);
      mockDb.cancellationProvider.findFirst.mockResolvedValue(
        mockProvider as any
      );

      // Mock API service to fail
      const mockApiService = {
        initiateCancellation: vi
          .fn()
          .mockRejectedValue(new Error('API service down')),
      };

      // Mock lightweight service to succeed
      const mockLightweightService = {
        provideCancellationInstructions: vi.fn().mockResolvedValue({
          requestId: 'req123',
          status: 'instructions_provided',
          instructions: {
            provider: { id: 'default', name: 'Netflix' },
            instructions: {
              overview: 'Fallback manual instructions',
              steps: ['Step 1', 'Step 2'],
              tips: ['Tip 1'],
              warnings: ['Warning 1'],
              contactInfo: {},
              estimatedTime: '10 minutes',
              difficulty: 'medium',
            },
          },
        }),
      };

      (service as any).apiService = mockApiService;
      (service as any).lightweightService = mockLightweightService;

      const input = {
        subscriptionId: 'sub123',
        priority: 'normal' as const,
        preferredMethod: 'api' as const,
      };

      const result = await service.initiateCancellation('user123', input);

      expect(result.method).toBe('lightweight');
      expect(mockApiService.initiateCancellation).toHaveBeenCalled();
      expect(
        mockLightweightService.provideCancellationInstructions
      ).toHaveBeenCalled();
    });

    it('should throw error when both primary and fallback fail', async () => {
      mockDb.subscription.findFirst.mockResolvedValue(mockSubscription as any);
      mockDb.cancellationRequest.findFirst.mockResolvedValue(null);
      mockDb.cancellationProvider.findFirst.mockResolvedValue(
        mockProvider as any
      );

      // Mock both services to fail
      const mockApiService = {
        initiateCancellation: vi
          .fn()
          .mockRejectedValue(new Error('API service down')),
      };

      const mockLightweightService = {
        provideCancellationInstructions: vi
          .fn()
          .mockRejectedValue(new Error('Lightweight also failed')),
      };

      (service as any).apiService = mockApiService;
      (service as any).lightweightService = mockLightweightService;

      const input = {
        subscriptionId: 'sub123',
        priority: 'normal' as const,
        preferredMethod: 'api' as const,
      };

      await expect(
        service.initiateCancellation('user123', input)
      ).rejects.toThrow('API service down');
    });
  });
});
