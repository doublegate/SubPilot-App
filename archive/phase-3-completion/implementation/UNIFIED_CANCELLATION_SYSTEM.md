# Unified Cancellation System

## Overview

SubPilot's Unified Cancellation System is a comprehensive, intelligent subscription cancellation solution that combines three distinct approaches into a cohesive orchestration service. The system automatically selects the best cancellation method based on provider capabilities and falls back gracefully when primary methods fail.

## Architecture

### Three-Agent Architecture

1. **API-First Agent** - Direct provider API integration with webhook support
2. **Event-Driven Agent** - Background job processing with workflow orchestration
3. **Lightweight Agent** - Manual instructions with user confirmation flow

### Core Components

1. **UnifiedCancellationOrchestratorService** - Central intelligence for method selection and coordination
2. **CancellationService** (API-First) - Direct API calls and webhook handling
3. **EventDrivenCancellationService** - Job queue and workflow management
4. **LightweightCancellationService** - Manual instruction generation and tracking
5. **Job Queue System** - Background processing with retry logic
6. **Event Bus** - Real-time communication between components
7. **Workflow Engine** - Complex multi-step process orchestration

### Database Models

- **CancellationRequest** - Central request tracking across all methods
- **CancellationProvider** - Provider capabilities and configuration
- **CancellationLog** - Comprehensive activity logging
- **CancellationWebhook** - Webhook delivery tracking
- **CancellationTemplate** - Manual instruction templates
- **CancellationOrchestration** - Orchestration session tracking

## Intelligent Method Selection

The system automatically selects the optimal cancellation method based on:

1. **Provider Capabilities** - API availability, webhook support, automation compatibility
2. **Historical Success Rates** - Past performance metrics for each method
3. **User Preferences** - Speed vs. certainty trade-offs
4. **Current System Health** - Service availability and load

### Method Priority

1. **API Integration** (Primary)
   - Direct API calls to provider endpoints
   - Immediate confirmation
   - Highest success rate when available

2. **Event-Driven Automation** (Secondary)
   - Web automation with anti-detection
   - Background job processing
   - Handles complex multi-step flows

3. **Manual Instructions** (Fallback)
   - Always available
   - Step-by-step guidance
   - User confirmation required

## API Endpoints

### Unified Router

All endpoints are available under the `unifiedCancellation` router:

```typescript
// Initiate cancellation with intelligent routing
api.unifiedCancellation.initiate.mutate({
  subscriptionId: "sub_123",
  method: "auto", // auto, api, automation, manual
  priority: "normal",
  userPreference: {
    preferredMethod: "api",
    allowFallback: true,
    notificationPreferences: {
      realTime: true,
      email: true
    }
  }
});

// Get real-time status updates
api.unifiedCancellation.getStatus.query({
  requestId: "req_123",
  orchestrationId: "orch_456"
});

// Retry with different method
api.unifiedCancellation.retry.mutate({
  requestId: "req_123",
  forceMethod: "event_driven",
  escalate: true
});

// Get provider capabilities
api.unifiedCancellation.getProviderCapabilities.query({
  subscriptionId: "sub_123"
});
```

## Real-Time Updates

### Server-Sent Events (SSE)

Connect to real-time updates:
```
GET /api/sse/cancellation/{orchestrationId}
```

Updates include:
- Method selection decisions
- Progress through each step
- Retry attempts
- Final confirmation

### Event Types

```typescript
{
  type: "method_selected" | "progress" | "retry" | "completed" | "failed",
  method: "api" | "event_driven" | "lightweight",
  status: string,
  progress: number,
  message: string,
  metadata: object
}
```

## Provider Registry

### Provider Configuration

```typescript
{
  name: "Netflix",
  type: "api" | "web_automation" | "manual",
  capabilities: {
    hasApi: true,
    hasWebhooks: false,
    hasAutomation: true,
    requires2FA: false,
    requiresRetention: true
  },
  successRates: {
    api: 0.95,
    automation: 0.85,
    manual: 0.99
  },
  averageTime: {
    api: 2,        // minutes
    automation: 10,
    manual: 15
  },
  difficulty: "medium",
  apiConfig: { ... },
  automationConfig: { ... },
  manualInstructions: [ ... ]
}
```

## Job Queue System

### Background Processing

- Automatic retry with exponential backoff
- Priority-based processing
- Dead letter queue for failed jobs
- Real-time status updates via event bus

### Job Types

1. **Validation Jobs** - Verify request eligibility
2. **API Cancellation Jobs** - Direct API calls
3. **Automation Jobs** - Web automation tasks
4. **Notification Jobs** - User updates
5. **Analytics Jobs** - Success tracking

## Workflow Engine

### Complex Flow Management

The workflow engine handles:
- Multi-step cancellation processes
- Conditional branching
- Parallel task execution
- State persistence
- Error recovery

### Example Workflow

```yaml
name: Netflix Cancellation
steps:
  - validate_account
  - parallel:
    - check_billing_cycle
    - fetch_retention_offers
  - execute_cancellation
  - wait_for_confirmation
  - notify_user
```

## Security Features

- **Anti-Detection** - Browser fingerprinting, proxy rotation
- **Rate Limiting** - Per-user and per-provider limits
- **Webhook Verification** - HMAC signature validation
- **Audit Logging** - Complete activity trail
- **Encryption** - Provider credentials at rest

## Error Handling

### Intelligent Recovery

1. **Automatic Retry** - With backoff strategies
2. **Method Fallback** - Seamless transition to next method
3. **Partial Progress** - Resume from last successful step
4. **Manual Escalation** - User intervention options

### Error Categories

- **Temporary** - Network issues, rate limits
- **Provider** - API changes, authentication failures
- **User** - Invalid credentials, cancelled accounts
- **System** - Internal errors, resource constraints

## Analytics & Monitoring

### Real-Time Metrics

- Success rates by method and provider
- Average completion times
- Fallback frequency
- Error patterns
- User satisfaction scores

### Provider Health Monitoring

```typescript
api.unifiedCancellation.getSystemHealth.query()
// Returns:
{
  status: "healthy" | "degraded" | "unhealthy",
  methods: {
    api: { available: true, successRate: 0.95 },
    event_driven: { available: true, successRate: 0.82 },
    lightweight: { available: true, successRate: 1.0 }
  },
  recommendations: string[]
}
```

## Testing Strategy

### Comprehensive Coverage

1. **Unit Tests** - Individual service methods
2. **Integration Tests** - Cross-service workflows
3. **End-to-End Tests** - Complete cancellation flows
4. **Load Tests** - System performance under stress
5. **Chaos Tests** - Failure recovery scenarios

### Mock Providers

- Configurable success/failure rates
- Latency simulation
- Error scenario testing
- State verification

## Usage Examples

### Automatic Method Selection

```typescript
// Let the system choose the best method
const result = await api.unifiedCancellation.initiate.mutate({
  subscriptionId: subscription.id,
  method: "auto"
});

// System analyzes:
// - Netflix has API support (95% success)
// - User prefers speed
// - API service is healthy
// → Selects API method
```

### Manual Method Override

```typescript
// Force specific method
const result = await api.unifiedCancellation.initiate.mutate({
  subscriptionId: subscription.id,
  method: "manual"
});

// Useful when:
// - User had issues with automation
// - Provider requires special handling
// - User prefers personal interaction
```

## Implementation Benefits

### For Users

- **Higher Success Rates** - Intelligent method selection
- **Faster Cancellations** - Automatic routing to fastest method
- **Better Transparency** - Real-time progress updates
- **Fallback Options** - Never stuck without a solution

### For Developers

- **Clean Architecture** - Separation of concerns
- **Extensible Design** - Easy to add new providers/methods
- **Type Safety** - Full TypeScript coverage
- **Comprehensive Testing** - High confidence in changes

### For Business

- **Reduced Support Costs** - Higher automation rates
- **Better Analytics** - Detailed success metrics
- **Competitive Advantage** - Industry-leading cancellation experience
- **Scalable Infrastructure** - Handles growth efficiently

## Future Enhancements

1. **Machine Learning** - Predictive method selection
2. **Bulk Operations** - Cancel multiple subscriptions
3. **Retention Negotiation** - AI-powered deal negotiations
4. **International Support** - Multi-language instructions
5. **Mobile SDK** - Native app integration

## Configuration

### Environment Variables

```env
# Job Queue
REDIS_URL=redis://localhost:6379
JOB_QUEUE_CONCURRENCY=5

# Event Bus
EVENT_BUS_MAX_LISTENERS=100

# Workflow Engine
WORKFLOW_TIMEOUT_MS=300000

# Provider APIs
NETFLIX_API_KEY=...
SPOTIFY_CLIENT_ID=...
```

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Seed Providers**
   ```bash
   npx tsx scripts/seed-unified-providers.ts
   ```

3. **Start Services**
   ```bash
   npm run dev:services
   ```

4. **Test Cancellation**
   - Navigate to any subscription
   - Click "Cancel Subscription"
   - Watch the intelligent routing in action

The Unified Cancellation System represents a significant advancement in subscription management, providing users with the most reliable and efficient cancellation experience possible while maintaining complete transparency and control.