import { type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

// Import existing services
import { CancellationService } from './cancellation.service';
import { EventDrivenCancellationService } from './event-driven-cancellation.service';
import { LightweightCancellationService } from './lightweight-cancellation.service';

// Import utilities
import { AuditLogger } from '@/server/lib/audit-logger';
import {
  emitCancellationEvent,
  onCancellationEvent,
} from '@/server/lib/event-bus';

// Enhanced input validation schema
export const UnifiedCancellationRequestInput = z.object({
  subscriptionId: z.string(),
  reason: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  preferredMethod: z
    .enum(['auto', 'api', 'automation', 'manual'])
    .optional()
    .default('auto'),
  userPreferences: z
    .object({
      allowFallback: z.boolean().optional().default(true),
      maxRetries: z.number().min(1).max(5).optional().default(3),
      timeoutMinutes: z.number().min(5).max(60).optional().default(30),
      notificationPreferences: z
        .object({
          realTime: z.boolean().optional().default(true),
          email: z.boolean().optional().default(true),
          sms: z.boolean().optional().default(false),
        })
        .optional(),
    })
    .optional(),
  scheduling: z
    .object({
      scheduleFor: z.date().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

export type UnifiedCancellationRequest = z.infer<
  typeof UnifiedCancellationRequestInput
>;

// Enhanced result interface
export interface UnifiedCancellationResult {
  success: boolean;
  orchestrationId: string;
  requestId: string;
  status:
    | 'initiated'
    | 'routing'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'requires_manual'
    | 'scheduled';
  method: 'api' | 'automation' | 'manual';
  message: string;

  // Timing information
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  processingStarted?: Date;

  // Results
  confirmationCode?: string;
  effectiveDate?: Date;
  refundAmount?: number;

  // Instructions (for manual method)
  manualInstructions?: {
    provider: {
      name: string;
      logo?: string;
      difficulty: 'easy' | 'medium' | 'hard';
      estimatedTime: number;
    };
    steps: string[];
    tips: string[];
    warnings: string[];
    contactInfo: {
      website?: string;
      phone?: string;
      email?: string;
      chat?: string;
    };
  };

  // Metadata
  metadata: {
    originalMethod?: string;
    fallbackReason?: string;
    attemptsUsed: number;
    providerInfo?: any;
    workflowId?: string;
    realTimeUpdatesEnabled: boolean;
  };

  // Real-time tracking
  tracking: {
    sseEndpoint: string;
    websocketEndpoint?: string;
    statusCheckUrl: string;
  };
}

// Provider capability assessment
interface ProviderCapability {
  providerId?: string;
  providerName: string;

  // Method support
  supportsApi: boolean;
  supportsAutomation: boolean;
  supportsManual: boolean;

  // Success metrics
  apiSuccessRate: number;
  automationSuccessRate: number;
  manualSuccessRate: number;

  // Timing estimates
  apiEstimatedTime: number; // minutes
  automationEstimatedTime: number;
  manualEstimatedTime: number;

  // Complexity factors
  difficulty: 'easy' | 'medium' | 'hard';
  requires2FA: boolean;
  hasRetentionOffers: boolean;
  requiresHumanIntervention: boolean;

  // Last updated
  lastAssessed: Date;
  dataSource: 'database' | 'heuristic' | 'default';
}

/**
 * Enhanced Unified Cancellation Orchestrator Service
 *
 * This is the final implementation that combines all three sub-agent approaches
 * into a truly unified, intelligent cancellation platform with real-time updates,
 * comprehensive fallback handling, and advanced analytics.
 */
export class UnifiedCancellationOrchestratorEnhancedService {
  private cancellationService: CancellationService;
  private eventDrivenService: EventDrivenCancellationService;
  private lightweightService: LightweightCancellationService;

  // Provider capabilities cache with TTL
  private providerCapabilities = new Map<
    string,
    { capability: ProviderCapability; expires: Date }
  >();
  private readonly CAPABILITY_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  // Active orchestrations tracking
  private activeOrchestrations = new Map<
    string,
    {
      userId: string;
      status: string;
      method: string;
      startTime: Date;
      lastUpdate: Date;
      callbacks: Set<(update: any) => void>;
    }
  >();

  constructor(private db: PrismaClient) {
    this.cancellationService = new CancellationService(db);
    this.eventDrivenService = new EventDrivenCancellationService(db);
    this.lightweightService = new LightweightCancellationService(db);

    this.setupEventListeners();
    this.initializeCapabilityCache();
  }

  /**
   * Main unified cancellation entry point
   */
  async initiateCancellation(
    userId: string,
    input: UnifiedCancellationRequest
  ): Promise<UnifiedCancellationResult> {
    const orchestrationId = this.generateOrchestrationId();
    const startTime = new Date();

    try {
      // Log orchestration start
      await this.logOrchestrationActivity(
        orchestrationId,
        'orchestration_initiated',
        'info',
        'Enhanced unified cancellation orchestration started',
        { userId, subscriptionId: input.subscriptionId, input }
      );

      // Validate subscription ownership
      const subscription = await this.validateSubscriptionOwnership(
        userId,
        input.subscriptionId
      );

      // Check if cancellation is allowed
      await this.validateCancellationEligibility(
        userId,
        input.subscriptionId,
        subscription
      );

      // Assess provider capabilities
      const capabilities = await this.assessProviderCapabilities(
        subscription.name
      );

      // Determine optimal method using consensus logic
      const optimalMethod = this.determineOptimalMethod(
        capabilities,
        input.preferredMethod,
        input.userPreferences
      );

      // Handle scheduling if requested
      if (input.scheduling?.scheduleFor) {
        return await this.handleScheduledCancellation(
          userId,
          subscription,
          input,
          orchestrationId,
          optimalMethod,
          capabilities
        );
      }

      // Register active orchestration for real-time tracking
      this.registerActiveOrchestration(orchestrationId, {
        userId,
        status: 'routing',
        method: optimalMethod,
        startTime,
        lastUpdate: startTime,
        callbacks: new Set(),
      });

      // Route to appropriate service with unified error handling
      const result = await this.executeWithFallback(
        userId,
        subscription,
        input,
        orchestrationId,
        optimalMethod,
        capabilities
      );

      // Update orchestration status
      this.updateOrchestrationStatus(orchestrationId, 'completed');

      return result;
    } catch (error) {
      // Handle orchestration failure
      await this.handleOrchestrationFailure(
        orchestrationId,
        userId,
        input.subscriptionId,
        error
      );

      // Clean up active orchestration
      this.activeOrchestrations.delete(orchestrationId);

      throw error;
    }
  }

  /**
   * Execute cancellation with intelligent fallback handling
   */
  private async executeWithFallback(
    userId: string,
    subscription: any,
    input: UnifiedCancellationRequest,
    orchestrationId: string,
    primaryMethod: 'api' | 'automation' | 'manual',
    capabilities: ProviderCapability
  ): Promise<UnifiedCancellationResult> {
    const fallbackChain = this.buildFallbackChain(primaryMethod, capabilities);
    let lastError: Error | null = null;

    for (let i = 0; i < fallbackChain.length; i++) {
      const method = fallbackChain[i];

      try {
        // Update status to show current method attempt
        this.updateOrchestrationStatus(orchestrationId, 'processing', {
          currentMethod: method,
          attempt: i + 1,
          totalMethods: fallbackChain.length,
        });

        // Emit real-time update
        this.emitOrchestrationUpdate(orchestrationId, {
          type: 'method_attempt',
          method,
          attempt: i + 1,
          message: `Attempting ${method} cancellation...`,
        });

        // Execute the method
        const result = await this.executeMethod(
          method!,
          userId,
          subscription,
          input,
          orchestrationId,
          capabilities
        );

        // Success! Return the result
        await this.logOrchestrationActivity(
          orchestrationId,
          'method_succeeded',
          'success',
          `${method} cancellation succeeded`,
          { method, result }
        );

        return result;
      } catch (error) {
        lastError = error as Error;

        // Log method failure
        await this.logOrchestrationActivity(
          orchestrationId,
          'method_failed',
          'warning',
          `${method} cancellation failed: ${lastError.message}`,
          { method, error: lastError.message, attempt: i + 1 }
        );

        // Emit failure update
        this.emitOrchestrationUpdate(orchestrationId, {
          type: 'method_failed',
          method,
          error: lastError.message,
          willRetry: i < fallbackChain.length - 1,
        });

        // If this was the last method in the chain, throw the error
        if (i === fallbackChain.length - 1) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `All cancellation methods failed. Last error: ${lastError.message}`,
            cause: lastError,
          });
        }

        // Check if user preferences allow fallback
        if (!input.userPreferences?.allowFallback) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `${method} cancellation failed and fallback is disabled`,
            cause: lastError,
          });
        }

        // Small delay before trying next method
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // This should never be reached, but just in case
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected error in fallback chain execution',
    });
  }

  /**
   * Execute a specific cancellation method
   */
  private async executeMethod(
    method: 'api' | 'automation' | 'manual',
    userId: string,
    subscription: any,
    input: UnifiedCancellationRequest,
    orchestrationId: string,
    capabilities: ProviderCapability
  ): Promise<UnifiedCancellationResult> {
    const baseResult = {
      orchestrationId,
      method,
      metadata: {
        attemptsUsed: 1,
        providerInfo: capabilities,
        realTimeUpdatesEnabled:
          input.userPreferences?.notificationPreferences?.realTime ?? true,
      },
      tracking: {
        sseEndpoint: `/api/sse/cancellation/${orchestrationId}`,
        statusCheckUrl: `/api/trpc/unifiedCancellation.getStatus?input=${encodeURIComponent(JSON.stringify({ orchestrationId }))}`,
      },
    };

    switch (method) {
      case 'api':
        return await this.executeApiMethod(
          userId,
          subscription,
          input,
          baseResult,
          capabilities
        );

      case 'automation':
        return await this.executeAutomationMethod(
          userId,
          subscription,
          input,
          baseResult,
          capabilities
        );

      case 'manual':
        return await this.executeManualMethod(
          userId,
          subscription,
          input,
          baseResult,
          capabilities
        );

      default:
        throw new Error(`Unsupported cancellation method: ${method}`);
    }
  }

  /**
   * Execute API-based cancellation (Sub-agent 1)
   */
  private async executeApiMethod(
    userId: string,
    subscription: any,
    input: UnifiedCancellationRequest,
    baseResult: any,
    capabilities: ProviderCapability
  ): Promise<UnifiedCancellationResult> {
    try {
      const apiResult = await this.cancellationService.initiateCancellation(
        userId,
        {
          subscriptionId: input.subscriptionId,
          priority: input.priority,
          notes: input.reason,
        }
      );

      const estimatedCompletion = new Date(
        Date.now() + capabilities.apiEstimatedTime * 60 * 1000
      );

      return {
        success: true,
        requestId: apiResult.requestId,
        status: apiResult.status === 'completed' ? 'completed' : 'processing',
        message: 'API cancellation initiated successfully',
        estimatedCompletion,
        processingStarted: new Date(),
        confirmationCode: apiResult.confirmationCode,
        effectiveDate: apiResult.effectiveDate,
        refundAmount: apiResult.refundAmount,
        ...baseResult,
      };
    } catch (error) {
      throw new Error(
        `API cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute automation-based cancellation (Sub-agent 2)
   */
  private async executeAutomationMethod(
    userId: string,
    subscription: any,
    input: UnifiedCancellationRequest,
    baseResult: any,
    capabilities: ProviderCapability
  ): Promise<UnifiedCancellationResult> {
    try {
      const automationResult =
        await this.eventDrivenService.initiateCancellation(userId, {
          subscriptionId: input.subscriptionId,
          priority: input.priority,
          notes: input.reason,
          preferredMethod: 'webhook' as const,
          notificationPreferences: {
            email:
              input.userPreferences?.notificationPreferences?.email ?? true,
            sms: input.userPreferences?.notificationPreferences?.sms ?? false,
            realtime:
              input.userPreferences?.notificationPreferences?.realTime ?? true,
          },
        });

      return {
        success: true,
        requestId: automationResult.requestId,
        status: 'processing',
        message: 'Automation cancellation workflow started',
        estimatedCompletion: automationResult.estimatedCompletion,
        processingStarted: new Date(),
        ...baseResult,
        metadata: {
          ...baseResult.metadata,
          workflowId: automationResult.workflowId,
        },
      };
    } catch (error) {
      throw new Error(
        `Automation cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute manual cancellation method (Sub-agent 3)
   */
  private async executeManualMethod(
    userId: string,
    subscription: any,
    input: UnifiedCancellationRequest,
    baseResult: any,
    capabilities: ProviderCapability
  ): Promise<UnifiedCancellationResult> {
    try {
      const manualResult =
        await this.lightweightService.provideCancellationInstructions(userId, {
          subscriptionId: input.subscriptionId,
          notes: input.reason,
        });

      return {
        success: true,
        requestId: manualResult.requestId,
        status: 'requires_manual',
        message: 'Manual cancellation instructions generated',
        estimatedCompletion: new Date(
          Date.now() + capabilities.manualEstimatedTime * 60 * 1000
        ),
        manualInstructions: manualResult.instructions
          ? {
              provider: {
                name: manualResult.instructions.provider.name,
                logo: manualResult.instructions.provider.logo,
                difficulty: manualResult.instructions.provider.difficulty,
                estimatedTime: manualResult.instructions.provider.estimatedTime,
              },
              steps: manualResult.instructions.instructions.steps,
              tips: manualResult.instructions.instructions.tips,
              warnings: manualResult.instructions.instructions.warnings,
              contactInfo: manualResult.instructions.instructions.contactInfo,
            }
          : undefined,
        ...baseResult,
      };
    } catch (error) {
      throw new Error(
        `Manual cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Determine optimal cancellation method using consensus logic
   */
  private determineOptimalMethod(
    capabilities: ProviderCapability,
    preferredMethod = 'auto',
    userPreferences?: any
  ): 'api' | 'automation' | 'manual' {
    // If user specified a method other than auto, try to honor it
    if (preferredMethod !== 'auto') {
      const method = preferredMethod as 'api' | 'automation' | 'manual';
      if (this.isMethodSupported(method, capabilities)) {
        return method;
      }
    }

    // Consensus-based intelligent selection:
    // 1. API-first if high success rate and supported
    if (capabilities.supportsApi && capabilities.apiSuccessRate > 0.85) {
      return 'api';
    }

    // 2. Automation for complex cases or moderate success rates
    if (
      capabilities.supportsAutomation &&
      (capabilities.requires2FA ||
        capabilities.hasRetentionOffers ||
        capabilities.difficulty === 'hard' ||
        capabilities.automationSuccessRate > 0.7)
    ) {
      return 'automation';
    }

    // 3. Manual as universal fallback
    return 'manual';
  }

  /**
   * Build intelligent fallback chain based on provider capabilities
   */
  private buildFallbackChain(
    primaryMethod: 'api' | 'automation' | 'manual',
    capabilities: ProviderCapability
  ): Array<'api' | 'automation' | 'manual'> {
    const chain: Array<'api' | 'automation' | 'manual'> = [primaryMethod];
    const methods: Array<'api' | 'automation' | 'manual'> = [
      'api',
      'automation',
      'manual',
    ];

    // Add other supported methods in order of preference
    for (const method of methods) {
      if (
        method !== primaryMethod &&
        this.isMethodSupported(method, capabilities)
      ) {
        chain.push(method);
      }
    }

    // Always ensure manual is available as final fallback
    if (!chain.includes('manual')) {
      chain.push('manual');
    }

    return chain;
  }

  /**
   * Check if a method is supported by the provider
   */
  private isMethodSupported(
    method: 'api' | 'automation' | 'manual',
    capabilities: ProviderCapability
  ): boolean {
    switch (method) {
      case 'api':
        return capabilities.supportsApi;
      case 'automation':
        return capabilities.supportsAutomation;
      case 'manual':
        return capabilities.supportsManual; // Always true in practice
      default:
        return false;
    }
  }

  /**
   * Assess provider capabilities for a subscription
   */
  private async assessProviderCapabilities(
    subscriptionName: string
  ): Promise<ProviderCapability> {
    const normalizedName = subscriptionName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    // Check cache first
    const cached = this.providerCapabilities.get(normalizedName);
    if (cached && cached.expires > new Date()) {
      return cached.capability;
    }

    // Look up provider in database
    const provider = await this.db.cancellationProvider.findFirst({
      where: {
        normalizedName,
        isActive: true,
      },
    });

    let capability: ProviderCapability;

    if (provider) {
      // Build capability from database provider
      capability = {
        providerId: provider.id,
        providerName: provider.name,
        supportsApi: provider.type === 'api' && Boolean(provider.apiEndpoint),
        supportsAutomation: provider.type === 'web_automation',
        supportsManual: true,
        apiSuccessRate:
          provider.type === 'api'
            ? parseFloat(provider.successRate.toString())
            : 0,
        automationSuccessRate:
          provider.type === 'web_automation'
            ? parseFloat(provider.successRate.toString())
            : 0,
        manualSuccessRate: 0.95, // Manual instructions are generally reliable
        apiEstimatedTime:
          provider.type === 'api' ? provider.averageTime || 5 : 0,
        automationEstimatedTime:
          provider.type === 'web_automation' ? provider.averageTime || 15 : 0,
        manualEstimatedTime: provider.averageTime || 20,
        difficulty: provider.difficulty as 'easy' | 'medium' | 'hard',
        requires2FA: provider.requires2FA,
        hasRetentionOffers: provider.requiresRetention,
        requiresHumanIntervention:
          provider.requires2FA || provider.requiresRetention,
        lastAssessed: new Date(),
        dataSource: 'database',
      };
    } else {
      // Generate heuristic-based capability for unknown providers
      capability = this.generateHeuristicCapability(subscriptionName);
    }

    // Cache the result
    this.providerCapabilities.set(normalizedName, {
      capability,
      expires: new Date(Date.now() + this.CAPABILITY_CACHE_TTL),
    });

    return capability;
  }

  /**
   * Generate heuristic capabilities for unknown providers
   */
  private generateHeuristicCapability(
    subscriptionName: string
  ): ProviderCapability {
    const name = subscriptionName.toLowerCase();

    // Heuristics based on common patterns
    const isStreamingService =
      /netflix|hulu|disney|prime|spotify|apple|youtube/.test(name);
    const isSoftwareService = /adobe|microsoft|zoom|slack|dropbox/.test(name);
    const isUtilityService = /phone|electric|gas|water|internet/.test(name);

    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    let estimatedTime = 15;
    let hasRetention = false;

    if (isStreamingService) {
      difficulty = 'easy';
      estimatedTime = 10;
      hasRetention = true;
    } else if (isSoftwareService) {
      difficulty = 'medium';
      estimatedTime = 20;
      hasRetention = true;
    } else if (isUtilityService) {
      difficulty = 'hard';
      estimatedTime = 30;
      hasRetention = false;
    }

    return {
      providerName: subscriptionName,
      supportsApi: false, // Conservative assumption
      supportsAutomation: false, // Conservative assumption
      supportsManual: true, // Always available
      apiSuccessRate: 0,
      automationSuccessRate: 0,
      manualSuccessRate: 0.9,
      apiEstimatedTime: 0,
      automationEstimatedTime: 0,
      manualEstimatedTime: estimatedTime,
      difficulty,
      requires2FA: false,
      hasRetentionOffers: hasRetention,
      requiresHumanIntervention: hasRetention,
      lastAssessed: new Date(),
      dataSource: 'heuristic',
    };
  }

  /**
   * Validate subscription ownership
   */
  private async validateSubscriptionOwnership(
    userId: string,
    subscriptionId: string
  ) {
    const subscription = await this.db.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message:
          'Subscription not found or you do not have permission to cancel it',
      });
    }

    return subscription;
  }

  /**
   * Validate cancellation eligibility
   */
  private async validateCancellationEligibility(
    userId: string,
    subscriptionId: string,
    subscription: any
  ) {
    // Check if already cancelled
    if (subscription.status === 'cancelled') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This subscription is already cancelled',
      });
    }

    // Check for existing active cancellation requests
    const existingRequest = await this.db.cancellationRequest.findFirst({
      where: {
        subscriptionId,
        userId,
        status: { in: ['pending', 'processing', 'scheduled'] },
      },
    });

    if (existingRequest) {
      throw new TRPCError({
        code: 'CONFLICT',
        message:
          'A cancellation request is already in progress for this subscription',
        // @ts-ignore - adding custom field for client handling
        existingRequestId: existingRequest.id,
      });
    }
  }

  /**
   * Handle scheduled cancellation
   */
  private async handleScheduledCancellation(
    userId: string,
    subscription: any,
    input: UnifiedCancellationRequest,
    orchestrationId: string,
    method: 'api' | 'automation' | 'manual',
    capabilities: ProviderCapability
  ): Promise<UnifiedCancellationResult> {
    const scheduleFor = input.scheduling!.scheduleFor!;

    if (scheduleFor <= new Date()) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Scheduled time must be in the future',
      });
    }

    // Create scheduled cancellation request
    const request = await this.db.cancellationRequest.create({
      data: {
        userId,
        subscriptionId: input.subscriptionId,
        method,
        priority: input.priority || 'normal',
        status: 'scheduled',
        attempts: 0,
        userNotes: input.reason,
        errorDetails: JSON.parse(
          JSON.stringify({
            orchestrationId,
            scheduleFor: scheduleFor.toISOString(),
            preferredMethod: method,
            timezone: input.scheduling?.timezone,
            capabilities,
          })
        ),
      },
    });

    await this.logOrchestrationActivity(
      orchestrationId,
      'cancellation_scheduled',
      'info',
      `Cancellation scheduled for ${scheduleFor.toISOString()}`,
      { requestId: request.id, scheduleFor, method }
    );

    return {
      success: true,
      orchestrationId,
      requestId: request.id,
      status: 'scheduled',
      method,
      message: `Cancellation scheduled for ${scheduleFor.toLocaleString()}`,
      estimatedCompletion: scheduleFor,
      metadata: {
        attemptsUsed: 0,
        providerInfo: capabilities,
        realTimeUpdatesEnabled:
          input.userPreferences?.notificationPreferences?.realTime ?? true,
      },
      tracking: {
        sseEndpoint: `/api/sse/cancellation/${orchestrationId}`,
        statusCheckUrl: `/api/trpc/unifiedCancellation.getStatus?input=${encodeURIComponent(JSON.stringify({ orchestrationId }))}`,
      },
    };
  }

  /**
   * Setup event listeners for cross-service coordination
   */
  private setupEventListeners(): void {
    // Listen for service completion events
    onCancellationEvent('service.completed', data => {
      this.handleServiceCompletion(data);
    });

    // Listen for service progress events
    onCancellationEvent('service.progress', data => {
      this.handleServiceProgress(data);
    });

    // Listen for service failure events
    onCancellationEvent('service.failed', data => {
      this.handleServiceFailure(data);
    });

    console.log(
      '[UnifiedCancellationOrchestratorEnhanced] Event listeners initialized'
    );
  }

  /**
   * Initialize provider capability cache
   */
  private async initializeCapabilityCache(): Promise<void> {
    try {
      const providers = await this.db.cancellationProvider.findMany({
        where: { isActive: true },
      });

      for (const provider of providers) {
        const capability: ProviderCapability = {
          providerId: provider.id,
          providerName: provider.name,
          supportsApi: provider.type === 'api' && Boolean(provider.apiEndpoint),
          supportsAutomation: provider.type === 'web_automation',
          supportsManual: true,
          apiSuccessRate:
            provider.type === 'api'
              ? parseFloat(provider.successRate.toString())
              : 0,
          automationSuccessRate:
            provider.type === 'web_automation'
              ? parseFloat(provider.successRate.toString())
              : 0,
          manualSuccessRate: 0.95,
          apiEstimatedTime:
            provider.type === 'api' ? provider.averageTime || 5 : 0,
          automationEstimatedTime:
            provider.type === 'web_automation' ? provider.averageTime || 15 : 0,
          manualEstimatedTime: provider.averageTime || 20,
          difficulty: provider.difficulty as 'easy' | 'medium' | 'hard',
          requires2FA: provider.requires2FA,
          hasRetentionOffers: provider.requiresRetention,
          requiresHumanIntervention:
            provider.requires2FA || provider.requiresRetention,
          lastAssessed: new Date(),
          dataSource: 'database',
        };

        this.providerCapabilities.set(provider.normalizedName, {
          capability,
          expires: new Date(Date.now() + this.CAPABILITY_CACHE_TTL),
        });
      }

      console.log(
        `[UnifiedCancellationOrchestratorEnhanced] Initialized capabilities for ${providers.length} providers`
      );
    } catch (error) {
      console.error(
        '[UnifiedCancellationOrchestratorEnhanced] Failed to initialize capability cache:',
        error
      );
    }
  }

  /**
   * Generate unique orchestration ID
   */
  private generateOrchestrationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `orch_${timestamp}_${random}`;
  }

  /**
   * Register active orchestration for real-time tracking
   */
  private registerActiveOrchestration(
    orchestrationId: string,
    data: any
  ): void {
    this.activeOrchestrations.set(orchestrationId, data);
  }

  /**
   * Update orchestration status and emit real-time updates
   */
  private updateOrchestrationStatus(
    orchestrationId: string,
    status: string,
    metadata?: any
  ): void {
    const orchestration = this.activeOrchestrations.get(orchestrationId);
    if (orchestration) {
      orchestration.status = status;
      orchestration.lastUpdate = new Date();

      this.emitOrchestrationUpdate(orchestrationId, {
        type: 'status_update',
        status,
        timestamp: new Date(),
        metadata,
      });
    }
  }

  /**
   * Emit real-time orchestration updates
   */
  private emitOrchestrationUpdate(orchestrationId: string, update: any): void {
    const orchestration = this.activeOrchestrations.get(orchestrationId);
    if (orchestration) {
      // Emit to all registered callbacks
      orchestration.callbacks.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error(
            '[UnifiedCancellationOrchestratorEnhanced] Error in update callback:',
            error
          );
        }
      });

      // Emit global event
      emitCancellationEvent('orchestration.update', {
        orchestrationId,
        userId: orchestration.userId,
        update,
      });
    }
  }

  /**
   * Handle orchestration failure
   */
  private async handleOrchestrationFailure(
    orchestrationId: string,
    userId: string,
    subscriptionId: string,
    error: unknown
  ): Promise<void> {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown orchestration error';

    await this.logOrchestrationActivity(
      orchestrationId,
      'orchestration_failed',
      'error',
      errorMessage,
      { userId, subscriptionId, error: errorMessage }
    );

    // Emit failure event
    this.emitOrchestrationUpdate(orchestrationId, {
      type: 'orchestration_failed',
      error: errorMessage,
      timestamp: new Date(),
    });

    // Audit log
    await AuditLogger.log({
      userId,
      action: 'cancellation.orchestration_failed',
      resource: orchestrationId,
      result: 'failure',
      error: errorMessage,
      metadata: { subscriptionId },
    });
  }

  /**
   * Handle service completion events
   */
  private async handleServiceCompletion(data: any): Promise<void> {
    // Implementation for handling service completion
    console.log(
      '[UnifiedCancellationOrchestratorEnhanced] Service completion:',
      data
    );
  }

  /**
   * Handle service progress events
   */
  private async handleServiceProgress(data: any): Promise<void> {
    // Implementation for handling service progress
    console.log(
      '[UnifiedCancellationOrchestratorEnhanced] Service progress:',
      data
    );
  }

  /**
   * Handle service failure events
   */
  private async handleServiceFailure(data: any): Promise<void> {
    // Implementation for handling service failure
    console.log(
      '[UnifiedCancellationOrchestratorEnhanced] Service failure:',
      data
    );
  }

  /**
   * Log orchestration activity
   */
  private async logOrchestrationActivity(
    orchestrationId: string,
    action: string,
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
    metadata: any = {}
  ): Promise<void> {
    try {
      await this.db.cancellationLog.create({
        data: {
          requestId: orchestrationId, // Using requestId for orchestration logs
          action,
          status: level,
          message,
          metadata: {
            orchestrationId,
            timestamp: new Date(),
            ...metadata,
          },
        },
      });
    } catch (error) {
      console.error(
        '[UnifiedCancellationOrchestratorEnhanced] Failed to log activity:',
        error
      );
    }
  }

  /**
   * Get orchestration status and progress
   */
  async getOrchestrationStatus(orchestrationId: string): Promise<{
    orchestrationId: string;
    status: string;
    method: string;
    startTime: Date;
    lastUpdate: Date;
    progress?: any;
    logs: any[];
  } | null> {
    const orchestration = this.activeOrchestrations.get(orchestrationId);
    if (!orchestration) {
      return null;
    }

    // Get logs for this orchestration
    const logs = await this.db.cancellationLog.findMany({
      where: {
        metadata: {
          path: ['orchestrationId'],
          equals: orchestrationId,
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return {
      orchestrationId,
      status: orchestration.status,
      method: orchestration.method,
      startTime: orchestration.startTime,
      lastUpdate: orchestration.lastUpdate,
      logs: logs.map(log => ({
        timestamp: log.createdAt,
        action: log.action,
        level: log.status,
        message: log.message,
        metadata: log.metadata,
      })),
    };
  }

  /**
   * Subscribe to real-time updates for an orchestration
   */
  subscribeToUpdates(
    orchestrationId: string,
    callback: (update: any) => void
  ): () => void {
    const orchestration = this.activeOrchestrations.get(orchestrationId);
    if (orchestration) {
      orchestration.callbacks.add(callback);

      // Return unsubscribe function
      return () => {
        orchestration.callbacks.delete(callback);
      };
    }

    // Return no-op unsubscribe if orchestration not found
    return () => {};
  }

  /**
   * Get comprehensive analytics across all methods
   */
  async getUnifiedAnalytics(
    userId: string,
    timeframe: 'day' | 'week' | 'month' = 'month'
  ): Promise<{
    summary: any;
    methodBreakdown: any;
    successRates: any;
    providerAnalytics: any[];
    trends: any[];
  }> {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    // Get all cancellation requests for the user in the timeframe
    const requests = await this.db.cancellationRequest.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        subscription: {
          select: { name: true, amount: true },
        },
        provider: {
          select: { name: true, type: true },
        },
      },
    });

    // Calculate summary statistics
    const total = requests.length;
    const completed = requests.filter(r => r.status === 'completed').length;
    const failed = requests.filter(r => r.status === 'failed').length;
    const pending = requests.filter(r =>
      ['pending', 'processing', 'scheduled'].includes(r.status)
    ).length;

    // Method breakdown
    const methodCounts = requests.reduce(
      (acc, r) => {
        const method =
          r.method === 'manual'
            ? 'manual'
            : r.method === 'web_automation'
              ? 'automation'
              : r.method;
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Success rates by method
    const successRates = Object.keys(methodCounts).reduce(
      (acc, method) => {
        const methodRequests = requests.filter(r => {
          const requestMethod =
            r.method === 'manual'
              ? 'manual'
              : r.method === 'web_automation'
                ? 'automation'
                : r.method;
          return requestMethod === method;
        });
        const successful = methodRequests.filter(
          r => r.status === 'completed'
        ).length;
        acc[method] =
          methodRequests.length > 0
            ? Math.round((successful / methodRequests.length) * 100)
            : 0;
        return acc;
      },
      {} as Record<string, number>
    );

    // Provider analytics
    const providerStats = new Map<
      string,
      { total: number; successful: number; totalTime: number }
    >();

    for (const request of requests) {
      const providerName = request.provider?.name || request.subscription.name;
      const stats = providerStats.get(providerName) || {
        total: 0,
        successful: 0,
        totalTime: 0,
      };

      stats.total++;
      if (request.status === 'completed') {
        stats.successful++;
      }

      if (request.completedAt && request.createdAt) {
        stats.totalTime +=
          request.completedAt.getTime() - request.createdAt.getTime();
      }

      providerStats.set(providerName, stats);
    }

    const providerAnalytics = Array.from(providerStats.entries()).map(
      ([provider, stats]) => ({
        provider,
        totalAttempts: stats.total,
        successRate:
          stats.total > 0
            ? Math.round((stats.successful / stats.total) * 100)
            : 0,
        averageCompletionTime:
          stats.successful > 0
            ? Math.round(stats.totalTime / stats.successful / 1000 / 60)
            : 0, // minutes
      })
    );

    // Simple trends (daily counts)
    const trends = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayRequests = requests.filter(
        r => r.createdAt.toDateString() === date.toDateString()
      );
      return {
        date: date.toISOString().split('T')[0],
        total: dayRequests.length,
        completed: dayRequests.filter(r => r.status === 'completed').length,
        failed: dayRequests.filter(r => r.status === 'failed').length,
      };
    }).reverse();

    return {
      summary: {
        total,
        completed,
        failed,
        pending,
        successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      methodBreakdown: methodCounts,
      successRates,
      providerAnalytics,
      trends,
    };
  }
}
