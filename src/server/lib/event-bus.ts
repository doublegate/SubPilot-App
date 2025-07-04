import { EventEmitter } from 'events';

/**
 * Centralized Event Bus for Cancellation System
 *
 * Provides a unified event system for communication between different
 * cancellation services and components.
 */

// Define the event data type
export interface CancellationEventData {
  requestId?: string;
  orchestrationId?: string;
  userId?: string;
  subscriptionId?: string;
  method?: 'api' | 'automation' | 'manual';
  status?: string;
  error?: string;
  progress?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}
class CancellationEventBus extends EventEmitter {
  private static instance: CancellationEventBus;

  private constructor() {
    super();
    this.setMaxListeners(100); // Increase limit for high-traffic scenarios
  }

  public static getInstance(): CancellationEventBus {
    if (!CancellationEventBus.instance) {
      CancellationEventBus.instance = new CancellationEventBus();
    }
    return CancellationEventBus.instance;
  }

  /**
   * Emit a cancellation-related event
   */
  public emitCancellationEvent(
    eventType: string,
    data: CancellationEventData
  ): void {
    this.emit(eventType, data);

    // Also emit a generic 'cancellation' event for global listeners
    this.emit('cancellation', { type: eventType, ...data });

    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EventBus] Emitted: ${eventType}`, data);
    }
  }

  /**
   * Listen for cancellation-related events
   */
  public onCancellationEvent(
    eventType: string,
    listener: (data: CancellationEventData) => void
  ): void {
    this.on(eventType, listener);
  }

  /**
   * Listen for cancellation events once
   */
  public onceCancellationEvent(
    eventType: string,
    listener: (data: CancellationEventData) => void
  ): void {
    this.once(eventType, listener);
  }

  /**
   * Remove cancellation event listener
   */
  public offCancellationEvent(
    eventType: string,
    listener: (data: CancellationEventData) => void
  ): void {
    this.off(eventType, listener);
  }

  /**
   * Remove all listeners for a specific event type
   */
  public removeAllCancellationListeners(eventType?: string): void {
    if (eventType) {
      this.removeAllListeners(eventType);
    } else {
      this.removeAllListeners();
    }
  }

  /**
   * Get current listener count for debugging
   */
  public getListenerCount(eventType: string): number {
    return this.listenerCount(eventType);
  }

  /**
   * Get all registered event types
   */
  public getEventTypes(): string[] {
    return this.eventNames() as string[];
  }
}

// Create singleton instance
const eventBus = CancellationEventBus.getInstance();

// Export convenience functions
export function emitCancellationEvent(
  eventType: string,
  data: CancellationEventData
): void {
  eventBus.emitCancellationEvent(eventType, data);
}

export function onCancellationEvent(
  eventType: string,
  listener: (data: CancellationEventData) => void
): void {
  eventBus.onCancellationEvent(eventType, listener);
}

export function onceCancellationEvent(
  eventType: string,
  listener: (data: CancellationEventData) => void
): void {
  eventBus.onceCancellationEvent(eventType, listener);
}

export function offCancellationEvent(
  eventType: string,
  listener: (data: CancellationEventData) => void
): void {
  eventBus.offCancellationEvent(eventType, listener);
}

export function removeAllCancellationListeners(eventType?: string): void {
  eventBus.removeAllCancellationListeners(eventType);
}

// Export the event bus instance for advanced usage
export { eventBus as cancellationEventBus };

// Common event types for type safety
export const CancellationEventTypes = {
  // Request lifecycle
  CANCELLATION_REQUESTED: 'cancellation.requested',
  CANCELLATION_STARTED: 'cancellation.started',
  CANCELLATION_COMPLETED: 'cancellation.completed',
  CANCELLATION_FAILED: 'cancellation.failed',
  CANCELLATION_CANCELLED: 'cancellation.cancelled',

  // Method-specific events
  API_CANCELLATION_STARTED: 'cancellation.api.started',
  API_CANCELLATION_COMPLETED: 'cancellation.api.completed',
  API_CANCELLATION_FAILED: 'cancellation.api.failed',

  AUTOMATION_CANCELLATION_STARTED: 'cancellation.automation.started',
  AUTOMATION_CANCELLATION_COMPLETED: 'cancellation.automation.completed',
  AUTOMATION_CANCELLATION_FAILED: 'cancellation.automation.failed',

  MANUAL_CANCELLATION_STARTED: 'cancellation.manual.started',
  MANUAL_CANCELLATION_COMPLETED: 'cancellation.manual.completed',
  MANUAL_CANCELLATION_CONFIRMED: 'cancellation.manual.confirmed',

  // Orchestration events
  ORCHESTRATION_STARTED: 'orchestration.started',
  ORCHESTRATION_METHOD_ATTEMPT: 'orchestration.method_attempt',
  ORCHESTRATION_METHOD_SUCCESS: 'orchestration.method_success',
  ORCHESTRATION_METHOD_FAILED: 'orchestration.method_failed',
  ORCHESTRATION_FALLBACK: 'orchestration.fallback',
  ORCHESTRATION_COMPLETED: 'orchestration.completed',
  ORCHESTRATION_FAILED: 'orchestration.failed',

  // Service events
  SERVICE_COMPLETED: 'service.completed',
  SERVICE_PROGRESS: 'service.progress',
  SERVICE_FAILED: 'service.failed',

  // Analytics events
  ANALYTICS_TRACK: 'analytics.track',
  ANALYTICS_UPDATE: 'analytics.update',

  // System events
  SYSTEM_HEALTH_UPDATE: 'system.health_update',
  SYSTEM_PERFORMANCE_UPDATE: 'system.performance_update',

  // Real-time updates
  REALTIME_UPDATE: 'realtime.update',
  REALTIME_CONNECTION: 'realtime.connection',
  REALTIME_DISCONNECTION: 'realtime.disconnection',
} as const;

export type CancellationEventType =
  (typeof CancellationEventTypes)[keyof typeof CancellationEventTypes];
