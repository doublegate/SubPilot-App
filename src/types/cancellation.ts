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