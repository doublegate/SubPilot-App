import { type PrismaClient } from '@prisma/client';
import { CancellationService } from './cancellation.service';
import { EventDrivenCancellationService } from './event-driven-cancellation.service';
import { LightweightCancellationService } from './lightweight-cancellation.service';
import {
  emitCancellationEvent,
  onCancellationEvent,
} from '@/server/lib/event-bus';
import { sendRealtimeNotification } from '@/server/lib/realtime-notifications';
import { getJobQueue } from '@/server/lib/job-queue';
import { getWorkflowEngine } from '@/server/lib/workflow-engine';

// Unified cancellation request interface
export interface UnifiedCancellationRequest {
  subscriptionId: string;
  reason?: string;
  method?: 'auto' | 'api' | 'automation' | 'manual';
  priority?: 'low' | 'normal' | 'high';
  userPreference?: {
    preferredMethod?: 'api' | 'automation' | 'manual';
    allowFallback?: boolean;
    notificationPreferences?: {
      realTime?: boolean;
      email?: boolean;
      sms?: boolean;
    };
  };
}

// Unified cancellation result interface
export interface UnifiedCancellationResult {
  success: boolean;
  requestId: string;
  orchestrationId: string;
  method: 'api' | 'automation' | 'manual';
  status:
    | 'initiated'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'requires_manual';
  message: string;
  estimatedCompletion?: Date;
  manualInstructions?: {
    steps: string[];
    contactInfo?: {
      phone?: string;
      email?: string;
      website?: string;
    };
    expectedDuration?: string;
  };
  metadata?: {
    providerCapabilities?: any;
    fallbackReason?: string;
    originalMethod?: string;
    retryCount?: number;
  };
}

// Provider capability interface
interface ProviderCapability {
  apiSupport: boolean;
  automationSupport: boolean;
  manualInstructions: boolean;
  successRate?: number;
  averageCompletionTime?: number;
  lastUpdated?: Date;
}

/**
 * Unified Cancellation Orchestrator Service
 *
 * This service acts as the central coordinator for all cancellation approaches,
 * intelligently routing requests to the most appropriate service and handling
 * fallbacks seamlessly.
 */
export class UnifiedCancellationOrchestratorService {
  private cancellationService: CancellationService;
  private eventDrivenService: EventDrivenCancellationService;
  private lightweightService: LightweightCancellationService;
  private jobQueue = getJobQueue();
  private workflowEngine = getWorkflowEngine();

  // Provider capabilities cache
  private providerCapabilities = new Map<string, ProviderCapability>();

  constructor(private db: PrismaClient) {
    this.cancellationService = new CancellationService(db);
    this.eventDrivenService = new EventDrivenCancellationService(db);
    this.lightweightService = new LightweightCancellationService(db);

    this.setupEventListeners();
    this.initializeProviderCapabilities();
  }

  /**
   * Main entry point for unified cancellation
   */
  async initiateCancellation(
    userId: string,
    input: UnifiedCancellationRequest
  ): Promise<UnifiedCancellationResult> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const orchestrationId = `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Log orchestration start
      await this.logOrchestrationActivity(
        orchestrationId,
        'orchestration_started',
        'info',
        'Unified cancellation orchestration initiated',
        {
          userId,
          subscriptionId: input.subscriptionId,
          requestedMethod: input.method,
          priority: input.priority,
        }
      );

      // Get subscription details
      const subscription = await this.db.subscription.findUnique({
        where: { id: input.subscriptionId },
        include: {
          user: true,
        },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Verify user ownership
      if (subscription.user.id !== userId) {
        throw new Error('Unauthorized: User does not own this subscription');
      }

      // Determine optimal cancellation method
      const optimalMethod = await this.determineOptimalMethod(
        subscription,
        input.method,
        input.userPreference
      );

      // Send initial notification
      sendRealtimeNotification(userId, {
        type: 'cancellation.orchestration_started',
        title: 'Cancellation Initiated',
        message: `Starting ${optimalMethod} cancellation for ${subscription.name}`,
        priority: input.priority ?? 'normal',
        data: {
          orchestrationId,
          requestId,
          subscriptionId: input.subscriptionId,
          method: optimalMethod,
        },
      });

      // Emit orchestration event
      emitCancellationEvent('cancellation.requested', {
        userId,
        requestId,
        orchestrationId,
        subscriptionId: input.subscriptionId,
        method: optimalMethod,
        priority: input.priority,
      });

      // Route to appropriate service
      const result = await this.routeToService(
        optimalMethod,
        userId,
        subscription,
        input,
        requestId,
        orchestrationId
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown orchestration error';

      // Log orchestration failure
      await this.logOrchestrationActivity(
        orchestrationId,
        'orchestration_failed',
        'error',
        errorMessage,
        { userId, subscriptionId: input.subscriptionId, error: errorMessage }
      );

      // Send failure notification
      sendRealtimeNotification(userId, {
        type: 'cancellation.orchestration_failed',
        title: 'Cancellation Failed',
        message: errorMessage,
        priority: 'high',
        data: {
          orchestrationId,
          requestId,
          error: errorMessage,
        },
      });

      return {
        success: false,
        requestId,
        orchestrationId,
        method: 'manual',
        status: 'failed',
        message: errorMessage,
      };
    }
  }

  /**
   * Determine the optimal cancellation method
   */
  private async determineOptimalMethod(
    subscription: { name: string; provider?: { name: string } },
    requestedMethod?: string,
    userPreference?: { preferredMethod?: string }
  ): Promise<'api' | 'automation' | 'manual'> {
    // If user explicitly requested a method, try to honor it
    if (requestedMethod && requestedMethod !== 'auto') {
      return requestedMethod as 'api' | 'automation' | 'manual';
    }

    // Get provider capabilities
    const merchantName = subscription.name.toLowerCase();
    const capabilities = this.providerCapabilities.get(merchantName);

    if (!capabilities) {
      // Unknown provider, start with manual as safest option
      return 'manual';
    }

    // Check user preferences
    const preferredMethod = userPreference?.preferredMethod;
    if (
      preferredMethod &&
      this.isMethodSupported(preferredMethod, capabilities)
    ) {
      return preferredMethod;
    }

    // Intelligent selection based on capabilities and success rates
    if (capabilities.apiSupport && (capabilities.successRate ?? 0) > 0.8) {
      return 'api';
    }

    if (
      capabilities.automationSupport &&
      (capabilities.successRate ?? 0) > 0.6
    ) {
      return 'automation';
    }

    // Fallback to manual
    return 'manual';
  }

  /**
   * Check if a method is supported by the provider
   */
  private isMethodSupported(
    method: string,
    capabilities: ProviderCapability
  ): boolean {
    switch (method) {
      case 'api':
        return capabilities.apiSupport;
      case 'automation':
        return capabilities.automationSupport;
      case 'manual':
        return capabilities.manualInstructions;
      default:
        return false;
    }
  }

  /**
   * Route cancellation request to appropriate service
   */
  private async routeToService(
    method: 'api' | 'automation' | 'manual',
    userId: string,
    subscription: any,
    input: UnifiedCancellationRequest,
    requestId: string,
    orchestrationId: string
  ): Promise<UnifiedCancellationResult> {
    const baseResult = {
      requestId,
      orchestrationId,
      method,
    };

    try {
      switch (method) {
        case 'api':
          return await this.routeToApiService(
            userId,
            subscription,
            input,
            baseResult
          );

        case 'automation':
          return await this.routeToEventDrivenService(
            userId,
            subscription,
            input,
            baseResult
          );

        case 'manual':
          return await this.routeToLightweightService(
            userId,
            subscription,
            input,
            baseResult
          );

        default:
          throw new Error(`Unsupported cancellation method: ${method}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Service routing error';

      // If fallback is allowed, try the next best method
      if (input.userPreference?.allowFallback !== false) {
        return await this.handleFallback(
          method,
          userId,
          subscription,
          input,
          baseResult,
          errorMessage
        );
      }

      throw error;
    }
  }

  /**
   * Route to API-first service (Sub-agent 1)
   */
  private async routeToApiService(
    userId: string,
    subscription: any,
    input: UnifiedCancellationRequest,
    baseResult: any
  ): Promise<UnifiedCancellationResult> {
    try {
      const result = await this.cancellationService.initiateCancellation(
        userId,
        {
          subscriptionId: input.subscriptionId,
          notes: input.reason,
          priority: input.priority ?? 'normal',
        }
      );

      return {
        ...baseResult,
        success: true,
        status: 'processing',
        message: 'API cancellation initiated successfully',
        estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      };
    } catch (error) {
      throw new Error(
        `API service failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Route to event-driven service (Sub-agent 2)
   */
  private async routeToEventDrivenService(
    userId: string,
    subscription: any,
    input: UnifiedCancellationRequest,
    baseResult: any
  ): Promise<UnifiedCancellationResult> {
    try {
      // Start workflow for automation
      const workflowId = await this.workflowEngine.startWorkflow(
        'cancellation.full_process',
        userId,
        {
          subscriptionId: input.subscriptionId,
          merchantName: subscription.name,
          reason: input.reason,
          orchestrationId: baseResult.orchestrationId,
        }
      );

      return {
        ...baseResult,
        success: true,
        status: 'processing',
        message: 'Automation cancellation workflow started',
        estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        metadata: {
          workflowId,
        },
      };
    } catch (error) {
      throw new Error(
        `Event-driven service failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Route to lightweight service (Sub-agent 3)
   */
  private async routeToLightweightService(
    userId: string,
    subscription: any,
    input: UnifiedCancellationRequest,
    baseResult: any
  ): Promise<UnifiedCancellationResult> {
    try {
      const result =
        await this.lightweightService.provideCancellationInstructions(userId, {
          subscriptionId: input.subscriptionId,
          notes: input.reason,
        });

      return {
        ...baseResult,
        success: true,
        status: 'requires_manual',
        message: 'Manual cancellation instructions generated',
        manualInstructions: result.instructions
          ? {
              steps: result.instructions.instructions.steps,
              contactInfo: result.instructions.instructions.contactInfo,
              expectedDuration: result.instructions.instructions.estimatedTime,
            }
          : undefined,
      };
    } catch (error) {
      throw new Error(
        `Lightweight service failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle fallback to alternative methods
   */
  private async handleFallback(
    originalMethod: 'api' | 'automation' | 'manual',
    userId: string,
    subscription: { id: string; name: string; provider?: unknown },
    input: UnifiedCancellationRequest,
    baseResult: { status: string; error?: string; [key: string]: unknown },
    fallbackReason: string
  ): Promise<UnifiedCancellationResult> {
    // Determine fallback hierarchy
    const fallbackHierarchy: Array<'api' | 'automation' | 'manual'> = [
      'api',
      'automation',
      'manual',
    ];
    const currentIndex = fallbackHierarchy.indexOf(originalMethod);

    // Try next method in hierarchy
    for (let i = currentIndex + 1; i < fallbackHierarchy.length; i++) {
      const fallbackMethod = fallbackHierarchy[i];

      try {
        await this.logOrchestrationActivity(
          baseResult.orchestrationId,
          'fallback_attempt',
          'info',
          `Attempting fallback to ${fallbackMethod} method`,
          {
            originalMethod,
            fallbackMethod,
            fallbackReason,
          }
        );

        // Send fallback notification
        sendRealtimeNotification(userId, {
          type: 'cancellation.orchestration_fallback',
          title: 'Trying Alternative Method',
          message: `${originalMethod} failed, trying ${fallbackMethod} approach`,
          priority: 'normal',
          data: {
            originalMethod,
            fallbackMethod,
            fallbackReason,
          },
        });

        const result = await this.routeToService(
          fallbackMethod!,
          userId,
          subscription,
          input,
          baseResult.requestId,
          baseResult.orchestrationId
        );

        // Update result with fallback metadata
        result.metadata = {
          ...result.metadata,
          originalMethod,
          fallbackReason,
        };

        return result;
      } catch (fallbackError) {
        // Continue to next fallback option
        continue;
      }
    }

    // All methods failed
    throw new Error(
      `All cancellation methods failed. Original error: ${fallbackReason}`
    );
  }

  /**
   * Setup event listeners for cross-service coordination
   */
  private setupEventListeners(): void {
    // Listen for API service events
    onCancellationEvent('cancellation.api.completed', data => {
      void this.handleServiceCompletion('api', data);
    });

    onCancellationEvent('cancellation.api.failed', data => {
      void this.handleServiceFailure('api', data);
    });

    // Listen for event-driven service events
    onCancellationEvent('cancellation.event_driven.progress', data => {
      void this.handleServiceProgress('event_driven', data);
    });

    // Listen for manual confirmations
    onCancellationEvent('cancellation.manual.confirmed', data => {
      void this.handleManualConfirmation(data);
    });

    console.log(
      '[UnifiedCancellationOrchestrator] Event listeners setup complete'
    );
  }

  /**
   * Handle service completion events
   */
  private async handleServiceCompletion(
    service: string,
    data: any
  ): Promise<void> {
    try {
      const orchestrationId =
        data.orchestrationId ?? `${service}_${data.requestId}`;

      await this.logOrchestrationActivity(
        orchestrationId,
        'service_completed',
        'success',
        `${service} service completed successfully`,
        data
      );

      // Send real-time notification
      sendRealtimeNotification(data.userId, {
        type: 'cancellation.orchestration_progress',
        title: 'Cancellation Progress',
        message: `${service} cancellation completed`,
        priority: 'normal',
        data: {
          orchestrationId,
          service,
          status: 'completed',
        },
      });
    } catch (error) {
      console.error(
        '[UnifiedCancellationOrchestrator] Error handling service completion:',
        error
      );
    }
  }

  /**
   * Handle service failure events
   */
  private async handleServiceFailure(
    service: string,
    data: any
  ): Promise<void> {
    try {
      const orchestrationId =
        data.orchestrationId ?? `${service}_${data.requestId}`;

      await this.logOrchestrationActivity(
        orchestrationId,
        'service_failed',
        'error',
        `${service} service failed: ${data.error}`,
        data
      );

      // Send real-time notification
      sendRealtimeNotification(data.userId, {
        type: 'cancellation.orchestration_failure',
        title: 'Cancellation Issue',
        message: `${service} cancellation encountered an issue`,
        priority: 'high',
        data: {
          orchestrationId,
          service,
          error: data.error,
        },
      });
    } catch (error) {
      console.error(
        '[UnifiedCancellationOrchestrator] Error handling service failure:',
        error
      );
    }
  }

  /**
   * Handle service progress events
   */
  private async handleServiceProgress(
    service: string,
    data: any
  ): Promise<void> {
    try {
      const orchestrationId =
        data.orchestrationId ?? `${service}_${data.requestId}`;

      await this.logOrchestrationActivity(
        orchestrationId,
        'service_progress',
        'info',
        `${service} service progress: ${data.message}`,
        data
      );

      // Send real-time notification
      sendRealtimeNotification(data.userId, {
        type: 'cancellation.orchestration_progress',
        title: 'Cancellation Update',
        message: data.message ?? `${service} cancellation in progress`,
        priority: 'normal',
        data: {
          orchestrationId,
          service,
          progress: data.progress,
        },
      });
    } catch (error) {
      console.error(
        '[UnifiedCancellationOrchestrator] Error handling service progress:',
        error
      );
    }
  }

  /**
   * Handle manual confirmation events
   */
  private async handleManualConfirmation(data: any): Promise<void> {
    try {
      await this.logOrchestrationActivity(
        data.orchestrationId,
        'manual_confirmed',
        'success',
        'Manual cancellation confirmed by user',
        data
      );

      // Update cancellation request status
      await this.db.cancellationRequest.updateMany({
        where: {
          id: data.requestId,
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
          userConfirmed: true,
          errorDetails: {
            method: 'manual',
            confirmedAt: new Date().toISOString(),
            confirmedBy: data.userId,
          },
        },
      });

      // Send completion notification
      sendRealtimeNotification(data.userId, {
        type: 'cancellation.completed',
        title: 'Cancellation Completed',
        message: 'Manual cancellation has been confirmed',
        priority: 'normal',
        data: {
          orchestrationId: data.orchestrationId,
          method: 'manual',
          status: 'completed',
        },
      });
    } catch (error) {
      console.error(
        '[UnifiedCancellationOrchestrator] Error handling manual confirmation:',
        error
      );
    }
  }

  /**
   * Initialize provider capabilities
   */
  private initializeProviderCapabilities(): void {
    // Initialize with some common providers
    // In production, this would be loaded from database or external API

    this.providerCapabilities.set('netflix', {
      apiSupport: true,
      automationSupport: true,
      manualInstructions: true,
      successRate: 0.85,
      averageCompletionTime: 300000, // 5 minutes
      lastUpdated: new Date(),
    });

    this.providerCapabilities.set('spotify', {
      apiSupport: true,
      automationSupport: true,
      manualInstructions: true,
      successRate: 0.9,
      averageCompletionTime: 180000, // 3 minutes
      lastUpdated: new Date(),
    });

    this.providerCapabilities.set('adobe', {
      apiSupport: false,
      automationSupport: true,
      manualInstructions: true,
      successRate: 0.7,
      averageCompletionTime: 600000, // 10 minutes
      lastUpdated: new Date(),
    });

    this.providerCapabilities.set('amazon', {
      apiSupport: false,
      automationSupport: true,
      manualInstructions: true,
      successRate: 0.6,
      averageCompletionTime: 900000, // 15 minutes
      lastUpdated: new Date(),
    });

    console.log(
      '[UnifiedCancellationOrchestrator] Provider capabilities initialized'
    );
  }

  /**
   * Log orchestration activity
   */
  private async logOrchestrationActivity(
    orchestrationId: string,
    activityType: string,
    level: 'info' | 'success' | 'error',
    message: string,
    metadata: any = {}
  ): Promise<void> {
    try {
      // Create orchestration log entry
      // Note: CancellationLog doesn't have an orchestrationId field, so we'll need to track it differently
      // For now, we'll log to console only
      console.log(
        `[UnifiedCancellationOrchestrator] ${level.toUpperCase()}: ${message}`,
        {
          orchestrationId,
          activityType,
          metadata,
        }
      );
    } catch (error) {
      console.error(
        '[UnifiedCancellationOrchestrator] Failed to log activity:',
        error
      );
    }
  }

  /**
   * Get orchestration status and analytics
   */
  async getOrchestrationAnalytics(
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): Promise<{
    totalOrchestrations: number;
    successRate: number;
    methodBreakdown: Record<string, number>;
    fallbackRate: number;
    averageCompletionTime: number;
    providerAnalytics: Array<{
      provider: string;
      successRate: number;
      totalAttempts: number;
      averageCompletionTime: number;
    }>;
  }> {
    // Calculate timeframe boundaries
    const now = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    // Query orchestration logs
    const logs = await this.db.cancellationLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Process analytics
    const orchestrationIds = new Set<string>();
    const methodCounts: Record<string, number> = {};
    let successfulOrchestrations = 0;
    let totalFallbacks = 0;
    const providerStats = new Map<
      string,
      { total: number; successful: number; totalTime: number }
    >();

    for (const log of logs) {
      const metadata = log.metadata as Record<string, unknown>;
      const orchestrationId = metadata.orchestrationId as string | undefined;

      if (orchestrationId) {
        orchestrationIds.add(orchestrationId);
      }

      // Count methods
      if (metadata.method) {
        methodCounts[metadata.method] =
          (methodCounts[metadata.method] ?? 0) + 1;
      }

      // Count successes
      if (
        log.status === 'success' &&
        metadata.activityType === 'service_completed'
      ) {
        successfulOrchestrations++;
      }

      // Count fallbacks
      if (metadata.activityType === 'fallback_attempt') {
        totalFallbacks++;
      }

      // Track provider stats
      if (metadata.provider) {
        const stats = providerStats.get(metadata.provider) ?? {
          total: 0,
          successful: 0,
          totalTime: 0,
        };
        stats.total++;

        if (log.status === 'success') {
          stats.successful++;
        }

        if (metadata.completionTime) {
          stats.totalTime += metadata.completionTime;
        }

        providerStats.set(metadata.provider, stats);
      }
    }

    const totalOrchestrations = orchestrationIds.size;
    const successRate =
      totalOrchestrations > 0
        ? successfulOrchestrations / totalOrchestrations
        : 0;
    const fallbackRate =
      totalOrchestrations > 0 ? totalFallbacks / totalOrchestrations : 0;

    // Calculate provider analytics
    const providerAnalytics = Array.from(providerStats.entries()).map(
      ([provider, stats]) => ({
        provider,
        successRate: stats.total > 0 ? stats.successful / stats.total : 0,
        totalAttempts: stats.total,
        averageCompletionTime:
          stats.successful > 0 ? stats.totalTime / stats.successful : 0,
      })
    );

    return {
      totalOrchestrations,
      successRate,
      methodBreakdown: methodCounts,
      fallbackRate,
      averageCompletionTime: 0, // Would need more detailed tracking
      providerAnalytics,
    };
  }

  /**
   * Update provider capabilities
   */
  async updateProviderCapability(
    provider: string,
    capabilities: Partial<ProviderCapability>
  ): Promise<void> {
    const existing = this.providerCapabilities.get(provider) ?? {
      apiSupport: false,
      automationSupport: false,
      manualInstructions: true,
    };

    const updated = {
      ...existing,
      ...capabilities,
      lastUpdated: new Date(),
    };

    this.providerCapabilities.set(provider, updated);

    console.log(
      `[UnifiedCancellationOrchestrator] Updated capabilities for ${provider}:`,
      updated
    );
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities(
    provider?: string
  ): Map<string, ProviderCapability> | ProviderCapability | null {
    if (provider) {
      return this.providerCapabilities.get(provider) ?? null;
    }
    return this.providerCapabilities;
  }

  /**
   * Get cancellation request status
   */
  async getCancellationStatus(
    userId: string,
    requestId: string,
    orchestrationId?: string
  ): Promise<any> {
    const request = await this.db.cancellationRequest.findUnique({
      where: { id: requestId },
      include: {
        subscription: true,
        provider: true,
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!request) {
      throw new Error('Cancellation request not found');
    }

    return {
      id: request.id,
      status: request.status,
      method: request.method,
      attempts: request.attempts,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      completedAt: request.completedAt,
      confirmationCode: request.confirmationCode,
      effectiveDate: request.effectiveDate,
      subscription: {
        id: request.subscription.id,
        name: request.subscription.name,
        amount: request.subscription.amount,
      },
      provider: request.provider
        ? {
            name: request.provider.name,
            type: request.provider.type,
          }
        : null,
      recentLogs: request.logs.map(log => ({
        action: log.action,
        status: log.status,
        message: log.message,
        createdAt: log.createdAt,
      })),
    };
  }

  /**
   * Retry a failed cancellation request
   */
  async retryCancellation(
    userId: string,
    requestId: string,
    options?: { forceMethod?: 'api' | 'automation' | 'manual'; escalate?: boolean }
  ): Promise<UnifiedCancellationResult> {
    // Get the existing request
    const request = await this.db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId,
        status: { in: ['failed', 'cancelled'] },
      },
      include: {
        subscription: true,
      },
    });

    if (!request) {
      throw new Error('Cancellation request not found or not retryable');
    }

    // Reset the request for retry
    await this.db.cancellationRequest.update({
      where: { id: requestId },
      data: {
        status: 'pending',
        attempts: request.attempts,
        errorCode: null,
        errorMessage: null,
        lastAttemptAt: new Date(),
      },
    });

    // Re-orchestrate the cancellation
    return this.initiateCancellation(userId, {
      subscriptionId: request.subscription.id,
      reason: 'Retry',
      method: options?.forceMethod ?? request.method,
      priority: options?.escalate ? 'high' : 'normal',
    });
  }

  /**
   * Cancel a cancellation request
   */
  async cancelCancellationRequest(
    userId: string,
    requestId: string,
    reason?: string
  ): Promise<void> {
    const request = await this.db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId,
        status: { in: ['pending', 'processing'] },
      },
    });

    if (!request) {
      throw new Error('Cancellation request not found or not cancellable');
    }

    await this.db.cancellationRequest.update({
      where: { id: requestId },
      data: {
        status: 'cancelled',
        updatedAt: new Date(),
      },
    });

    await this.db.cancellationLog.create({
      data: {
        requestId,
        action: 'user_cancelled',
        status: 'info',
        message: 'Cancellation request cancelled by user',
      },
    });

    // Emit cancellation event
    emitCancellationEvent('cancellation.cancelled', {
      requestId,
      userId,
    });
  }

  /**
   * Get unified analytics data
   */
  async getUnifiedAnalytics(userId?: string, timeframe?: string): Promise<any> {
    const dateFilter = this.getDateFilterForTimeframe(timeframe);

    const where: any = {
      ...dateFilter,
      ...(userId ? { userId } : {}),
    };

    const [
      totalRequests,
      successfulRequests,
      failedRequests,
      pendingRequests,
      methodStats,
    ] = await Promise.all([
      this.db.cancellationRequest.count({ where }),
      this.db.cancellationRequest.count({
        where: { ...where, status: 'completed' },
      }),
      this.db.cancellationRequest.count({
        where: { ...where, status: 'failed' },
      }),
      this.db.cancellationRequest.count({
        where: { ...where, status: { in: ['pending', 'processing'] } },
      }),
      this.db.cancellationRequest.groupBy({
        by: ['method'],
        where,
        _count: { method: true },
      }),
    ]);

    const successRate =
      totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const methodBreakdown = methodStats.reduce(
      (acc, stat) => {
        acc[stat.method] = stat._count.method;
        return acc;
      },
      {} as Record<string, number>
    );

    // Get average completion time for successful requests
    const completedRequests = await this.db.cancellationRequest.findMany({
      where: {
        ...where,
        status: 'completed',
        completedAt: { not: null },
      },
      select: {
        createdAt: true,
        completedAt: true,
      },
    });

    let averageCompletionTime = 0;
    if (completedRequests.length > 0) {
      const totalTime = completedRequests.reduce((sum, req) => {
        const duration = req.completedAt!.getTime() - req.createdAt.getTime();
        return sum + duration;
      }, 0);
      averageCompletionTime = totalTime / completedRequests.length / 1000 / 60; // in minutes
    }

    return {
      summary: {
        total: totalRequests,
        successful: successfulRequests,
        failed: failedRequests,
        pending: pendingRequests,
        successRate: Math.round(successRate * 100) / 100,
      },
      methodBreakdown,
      averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
      timeframe: timeframe ?? '30days',
    };
  }

  /**
   * Helper to get date filter for analytics timeframe
   */
  private getDateFilterForTimeframe(timeframe?: string): any {
    if (!timeframe) return {};

    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return {};
    }

    return {
      createdAt: { gte: startDate },
    };
  }
}
