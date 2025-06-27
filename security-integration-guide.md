# Security Integration Guide for SubPilot v1.0.0

This guide shows how to integrate the new security features into your existing codebase.

## 1. Update Authentication with Account Lockout

### Update auth.config.ts

```typescript
import { trackFailedAuth, isAccountLocked, clearFailedAuth } from '@/server/lib/rate-limiter';
import { AuditLogger } from '@/server/lib/audit-logger';

// In the credentials provider authorize function:
async authorize(credentials, req) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  const email = credentials.email as string;
  
  // Check if account is locked
  const lockStatus = await isAccountLocked(email);
  if (lockStatus.locked) {
    await AuditLogger.logAuthFailure(email, req.ip, req.headers['user-agent'], 'Account locked');
    throw new Error(`Account locked until ${lockStatus.until?.toLocaleTimeString()}`);
  }

  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user?.password) {
    await trackFailedAuth(email);
    await AuditLogger.logAuthFailure(email, req.ip, req.headers['user-agent'], 'User not found');
    return null;
  }

  const isPasswordValid = await compare(
    credentials.password as string,
    user.password
  );

  if (!isPasswordValid) {
    const { locked, lockUntil } = await trackFailedAuth(email);
    await AuditLogger.logAuthFailure(email, req.ip, req.headers['user-agent'], 'Invalid password');
    
    if (locked) {
      await AuditLogger.logAccountLockout(user.id, 'Too many failed attempts');
      throw new Error(`Account locked until ${lockUntil?.toLocaleTimeString()}`);
    }
    
    return null;
  }

  // Clear failed attempts on successful login
  await clearFailedAuth(email);
  await AuditLogger.logAuth(user.id, req.ip, req.headers['user-agent']);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}
```

## 2. Add Error Boundaries to Key Components

### Wrap Dashboard Layout

```typescript
// src/app/(dashboard)/layout.tsx
import { ErrorBoundary } from '@/components/error-boundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </ErrorBoundary>
  );
}
```

### Wrap Individual Components

```typescript
// src/app/(dashboard)/subscriptions/page.tsx
import { ErrorBoundary } from '@/components/error-boundary';

export default function SubscriptionsPage() {
  return (
    <ErrorBoundary 
      fallback={(error, reset) => (
        <div className="p-8">
          <h2>Error loading subscriptions</h2>
          <p>{error.message}</p>
          <button onClick={reset}>Retry</button>
        </div>
      )}
    >
      <SubscriptionsList />
    </ErrorBoundary>
  );
}
```

## 3. Implement Request Signing for Sensitive Operations

### Account Deletion with Request Signing

```typescript
// src/server/api/routers/auth.ts
import { WebhookSecurity } from '@/server/lib/webhook-security';

deleteAccount: protectedProcedure
  .input(
    z.object({
      confirmationEmail: z.string().email(),
      signature: z.string(),
      timestamp: z.number(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Verify request signature
    const payload = { 
      userId: ctx.session.user.id, 
      email: input.confirmationEmail 
    };
    
    const isValid = WebhookSecurity.verifyRequestSignature(
      payload,
      input.signature,
      input.timestamp
    );
    
    if (!isValid) {
      await AuditLogger.log({
        userId: ctx.session.user.id,
        action: 'user.delete',
        result: 'failure',
        error: 'Invalid signature',
      });
      
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Invalid request signature',
      });
    }

    // Proceed with deletion...
  });
```

## 4. Update Plaid Webhook Handler

```typescript
// src/app/api/webhooks/plaid/route.ts
import { WebhookSecurity } from '@/server/lib/webhook-security';
import { AuditLogger } from '@/server/lib/audit-logger';

export async function POST(req: Request) {
  const body = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  // Verify webhook signature
  const isValid = WebhookSecurity.verifyPlaidWebhook(body, headers);
  if (!isValid) {
    await AuditLogger.log({
      action: 'security.suspicious_activity',
      resource: 'plaid-webhook',
      ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'],
      result: 'failure',
      error: 'Invalid webhook signature',
    });
    
    return new Response('Unauthorized', { status: 401 });
  }

  const webhook = JSON.parse(body);
  
  // Process webhook...
}
```

## 5. Use Error Toast Hook in Components

```typescript
// src/components/subscriptions/cancel-dialog.tsx
import { useErrorToast } from '@/hooks/use-error-toast';

export function CancelSubscriptionDialog({ subscription }: Props) {
  const { showError, showSuccess } = useErrorToast();
  const cancelMutation = api.subscriptions.cancel.useMutation();

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ id: subscription.id });
      showSuccess('Subscription cancelled successfully');
    } catch (error) {
      showError(error, {
        title: 'Failed to cancel subscription',
        fallbackMessage: 'Please try again or contact support',
      });
    }
  };

  return (
    // Dialog UI...
  );
}
```

## 6. Environment Variables to Add

```env
# Security Keys (generate with: openssl rand -base64 32)
ENCRYPTION_KEY="your-32-char-minimum-encryption-key-here"
API_SECRET="your-32-char-minimum-api-secret-here"
PLAID_WEBHOOK_SECRET="your-plaid-webhook-secret"

# Redis (for production rate limiting)
REDIS_URL="redis://localhost:6379"

# Enable rate limiting in development
ENABLE_RATE_LIMIT="true"
```

## 7. Database Schema Updates Needed

Add to your Prisma schema:

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  action     String
  resource   String?
  ipAddress  String?
  userAgent  String?
  result     String
  metadata   Json?
  error      String?
  timestamp  DateTime @default(now())
  
  user       User?    @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([action])
  @@index([timestamp])
}

model User {
  // ... existing fields
  
  // Add for account lockout
  failedLoginAttempts Int      @default(0)
  lockedUntil         DateTime?
  
  // Add for audit logs
  auditLogs           AuditLog[]
}
```

## 8. Testing Security Features

### Test Rate Limiting

```bash
# Test rate limiting (adjust the URL to your local dev server)
for i in {1..150}; do
  curl -X POST http://localhost:3000/api/trpc/auth.getUser \
    -H "Content-Type: application/json" \
    -w "\nStatus: %{http_code}\n"
done
```

### Test Account Lockout

```typescript
// Create a test that attempts multiple failed logins
test('should lock account after 5 failed attempts', async () => {
  for (let i = 0; i < 5; i++) {
    await signIn('credentials', {
      email: 'test@example.com',
      password: 'wrong-password',
      redirect: false,
    });
  }
  
  const result = await signIn('credentials', {
    email: 'test@example.com',
    password: 'correct-password',
    redirect: false,
  });
  
  expect(result?.error).toContain('Account locked');
});
```

## 9. Monitoring & Alerts

Set up monitoring for security events:

```typescript
// Example: Check for suspicious activity
const suspiciousActivity = await AuditLogger.query({
  action: 'auth.failed',
  startDate: new Date(Date.now() - 3600000), // Last hour
  result: 'failure',
});

if (suspiciousActivity.length > 20) {
  // Send alert to security team
}
```

## Implementation Checklist

- [ ] Add ENCRYPTION_KEY to production environment
- [ ] Add API_SECRET to production environment  
- [ ] Set up Redis for production rate limiting
- [ ] Update Prisma schema with AuditLog model
- [ ] Run database migration
- [ ] Update auth configuration with lockout logic
- [ ] Add error boundaries to key components
- [ ] Implement request signing for account deletion
- [ ] Add webhook signature verification
- [ ] Update all API error responses to use standardized format
- [ ] Configure Sentry or similar error tracking
- [ ] Set up security event monitoring dashboard
- [ ] Test all security features thoroughly
- [ ] Document security procedures for team

## Security Best Practices Reminder

1. **Never log sensitive data** - Audit logs should never contain passwords, tokens, or PII
2. **Fail securely** - Always fail closed, not open
3. **Defense in depth** - Layer multiple security measures
4. **Regular audits** - Review audit logs weekly
5. **Incident response** - Have a plan for security incidents
6. **Keep dependencies updated** - Regular security updates
7. **Penetration testing** - Before major releases

This completes the security hardening for SubPilot v1.0.0. With these implementations, the application will have enterprise-grade security suitable for handling sensitive financial data.
