# SubPilot Tech Stack Integration Guide

## Overview

SubPilot leverages a modern, type-safe full-stack architecture combining Next.js, tRPC, Prisma, and Radix UI. This guide demonstrates how these technologies integrate to create a cohesive development experience for financial applications.

## Technology Stack Overview

```mermaid
graph TD
    A[Frontend - Next.js App Router] --> B[API Layer - tRPC]
    B --> C[Database Layer - Prisma ORM]
    C --> D[Database - PostgreSQL]
    A --> E[UI Components - Radix UI]
    E --> F[Styling - Tailwind CSS]
    B --> G[Authentication - NextAuth.js]
    B --> H[External APIs - Plaid Banking]
```

## Integration Patterns

### 1. Next.js + tRPC Integration

#### Server-Side Setup

```typescript
// pages/api/trpc/[trpc].ts
import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '../../../server/routers/_app';
import { createContext } from '../../../server/context';

export default createNextApiHandler({
  router: appRouter,
  createContext,
});
```

#### Client-Side Configuration

```typescript
// utils/trpc.ts
import { createTRPCNext } from '@trpc/next';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/routers/_app';

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    };
  },
  ssr: false,
});
```

### 2. tRPC + Prisma Integration

#### Context Setup with Prisma

```typescript
// server/context.ts
import { PrismaClient } from '@prisma/client';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const createContext = (opts: CreateNextContextOptions) => {
  return { prisma };
};
```

#### tRPC Router with Prisma

```typescript
// server/routers/subscriptions.ts
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const subscriptionsRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.subscription.findMany({
      include: {
        user: true,
        transactions: true,
      },
    });
  }),

  create: publicProcedure
    .input(z.object({
      name: z.string(),
      amount: z.number(),
      frequency: z.enum(['MONTHLY', 'YEARLY']),
      nextPayment: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.subscription.create({
        data: input,
      });
    }),
});
```

### 3. Next.js App Router + Radix UI Integration

#### Layout with Radix Theme Provider

```typescript
// app/layout.tsx
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Theme
          accentColor="blue"
          grayColor="gray"
          radius="medium"
          scaling="100%"
        >
          {children}
        </Theme>
      </body>
    </html>
  );
}
```

#### Server Component with tRPC

```typescript
// app/dashboard/page.tsx
import { SubscriptionsList } from '../components/SubscriptionsList';
import { trpc } from '../../utils/trpc';

export default async function DashboardPage() {
  // Server-side data fetching
  const subscriptions = await trpc.subscriptions.getAll.query();

  return (
    <div>
      <h1>Dashboard</h1>
      <SubscriptionsList subscriptions={subscriptions} />
    </div>
  );
}
```

### 4. Radix UI + Tailwind CSS Integration

#### Component with Radix and Custom Styling

```typescript
// components/SubscriptionCard.tsx
import { Card, Flex, Text, Button } from '@radix-ui/themes';
import { cn } from '../utils/cn';

interface SubscriptionCardProps {
  subscription: {
    name: string;
    amount: number;
    frequency: string;
  };
  className?: string;
}

export function SubscriptionCard({ subscription, className }: SubscriptionCardProps) {
  return (
    <Card className={cn("p-4", className)}>
      <Flex direction="column" gap="3">
        <Text size="4" weight="bold">{subscription.name}</Text>
        <Text size="3" color="gray">
          ${subscription.amount}/{subscription.frequency.toLowerCase()}
        </Text>
        <Button variant="soft" size="2">
          Manage
        </Button>
      </Flex>
    </Card>
  );
}
```

## Data Flow Architecture

### Request Flow

1. **Client Request**: User interacts with Radix UI component
2. **tRPC Client**: Type-safe API call via tRPC client
3. **Next.js API Route**: Request hits tRPC handler
4. **tRPC Router**: Routes to appropriate procedure
5. **Prisma Query**: Database operation via Prisma ORM
6. **Response**: Type-safe response back through the chain

### Example: Subscription Creation Flow

```typescript
// 1. Client-side interaction
const createSubscription = trpc.subscriptions.create.useMutation();

const handleSubmit = (data: SubscriptionFormData) => {
  createSubscription.mutate(data, {
    onSuccess: () => {
      // Refresh data
      utils.subscriptions.getAll.invalidate();
    },
  });
};

// 2. Server-side handling
export const subscriptionsRouter = router({
  create: publicProcedure
    .input(subscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      // 3. Database operation
      const subscription = await ctx.prisma.subscription.create({
        data: {
          ...input,
          userId: ctx.user.id,
        },
      });

      // 4. Additional business logic
      await scheduleNextPayment(subscription);

      return subscription;
    }),
});
```

## Type Safety Benefits

### End-to-End Type Safety

```typescript
// Schema definition
const subscriptionSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.enum(['MONTHLY', 'YEARLY']),
});

// Prisma model (generates types)
model Subscription {
  id        String   @id @default(cuid())
  name      String
  amount    Float
  frequency Frequency
  createdAt DateTime @default(now())
}

// tRPC procedure (infers types)
create: publicProcedure
  .input(subscriptionSchema)
  .mutation(async ({ input }) => {
    // input is fully typed
    return prisma.subscription.create({ data: input });
  }),

// Client usage (fully typed)
const { data: subscriptions } = trpc.subscriptions.getAll.useQuery();
// subscriptions is typed as Subscription[]
```

## Environment Configuration

### Database Configuration

```env
# .env
DATABASE_URL="postgresql://username:password@localhost:5432/subpilot"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-secret"
```

### Next.js Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['images.unsplash.com'],
  },
};

module.exports = nextConfig;
```

## Development Workflow

### 1. Schema Changes

```bash
# Update Prisma schema
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### 2. Type Generation

```bash
# tRPC types are automatically generated
# Prisma types are generated on prisma generate
# No additional type generation needed
```

### 3. Testing Integration

```typescript
// Integration test example
import { createCaller } from '../server/routers/_app';
import { createContextInner } from '../server/context';

test('create subscription', async () => {
  const ctx = await createContextInner({});
  const caller = createCaller(ctx);

  const subscription = await caller.subscriptions.create({
    name: 'Netflix',
    amount: 15.99,
    frequency: 'MONTHLY',
    nextPayment: new Date(),
  });

  expect(subscription.name).toBe('Netflix');
});
```

## Performance Optimizations

### 1. React Query Integration

```typescript
// Optimistic updates
const utils = trpc.useContext();

const updateSubscription = trpc.subscriptions.update.useMutation({
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await utils.subscriptions.getAll.cancel();

    // Snapshot previous value
    const previousData = utils.subscriptions.getAll.getData();

    // Optimistically update
    utils.subscriptions.getAll.setData(undefined, (old) =>
      old?.map((sub) =>
        sub.id === newData.id ? { ...sub, ...newData } : sub
      )
    );

    return { previousData };
  },
});
```

### 2. Database Query Optimization

```typescript
// Efficient queries with Prisma
export const subscriptionsRouter = router({
  getDashboard: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.subscription.findMany({
      where: { userId: ctx.user.id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { nextPayment: 'asc' },
      take: 10,
    });
  }),
});
```

## Security Considerations

### 1. Input Validation

```typescript
// Always validate inputs with Zod
const createSubscriptionSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive().max(10000),
  frequency: z.enum(['MONTHLY', 'YEARLY']),
});
```

### 2. Authorization

```typescript
// Protect procedures with middleware
const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
```

## Best Practices

1. **Type Safety**: Always use Zod schemas for input validation
2. **Error Handling**: Implement proper error boundaries and tRPC error handling
3. **Performance**: Use React Query features like caching and optimistic updates
4. **Security**: Always validate and authorize requests
5. **Testing**: Write integration tests that cover the full stack
6. **Code Organization**: Separate concerns (routers, schemas, components)

This integration creates a robust, type-safe foundation for building financial applications like SubPilot.
