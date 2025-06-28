# Event-Driven Cancellation System

## Overview

The Event-Driven Cancellation System is a robust, scalable architecture that handles subscription cancellations through background jobs, workflows, and real-time notifications. This system complements Sub-agent 1's API-first approach by providing asynchronous processing, retry mechanisms, and comprehensive monitoring.

## Architecture Components

### 1. Event Bus (`/server/lib/event-bus.ts`)

A type-safe event system that coordinates communication between different components.

**Key Features:**
- Type-safe event definitions
- Automatic audit logging
- Event pattern matching (waitForEvent, sequences)
- Debug utilities for development

**Example Events:**
```typescript
'cancellation.requested' | 'cancellation.processing' | 'cancellation.completed' 
'cancellation.failed' | 'cancellation.manual_required' | 'webhook.received'
```

### 2. Job Queue (`/server/lib/job-queue.ts`)

Redis-based job queue with priority handling, retry logic, and exponential backoff.

**Features:**
- Priority-based job processing
- Automatic retries with exponential backoff
- Delayed job execution
- Failed job management
- Health monitoring

**Job Types:**
- `cancellation.validate` - Validate cancellation requests
- `cancellation.api` - Process API-based cancellations
- `cancellation.webhook` - Handle webhook cancellations
- `notification.send` - Send user notifications
- `analytics.track` - Track system events

### 3. Workflow Engine (`/server/lib/workflow-engine.ts`)

Orchestrates complex multi-step cancellation processes.

**Built-in Workflows:**
- **Full Cancellation Process**: API → Webhook → Manual fallback
- **Webhook Processing**: Validate → Process → Update status

**Workflow Features:**
- Conditional steps
- Parallel/sequential execution
- Timeout handling
- Event-driven triggers
- Progress tracking

### 4. Real-time Notifications (`/server/lib/realtime-notifications.ts`)

Server-Sent Events (SSE) based real-time updates to users.

**Features:**
- Live cancellation progress updates
- Connection management
- Notification history
- Automatic cleanup of inactive connections

### 5. Job Processors (`/server/services/job-processors/`)

Specialized processors for different job types:

- **CancellationJobProcessor**: Handles all cancellation-related jobs
- **NotificationJobProcessor**: Manages user notifications
- **WebhookJobProcessor**: Processes incoming webhooks
- **AnalyticsJobProcessor**: Tracks system metrics

## Usage Examples

### 1. Initiating a Cancellation

```typescript
import { EventDrivenCancellationService } from '@/server/services/event-driven-cancellation.service';

const service = new EventDrivenCancellationService(db);

const result = await service.initiateCancellation(userId, {
  subscriptionId: 'sub_123',
  priority: 'high',
  preferredMethod: 'api',
  notificationPreferences: {
    realtime: true,
    email: true,
  },
});

// Returns: { requestId, workflowId, status, estimatedCompletion }
```

### 2. Scheduling a Delayed Cancellation

```typescript
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 7); // Cancel in 7 days

const result = await service.initiateCancellation(userId, {
  subscriptionId: 'sub_123',
  scheduleFor: futureDate,
  priority: 'normal',
});
```

### 3. Monitoring Real-time Progress

Frontend implementation:
```typescript
// Connect to real-time notifications
const eventSource = new EventSource('/api/realtime/notifications');

eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  
  if (notification.type === 'cancellation.progress') {
    updateCancellationProgress(notification);
  }
};
```

### 4. Using tRPC System Monitoring

```typescript
// Get system status
const status = await api.systemMonitoring.systemStatus.useQuery();

// Get job queue statistics
const jobStats = await api.systemMonitoring.jobQueueStats.useQuery();

// Retry a failed job
await api.systemMonitoring.retryFailedJob.mutate({ jobId: 'job_123' });
```

## Event Flow

### Typical Cancellation Flow

1. **User Request** → `EventDrivenCancellationService.initiateCancellation()`
2. **Event Emission** → `cancellation.requested` event
3. **Workflow Start** → `cancellation.full_process` workflow
4. **Job Queue** → `cancellation.validate` job
5. **API Attempt** → `cancellation.api` job
6. **Webhook Fallback** → `cancellation.webhook` job (if API fails)
7. **Manual Instructions** → `cancellation.manual_instructions` job (if webhook fails)
8. **Real-time Updates** → User receives live progress notifications
9. **Completion** → `cancellation.completed` event → User notification

### Retry Mechanism

- **Exponential Backoff**: 1s, 2s, 4s, 8s... (max 5 minutes)
- **Max Attempts**: Configurable per job type (default: 3)
- **Jitter**: Random delay to prevent thundering herd
- **Failed Job Queue**: Permanent storage for debugging

## Configuration

### Environment Variables

```env
# Redis for job queue
REDIS_URL=redis://localhost:6379

# Job processing intervals
JOB_PROCESSING_INTERVAL=1000  # milliseconds

# Real-time notification settings
SSE_KEEPALIVE_INTERVAL=30000  # milliseconds

# Development features
NODE_ENV=development  # Enables debug logging
```

### Job Queue Configuration

```typescript
const jobQueue = new JobQueue(redisUrl);

// Configure job types
await jobQueue.addJob('cancellation.api', data, {
  priority: 2,      // Higher = more priority
  delay: 5000,      // Delay in milliseconds
  maxAttempts: 3,   // Retry attempts
});
```

## Monitoring and Observability

### Health Checks

The system provides comprehensive health monitoring:

- **Database Connectivity**: Validates database connections
- **Job Queue Health**: Monitors Redis and job processing
- **Event Bus Status**: Verifies event system responsiveness
- **Real-time Connections**: Tracks active SSE connections

### System Metrics

Available through tRPC endpoints:

```typescript
// System overview
const metrics = await api.systemMonitoring.systemMetrics.useQuery({
  timeframe: 'day' // hour, day, week, month
});

// Real-time statistics
const realtimeStats = await api.systemMonitoring.realtimeStats.useQuery();

// Recent system events
const events = await api.systemMonitoring.recentEvents.useQuery({
  limit: 50,
  actions: ['cancellation.*', 'job.*']
});
```

### Audit Logging

All system operations are automatically logged:

```typescript
await AuditLogger.log({
  userId: 'user_123',
  action: 'cancellation.initiated',
  resource: 'request_456',
  result: 'success',
  metadata: { /* additional context */ }
});
```

## Error Handling

### Graceful Degradation

1. **API Failure** → Fallback to webhook
2. **Webhook Timeout** → Generate manual instructions
3. **All Methods Fail** → Provide user support options

### Retry Strategies

- **Temporary Failures**: Automatic retry with backoff
- **Configuration Issues**: Manual intervention required
- **User Errors**: Immediate failure, no retry

### Error Recovery

```typescript
// Retry a failed job manually
await jobQueue.retryFailedJob('job_123');

// Get failed jobs for analysis
const failedJobs = await jobQueue.getFailedJobs(10);
```

## Development and Testing

### Running the System

```bash
# Start Redis (required for job queue)
redis-server

# Start the development server
npm run dev

# The event-driven system auto-starts with the app
```

### Testing Events

Development endpoint for testing notifications:

```bash
# Send a test notification
curl -X POST http://localhost:3000/api/realtime/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cancellation.progress",
    "title": "Test Notification",
    "message": "Testing real-time notifications",
    "priority": "normal"
  }'
```

### Debug Mode

Enable comprehensive logging:

```typescript
import { EventDebugger } from '@/server/lib/event-bus';

// Enable event logging in development
EventDebugger.enableLogging();
```

## Performance Considerations

### Scalability

- **Horizontal Scaling**: Multiple app instances can share the Redis job queue
- **Job Distribution**: Jobs are automatically distributed across workers
- **Connection Limits**: SSE connections are managed and cleaned up automatically

### Resource Management

- **Memory**: Old workflow instances are automatically cleaned up
- **Redis**: Failed jobs are stored separately to prevent queue bloat
- **Connections**: Inactive SSE connections are terminated after 30 minutes

### Optimization Tips

1. **Job Priorities**: Use appropriate priorities to ensure critical cancellations are processed first
2. **Batch Processing**: Group related operations when possible
3. **Connection Pooling**: Redis connections are pooled automatically
4. **Event Debouncing**: Similar events are deduplicated where possible

## Troubleshooting

### Common Issues

1. **Jobs Not Processing**
   - Check Redis connectivity
   - Verify job processors are started
   - Check for failed jobs in the queue

2. **Real-time Notifications Not Working**
   - Verify SSE endpoint is accessible
   - Check browser console for connection errors
   - Ensure user is authenticated

3. **Workflows Stuck**
   - Check workflow status via monitoring endpoints
   - Look for failed jobs that might be blocking progress
   - Review audit logs for error details

### Debugging Commands

```typescript
// Check system status
const status = await api.systemMonitoring.systemStatus.useQuery();

// Get job queue statistics
const stats = await jobQueue.getStats();

// View recent audit logs
const logs = await api.systemMonitoring.recentEvents.useQuery();
```

## Security Considerations

### Authentication

- All tRPC endpoints require user authentication
- SSE connections validate user sessions
- Job processors verify user ownership of resources

### Data Protection

- Sensitive data is excluded from event logs
- Webhook signatures are verified
- User notifications contain minimal sensitive information

### Rate Limiting

- Job queues prevent system overload
- Real-time connections are limited per user
- Failed job retention prevents storage bloat

## Future Enhancements

### Planned Features

1. **Advanced Analytics**: Machine learning for cancellation success prediction
2. **Provider SDKs**: Direct integration with more cancellation APIs
3. **User Preferences**: Customizable notification channels and timing
4. **Bulk Operations**: Batch cancellation processing
5. **External Webhooks**: User-defined webhook endpoints for integration

### Integration Opportunities

- **Customer Support**: Integration with helpdesk systems
- **Analytics Platforms**: Export metrics to external services
- **Communication**: SMS, push notifications, Slack integration
- **Scheduling**: Advanced scheduling with recurring patterns

## Conclusion

The Event-Driven Cancellation System provides a robust, scalable foundation for handling subscription cancellations asynchronously. By leveraging events, workflows, and background jobs, it ensures reliable processing while providing users with real-time feedback and comprehensive monitoring capabilities.

The system is designed to be resilient, observable, and maintainable, making it suitable for production environments with high-volume cancellation processing requirements.