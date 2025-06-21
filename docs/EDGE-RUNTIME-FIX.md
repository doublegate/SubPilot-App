# Edge Runtime Compatibility Fix

**Date**: 2025-06-21  
**Issue**: Nodemailer incompatibility with Next.js Edge Runtime in middleware  
**Resolution**: Refactored middleware to use Edge-compatible authentication check  

## Problem Description

When running the application with `npm run dev`, the following error occurred:

```
Error: The edge runtime does not support Node.js 'stream' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime
```

### Root Cause

The middleware was importing the full Auth.js configuration which included:
1. Nodemailer for email sending functionality
2. Prisma adapter with database connections
3. Other Node.js-specific modules

These dependencies are not compatible with the Edge Runtime that Next.js uses for middleware execution.

## Solution Implementation

### 1. Created Edge-Compatible Auth Check

Created a new file `src/server/auth-edge.ts` that provides a lightweight authentication check using only Edge-compatible APIs:

```typescript
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function getAuthForEdge(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    return {
      auth: token ? { user: { id: token.sub, email: token.email as string } } : null,
    };
  } catch (error) {
    console.error("Error checking auth in edge:", error);
    return { auth: null };
  }
}
```

### 2. Updated Middleware

Modified `src/middleware.ts` to:
- Remove the Auth.js auth wrapper function
- Use the new Edge-compatible auth check
- Convert to standard async middleware function

**Before:**
```typescript
import { auth } from "@/server/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  // ... rest of logic
})
```

**After:**
```typescript
import { getAuthForEdge } from "@/server/auth-edge"

export async function middleware(req: NextRequest) {
  const { auth } = await getAuthForEdge(req)
  const isLoggedIn = !!auth
  // ... rest of logic
}
```

## Technical Details

### Edge Runtime Limitations

The Edge Runtime has the following restrictions:
- No native Node.js APIs (fs, stream, crypto, etc.)
- Limited to Web Standard APIs
- No access to Node modules that use native APIs
- Must use ES Modules

### Compatible APIs in Edge Runtime

- Fetch API
- Web Crypto API
- TextEncoder/TextDecoder
- URL and URLSearchParams
- Headers, Request, Response
- Next.js specific: `next-auth/jwt` for token handling

## Testing & Verification

1. **Build Test**: `npm run build:ci` - Successful compilation
2. **Dev Server**: Application runs without Edge Runtime errors
3. **Middleware Functionality**: Route protection still works correctly
4. **Authentication Flow**: Users can still sign in/out normally

## Impact & Benefits

1. **Performance**: Middleware runs faster in Edge Runtime
2. **Scalability**: Edge Runtime can run globally at edge locations
3. **Compatibility**: Works with Vercel Edge Functions and other edge deployments
4. **Separation of Concerns**: Clear separation between edge and server code

## Best Practices for Future Development

1. **Keep Middleware Lightweight**: Only include essential checks
2. **Avoid Node.js Dependencies**: Use Web Standard APIs when possible
3. **Separate Edge and Server Code**: Create Edge-specific versions when needed
4. **Test Edge Compatibility**: Use `next build` to catch issues early

## Related Files

- `/src/server/auth-edge.ts` - Edge-compatible auth utilities
- `/src/middleware.ts` - Updated middleware implementation
- `/src/server/auth.config.ts` - Full auth configuration (server-only)
- `/src/lib/email.ts` - Email functionality (server-only)

## References

- [Next.js Edge Runtime Documentation](https://nextjs.org/docs/pages/api-reference/edge)
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Auth.js Edge Compatibility](https://authjs.dev/guides/edge-compatibility)