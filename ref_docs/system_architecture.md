# SubPilot System Architecture Overview

## High-Level Architecture

SubPilot follows a modern full-stack architecture pattern with clear separation of concerns and type safety throughout the entire application stack.

```mermaid
graph TB
    subgraph "Client Layer"
        A[Next.js App Router]
        B[React Components]
        C[Radix UI Components]
        D[State Management]
    end
    
    subgraph "API Layer"
        E[tRPC Router]
        F[Procedures]
        G[Middleware]
        H[Input Validation]
    end
    
    subgraph "Business Logic"
        I[Subscription Service]
        J[Transaction Service]
        K[Budget Service]
        L[Notification Service]
    end
    
    subgraph "Data Layer"
        M[Prisma ORM]
        N[Database Queries]
        O[Migrations]
    end
    
    subgraph "External Services"
        P[Plaid Banking API]
        Q[Email Service]
        R[Authentication]
    end
    
    subgraph "Infrastructure"
        S[PostgreSQL]
        T[Redis Cache]
        U[File Storage]
    end
    
    A --> E
    B --> A
    C --> B
    D --> A
    E --> F
    F --> G
    G --> H
    F --> I
    F --> J
    F --> K
    F --> L
    I --> M
    J --> M
    K --> M
    L --> Q
    M --> N
    N --> S
    I --> P
    R --> E
    M --> T
    L --> U
```

## Component Architecture

### Frontend Architecture

```mermaid
graph TD
    A[App Router Layout] --> B[Page Components]
    B --> C[Feature Components]
    C --> D[UI Components]
    D --> E[Radix Primitives]
    
    F[tRPC Client] --> G[React Query]
    G --> H[Cache Management]
    
    I[Form Management] --> J[React Hook Form]
    J --> K[Zod Validation]
    
    C --> F
    C --> I
    
    L[State Management] --> M[URL State]
    L --> N[Local Storage]
    L --> O[Session State]
    
    C --> L
```

### Backend Architecture

```mermaid
graph TD
    A[Next.js API Routes] --> B[tRPC Handler]
    B --> C[Router Resolution]
    C --> D[Middleware Chain]
    D --> E[Procedure Execution]
    
    F[Authentication] --> G[Session Validation]
    G --> H[User Context]
    
    I[Input Validation] --> J[Zod Schemas]
    J --> K[Type Safety]
    
    L[Business Logic] --> M[Service Layer]
    M --> N[Repository Pattern]
    
    E --> F
    E --> I
    E --> L
    
    N --> O[Prisma Client]
    O --> P[Database Operations]
```

## Data Flow Architecture

### Subscription Management Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client Component
    participant T as tRPC Client
    participant R as tRPC Router
    participant S as Service Layer
    participant D as Database
    participant E as External API
    
    U->>C: Add Subscription
    C->>T: subscriptions.create.mutate()
    T->>R: HTTP Request
    R->>R: Validate Input (Zod)
    R->>R: Check Authentication
    R->>S: Call Subscription Service
    S->>D: Create Subscription Record
    S->>E: Setup Payment Monitoring
    D-->>S: Return Subscription
    S-->>R: Return Result
    R-->>T: HTTP Response
    T-->>C: Update Local Cache
    C-->>U: Show Success State
```

### Transaction Processing Flow

```mermaid
sequenceDiagram
    participant P as Plaid Webhook
    participant A as API Handler
    participant Q as Queue System
    participant S as Transaction Service
    participant D as Database
    participant N as Notification Service
    participant U as User
    
    P->>A: Transaction Webhook
    A->>Q: Enqueue Processing
    Q->>S: Process Transaction
    S->>D: Store Transaction
    S->>S: Match to Subscription
    S->>D: Update Subscription Status
    S->>N: Trigger Notifications
    N->>U: Send Email/Push
    S-->>Q: Processing Complete
```

## Database Architecture

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Subscription : has
    User ||--o{ Transaction : has
    User ||--o{ Budget : has
    User ||--o{ Account : has
    User ||--o{ Session : has
    
    Subscription ||--o{ Transaction : generates
    Budget ||--o{ BudgetItem : contains
    
    User {
        string id PK
        string email UK
        string name
        datetime createdAt
        datetime updatedAt
    }
    
    Subscription {
        string id PK
        string userId FK
        string name
        decimal amount
        enum frequency
        string category
        datetime nextPayment
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }
    
    Transaction {
        string id PK
        string userId FK
        string subscriptionId FK
        decimal amount
        string description
        string category
        enum type
        datetime date
        datetime createdAt
        datetime updatedAt
    }
    
    Budget {
        string id PK
        string userId FK
        string name
        decimal amount
        string category
        enum period
        datetime createdAt
        datetime updatedAt
    }
    
    Account {
        string id PK
        string userId FK
        string provider
        string providerAccountId
        string accessToken
        string refreshToken
        datetime createdAt
        datetime updatedAt
    }
```

### Data Access Patterns

```typescript
// Repository Pattern Implementation
interface SubscriptionRepository {
  findByUserId(userId: string): Promise<Subscription[]>;
  findUpcoming(days: number): Promise<Subscription[]>;
  create(data: CreateSubscriptionData): Promise<Subscription>;
  update(id: string, data: UpdateSubscriptionData): Promise<Subscription>;
  delete(id: string): Promise<void>;
}

// Service Layer Implementation
class SubscriptionService {
  constructor(
    private subscriptionRepo: SubscriptionRepository,
    private transactionRepo: TransactionRepository,
    private notificationService: NotificationService
  ) {}

  async createSubscription(userId: string, data: CreateSubscriptionData) {
    // Business logic
    const subscription = await this.subscriptionRepo.create({
      ...data,
      userId,
    });

    // Schedule notifications
    await this.notificationService.schedulePaymentReminder(subscription);

    return subscription;
  }
}
```

## Security Architecture

### Authentication & Authorization Flow

```mermaid
graph TD
    A[User Request] --> B{Authenticated?}
    B -->|No| C[Redirect to Login]
    B -->|Yes| D[Extract Session]
    D --> E[Validate Token]
    E --> F{Token Valid?}
    F -->|No| C
    F -->|Yes| G[Load User Context]
    G --> H[Check Permissions]
    H --> I{Authorized?}
    I -->|No| J[Return 403]
    I -->|Yes| K[Process Request]
```

### Data Protection Layers

```mermaid
graph TB
    A[Input Layer] --> B[Validation]
    B --> C[Sanitization]
    C --> D[Authorization]
    D --> E[Business Logic]
    E --> F[Data Access]
    F --> G[Encryption]
    G --> H[Database]
    
    subgraph "Security Controls"
        I[Rate Limiting]
        J[CSRF Protection]
        K[SQL Injection Prevention]
        L[XSS Prevention]
        M[Data Encryption]
    end
    
    A -.-> I
    B -.-> J
    C -.-> L
    F -.-> K
    G -.-> M
```

## Caching Strategy

### Multi-Level Caching Architecture

```mermaid
graph TD
    A[User Request] --> B[React Query Cache]
    B --> C{Cache Hit?}
    C -->|Yes| D[Return Cached Data]
    C -->|No| E[API Request]
    E --> F[Redis Cache]
    F --> G{Cache Hit?}
    G -->|Yes| H[Return Cached Result]
    G -->|No| I[Database Query]
    I --> J[Cache Result in Redis]
    J --> K[Cache Result in React Query]
    K --> L[Return to User]
```

### Cache Invalidation Strategy

```typescript
// Cache invalidation patterns
export const cacheKeys = {
  subscriptions: {
    all: (userId: string) => ['subscriptions', userId] as const,
    byId: (id: string) => ['subscription', id] as const,
    upcoming: (userId: string) => ['subscriptions', 'upcoming', userId] as const,
  },
  transactions: {
    all: (userId: string) => ['transactions', userId] as const,
    byMonth: (userId: string, month: string) => ['transactions', userId, month] as const,
  },
} as const;

// Automatic cache invalidation
export const subscriptionsRouter = router({
  create: protectedProcedure
    .input(createSubscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      const subscription = await ctx.prisma.subscription.create({
        data: { ...input, userId: ctx.user.id },
      });

      // Invalidate related caches
      await ctx.revalidateTag(['subscriptions', ctx.user.id]);
      
      return subscription;
    }),
});
```

## Performance Architecture

### Optimization Strategies

```mermaid
graph TD
    A[Performance Optimization] --> B[Frontend]
    A --> C[Backend]
    A --> D[Database]
    
    B --> E[Code Splitting]
    B --> F[Lazy Loading]
    B --> G[Image Optimization]
    B --> H[Bundle Analysis]
    
    C --> I[Response Caching]
    C --> J[Database Connection Pooling]
    C --> K[Query Optimization]
    C --> L[Background Jobs]
    
    D --> M[Indexing Strategy]
    D --> N[Query Optimization]
    D --> O[Connection Pooling]
    D --> P[Read Replicas]
```

### Database Query Optimization

```typescript
// Optimized Prisma queries
export const getSubscriptionsDashboard = async (userId: string) => {
  return prisma.subscription.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      amount: true,
      frequency: true,
      nextPayment: true,
      category: true,
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { nextPayment: 'asc' },
    take: 20,
  });
};

// Batch loading for N+1 prevention
export const getSubscriptionsWithTransactions = async (userId: string) => {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    include: {
      transactions: {
        orderBy: { date: 'desc' },
        take: 5,
      },
    },
  });

  return subscriptions;
};
```

## Scalability Considerations

### Horizontal Scaling Strategy

```mermaid
graph TD
    A[Load Balancer] --> B[Next.js Instance 1]
    A --> C[Next.js Instance 2]
    A --> D[Next.js Instance N]
    
    B --> E[Database Pool]
    C --> E
    D --> E
    
    E --> F[Primary Database]
    E --> G[Read Replica 1]
    E --> H[Read Replica 2]
    
    I[Redis Cluster] --> J[Cache Node 1]
    I --> K[Cache Node 2]
    I --> L[Cache Node 3]
    
    B --> I
    C --> I
    D --> I
```

### Microservices Evolution Path

```mermaid
graph TD
    A[Monolithic Next.js App] --> B[Service Extraction]
    
    B --> C[Subscription Service]
    B --> D[Transaction Service]
    B --> E[Notification Service]
    B --> F[Analytics Service]
    
    G[API Gateway] --> C
    G --> D
    G --> E
    G --> F
    
    H[Frontend App] --> G
```

## Monitoring & Observability

### Monitoring Stack

```mermaid
graph TD
    A[Application] --> B[Metrics Collection]
    A --> C[Log Aggregation]
    A --> D[Error Tracking]
    A --> E[Performance Monitoring]
    
    B --> F[Prometheus/Grafana]
    C --> G[Structured Logging]
    D --> H[Sentry/Bugsnag]
    E --> I[Web Vitals/Lighthouse]
    
    J[Alerting] --> K[PagerDuty/Slack]
    F --> J
    G --> J
    H --> J
    I --> J
```

### Health Check Architecture

```typescript
// Health check endpoints
export const healthRouter = router({
  ping: publicProcedure.query(() => ({ status: 'ok', timestamp: new Date() })),
  
  database: publicProcedure.query(async ({ ctx }) => {
    try {
      await ctx.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', service: 'database' };
    } catch (error) {
      return { status: 'unhealthy', service: 'database', error: error.message };
    }
  }),
  
  external: publicProcedure.query(async () => {
    const checks = await Promise.allSettled([
      checkPlaidConnection(),
      checkEmailService(),
      checkRedisConnection(),
    ]);
    
    return checks.map((check, index) => ({
      service: ['plaid', 'email', 'redis'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      error: check.status === 'rejected' ? check.reason : null,
    }));
  }),
});
```

## Deployment Architecture

### Production Deployment

```mermaid
graph TD
    A[GitHub Repository] --> B[CI/CD Pipeline]
    B --> C[Build & Test]
    C --> D[Security Scan]
    D --> E[Deploy to Staging]
    E --> F[Integration Tests]
    F --> G[Deploy to Production]
    
    G --> H[Vercel/Railway]
    H --> I[CDN Distribution]
    
    J[Database Migration] --> K[Prisma Migrate]
    K --> L[Production Database]
    
    M[Environment Config] --> N[Secret Management]
    N --> O[Runtime Configuration]
```

### Infrastructure as Code

```yaml
# docker-compose.yml for local development
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/subpilot
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=subpilot
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Error Handling Architecture

### Error Propagation Strategy

```mermaid
graph TD
    A[Database Error] --> B[Prisma Exception]
    B --> C[Service Layer Error]
    C --> D[tRPC Error]
    D --> E[Client Error Boundary]
    E --> F[User Notification]
    
    G[External API Error] --> H[Service Error]
    H --> D
    
    I[Validation Error] --> J[Zod Error]
    J --> D
    
    K[Authentication Error] --> L[Auth Error]
    L --> D
```

### Error Recovery Patterns

```typescript
// Error boundaries and retry logic
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
};

// Circuit breaker pattern
class CircuitBreaker {
  private failures = 0;
  private nextAttempt = Date.now();
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.nextAttempt > Date.now()) {
        throw new Error('Circuit breaker is open');
      }
      this.state = 'half-open';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= 5) {
      this.state = 'open';
      this.nextAttempt = Date.now() + 60000; // 1 minute
    }
  }
}
```

This architecture provides a robust, scalable foundation for SubPilot that can handle the complexities of financial data management while maintaining security, performance, and reliability.
