import { emitCancellationEvent } from './event-bus';

/**
 * Real-time Notification System for Cancellation Updates
 * 
 * Provides real-time notifications to users about cancellation progress,
 * status changes, and important events.
 */

export interface RealtimeNotification {
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high';
  data?: Record<string, any>;
  timestamp?: Date;
}

export interface NotificationPreferences {
  realTime?: boolean;
  email?: boolean;
  sms?: boolean;
  push?: boolean;
}

/**
 * Send a real-time notification to a user
 */
export function sendRealtimeNotification(
  userId: string,
  notification: RealtimeNotification
): void {
  // Add timestamp if not provided
  const timestampedNotification: RealtimeNotification = {
    ...notification,
    timestamp: notification.timestamp || new Date(),
  };

  // Emit the notification event for real-time delivery
  emitCancellationEvent('realtime.notification', {
    userId,
    notification: timestampedNotification,
  });

  // Log for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[RealtimeNotifications] Sent to ${userId}:`, timestampedNotification);
  }
}

/**
 * Send a batch of notifications to a user
 */
export function sendBatchNotifications(
  userId: string,
  notifications: RealtimeNotification[]
): void {
  notifications.forEach(notification => {
    sendRealtimeNotification(userId, notification);
  });
}

/**
 * Send notification to multiple users
 */
export function broadcastNotification(
  userIds: string[],
  notification: RealtimeNotification
): void {
  userIds.forEach(userId => {
    sendRealtimeNotification(userId, notification);
  });
}

/**
 * Create a cancellation progress notification
 */
export function createProgressNotification(
  step: string,
  progress: number,
  message: string,
  metadata?: Record<string, any>
): RealtimeNotification {
  return {
    type: 'cancellation.progress',
    title: 'Cancellation Progress',
    message,
    priority: 'normal',
    data: {
      step,
      progress,
      ...metadata,
    },
  };
}

/**
 * Create a cancellation status notification
 */
export function createStatusNotification(
  status: string,
  title: string,
  message: string,
  priority: 'low' | 'normal' | 'high' = 'normal',
  metadata?: Record<string, any>
): RealtimeNotification {
  return {
    type: 'cancellation.status',
    title,
    message,
    priority,
    data: {
      status,
      ...metadata,
    },
  };
}

/**
 * Create an error notification
 */
export function createErrorNotification(
  error: string,
  details?: string,
  metadata?: Record<string, any>
): RealtimeNotification {
  return {
    type: 'cancellation.error',
    title: 'Cancellation Error',
    message: error,
    priority: 'high',
    data: {
      error,
      details,
      ...metadata,
    },
  };
}

/**
 * Create a success notification
 */
export function createSuccessNotification(
  title: string,
  message: string,
  metadata?: Record<string, any>
): RealtimeNotification {
  return {
    type: 'cancellation.success',
    title,
    message,
    priority: 'high',
    data: metadata,
  };
}

/**
 * Create a warning notification
 */
export function createWarningNotification(
  title: string,
  message: string,
  metadata?: Record<string, any>
): RealtimeNotification {
  return {
    type: 'cancellation.warning',
    title,
    message,
    priority: 'normal',
    data: metadata,
  };
}

/**
 * Create an info notification
 */
export function createInfoNotification(
  title: string,
  message: string,
  metadata?: Record<string, any>
): RealtimeNotification {
  return {
    type: 'cancellation.info',
    title,
    message,
    priority: 'low',
    data: metadata,
  };
}

/**
 * Notification queue for managing delivery
 */
class NotificationQueue {
  private queue: Array<{
    userId: string;
    notification: RealtimeNotification;
    retries: number;
    timestamp: Date;
  }> = [];
  
  private processing = false;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  /**
   * Add notification to queue
   */
  public enqueue(userId: string, notification: RealtimeNotification): void {
    this.queue.push({
      userId,
      notification,
      retries: 0,
      timestamp: new Date(),
    });

    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process notification queue
   */
  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      try {
        // Attempt to deliver notification
        await this.deliverNotification(item.userId, item.notification);
      } catch (error) {
        // Handle delivery failure
        if (item.retries < this.maxRetries) {
          item.retries++;
          // Re-queue for retry with delay
          setTimeout(() => {
            this.queue.unshift(item);
          }, this.retryDelay * item.retries);
        } else {
          console.error(`[NotificationQueue] Failed to deliver notification after ${this.maxRetries} retries:`, error);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Deliver notification (override in subclasses for different delivery methods)
   */
  private async deliverNotification(
    userId: string,
    notification: RealtimeNotification
  ): Promise<void> {
    // Default implementation just sends real-time notification
    sendRealtimeNotification(userId, notification);
  }

  /**
   * Get queue status
   */
  public getStatus(): {
    queueLength: number;
    processing: boolean;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
    };
  }

  /**
   * Clear queue
   */
  public clear(): void {
    this.queue = [];
  }
}

// Global notification queue instance
const notificationQueue = new NotificationQueue();

/**
 * Queue a notification for reliable delivery
 */
export function queueNotification(
  userId: string,
  notification: RealtimeNotification
): void {
  notificationQueue.enqueue(userId, notification);
}

/**
 * Get notification queue status
 */
export function getNotificationQueueStatus(): {
  queueLength: number;
  processing: boolean;
} {
  return notificationQueue.getStatus();
}

/**
 * Clear notification queue
 */
export function clearNotificationQueue(): void {
  notificationQueue.clear();
}

/**
 * Common notification types for cancellation workflows
 */
export const NotificationTypes = {
  CANCELLATION_INITIATED: 'cancellation.initiated',
  CANCELLATION_PROGRESS: 'cancellation.progress',
  CANCELLATION_METHOD_ATTEMPT: 'cancellation.method_attempt',
  CANCELLATION_METHOD_SUCCESS: 'cancellation.method_success',
  CANCELLATION_METHOD_FAILED: 'cancellation.method_failed',
  CANCELLATION_FALLBACK: 'cancellation.fallback',
  CANCELLATION_COMPLETED: 'cancellation.completed',
  CANCELLATION_FAILED: 'cancellation.failed',
  CANCELLATION_REQUIRES_MANUAL: 'cancellation.requires_manual',
  CANCELLATION_MANUAL_CONFIRMATION: 'cancellation.manual_confirmation',
  ORCHESTRATION_STATUS: 'orchestration.status',
  SYSTEM_HEALTH: 'system.health',
  SYSTEM_MAINTENANCE: 'system.maintenance',
} as const;

export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes];

/**
 * SSE Stream Management for real-time notifications
 */
export interface SSEConnection {
  userId: string;
  stream: ReadableStream;
  controller: ReadableStreamDefaultController;
  lastPing?: Date;
}

class SSEManager {
  private connections = new Map<string, SSEConnection>();

  /**
   * Create a new SSE stream for a user
   */
  public createStream(userId: string): ReadableStream {
    // Create readable stream with proper controller
    const stream = new ReadableStream({
      start: (controller) => {
        // Store connection
        const connection: SSEConnection = {
          userId,
          stream: stream,
          controller,
          lastPing: new Date(),
        };
        this.connections.set(userId, connection);

        // Send initial connection event
        this.sendSSEMessage(controller, {
          type: 'connection',
          data: { status: 'connected', timestamp: new Date().toISOString() }
        });

        // Setup ping interval
        const pingInterval = setInterval(() => {
          this.sendSSEMessage(controller, {
            type: 'ping',
            data: { timestamp: new Date().toISOString() }
          });
        }, 30000); // 30 seconds

        // Cleanup on close
        return () => {
          clearInterval(pingInterval);
          this.connections.delete(userId);
        };
      }
    });

    return stream;
  }

  /**
   * Send SSE message to controller
   */
  private sendSSEMessage(controller: ReadableStreamDefaultController, message: {
    type: string;
    data: any;
  }): void {
    try {
      const sseData = `event: ${message.type}\ndata: ${JSON.stringify(message.data)}\n\n`;
      controller.enqueue(new TextEncoder().encode(sseData));
    } catch (error) {
      console.error('[SSEManager] Error sending message:', error);
    }
  }

  /**
   * Send notification to specific user via SSE
   */
  public sendToUser(userId: string, notification: RealtimeNotification): boolean {
    const connection = this.connections.get(userId);
    if (!connection) {
      return false;
    }

    try {
      this.sendSSEMessage(connection.controller, {
        type: 'notification',
        data: notification
      });
      return true;
    } catch (error) {
      console.error('[SSEManager] Error sending notification:', error);
      // Remove failed connection
      this.connections.delete(userId);
      return false;
    }
  }

  /**
   * Get active connections count
   */
  public getActiveConnections(): number {
    return this.connections.size;
  }

  /**
   * Close connection for user
   */
  public closeConnection(userId: string): void {
    const connection = this.connections.get(userId);
    if (connection) {
      try {
        connection.controller.close();
      } catch (error) {
        console.error('[SSEManager] Error closing connection:', error);
      }
      this.connections.delete(userId);
    }
  }
}

// Global SSE manager instance
const sseManager = new SSEManager();

/**
 * Create SSE stream for real-time notifications
 */
export function createSSEStream(userId: string): ReadableStream {
  return sseManager.createStream(userId);
}

/**
 * Get the realtime notification manager
 */
export function getRealtimeNotificationManager() {
  return {
    sendToUser: (userId: string, notification: RealtimeNotification) => 
      sseManager.sendToUser(userId, notification),
    getActiveConnections: () => sseManager.getActiveConnections(),
    closeConnection: (userId: string) => sseManager.closeConnection(userId),
  };
}