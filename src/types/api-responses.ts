/**
 * Advanced API Response Type System
 * Provides consistent, type-safe API response patterns with advanced TypeScript features
 */

// Template Literal Types for HTTP Status Codes
type SuccessStatus = '200' | '201' | '202' | '204';
type ClientErrorStatus = '400' | '401' | '403' | '404' | '409' | '422' | '429';
type ServerErrorStatus = '500' | '502' | '503' | '504';
type HttpStatus = SuccessStatus | ClientErrorStatus | ServerErrorStatus;

// Discriminated Union for API Responses
export type ApiResponse<T = unknown, E = string> =
  | SuccessResponse<T>
  | ErrorResponse<E>;

// Success Response with Metadata
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMetadata;
  links?: ResponseLinks;
}

// Error Response with Detailed Information
export interface ErrorResponse<E = string> {
  success: false;
  error: E;
  code?: string;
  details?: ErrorDetails;
  trace?: string;
}

// Response Metadata for Pagination and Context
export interface ResponseMetadata {
  total?: number;
  page?: number;
  limit?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  timestamp?: string;
  version?: string;
}

// HATEOAS-style Links
export interface ResponseLinks {
  self?: string;
  next?: string;
  previous?: string;
  first?: string;
  last?: string;
  related?: Record<string, string>;
}

// Detailed Error Information
export interface ErrorDetails {
  field?: string;
  code?: string;
  message?: string;
  validationErrors?: ValidationError[];
  context?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: unknown;
}

// Conditional Types for Response Data Based on Operation
type OperationType = 'create' | 'read' | 'update' | 'delete' | 'list';

type ResponseDataFor<T, Op extends OperationType> = Op extends 'create'
  ? T & { id: string; createdAt: Date }
  : Op extends 'read'
    ? T
    : Op extends 'update'
      ? T & { updatedAt: Date }
      : Op extends 'delete'
        ? { id: string; deletedAt: Date }
        : Op extends 'list'
          ? T[]
          : T;

// Generic CRUD Response Types
export type CreateResponse<T> = ApiResponse<ResponseDataFor<T, 'create'>>;
export type ReadResponse<T> = ApiResponse<ResponseDataFor<T, 'read'>>;
export type UpdateResponse<T> = ApiResponse<ResponseDataFor<T, 'update'>>;
export type DeleteResponse = ApiResponse<
  ResponseDataFor<{ id: string }, 'delete'>
>;
export type ListResponse<T> = ApiResponse<ResponseDataFor<T, 'list'>>;

// Paginated Response with Advanced Metadata
export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  meta: ResponseMetadata & {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  links: ResponseLinks & {
    self: string;
    first: string;
    last: string;
    next?: string;
    previous?: string;
  };
}

// Branded Types for Different Response Categories
type Brand<T, B> = T & { readonly __brand: B };

export type SubscriptionResponse<T> = Brand<
  ApiResponse<T>,
  'SubscriptionResponse'
>;
export type TransactionResponse<T> = Brand<
  ApiResponse<T>,
  'TransactionResponse'
>;
export type AccountResponse<T> = Brand<ApiResponse<T>, 'AccountResponse'>;
export type NotificationResponse<T> = Brand<
  ApiResponse<T>,
  'NotificationResponse'
>;
export type CancellationResponse<T> = Brand<
  ApiResponse<T>,
  'CancellationResponse'
>;

// Mapped Types for Batch Operations
export type BatchResponse<T> = {
  [K in keyof T]: ApiResponse<T[K]>;
};

export interface BulkOperationResponse<T>
  extends SuccessResponse<BulkOperationResult<T>> {
  data: BulkOperationResult<T>;
}

export interface BulkOperationResult<T> {
  successful: T[];
  failed: Array<{
    item: Partial<T>;
    error: string;
    code?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Advanced Error Types with Context
export interface DetailedError {
  message: string;
  code: string;
  status: HttpStatus;
  timestamp: Date;
  path?: string;
  method?: string;
  requestId?: string;
  userId?: string;
  context?: Record<string, unknown>;
}

// Conditional Error Types Based on Status
export type ErrorFor<S extends HttpStatus> = S extends '400'
  ? ValidationError[]
  : S extends '401'
    ? { reason: 'unauthorized' | 'invalid_token' | 'expired_token' }
    : S extends '403'
      ? { reason: 'forbidden' | 'insufficient_permissions' }
      : S extends '404'
        ? { resource: string; id?: string }
        : S extends '409'
          ? {
              conflictType: 'duplicate' | 'version_mismatch' | 'state_conflict';
            }
          : S extends '422'
            ? ValidationError[]
            : S extends '429'
              ? { retryAfter: number; limit: number; remaining: number }
              : S extends '500'
                ? { internal: true; reference?: string }
                : DetailedError;

// Type-safe Error Response Factory
export const createErrorResponse = <S extends HttpStatus>(
  status: S,
  error: ErrorFor<S>,
  options?: {
    code?: string;
    trace?: string;
    context?: Record<string, unknown>;
  }
): ErrorResponse<ErrorFor<S>> => ({
  success: false,
  error,
  code: options?.code,
  details: {
    code: options?.code,
    context: options?.context,
  },
  trace: options?.trace,
});

// Type-safe Success Response Factory
export const createSuccessResponse = <T>(
  data: T,
  options?: {
    meta?: Partial<ResponseMetadata>;
    links?: Partial<ResponseLinks>;
  }
): SuccessResponse<T> => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    version: '1.0',
    ...options?.meta,
  },
  links: options?.links,
});

// Paginated Response Factory
export const createPaginatedResponse = <T>(
  data: T[],
  pagination: {
    total: number;
    page: number;
    limit: number;
  },
  options?: {
    baseUrl?: string;
    additionalMeta?: Record<string, unknown>;
  }
): PaginatedResponse<T> => {
  const { total, page, limit } = pagination;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const baseUrl = options?.baseUrl ?? '';
  const buildUrl = (pageNum: number) =>
    `${baseUrl}?page=${pageNum}&limit=${limit}`;

  return {
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      timestamp: new Date().toISOString(),
      version: '1.0',
      ...options?.additionalMeta,
    },
    links: {
      self: buildUrl(page),
      first: buildUrl(1),
      last: buildUrl(totalPages),
      ...(hasNextPage && { next: buildUrl(page + 1) }),
      ...(hasPreviousPage && { previous: buildUrl(page - 1) }),
    },
  };
};

// Type Guards for Response Types
export const isSuccessResponse = <T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> => {
  return response.success === true;
};

export const isErrorResponse = <T, E>(
  response: ApiResponse<T, E>
): response is ErrorResponse<E> => {
  return response.success === false;
};

export const isPaginatedResponse = <T>(
  response: SuccessResponse<T[] | T>
): response is PaginatedResponse<T extends (infer U)[] ? U : T> => {
  return (
    Array.isArray(response.data) &&
    response.meta?.total !== undefined &&
    response.links?.first !== undefined
  );
};

// Utility Types for Response Transformation
export type ExtractData<T> = T extends SuccessResponse<infer U> ? U : never;
export type ExtractError<T> = T extends ErrorResponse<infer E> ? E : never;

// Response Transformation Utilities
export const mapResponseData = <T, U>(
  response: ApiResponse<T>,
  mapper: (data: T) => U
): ApiResponse<U> => {
  if (isSuccessResponse(response)) {
    return {
      ...response,
      data: mapper(response.data),
    };
  }
  return response;
};

export const flattenPaginatedResponse = <T>(
  responses: PaginatedResponse<T>[]
): SuccessResponse<T[]> => {
  const allData = responses.flatMap(response => response.data);
  const totalItems = responses.reduce(
    (sum, response) => sum + response.meta.total,
    0
  );

  return createSuccessResponse(allData, {
    meta: {
      total: totalItems,
      page: 1,
      limit: allData.length,
    },
  });
};

// Advanced Response Composition
export const composeResponses = <T extends Record<string, ApiResponse<any>>>(
  responses: T
): ApiResponse<{ [K in keyof T]: ExtractData<T[K]> }> => {
  const errors: string[] = [];
  const data: Record<string, unknown> = {};

  for (const [key, response] of Object.entries(responses)) {
    if (isErrorResponse(response)) {
      errors.push(`${key}: ${response.error}`);
    } else {
      data[key] = response.data;
    }
  }

  if (errors.length > 0) {
    return createErrorResponse('422', errors as ErrorDetails[], {
      code: 'COMPOSITION_FAILED',
    });
  }

  return createSuccessResponse(data as { [K in keyof T]: ExtractData<T[K]> });
};

// Export specific response types for common entities
export type SubscriptionCreateResponse = CreateResponse<{
  id: string;
  name: string;
  provider: string;
  amount: number;
  frequency: string;
}>;

export type SubscriptionListResponse = PaginatedResponse<{
  id: string;
  name: string;
  provider: string;
  amount: number;
  status: string;
}>;

export type SubscriptionCancelResponse = SuccessResponse<{
  id: string;
  status: 'cancelled';
  cancelledAt: Date;
  refund?: {
    amount: number;
    status: string;
  };
}>;

export type TransactionListResponse = PaginatedResponse<{
  id: string;
  amount: number;
  date: Date;
  description: string;
  category: string;
  isSubscription: boolean;
}>;

export type TransactionAnalyzeResponse = SuccessResponse<{
  summary: {
    total: number;
    subscriptions: number;
    categories: Record<string, number>;
  };
  patterns: Array<{
    type: 'recurring' | 'seasonal' | 'irregular';
    confidence: number;
    description: string;
  }>;
}>;

export type AccountConnectResponse = SuccessResponse<{
  id: string;
  institutionName: string;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
  }>;
}>;

export type AccountSyncResponse = SuccessResponse<{
  accountId: string;
  transactionsAdded: number;
  lastSync: Date;
  status: 'success' | 'partial' | 'failed';
}>;
