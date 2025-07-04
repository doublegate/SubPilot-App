/**
 * Comprehensive type definitions for the cancellation system
 * This file provides strict typing to resolve ESLint type safety errors
 */

// Base cancellation status types
export type CancellationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'requires_manual';

export type CancellationMethod = 'api' | 'web_automation' | 'manual';

export type CancellationPriority = 'low' | 'normal' | 'high';

// Manual instructions interface - Enhanced modal format
export interface ManualInstructions {
  provider: {
    name: string;
    logo?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  };
  instructions: string[];
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
    hours?: string;
  };
  estimatedTime?: string;
  tips?: string[];
}

// Unified cancellation instructions type
export type CancellationInstructions =
  | string
  | ManualInstructions
  | {
      provider?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
      estimatedTime?: string;
      steps?: Array<{
        title: string;
        description: string;
        url?: string;
        note?: string;
      }>;
      specificSteps?: string[];
      alternativeMethod?: {
        description: string;
        contactInfo?: string;
      };
      tips?: string[];
      website?: string;
      phone?: string;
      email?: string;
      chatUrl?: string;
      service?: string;
    }
  | {
      instructions: {
        steps: string[];
        contactInfo: {
          website?: string;
          phone?: string;
          email?: string;
        };
      };
    };

// Alternative format for unified modal
export interface ManualInstructionsUnified {
  instructions: {
    steps: string[];
    contactInfo: {
      website?: string;
      phone?: string;
      email?: string;
    };
  };
}

// Enhanced cancellation result interface
export interface CancellationResult {
  status: CancellationStatus;
  message?: string;
  orchestrationId?: string;
  requestId?: string;
  method?: CancellationMethod;
  estimatedCompletion?: string;
  manualInstructions?: ManualInstructions;
  metadata?: Record<string, unknown>;
  confirmationCode?: string;
  effectiveDate?: string | Date;
  refundAmount?: number;
  success?: boolean;
  subscription?: {
    id: string;
    name: string;
    status: string;
  };
  completedAt?: string | Date;
}

// Manual confirmation data interface
export interface ManualConfirmationData {
  success: boolean;
  confirmationCode?: string;
  effectiveDate?: Date;
  notes?: string;
  refundAmount?: number;
  details?: string;
  screenshotUrl?: string;
}

// API response interfaces
export interface CancellationStatusResponse {
  status: CancellationStatus;
  method: CancellationMethod;
  completedSteps: number;
  totalSteps: number;
  progress: number;
  message?: string;
  error?: string;
  confirmationCode?: string;
  effectiveDate?: string | Date;
  cancellationUrl?: string;
  supportUrl?: string;
  customerServiceNumber?: string;
  instructions?: string;
  manualInstructions?: ManualInstructions;
}

// Request interfaces
export interface CancellationRequest {
  subscriptionId: string;
  method?: CancellationMethod;
  priority?: CancellationPriority;
  notes?: string;
  preferredDate?: Date;
}

export interface RetryRequest {
  requestId: string;
  notes?: string;
}

// Enhanced interfaces for event-driven cancellation service
export interface AutoRetryData {
  userId: string;
  requestId: string;
  error: string;
  attempt: number;
  nextRetryAt: Date;
}

export interface FinalFailureData {
  userId: string;
  requestId: string;
  error: string;
  attempt: number;
  maxAttempts: number;
}

export interface CancellationRequestWithSubscription {
  id: string;
  userId: string;
  subscriptionId: string;
  providerId: string | null;
  status: CancellationStatus;
  method: CancellationMethod;
  priority: CancellationPriority;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  confirmationCode: string | null;
  refundAmount: number | null;
  effectiveDate: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  errorDetails: Record<string, unknown>;
  screenshots: string[];
  automationLog: Array<{
    step: string;
    timestamp: Date;
    status: 'success' | 'failed' | 'pending';
    details?: string;
  }>;
  manualInstructions: Record<string, unknown>;
  userConfirmed: boolean;
  userNotes: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  subscription: {
    id: string;
    name: string;
    status: string;
    provider: Record<string, unknown>;
  };
}

export interface WorkflowStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: string;
  completedSteps: string[];
  errors: string[];
  metadata: Record<string, unknown>;
}

export interface CancellationTimeline {
  id: string;
  timestamp: Date;
  event: string;
  details: string;
  metadata: Record<string, unknown>;
}

export interface CancellationAnalyticsSummary {
  totalRequests: number;
  successfulCancellations: number;
  failedCancellations: number;
  avgCompletionTimeHours: number;
  mostCommonFailureReason: string;
  successRateByMethod: {
    api: number;
    web_automation: number;
    manual: number;
  };
}

export interface CancellationTrend {
  period: string;
  totalRequests: number;
  successfulCancellations: number;
  failedCancellations: number;
  avgCompletionTime: number;
}

export interface MethodEffectiveness {
  method: CancellationMethod;
  totalAttempts: number;
  successfulAttempts: number;
  successRate: number;
  avgCompletionTime: number;
}

export interface MethodStatistic {
  method: CancellationMethod;
  status: CancellationStatus;
  _count: {
    method: number;
  };
}

export interface MethodData {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  successRate?: number;
}

export interface CancellationRequestCancelResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface CancellationProgressUpdate {
  orchestrationId: string;
  status: CancellationStatus;
  progress: number;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface SubscriptionForCancellation {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  category: string | null;
  amount: number;
  currency: string;
  frequency: string;
  nextBilling: Date | null;
  lastBilling: Date | null;
  status: string;
  isActive: boolean;
  provider: Record<string, unknown>;
  cancellationInfo: Record<string, unknown>;
  detectionConfidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCancellationPreferences {
  preferredMethod?: 'api' | 'automation' | 'manual' | 'auto';
  allowAutomation?: boolean;
  requireConfirmation?: boolean;
  notificationSettings?: {
    email?: boolean;
    sms?: boolean;
    realTime?: boolean;
  };
}

export interface ServiceEventData {
  orchestrationId: string;
  requestId: string;
  status: CancellationStatus;
  message: string;
  method: CancellationMethod;
  timestamp: Date;
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface ConfirmManualRequest {
  requestId: string;
  confirmationCode?: string;
  effectiveDate?: Date;
  refundAmount?: number;
  notes?: string;
  wasSuccessful: boolean;
  attachments?: Array<{
    type: 'screenshot' | 'email' | 'confirmation';
    url: string;
    description?: string;
  }>;
}

// Query interfaces
export interface StatusQueryData {
  orchestrationId?: string;
  requestId?: string;
  includeHistory?: boolean;
  includeLogs?: boolean;
}

// Component prop interfaces
export interface CancellationModalProps {
  subscription: {
    id: string;
    name: string;
    merchantName: string;
    amount: number;
    billingCycle: string;
  };
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: CancellationResult) => void;
}

export interface CancellationStatusProps {
  orchestrationId?: string;
  requestId?: string;
  onComplete?: (result: CancellationResult) => void;
}

// Error interfaces
export interface CancellationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Analytics interfaces
export interface CancellationAnalytics {
  timeframe: 'day' | 'week' | 'month' | 'year';
  totalRequests: number;
  successfulCancellations: number;
  failedCancellations: number;
  pendingRequests: number;
  averageCompletionTime: number;
  methodBreakdown: Record<CancellationMethod, number>;
  statusBreakdown: Record<CancellationStatus, number>;
}

// Utility type guards
export function isCancellationResult(obj: unknown): obj is CancellationResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'status' in obj &&
    typeof (obj as CancellationResult).status === 'string'
  );
}

export function isManualInstructions(obj: unknown): obj is ManualInstructions {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'instructions' in obj &&
    typeof (obj as ManualInstructions).instructions === 'object'
  );
}

export function isCancellationError(obj: unknown): obj is CancellationError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'message' in obj &&
    typeof (obj as CancellationError).code === 'string' &&
    typeof (obj as CancellationError).message === 'string'
  );
}

// Enhanced Unified Cancellation Result - Status Object Pattern (never throws exceptions)
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
  method: 'api' | 'event_driven' | 'lightweight';
  message: string;

  // Timing information
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  processingStarted?: Date;

  // Results
  confirmationCode?: string;
  effectiveDate?: Date;
  refundAmount?: number;

  // Instructions (for manual/lightweight methods)
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
    providerInfo?: Record<string, unknown>;
    workflowId?: string;
    realTimeUpdatesEnabled: boolean;
  };

  // Real-time tracking
  tracking: {
    sseEndpoint: string;
    websocketEndpoint?: string;
    statusCheckUrl: string;
  };

  // Error information (when success: false)
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
