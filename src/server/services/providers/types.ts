import type {
  CancellationRequest,
  Subscription,
  CancellationProvider as DbCancellationProvider,
} from '@prisma/client';

// Base cancellation context
export interface CancellationContext {
  request: CancellationRequest;
  subscription: Subscription;
  provider: DbCancellationProvider | null;
}

// Cancellation result
export interface CancellationStrategyResult {
  success: boolean;
  confirmationCode?: string;
  effectiveDate?: Date;
  refundAmount?: number;
  screenshots?: string[];
  automationLog?: any[];
  manualInstructions?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Base cancellation strategy interface
export interface CancellationStrategy {
  cancel(context: CancellationContext): Promise<CancellationStrategyResult>;
}

// Provider interface
export interface CancellationProvider extends CancellationStrategy {
  name: string;
  type: 'api' | 'web_automation' | 'manual';
}

// Provider-specific configurations
export interface ApiProviderConfig {
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface WebAutomationConfig {
  loginUrl: string;
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
  navigationSteps?: NavigationStep[];
}

export interface NavigationStep {
  action: 'click' | 'fill' | 'wait' | 'waitForSelector' | 'screenshot';
  selector?: string;
  value?: string;
  timeout?: number;
  description?: string;
}

// Manual instruction types
export interface ManualInstruction {
  step: number;
  title: string;
  description: string;
  warning?: string;
  tip?: string;
  expectedResult?: string;
  alternativeMethod?: ManualInstruction;
}

export interface ManualInstructionSet {
  provider: string;
  estimatedTime: number; // in minutes
  difficulty: 'easy' | 'medium' | 'hard';
  prerequisites?: string[];
  instructions: ManualInstruction[];
  contactInfo?: {
    phone?: string;
    email?: string;
    chat?: string;
    hours?: string;
  };
  tips?: string[];
  commonIssues?: {
    issue: string;
    solution: string;
  }[];
}

// Error codes
export enum CancellationErrorCode {
  // Authentication errors
  AUTH_FAILED = 'AUTH_FAILED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Provider errors
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',

  // Automation errors
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
  CAPTCHA_DETECTED = 'CAPTCHA_DETECTED',

  // Business logic errors
  RETENTION_OFFER = 'RETENTION_OFFER',
  BILLING_CYCLE_RESTRICTION = 'BILLING_CYCLE_RESTRICTION',
  CANCELLATION_PENDING = 'CANCELLATION_PENDING',
  REFUND_PROCESSING = 'REFUND_PROCESSING',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
}

// Provider registry types
export interface ProviderMetadata {
  id: string;
  name: string;
  category: string;
  logo?: string;
  supportedMethods: ('api' | 'web_automation' | 'manual')[];
  requiredFields?: string[]; // e.g., ["username", "password", "accountNumber"]
  features: {
    supportsRefunds: boolean;
    requires2FA: boolean;
    hasRetentionOffers: boolean;
    instantCancellation: boolean;
  };
}

// Webhook payload for provider updates
export interface ProviderWebhookPayload {
  provider: string;
  event: 'cancellation_confirmed' | 'refund_processed' | 'cancellation_failed';
  requestId: string;
  data: {
    confirmationCode?: string;
    effectiveDate?: string;
    refundAmount?: number;
    error?: {
      code: string;
      message: string;
    };
  };
  timestamp: string;
}
