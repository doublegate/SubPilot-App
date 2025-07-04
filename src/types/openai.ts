/**
 * Type definitions for OpenAI API responses
 * These types provide type safety for external API integration
 */

// OpenAI Chat Completion Types
export interface OpenAIChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: OpenAIChatChoice[];
  usage: OpenAIUsage;
  system_fingerprint?: string;
}

export interface OpenAIChatChoice {
  index: number;
  message: OpenAIChatMessage;
  finish_reason:
    | 'stop'
    | 'length'
    | 'function_call'
    | 'content_filter'
    | 'tool_calls'
    | null;
  logprobs?: OpenAILogprobs | null;
}

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string | null;
  name?: string;
  function_call?: OpenAIFunctionCall;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

export interface OpenAIFunctionCall {
  name: string;
  arguments: string;
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: OpenAIFunctionCall;
}

export interface OpenAILogprobs {
  tokens: string[];
  token_logprobs: (number | null)[];
  top_logprobs: Record<string, number>[] | null;
  text_offset: number[];
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// OpenAI Streaming Types
export interface OpenAIChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: OpenAIChatDelta[];
  usage?: OpenAIUsage;
}

export interface OpenAIChatDelta {
  index: number;
  delta: {
    role?: 'assistant';
    content?: string;
    function_call?: Partial<OpenAIFunctionCall>;
    tool_calls?: Partial<OpenAIToolCall>[];
  };
  finish_reason?:
    | 'stop'
    | 'length'
    | 'function_call'
    | 'content_filter'
    | 'tool_calls'
    | null;
}

// OpenAI Error Types
export interface OpenAIError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

export interface OpenAIRateLimitError extends OpenAIError {
  error: {
    message: string;
    type: 'requests' | 'tokens';
    param?: string;
    code: 'rate_limit_exceeded';
  };
}

// OpenAI Function/Tool Definitions
export interface OpenAIFunction {
  name: string;
  description?: string;
  parameters: {
    type: 'object';
    properties: Record<string, OpenAIFunctionProperty>;
    required?: string[];
  };
}

export interface OpenAIFunctionProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: (string | number)[];
  items?: OpenAIFunctionProperty;
  properties?: Record<string, OpenAIFunctionProperty>;
  required?: string[];
}

export interface OpenAITool {
  type: 'function';
  function: OpenAIFunction;
}

// OpenAI Request Types
export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIChatMessage[];
  functions?: OpenAIFunction[];
  function_call?: 'auto' | 'none' | { name: string };
  tools?: OpenAITool[];
  tool_choice?:
    | 'auto'
    | 'none'
    | { type: 'function'; function: { name: string } };
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  response_format?: { type: 'text' | 'json_object' };
  seed?: number;
}

// OpenAI Model Types
export interface OpenAIModel {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
  permission: OpenAIModelPermission[];
  root: string;
  parent?: string;
}

export interface OpenAIModelPermission {
  id: string;
  object: 'model_permission';
  created: number;
  allow_create_engine: boolean;
  allow_sampling: boolean;
  allow_logprobs: boolean;
  allow_search_indices: boolean;
  allow_view: boolean;
  allow_fine_tuning: boolean;
  organization: string;
  group?: string;
  is_blocking: boolean;
}

// OpenAI Embedding Types
export interface OpenAIEmbeddingResponse {
  object: 'list';
  data: OpenAIEmbedding[];
  model: string;
  usage: OpenAIUsage;
}

export interface OpenAIEmbedding {
  object: 'embedding';
  embedding: number[];
  index: number;
}

export interface OpenAIEmbeddingRequest {
  input: string | string[] | number[] | number[][];
  model: string;
  encoding_format?: 'float' | 'base64';
  dimensions?: number;
  user?: string;
}

// OpenAI Moderation Types
export interface OpenAIModerationResponse {
  id: string;
  model: string;
  results: OpenAIModerationResult[];
}

export interface OpenAIModerationResult {
  flagged: boolean;
  categories: OpenAIModerationCategories;
  category_scores: OpenAIModerationCategoryScores;
}

export interface OpenAIModerationCategories {
  sexual: boolean;
  hate: boolean;
  harassment: boolean;
  'self-harm': boolean;
  'sexual/minors': boolean;
  'hate/threatening': boolean;
  'violence/graphic': boolean;
  'self-harm/intent': boolean;
  'self-harm/instructions': boolean;
  'harassment/threatening': boolean;
  violence: boolean;
}

export interface OpenAIModerationCategoryScores {
  sexual: number;
  hate: number;
  harassment: number;
  'self-harm': number;
  'sexual/minors': number;
  'hate/threatening': number;
  'violence/graphic': number;
  'self-harm/intent': number;
  'self-harm/instructions': number;
  'harassment/threatening': number;
  violence: number;
}

// Type guards for OpenAI objects
export function isOpenAIError(obj: unknown): obj is OpenAIError {
  return typeof obj === 'object' && obj !== null && 'error' in obj;
}

export function isOpenAIRateLimitError(
  obj: unknown
): obj is OpenAIRateLimitError {
  return isOpenAIError(obj) && obj.error.code === 'rate_limit_exceeded';
}

export function isOpenAIChatCompletionResponse(
  obj: unknown
): obj is OpenAIChatCompletionResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'object' in obj &&
    obj.object === 'chat.completion'
  );
}

export function isOpenAIChatCompletionChunk(
  obj: unknown
): obj is OpenAIChatCompletionChunk {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'object' in obj &&
    obj.object === 'chat.completion.chunk'
  );
}

// OpenAI Configuration Types
export interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  project?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}

// Assistant Configuration Types
export interface AssistantConfig {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  functions?: OpenAIFunction[];
  tools?: OpenAITool[];
}
