# Deferred Implementation Items

**Created**: June 21, 2025 07:15 AM EDT
**Last Updated**: June 21, 2025 07:30 AM EDT
**Purpose**: Track all TODO items, disabled features, and deferred implementations that need to be completed

## Overview

This document captures all functionality that was stubbed out, marked as TODO, or temporarily disabled during the rapid development session. These items need to be implemented to achieve full functionality.

## Authentication & Session Management

### Session Token Access

**Location**: `src/server/api/routers/auth.ts`

- **Lines**: 128, 154-158
- **Issue**: Auth.js v5 doesn't expose sessionToken in client-side session
- **TODO**: Implement proper current session detection
- **Impact**: Cannot identify current session in active sessions list
- **Workaround**: All sessions show as not current
- **Related Test Issue**: `src/server/api/routers/__tests__/auth.test.ts:175`

```typescript
// TODO: Implement current session detection
isCurrent: false, // Line 128

// TODO: Implement check to prevent revoking current session
// For now, allow all revocations (Lines 154-158)
```

**Test Files Affected**:

- Test expects `isCurrent` to be implemented for proper session detection
- Current workaround: All test sessions marked as not current

## Plaid Integration

### Link Token Creation

**Location**: `src/server/api/routers/plaid.ts`

- **Line**: 17
- **TODO**: Implement Plaid Link token creation in Week 2
- **Status**: Returns mock token in development only

### Public Token Exchange

**Location**: `src/server/api/routers/plaid.ts`

- **Line**: 58
- **TODO**: Implement public token exchange in Week 2
- **Status**: Throws NOT_IMPLEMENTED error

### Transaction Sync

**Location**: `src/server/api/routers/plaid.ts`

- **Line**: 118
- **TODO**: Implement transaction sync in Week 2
- **Status**: Throws NOT_IMPLEMENTED error

### Institution Logos

**Location**: `src/server/api/routers/plaid.ts`

- **Line**: 96
- **TODO**: Add institution logos for bank display
- **Status**: Returns null for all institution logos
- **Impact**: Bank connection cards show no institution branding

```typescript
logo: null, // TODO: Add institution logos
```

### Webhook Processing

**Location**: `src/server/api/routers/plaid.ts`

- **Line**: 141
- **TODO**: Implement webhook processing in Week 2
- **Status**: Returns success without processing

## Transaction Processing

### Category Filtering

**Location**: `src/server/api/routers/transactions.ts`

- **Lines**: 48-51
- **TODO**: Implement category filtering for JSON array field
- **Issue**: Prisma doesn't support JSON array contains queries easily
- **Impact**: Category filter parameter is ignored

```typescript
if (input.category) {
  // TODO: Implement category filtering for JSON array field
  // For now, skip category filtering
}
```

### Last Transaction Update

**Location**: `src/server/api/routers/transactions.ts`

- **Lines**: 207-208
- **TODO**: Update subscription's last billing date
- **Issue**: Subscription model doesn't have lastTransaction field
- **Suggestion**: Add lastBilling field or use transaction history

```typescript
// TODO: Update subscription's last billing date
// This would require adding a lastBilling field or using transaction history
```

## Subscription Management

### Last Transaction Tracking

**Location**: `src/server/api/routers/subscriptions.ts`

- **Line**: 83
- **TODO**: Implement last transaction lookup
- **Status**: Returns null
- **Impact**: Cannot show last transaction date in subscription list

```typescript
lastTransaction: null, // TODO: Implement last transaction lookup
```

### Subscription Cancellation Notifications

**Location**: `src/server/api/routers/subscriptions.ts`

- **Line**: 239
- **TODO**: Create notification for cancelled subscription
- **Status**: No notification sent when subscription is cancelled
- **Impact**: Users don't receive confirmation of cancellation actions

```typescript
// TODO: Create notification for cancelled subscription
```

### Provider Information

**Location**: Multiple router files

- **Issue**: Provider field is JSON, not a relation
- **Status**: Type-safe access implemented but data structure needs definition
- **TODO**: Define proper provider data structure

## Analytics & Reporting

### Data Export Implementation

**Location**: `src/server/api/routers/analytics.ts`

- **Lines**: 390-473
- **Status**: Returns data structure but no actual export functionality
- **TODO**: Implement actual CSV/JSON file generation and download

## Testing Infrastructure

### Test Fixtures

**Location**: `src/server/api/routers/__tests__/`

- **Status**: Test infrastructure set up but tests need implementation
- **TODO**: Write comprehensive test suites for all routers

### Mock Implementations

**Location**: Various test files

- **Status**: Basic mocks created but need expansion
- **TODO**: Create realistic mock data generators

## UI Components

### Provider Logos

**Location**: `src/components/subscription-card.tsx`

- **Line**: 77
- **Status**: Using img tag with ESLint disable
- **TODO**: Implement proper image optimization or use Image component
- **Note**: Next.js Image component had compatibility issues

### Profile Form API Integration

**Location**: `src/components/profile/profile-form.tsx`

- **Line**: 28
- **TODO**: Implement profile update API endpoint
- **Status**: Form exists but API integration not implemented
- **Impact**: Profile updates may not persist properly

```typescript
// TODO: Implement profile update API endpoint
```

### Email Field Modification

**Location**: `src/components/profile/profile-form.tsx`

- **Line**: 86
- **TODO**: Implement email change functionality
- **Status**: Email field is currently disabled
- **Impact**: Users cannot update their email address

```typescript
disabled // Email cannot be changed for now
```

## Database Schema Enhancements

### Suggested Schema Additions

1. **Subscription.lastBilling**: Track last billing date
2. **User.currentSessionToken**: Enable current session detection
3. **Transaction.enrichedData**: Store additional Plaid data
4. **NotificationPreference**: Consider separate table vs JSON

## Security & Authentication Features

### Two-Factor Authentication

**Location**: `src/app/settings/page.tsx`

- **Line**: 143
- **Status**: Currently disabled with placeholder text
- **TODO**: Implement 2FA functionality
- **Impact**: Users cannot enable two-factor authentication for enhanced security

```typescript
<p className="text-sm text-gray-500">Two-factor authentication is currently disabled</p>
```

### Rate Limiting

**Location**: `src/server/api/middleware/security.ts`

- **Status**: Basic implementation
- **TODO**: Add Redis-based rate limiting for production
- **TODO**: Implement user-specific rate limits

### CSRF Protection

**Location**: `src/server/api/middleware/security.ts`

- **Status**: Basic implementation
- **TODO**: Add proper CSRF token generation and validation

## Performance Optimizations

### Database Queries

- **TODO**: Add pagination cursors for large datasets
- **TODO**: Implement query result caching
- **TODO**: Add database indexes for common queries

### API Response Caching

- **TODO**: Implement response caching for analytics endpoints
- **TODO**: Add ETags for conditional requests

## Notification System

### Email Notifications

**Location**: `src/server/api/routers/notifications.ts`

- **Status**: Database structure ready
- **TODO**: Implement actual email sending
- **TODO**: Create notification templates
- **TODO**: Add notification scheduling

### Push Notifications

**Location**: Various notification endpoints

- **Status**: Placeholder in preferences
- **TODO**: Implement web push notifications
- **TODO**: Add mobile push support

## Environment-Specific Items

### Production OAuth

- **TODO**: Create production Google OAuth application
- **TODO**: Create production GitHub OAuth application
- **TODO**: Update redirect URLs for production domain

### Production Email

- **TODO**: Configure SendGrid for production
- **TODO**: Create email templates in SendGrid
- **TODO**: Set up email authentication (SPF, DKIM)

## Code Quality & Development Tools

### ESLint Suppressions

**Multiple Locations**: Various files contain ESLint rule suppressions

- **Test Setup**: `src/test/setup.ts` - Multiple suppressions for test environment compatibility
- **UI Components**: Several components use `eslint-disable` for Next.js image optimization
- **Impact**: Some type safety and code quality checks are bypassed
- **TODO**: Review and minimize ESLint suppressions where possible

**Specific Suppressions**:

- `@typescript-eslint/no-explicit-any` in test files
- `@next/next/no-img-element` for image optimization workarounds
- `@typescript-eslint/no-empty-object-type` for type definitions

### Test Infrastructure Improvements

**Location**: `src/server/api/routers/__tests__/`

- **TODO**: Remove dependency on mock implementations for core functionality
- **TODO**: Add proper type definitions for test fixtures
- **TODO**: Implement test database seeding for integration tests
- **TODO**: Add performance benchmarks for API endpoints

## Migration Scripts

### Data Migration

- **TODO**: Create script to migrate from mock to real Plaid data
- **TODO**: Create subscription detection training data
- **TODO**: Build historical data import tools

## Documentation

### API Documentation

- **TODO**: Generate OpenAPI specification from tRPC
- **TODO**: Create API usage examples
- **TODO**: Document webhook payloads

### User Documentation

- **TODO**: Create user guide for bank connections
- **TODO**: Write FAQ for common issues
- **TODO**: Build help center content

## Future Enhancements

### Machine Learning

- **TODO**: Implement ML-based subscription detection
- **TODO**: Add spending prediction algorithms
- **TODO**: Create anomaly detection for unusual charges

### Integrations

- **TODO**: Add more bank connection providers
- **TODO**: Implement subscription service APIs
- **TODO**: Add expense tracking integrations

## Priority Matrix

### High Priority (Week 2)

1. All Plaid integration TODOs
2. Transaction sync implementation
3. Subscription detection algorithm
4. Category filtering fix

### Medium Priority (Week 3)

1. Last transaction tracking
2. Email notification sending
3. Current session detection
4. Provider data structure

### Low Priority (Week 4+)

1. Performance optimizations
2. Advanced analytics
3. ML implementations
4. Additional integrations

## Notes

- Most TODOs are marked with clear comments in the code
- Search for "TODO:" to find all instances (currently 12+ active TODOs)
- Many features return mock data or null as placeholders
- All NOT_IMPLEMENTED errors need to be resolved
- Type safety is maintained even for unimplemented features
- CI/CD fixes completed - TypeScript compilation now clean
- Some ESLint suppressions remain for compatibility reasons

## Recent Changes (2025-06-21 07:30 AM)

### Added During CI/CD Fix Session

- **Test Infrastructure**: Fixed Session type compatibility in auth tests
- **Code Quality**: Resolved nullish coalescing and unused variable warnings
- **Type Safety**: Improved mock data structure alignment with actual schemas

### Newly Identified TODOs

1. Institution logos for bank connections
2. Subscription cancellation notifications
3. Profile form API integration
4. Email field modification capabilities
5. Two-factor authentication implementation

---

*This document should be updated as TODOs are completed or new ones are discovered*
*Last comprehensive update: 2025-06-21 07:30 AM EDT*
