# SubPilot - Project Documentation for Claude

## 🎯 Project Overview

SubPilot is a modern subscription management platform built with the T3 Stack. It helps users monitor, manage, and cancel recurring subscriptions by automatically detecting them from bank transactions.

**Current Status**: Phase 2 Complete ✅ (AI & Analytics) - v1.1.0+ with CI/CD Excellence
- **Released**: 2025-06-27 11:57 PM EDT (Phase 2) → 2025-06-28 02:40 AM EDT (Workflow Consolidation)
- All Phase 2 features implemented (AI categorization, PWA, predictive analytics)
- 99.5% test coverage (391 tests passing)
- Zero ESLint/TypeScript errors
- Performance: 95/100 Lighthouse score
- Live at: https://subpilot-test.vercel.app
- GitHub Release: https://github.com/doublegate/SubPilot-App/releases/tag/v1.1.0

## 🏗️ Architecture Overview

### Tech Stack (T3 Stack)

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: tRPC for type-safe APIs
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: Auth.js (NextAuth v5) with OAuth + Magic Links
- **Bank Integration**: Plaid API for transaction data
- **Deployment**: Vercel (app) + Neon PostgreSQL (database)

### Key Design Principles

- **Type Safety**: End-to-end TypeScript with tRPC
- **Server Components**: Default to server components, client components only when needed
- **Security First**: Encrypted tokens, HTTPS only, CSRF protection
- **Responsive Design**: Mobile-first with Tailwind CSS

## 📁 Project Structure

```ascii
subpilot-app/
├── docs/                   # Active documentation
├── ref_docs/              # Reference documentation
├── archive/               # Historical documentation
│   ├── phase-1-completion/  # Phase 1 completed docs
│   └── memory/            # Project memory archives
├── to-dos/                # Task tracking (phase-based)
├── src/
│   ├── app/               # Next.js App Router (fully implemented)
│   ├── components/        # React components (20+ components)
│   ├── server/           # Backend code
│   │   ├── api/          # tRPC routers (6 routers with 35+ endpoints)
│   │   ├── auth.ts       # Auth.js configuration
│   │   └── db.ts         # Prisma client
│   └── env.js            # Environment validation
├── prisma/
│   └── schema.prisma     # Database schema (comprehensive)
├── css_theme/            # Design system files
└── public/               # Static assets
```

## 💻 Development Commands

### Essential Commands

```bash
# Development
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run dev:all      # Start dev server + Prisma Studio + Mailhog

# Database
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio GUI
npm run db:migrate   # Create and apply migrations
npm run db:seed      # Seed database with test data
npm run db:reset     # Reset database (CAUTION: deletes all data)

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix auto-fixable issues
npm run type-check   # TypeScript compilation check
npm run format       # Format with Prettier
npm run format:check # Check formatting

# Testing
npm run test         # Run unit tests with Vitest
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run Playwright E2E tests
npm run test:coverage # Generate coverage report

# Build & Production
npm run build        # Build for production
npm run start        # Start production server
```

## 🔐 Environment Setup

Create `.env.local` with these required variables:

```env
# Database
DATABASE_URL="postgresql://subpilot:password@localhost:5432/subpilot_dev"

# Auth.js
NEXTAUTH_SECRET="generate-a-secure-random-string"
NEXTAUTH_URL="http://localhost:3000"

# OAuth (optional for development)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Plaid (required for bank integration)
PLAID_CLIENT_ID=""
PLAID_SECRET=""
PLAID_ENV="sandbox"
PLAID_PRODUCTS="transactions,accounts,identity"
PLAID_COUNTRY_CODES="US,CA"

# Email (development)
SMTP_HOST="localhost"
SMTP_PORT="1025"
```

## 🗄️ Database Schema

The database is designed with the following core models:

- **User**: User accounts with notification preferences
- **PlaidItem**: Bank connections via Plaid
- **Account**: Individual bank accounts
- **Transaction**: Financial transactions
- **Subscription**: Detected recurring subscriptions
- **Notification**: User notifications and alerts

Key relationships:

- Users can have multiple bank accounts through PlaidItems
- Transactions are linked to Accounts and potentially to Subscriptions
- Subscriptions track recurring payments with billing history

## 🚀 Implementation Status

### ✅ Phase 1 & 2 Complete - Production Ready
- **Phase 1 MVP**: 100% Complete (v1.0.0)
- **Phase 2 Advanced Features**: 100% Complete (v1.1.0+)
- **Current Focus**: Ready for Phase 3 (Automation)

## 🎨 Design System

### Brand Colors

- **Primary**: Cyan (#06B6D4) - Trust and clarity
- **Accent**: Purple (#9333EA) - Premium and modern
- **Typography**: Inter font family

### UI Components

Using shadcn/ui component library with custom Tailwind theme. Components should follow the established design tokens in `css_theme/`.

## 🔧 Development Guidelines

### Code Style

- Use TypeScript strict mode
- Prefer server components by default
- Use tRPC for all API endpoints
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names

### Git Workflow

- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Use conventional commits: `feat:`, `fix:`, `docs:`, etc.

### Testing Strategy

- Unit tests for business logic
- Integration tests for API routes
- E2E tests for critical user flows
- Maintain good test coverage
- **TypeScript Compilation Excellence**: All mock data must match current Prisma schema, resolve UMD globals with proper imports, fix null assignments with type guards

## 📚 Key Documentation Files

- `docs/README.md` - Main project overview
- `docs/DEVELOPMENT_SETUP.md` - Detailed setup instructions
- `docs/ARCHITECTURE.md` - System design and architecture
- `docs/DATABASE_DESIGN.md` - Database schema details
- `docs/API_REFERENCE.md` - tRPC endpoint documentation
- `ref_docs/subpilot_product_plan.md` - Product roadmap and phases

## 🎯 Development Phases

**Phase 1**: MVP ✅ Complete (v1.0.0)
**Phase 2**: Advanced Features ✅ Complete (v1.1.0+)
**Phase 3**: Automation 📋 Next Focus
**Phase 4**: Launch & Marketing 📋 Future

## ⚠️ Important Notes

1. **Database First**: The Prisma schema is comprehensive and ready. Use it as the source of truth for data models.

2. **Type Safety**: Leverage tRPC and TypeScript for end-to-end type safety. The types should flow from database → API → frontend.

3. **Server Components**: Default to server components. Only use client components for interactivity.

4. **Security**: All sensitive data (Plaid tokens, etc.) must be encrypted. Never expose API keys in client code.

5. **Testing**: Write tests as you implement features. Don't leave testing until the end.

6. **Edge Runtime Compatibility**: Middleware runs in Edge Runtime. Use `auth-edge.ts` for auth checks instead of importing the full auth config. Complex security features (rate limiting, audit logging) must be in API routes, not middleware.

7. **Docker Health Checks**: Use DOCKER_HEALTH_CHECK_MODE=basic for test environments to skip database checks.

8. **CI/CD Best Practices**: Prefer single comprehensive workflows over multiple specialized ones for easier maintenance.


## 📞 External Services

### Plaid (Bank Integration)

- Use sandbox environment for development
- Test credentials available in Plaid dashboard
- Webhook support for real-time updates
- **Important**: Plaid sandbox accounts have NO transactions by default
  - Use `scripts/populate-test-data.ts` to generate test subscriptions
  - Production accounts will have real transaction history

### Email Service

- Mailhog for local development
- SendGrid for production

## 🔍 Debugging Tips

1. **Database Issues**: Check Prisma Studio (`npm run db:studio`)
2. **Type Errors**: Run `npm run type-check`
3. **API Issues**: Check tRPC error messages in browser console
4. **Auth Issues**: Check Auth.js logs and session data
5. **Dashboard Shows Zeros**: Run `npx tsx scripts/debug-dashboard-comprehensive.ts`
6. **Plaid Sandbox**: Use `npx tsx scripts/populate-test-data.ts` to generate test data
7. **Transaction Sync**: Check with `npx tsx scripts/manual-sync-transactions.ts`

## 📝 Repository Information

- **GitHub URL**: <https://github.com/doublegate/SubPilot-App>
- **Visibility**: Public repository
- **License**: MIT License
- **Current Version**: v1.1.0+ (Phase 2 Complete)

## 🛠️ Common Development Tasks

### Before Committing

```bash
npm run lint:fix    # Fix linting issues
npm run format      # Format code
npm run type-check  # Check TypeScript
```

### Database Work

```bash
npm run db:studio   # Visual database editor
npm run db:push     # Push schema changes (dev)
npm run db:migrate  # Create migration (prod)
```

### Running Tests

```bash
npm test            # Run all tests
npm run test:watch  # Watch mode
npm run test:e2e    # E2E tests
```

## 🚀 CI/CD Pipeline

The project has a comprehensive GitHub Actions CI/CD pipeline configured in `.github/workflows/ci.yml` that includes:

### Pipeline Features

- **Code Quality Checks**: ESLint, Prettier, TypeScript validation (non-blocking in dev mode)
- **Security Audit**: npm audit for dependency vulnerabilities
- **Docker Build**: Builds and tests Docker images with health checks
- **Release Management**: Automated GitHub releases for version tags

### Important CI/CD Notes

1. **Build Command**: Use `npm run build:ci` (no-lint build) for CI/CD and Docker builds
2. **Environment Variables**: Set `SKIP_ENV_VALIDATION=true` for build-time to bypass env validation
3. **Docker Configuration**: Uses Next.js standalone output mode for optimized container size
4. **npm Version**: Package.json requires npm >=10.8.0 to match GitHub Actions environment
5. **Health Check**: API health endpoint at `/api/health` for Docker container validation
6. **Vercel Integration**: Connect to GitHub for automatic deployments on main branch

### CI/CD Pipeline Status

- **Workflow**: Single unified `ci-cd-complete.yml`
- **Features**: Code quality checks, security scanning, Docker builds, automated releases
- **Optimizations**: ARM64 builds only for releases, health checks with curl

## 🎯 Key Features

- **Smart Detection**: Automatically identifies subscriptions from bank transactions
- **Bank Integration**: Secure connection via Plaid API
- **Real-time Analytics**: Interactive dashboards and spending insights
- **Email Notifications**: 8 types of alerts for subscription events
- **Theme Support**: Light/Dark/Auto modes with system preference detection
- **Mobile Responsive**: Full functionality on all device sizes
- **Type Safety**: End-to-end TypeScript with tRPC
- **Production Ready**: 99.5% test coverage, zero linting errors

## 🧪 Test Data Best Practices

When writing tests with TypeScript, define individual typed constants instead of using array access:

```typescript
// ❌ Avoid - TypeScript can't guarantee array element exists
const mockAccounts = [...];
const account = mockAccounts[0]; // Type: Account | undefined

// ✅ Preferred - TypeScript knows these constants exist
const mockAccount1: Account = {...};
const mockAccount2: Account = {...};
const mockAccounts: Account[] = [mockAccount1, mockAccount2];
const account = mockAccount1; // Type: Account (guaranteed)
```

This pattern eliminates the need for non-null assertions and improves test maintainability.

### TypeScript Compilation Excellence
- All mock data must match current Prisma schema
- Add missing imports (React, types) to resolve UMD globals
- Null assignment issues resolved with proper type guards
- Aggregate mock results align with expected Prisma types
- ESLint Config: Test files need rule overrides for flexible typing
- TypeScript Fixes: Use 'as any' sparingly for test mock compatibility

## 🏦 Bank Integration Patterns

### Dashboard Debugging Patterns
- **Systematic Data Flow Analysis**: Create comprehensive debugging scripts to analyze full data flow
- **Sandbox Environment Limitations**: Plaid sandbox has no default transactions
- **Test Data Generation**: Generate test data population scripts for development environments
- **Multiple Worktrees**: Use different debugging approaches in parallel
- **Detection Thresholds**: Lower thresholds and widen windows for better results
- **Account ID Mapping**: Fix bugs that prevent data relationships
- **Pipeline Verification**: Always verify data at each step of the pipeline

### Plaid Integration Best Practices
- Use Plaid sandbox environment for safe development testing
- Create comprehensive mock data generators for testing without real accounts
- Implement proper webhook handling for real-time updates
- Store encrypted access tokens with proper key rotation
- Handle token refresh and re-authentication flows gracefully
- Test with multiple account types (checking, savings, credit)

### Subscription Detection Algorithms
- Analyze transaction patterns for merchant name consistency
- Implement amount tolerance (±5%) for variable subscriptions
- Use rolling window analysis (90 days) for pattern detection
- Calculate confidence scores based on multiple factors
- Handle edge cases (annual, quarterly, bi-weekly payments)
- Group related transactions by merchant for better accuracy

## 🎨 UI State Management

### Dashboard UI Patterns
- Implement skeleton loaders for better perceived performance
- Use optimistic updates for user actions
- Handle partial data loading gracefully
- Implement proper error boundaries for fault isolation
- Cache data appropriately with invalidation strategies
- Show meaningful empty states with actionable CTAs

### Theme System Implementation
- **next-themes Integration**: Seamless Light/Dark/Auto mode switching
- **Theme Consistency**: Applied across all pages including Profile and Settings
- **User Preference Persistence**: Theme choice saved in localStorage
- **System Preference Detection**: Auto mode respects OS theme settings
- **No Flash of Unstyled Content**: Proper theme initialization prevents FOUC

### Analytics UI Enhancements
- **Interactive Calendar**: Visual representation of upcoming subscription renewals
- **Hover Tooltips**: Display subscription details on calendar date hover
- **Responsive Design**: Calendar adapts to different screen sizes
- **Overflow Handling**: Proper scrolling for calendars with many renewals

## 🧪 Test Framework Patterns

### Current Testing State
- **Test Coverage**: 99.5% (391 tests passing)
- **Framework**: Vitest + React Testing Library
- **Mocking**: External services properly mocked (Plaid, auth)
- **Organization**: Tests organized by domain

## 🛠️ TypeScript Compilation Patterns

### Systematic Compilation Fixes
- **Prisma Schema Alignment**: Field name consistency across API routers
- **React 19 Compatibility**: JSX syntax requirements
- **Auth.js v5 Structure**: sessionToken not available client-side
- **Nullish Coalescing**: ??= and ?? preferred over || for assignments
- **JSON Field Access**: Type guards for database fields
- **Component Dependencies**: Install all required UI library components
- **Edge Runtime**: Separate auth utilities for middleware compatibility
- **Middleware Restrictions**: No Node.js APIs, no dynamic imports, no Prisma client
- **ESLint Overrides**: Test files need flexible typing rules for mocking

## 🚀 CI/CD Patterns

### Workflow Consolidation
- **Single Comprehensive Workflow**: Consolidated ci.yml and docker-publish.yml into ci-cd-complete.yml
- **Eliminated Duplication**: One workflow handles all CI/CD operations
- **Improved Maintenance**: Easier to manage and update
- **Optimized Performance**: Reduced redundant builds and checks

### Docker Health Check Patterns
- **Test Environment Compatibility**: Use DOCKER_HEALTH_CHECK_MODE=basic for CI/CD
- **Dynamic Tag References**: Extract tags from metadata outputs, not hardcoded SHAs
- **Health Endpoint Flexibility**: Skip database checks in test environments
- **Container Testing**: Always verify health checks pass before pushing

### GitHub Actions Best Practices
- **Lowercase Image Names**: Docker registry requires lowercase (subpilot-app not SubPilot-App)
- **Dynamic Metadata**: Use fromJSON() for accessing build metadata
- **Environment Variables**: Pass critical config to Docker containers
- **Job Dependencies**: Structure for maximum parallelization while maintaining safety

## 📦 Documentation Archives

- **Phase 1 Completion**: `archive/phase-1-completion/`
- **Memory Archives**: `archive/memory/`
- **Session Summaries**: `archive/session/`

Active documentation remains in `docs/` for ongoing development.
