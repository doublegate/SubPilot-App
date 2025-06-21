# SubPilot Implementation Guide

## Getting Started

This guide provides step-by-step instructions for setting up and implementing the SubPilot tech stack from scratch.

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database
- Git
- VS Code (recommended) with extensions:
  - Prisma
  - TypeScript
  - Tailwind CSS IntelliSense

## Project Setup

### 1. Initialize Next.js Project

```bash
# Create new Next.js project with TypeScript
npx create-next-app@latest subpilot-app --typescript --tailwind --eslint --app

cd subpilot-app
```

### 2. Install Core Dependencies

```bash
# Core stack dependencies
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next
npm install @tanstack/react-query@4 zod
npm install @prisma/client prisma
npm install @radix-ui/themes @radix-ui/react-accordion @radix-ui/react-alert-dialog
npm install @radix-ui/react-avatar @radix-ui/react-button @radix-ui/react-calendar
npm install @radix-ui/react-card @radix-ui/react-checkbox @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu @radix-ui/react-form @radix-ui/react-icons
npm install @radix-ui/react-input @radix-ui/react-label @radix-ui/react-popover
npm install @radix-ui/react-progress @radix-ui/react-select @radix-ui/react-separator
npm install @radix-ui/react-sheet @radix-ui/react-slot @radix-ui/react-switch
npm install @radix-ui/react-table @radix-ui/react-tabs @radix-ui/react-toast
npm install @radix-ui/react-toggle @radix-ui/react-tooltip

# Authentication
npm install next-auth @auth/prisma-adapter

# Form handling
npm install react-hook-form @hookform/resolvers

# Additional utilities
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react date-fns
npm install superjson

# Development dependencies
npm install -D @types/node typescript
npm install -D prisma
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

## Database Setup

### 1. Initialize Prisma

```bash
npx prisma init
```

### 2. Configure Database Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  subscriptions Subscription[]
  transactions  Transaction[]
  budgets       Budget[]
  
  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verificationtokens")
}

model Subscription {
  id              String              @id @default(cuid())
  name            String
  description     String?
  amount          Float
  currency        String              @default("USD")
  frequency       SubscriptionFrequency
  category        String?
  nextPayment     DateTime
  isActive        Boolean             @default(true)
  userId          String
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  @@map("subscriptions")
}

model Transaction {
  id             String          @id @default(cuid())
  amount         Float
  currency       String          @default("USD")
  description    String?
  category       String?
  type           TransactionType
  date           DateTime
  userId         String
  subscriptionId String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription Subscription? @relation(fields: [subscriptionId], references: [id])

  @@map("transactions")
}

model Budget {
  id       String @id @default(cuid())
  name     String
  amount   Float
  currency String @default("USD")
  category String
  period   BudgetPeriod
  userId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("budgets")
}

enum SubscriptionFrequency {
  WEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
}

enum TransactionType {
  INCOME
  EXPENSE
  SUBSCRIPTION
}

enum BudgetPeriod {
  WEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
}
```

### 3. Environment Configuration

```env
# .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/subpilot"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Plaid API (for banking integration)
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-secret"
PLAID_ENV="sandbox" # sandbox, development, or production
```

### 4. Run Database Migration

```bash
npx prisma db push
npx prisma generate
```

## tRPC Configuration

### 1. Create Prisma Client Instance

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 2. Setup tRPC Context

```typescript
// src/server/context.ts
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]';
import { prisma } from '../lib/prisma';

export const createContext = async (opts: CreateNextContextOptions) => {
  const session = await getServerSession(opts.req, opts.res, authOptions);

  return {
    prisma,
    session,
    user: session?.user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
```

### 3. Initialize tRPC

```typescript
// src/server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure for authenticated users
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.user },
    },
  });
});
```

### 4. Create API Routers

```typescript
// src/server/routers/subscriptions.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

const subscriptionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  amount: z.number().positive(),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  category: z.string().optional(),
  nextPayment: z.date(),
});

export const subscriptionsRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.subscription.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { nextPayment: 'asc' },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const subscription = await ctx.prisma.subscription.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          transactions: {
            orderBy: { date: 'desc' },
            take: 5,
          },
        },
      });

      if (!subscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Subscription not found',
        });
      }

      return subscription;
    }),

  create: protectedProcedure
    .input(subscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.subscription.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: subscriptionSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.subscription.update({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        data: input.data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.subscription.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });
    }),
});
```

### 5. Main App Router

```typescript
// src/server/routers/_app.ts
import { router } from '../trpc';
import { subscriptionsRouter } from './subscriptions';
import { transactionsRouter } from './transactions';
import { budgetsRouter } from './budgets';

export const appRouter = router({
  subscriptions: subscriptionsRouter,
  transactions: transactionsRouter,
  budgets: budgetsRouter,
});

export type AppRouter = typeof appRouter;
```

### 6. Next.js API Handler

```typescript
// src/pages/api/trpc/[trpc].ts
import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '../../../server/routers/_app';
import { createContext } from '../../../server/context';

export default createNextApiHandler({
  router: appRouter,
  createContext,
});
```

## Client-Side Configuration

### 1. tRPC Client Setup

```typescript
// src/utils/trpc.ts
import { createTRPCNext } from '@trpc/next';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/routers/_app';
import superjson from 'superjson';

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    };
  },
  ssr: false,
});
```

### 2. Root Layout with Providers

```typescript
// src/app/layout.tsx
import { Inter } from 'next/font/google';
import { Theme } from '@radix-ui/themes';
import { Providers } from './providers';
import '@radix-ui/themes/styles.css';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SubPilot - Your Subscription Command Center',
  description: 'Manage your recurring finances with ease',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Theme
          accentColor="blue"
          grayColor="gray"
          radius="medium"
          scaling="100%"
        >
          <Providers>{children}</Providers>
        </Theme>
      </body>
    </html>
  );
}
```

### 3. Providers Component

```typescript
// src/app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { trpc } from '../utils/trpc';

interface ProvidersProps {
  children: React.ReactNode;
}

function ProvidersInner({ children }: ProvidersProps) {
  return <SessionProvider>{children}</SessionProvider>;
}

export const Providers = trpc.withTRPC(ProvidersInner);
```

## Authentication Setup

### 1. NextAuth Configuration

```typescript
// src/pages/api/auth/[...nextauth].ts
import NextAuth, { type NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '../../../lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
};

export default NextAuth(authOptions);
```

## UI Components Setup

### 1. Component Library Structure

```typescript
// src/components/ui/button.tsx
import * as React from 'react';
import { Button as RadixButton } from '@radix-ui/themes';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <RadixButton
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```

### 2. Form Components

```typescript
// src/components/ui/form.tsx
import * as React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Text } from '@radix-ui/themes';
import { cn } from '../../utils/cn';

const Form = React.forwardRef<
  HTMLFormElement,
  React.HTMLAttributes<HTMLFormElement>
>(({ className, ...props }, ref) => {
  return <form ref={ref} className={cn('space-y-6', className)} {...props} />;
});

const FormField = ({
  name,
  render,
}: {
  name: string;
  render: ({ field }: { field: any }) => React.ReactElement;
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => render({ field })}
    />
  );
};

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn('space-y-2', className)} {...props} />;
});

const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  return (
    <Text
      asChild
      size="2"
      weight="medium"
      className={cn('text-sm font-medium leading-none', className)}
    >
      <label ref={ref} {...props} />
    </Text>
  );
});

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <Text
      asChild
      size="1"
      color="red"
      className={cn('text-sm text-destructive', className)}
    >
      <p ref={ref} {...props}>
        {children}
      </p>
    </Text>
  );
});

export { Form, FormField, FormItem, FormLabel, FormMessage };
```

## Development Scripts

### 1. Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

### 2. Development Database Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });

  // Create sample subscriptions
  await prisma.subscription.createMany({
    data: [
      {
        name: 'Netflix',
        description: 'Video streaming service',
        amount: 15.99,
        frequency: 'MONTHLY',
        category: 'Entertainment',
        nextPayment: new Date('2024-02-01'),
        userId: user.id,
      },
      {
        name: 'Spotify',
        description: 'Music streaming service',
        amount: 9.99,
        frequency: 'MONTHLY',
        category: 'Entertainment',
        nextPayment: new Date('2024-02-05'),
        userId: user.id,
      },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## Verification Steps

### 1. Check Setup

```bash
# Start development server
npm run dev

# In another terminal, check database
npx prisma studio

# Run type checking
npm run type-check

# Seed database
npm run db:seed
```

### 2. Test API

```bash
# Test tRPC endpoint
curl http://localhost:3000/api/trpc/subscriptions.getAll
```

### 3. Verify Components

Create a simple test page to verify everything is working:

```typescript
// src/app/test/page.tsx
'use client';

import { Button } from '@radix-ui/themes';
import { trpc } from '../../utils/trpc';

export default function TestPage() {
  const { data: subscriptions, isLoading } = trpc.subscriptions.getAll.useQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">SubPilot Test</h1>
      <Button onClick={() => alert('Working!')}>
        Test Button
      </Button>
      
      <div className="mt-4">
        <h2 className="text-lg font-semibold">Subscriptions:</h2>
        <pre>{JSON.stringify(subscriptions, null, 2)}</pre>
      </div>
    </div>
  );
}
```

## Next Steps

1. **Set up authentication providers** (GitHub, Google)
2. **Configure Plaid integration** for banking data
3. **Implement subscription tracking logic**
4. **Add email notifications** for upcoming payments
5. **Set up deployment** (Vercel, Railway, etc.)
6. **Add testing setup** (Jest, React Testing Library)
7. **Configure CI/CD** pipeline

This implementation provides a solid foundation for building SubPilot with modern, type-safe technologies.
