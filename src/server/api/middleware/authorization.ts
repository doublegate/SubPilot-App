import { TRPCError } from '@trpc/server';
import { type PrismaClient } from '@prisma/client';
import { AuditLogger } from '@/server/lib/audit-logger';

export type ResourceType =
  | 'subscription'
  | 'account'
  | 'transaction'
  | 'notification'
  | 'cancellation_request'
  | 'conversation'
  | 'billing_subscription'
  | 'plaid_item';

/**
 * Authorization middleware for resource ownership verification
 * Prevents IDOR (Insecure Direct Object Reference) vulnerabilities
 */
export class AuthorizationMiddleware {
  constructor(private db: PrismaClient) {}

  /**
   * Verify that a user owns or has access to a specific resource
   * Uses generic error messages to prevent information disclosure
   */
  async requireResourceOwnership(
    resourceType: ResourceType,
    resourceId: string,
    userId: string,
    options: {
      allowedRoles?: string[];
      requireActive?: boolean;
      auditAction?: string;
    } = {}
  ): Promise<void> {
    const { allowedRoles = [], requireActive = true, auditAction } = options;

    try {
      // Check if user is admin (if roles are provided)
      if (allowedRoles.length > 0 && allowedRoles.includes('admin')) {
        const user = await this.db.user.findUnique({
          where: { id: userId },
          select: { isAdmin: true },
        });

        if (user?.isAdmin) {
          return; // Admin access allowed
        }
      }

      // Verify resource ownership based on type
      const hasAccess = await this.verifyOwnership(
        resourceType,
        resourceId,
        userId,
        requireActive
      );

      if (!hasAccess) {
        // Log unauthorized access attempt
        await AuditLogger.log({
          userId,
          action: 'security.suspicious_activity',
          resource: resourceId,
          result: 'failure',
          metadata: {
            resourceType,
            attempted_resource_id: resourceId,
            auditAction: auditAction || `unauthorized_access.${resourceType}`,
            ip: 'unknown', // Will be populated by middleware if available
          },
        });

        // Use generic error message to prevent information disclosure
        // Don't reveal whether resource exists or user just lacks access
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Resource not found or access denied',
        });
      }

      // Log successful access if audit action is specified
      // Note: auditAction should be a valid SecurityAction
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      // Log system error
      console.error('Authorization middleware error:', error);
      await AuditLogger.log({
        userId,
        action: 'security.suspicious_activity',
        resource: resourceId,
        result: 'failure',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          resourceType,
          errorType: 'authorization_system_error',
        },
      });

      // Return generic error to prevent information disclosure
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Authorization check failed',
      });
    }
  }

  /**
   * Verify ownership for different resource types
   */
  private async verifyOwnership(
    resourceType: ResourceType,
    resourceId: string,
    userId: string,
    requireActive: boolean
  ): Promise<boolean> {
    switch (resourceType) {
      case 'subscription':
        return this.verifySubscriptionOwnership(
          resourceId,
          userId,
          requireActive
        );

      case 'account':
        return this.verifyAccountOwnership(resourceId, userId, requireActive);

      case 'transaction':
        return this.verifyTransactionOwnership(resourceId, userId);

      case 'notification':
        return this.verifyNotificationOwnership(resourceId, userId);

      case 'cancellation_request':
        return this.verifyCancellationRequestOwnership(resourceId, userId);

      case 'conversation':
        return this.verifyConversationOwnership(resourceId, userId);

      case 'billing_subscription':
        return this.verifyBillingSubscriptionOwnership(resourceId, userId);

      case 'plaid_item':
        return this.verifyPlaidItemOwnership(resourceId, userId, requireActive);

      default:
        console.error(`Unknown resource type: ${resourceType}`);
        return false;
    }
  }

  private async verifySubscriptionOwnership(
    subscriptionId: string,
    userId: string,
    requireActive: boolean
  ): Promise<boolean> {
    const subscription = await this.db.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
        ...(requireActive && { isActive: true }),
      },
      select: { id: true },
    });

    return !!subscription;
  }

  private async verifyAccountOwnership(
    accountId: string,
    userId: string,
    requireActive: boolean
  ): Promise<boolean> {
    const account = await this.db.bankAccount.findFirst({
      where: {
        id: accountId,
        userId,
        ...(requireActive && { isActive: true }),
      },
      select: { id: true },
    });

    return !!account;
  }

  private async verifyTransactionOwnership(
    transactionId: string,
    userId: string
  ): Promise<boolean> {
    const transaction = await this.db.transaction.findFirst({
      where: {
        id: transactionId,
        bankAccount: {
          userId,
        },
      },
      select: { id: true },
    });

    return !!transaction;
  }

  private async verifyNotificationOwnership(
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    const notification = await this.db.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      select: { id: true },
    });

    return !!notification;
  }

  private async verifyCancellationRequestOwnership(
    requestId: string,
    userId: string
  ): Promise<boolean> {
    const request = await this.db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
      select: { id: true },
    });

    return !!request;
  }

  private async verifyConversationOwnership(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    const conversation = await this.db.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      select: { id: true },
    });

    return !!conversation;
  }

  private async verifyBillingSubscriptionOwnership(
    subscriptionId: string,
    userId: string
  ): Promise<boolean> {
    const subscription = await this.db.userSubscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
      select: { id: true },
    });

    return !!subscription;
  }

  private async verifyPlaidItemOwnership(
    itemId: string,
    userId: string,
    requireActive: boolean
  ): Promise<boolean> {
    const item = await this.db.plaidItem.findFirst({
      where: {
        id: itemId,
        userId,
        ...(requireActive && { isActive: true }),
      },
      select: { id: true },
    });

    return !!item;
  }

  /**
   * Helper method to require admin role
   */
  async requireAdminRole(userId: string): Promise<void> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      await AuditLogger.log({
        userId,
        action: 'security.suspicious_activity',
        result: 'failure',
        metadata: {
          requiredRole: 'admin',
          userIsAdmin: user?.isAdmin || false,
          attemptType: 'unauthorized_admin_access',
        },
      });

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Administrator access required',
      });
    }
  }

  /**
   * Helper method to check multiple resource ownership
   */
  async requireMultipleResourceOwnership(
    resources: Array<{
      type: ResourceType;
      id: string;
    }>,
    userId: string,
    options?: {
      allowedRoles?: string[];
      requireActive?: boolean;
    }
  ): Promise<void> {
    for (const resource of resources) {
      await this.requireResourceOwnership(
        resource.type,
        resource.id,
        userId,
        options
      );
    }
  }
}

/**
 * Create authorization middleware instance
 */
export function createAuthorizationMiddleware(db: PrismaClient) {
  return new AuthorizationMiddleware(db);
}

/**
 * Helper function for tRPC procedures to verify resource ownership
 */
export async function requireOwnership(
  db: PrismaClient,
  resourceType: ResourceType,
  resourceId: string,
  userId: string,
  options?: {
    allowedRoles?: string[];
    requireActive?: boolean;
    auditAction?: string;
  }
) {
  const authz = new AuthorizationMiddleware(db);
  await authz.requireResourceOwnership(
    resourceType,
    resourceId,
    userId,
    options
  );
}
