import { type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/server/db";
import { AuditLogger } from "~/server/lib/audit-logger";
import { ApiCancellationProvider } from "./providers/api-provider";
import { WebAutomationProvider } from "./providers/web-automation-provider";
import { ManualCancellationProvider } from "./providers/manual-provider";
import type { CancellationProvider, CancellationStrategy } from "./providers/types";

// Cancellation method types
export const CancellationMethod = z.enum(["api", "web_automation", "manual"]);
export type CancellationMethod = z.infer<typeof CancellationMethod>;

// Cancellation status types
export const CancellationStatus = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);
export type CancellationStatus = z.infer<typeof CancellationStatus>;

// Cancellation priority types
export const CancellationPriority = z.enum(["low", "normal", "high"]);
export type CancellationPriority = z.infer<typeof CancellationPriority>;

// Cancellation request input schema
export const CancellationRequestInput = z.object({
  subscriptionId: z.string(),
  method: CancellationMethod.optional(),
  priority: CancellationPriority.default("normal"),
  reason: z.string().optional(),
});

export type CancellationRequestInput = z.infer<typeof CancellationRequestInput>;

// Cancellation result schema
export const CancellationResult = z.object({
  requestId: z.string(),
  status: CancellationStatus,
  confirmationCode: z.string().nullable(),
  effectiveDate: z.date().nullable(),
  refundAmount: z.number().nullable(),
  manualInstructions: z.any().nullable(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    })
    .nullable(),
});

export type CancellationResult = z.infer<typeof CancellationResult>;

export class CancellationService {
  private providers: Map<CancellationMethod, CancellationProvider>;
  private db: PrismaClient;

  constructor(database?: PrismaClient) {
    this.db = database ?? db;
    this.providers = new Map();
    
    // Initialize providers
    this.providers.set("api", new ApiCancellationProvider());
    this.providers.set("web_automation", new WebAutomationProvider());
    this.providers.set("manual", new ManualCancellationProvider());
  }

  /**
   * Initiate a cancellation request
   */
  async initiateCancellation(
    userId: string,
    input: CancellationRequestInput,
    sessionData?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<CancellationResult> {
    try {
      // Validate subscription exists and belongs to user
      const subscription = await this.db.subscription.findFirst({
        where: {
          id: input.subscriptionId,
          userId,
        },
        include: {
          user: true,
        },
      });

      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      if (subscription.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Subscription is already cancelled",
        });
      }

      // Find provider configuration
      const providerName = subscription.name.toLowerCase().replace(/\s+/g, "");
      const provider = await this.db.cancellationProvider.findFirst({
        where: {
          OR: [
            { normalizedName: providerName },
            { name: { contains: subscription.name, mode: "insensitive" } },
          ],
          isActive: true,
        },
      });

      // Determine cancellation method
      const method = input.method ?? this.determineMethod(provider);

      // Create cancellation request
      const request = await this.db.cancellationRequest.create({
        data: {
          userId,
          subscriptionId: input.subscriptionId,
          providerId: provider?.id,
          method,
          priority: input.priority,
          status: "pending",
          ipAddress: sessionData?.ipAddress,
          userAgent: sessionData?.userAgent,
          sessionId: sessionData?.sessionId,
        },
      });

      // Log the cancellation initiation
      await this.logActivity(request.id, "initiated", "info", "Cancellation request initiated", {
        method,
        priority: input.priority,
        reason: input.reason,
      });

      // Audit log
      await AuditLogger.log({
        userId,
        action: "subscription.cancelled" as const,
        resource: subscription.id,
        result: "success",
        metadata: {
          requestId: request.id,
          method,
          provider: provider?.name,
        },
      });

      // Process the cancellation
      const result = await this.processCancellation(request.id);

      return result;
    } catch (error) {
      // Audit log failure
      await AuditLogger.log({
        userId,
        action: "subscription.cancelled" as const,
        resource: input.subscriptionId,
        result: "failure",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Process a cancellation request
   */
  async processCancellation(requestId: string): Promise<CancellationResult> {
    const request = await this.db.cancellationRequest.findUnique({
      where: { id: requestId },
      include: {
        subscription: true,
        provider: true,
      },
    });

    if (!request) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Cancellation request not found",
      });
    }

    // Update status to processing
    await this.db.cancellationRequest.update({
      where: { id: requestId },
      data: {
        status: "processing",
        lastAttemptAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    await this.logActivity(requestId, "processing", "info", "Started processing cancellation");

    try {
      // Get the appropriate provider strategy
      const strategy = this.providers.get(request.method as CancellationMethod);
      if (!strategy) {
        throw new Error(`No strategy found for method: ${request.method}`);
      }

      // Execute cancellation
      const result = await strategy.cancel({
        request,
        subscription: request.subscription,
        provider: request.provider,
      });

      // Update request with results
      const updatedRequest = await this.db.cancellationRequest.update({
        where: { id: requestId },
        data: {
          status: result.success ? "completed" : "failed",
          confirmationCode: result.confirmationCode,
          effectiveDate: result.effectiveDate,
          refundAmount: result.refundAmount,
          completedAt: result.success ? new Date() : undefined,
          errorCode: result.error?.code,
          errorMessage: result.error?.message,
          errorDetails: result.error?.details ?? {},
          screenshots: result.screenshots ?? [],
          automationLog: result.automationLog ?? [],
          manualInstructions: result.manualInstructions ?? {},
        },
      });

      // Update subscription status if successful
      if (result.success) {
        await this.db.subscription.update({
          where: { id: request.subscriptionId },
          data: {
            status: "cancelled",
            isActive: false,
            cancellationInfo: {
              requestId,
              confirmationCode: result.confirmationCode,
              effectiveDate: result.effectiveDate?.toISOString(),
              cancelledAt: new Date().toISOString(),
            },
          },
        });

        await this.logActivity(
          requestId,
          "completed",
          "success",
          "Cancellation completed successfully",
          {
            confirmationCode: result.confirmationCode,
            effectiveDate: result.effectiveDate,
          }
        );
      } else {
        await this.logActivity(requestId, "failed", "failure", result.error?.message ?? "Cancellation failed", {
          error: result.error,
        });

        // Schedule retry if attempts remaining
        if (updatedRequest.attempts < updatedRequest.maxAttempts) {
          const retryDelay = this.calculateRetryDelay(updatedRequest.attempts);
          await this.db.cancellationRequest.update({
            where: { id: requestId },
            data: {
              nextRetryAt: new Date(Date.now() + retryDelay),
            },
          });
        }
      }

      return {
        requestId,
        status: updatedRequest.status as CancellationStatus,
        confirmationCode: updatedRequest.confirmationCode,
        effectiveDate: updatedRequest.effectiveDate,
        refundAmount: updatedRequest.refundAmount ? Number(updatedRequest.refundAmount) : null,
        manualInstructions: updatedRequest.manualInstructions,
        error: result.error ?? null,
      };
    } catch (error) {
      await this.db.cancellationRequest.update({
        where: { id: requestId },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });

      await this.logActivity(
        requestId,
        "error",
        "failure",
        error instanceof Error ? error.message : "Unknown error"
      );

      throw error;
    }
  }

  /**
   * Get cancellation status
   */
  async getCancellationStatus(userId: string, requestId: string): Promise<CancellationResult> {
    const request = await this.db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
    });

    if (!request) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Cancellation request not found",
      });
    }

    return {
      requestId: request.id,
      status: request.status as CancellationStatus,
      confirmationCode: request.confirmationCode,
      effectiveDate: request.effectiveDate,
      refundAmount: request.refundAmount ? Number(request.refundAmount) : null,
      manualInstructions: request.manualInstructions as any,
      error: request.errorCode
        ? {
            code: request.errorCode,
            message: request.errorMessage ?? "Unknown error",
            details: request.errorDetails,
          }
        : null,
    };
  }

  /**
   * Retry a failed cancellation
   */
  async retryCancellation(userId: string, requestId: string): Promise<CancellationResult> {
    const request = await this.db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId,
        status: "failed",
      },
    });

    if (!request) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Failed cancellation request not found",
      });
    }

    // Reset for retry
    await this.db.cancellationRequest.update({
      where: { id: requestId },
      data: {
        status: "pending",
        errorCode: null,
        errorMessage: null,
        errorDetails: {},
        nextRetryAt: null,
      },
    });

    return this.processCancellation(requestId);
  }

  /**
   * Confirm manual cancellation
   */
  async confirmManualCancellation(
    userId: string,
    requestId: string,
    confirmationData: {
      confirmationCode?: string;
      effectiveDate?: Date;
      notes?: string;
    }
  ): Promise<CancellationResult> {
    const request = await this.db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId,
        method: "manual",
      },
      include: {
        subscription: true,
      },
    });

    if (!request) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Manual cancellation request not found",
      });
    }

    // Update request
    const updatedRequest = await this.db.cancellationRequest.update({
      where: { id: requestId },
      data: {
        status: "completed",
        userConfirmed: true,
        confirmationCode: confirmationData.confirmationCode,
        effectiveDate: confirmationData.effectiveDate,
        userNotes: confirmationData.notes,
        completedAt: new Date(),
      },
    });

    // Update subscription
    await this.db.subscription.update({
      where: { id: request.subscriptionId },
      data: {
        status: "cancelled",
        isActive: false,
        cancellationInfo: {
          requestId,
          confirmationCode: confirmationData.confirmationCode,
          effectiveDate: confirmationData.effectiveDate?.toISOString(),
          cancelledAt: new Date().toISOString(),
          manualConfirmation: true,
        },
      },
    });

    await this.logActivity(requestId, "manual_confirmed", "success", "User confirmed manual cancellation", {
      confirmationCode: confirmationData.confirmationCode,
      notes: confirmationData.notes,
    });

    return {
      requestId: updatedRequest.id,
      status: "completed",
      confirmationCode: updatedRequest.confirmationCode,
      effectiveDate: updatedRequest.effectiveDate,
      refundAmount: null,
      manualInstructions: null,
      error: null,
    };
  }

  /**
   * Get user's cancellation history
   */
  async getCancellationHistory(userId: string, limit = 10) {
    const requests = await this.db.cancellationRequest.findMany({
      where: { userId },
      include: {
        subscription: {
          select: {
            id: true,
            name: true,
            amount: true,
          },
        },
        provider: {
          select: {
            name: true,
            logo: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return requests.map((request) => ({
      id: request.id,
      subscription: request.subscription,
      provider: request.provider,
      status: request.status,
      method: request.method,
      confirmationCode: request.confirmationCode,
      effectiveDate: request.effectiveDate,
      createdAt: request.createdAt,
      completedAt: request.completedAt,
    }));
  }

  /**
   * Determine the best cancellation method for a provider
   */
  private determineMethod(provider: any | null): CancellationMethod {
    if (!provider) {
      return "manual"; // Default to manual if no provider found
    }

    // Priority: API > Web Automation > Manual
    if (provider.type === "api" && provider.apiEndpoint) {
      return "api";
    } else if (provider.type === "web_automation" && provider.loginUrl) {
      return "web_automation";
    } else {
      return "manual";
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 60000; // 1 minute
    const maxDelay = 3600000; // 1 hour
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    return delay;
  }

  /**
   * Log activity for a cancellation request
   */
  private async logActivity(
    requestId: string,
    action: string,
    status: string,
    message: string,
    metadata?: any
  ) {
    await this.db.cancellationLog.create({
      data: {
        requestId,
        action,
        status,
        message,
        metadata: metadata ?? {},
      },
    });
  }
}

// Export singleton instance
export const cancellationService = new CancellationService();