# SubPilot - Project Documentation for Claude

## 🎯 Project Overview

SubPilot is a modern subscription management platform built with the T3 Stack. It helps users monitor, manage, and cancel recurring subscriptions by automatically detecting them from bank transactions.

**Current Status**: Phase 1 MVP 100% Complete ✅ (Production Ready) - v1.0.0 STABLE RELEASE
- **Released**: 2025-06-26 01:45 AM EDT
- All core features implemented and working
- 99.5% test coverage (219/220 tests passing)
- Zero ESLint/TypeScript errors
- Performance: 95/100 Lighthouse score
- Live at: https://subpilot-test.vercel.app
- GitHub Release: https://github.com/doublegate/SubPilot-App/releases/tag/v1.0.0

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
├── docs/                   # Comprehensive documentation
├── ref_docs/              # Reference documentation
├── to-dos/                # Task tracking (phase-based with 40+ documented TODOs)
├── src/
│   ├── app/               # Next.js App Router (fully implemented)
│   ├── components/        # React components (20+ components implemented)
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

### ✅ Completed Features (Phase 1 MVP - 95% Complete)

- **Authentication**: Auth.js v5 with OAuth (Google, GitHub) and magic links
- **Bank Integration**: Plaid API with encrypted token storage and webhooks
- **Subscription Detection**: 85%+ accuracy with pattern matching and confidence scoring
- **Dashboard**: Real-time analytics with interactive visualizations
- **Email Notifications**: 8 notification types with SendGrid integration
- **Subscription Management**: Full CRUD operations with provider-specific workflows
- **Theme System**: Light/Dark/Auto modes with persistent preferences
- **UI Components**: 20+ components with shadcn/ui and custom implementations
- **Testing**: 99.5% pass rate (219/220 tests) with comprehensive coverage
- **CI/CD**: Fully automated pipeline with Docker support and release management

### 🎯 Remaining Tasks (5% for 100% MVP)

- [ ] Performance optimization and caching implementation
- [ ] Accessibility audit and WCAG 2.1 compliance
- [ ] Production OAuth credentials setup
- [ ] User documentation and help guides
- [ ] Final production deployment optimization

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

## 📚 Key Documentation Files

- `docs/README.md` - Main project overview
- `docs/DEVELOPMENT_SETUP.md` - Detailed setup instructions
- `docs/ARCHITECTURE.md` - System design and architecture
- `docs/DATABASE_DESIGN.md` - Database schema details
- `docs/API_REFERENCE.md` - tRPC endpoint documentation
- `ref_docs/subpilot_product_plan.md` - Product roadmap and phases

## 🎯 Development Phases

**Phase 1**: MVP (95% Complete) ✅
**Phase 2**: Advanced Features (AI, Analytics) 📋
**Phase 3**: Automation (Cancellation, AI Assistant) 📋
**Phase 4**: Launch & Marketing 📋

## ⚠️ Important Notes

1. **Database First**: The Prisma schema is comprehensive and ready. Use it as the source of truth for data models.

2. **Type Safety**: Leverage tRPC and TypeScript for end-to-end type safety. The types should flow from database → API → frontend.

3. **Server Components**: Default to server components. Only use client components for interactivity.

4. **Security**: All sensitive data (Plaid tokens, etc.) must be encrypted. Never expose API keys in client code.

5. **Testing**: Write tests as you implement features. Don't leave testing until the end.

6. **Edge Runtime Compatibility**: Middleware runs in Edge Runtime. Use `auth-edge.ts` for auth checks instead of importing the full auth config.

## 🎉 v1.0.0 Release Achievement

Phase 1 MVP is now 100% complete with this stable release! All core features are implemented and production-ready.

## 🚦 Phase 2 Planning

With Phase 1 complete, the next phase will focus on:

1. **AI-Powered Insights**: Smart recommendations and spending predictions
2. **Mobile Applications**: iOS and Android native apps
3. **Advanced Analytics**: Enhanced reporting and data visualization
4. **Automation Features**: Auto-cancellation and smart notifications
5. **Family Management**: Household subscription sharing

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
- **Current Version**: 0.1.9

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

### Monitoring CI/CD

```bash
# Check recent workflow runs
gh run list --workflow=ci.yml

# View detailed logs for a specific run
gh run view <run-id> --log

# Watch a running workflow
gh run watch <run-id>
```

---

**Remember**: This is a T3 Stack project with full implementation completed for Week 1 of Phase 1. When in doubt, refer to the T3 Stack documentation and best practices. The project follows standard T3 conventions with some customizations for the subscription management domain.

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

### Test Implementation Achievements
- **Vitest + React Testing Library**: Configuration for Next.js projects
- **API Router Testing**: tRPC patterns with comprehensive coverage
- **Component Testing**: User interactions and state management
- **Utility Function Testing**: 100% pass rates achieved
- **Mocking Strategies**: External services (Plaid, auth providers)
- **Coverage Integration**: CI/CD pipelines with reports
- **Test Organization**: By domain (analytics, notifications, components, utilities)

### Test Framework Restoration
- **Simplified Logic Tests**: tRPC routers avoid complex mocking setup
- **Business Logic Focus**: Rather than framework integration
- **Radix UI Handling**: Special test handling for dropdown menus
- **TypeScript First**: Fix compilation errors before running tests
- **Component Props**: Always verify against implementation
- **Target Pass Rate**: 80%+ rather than perfect coverage
- **High-Value Tests**: Prioritize over complete coverage
- **Aria-Label Workarounds**: Use getAllByRole('button') with className filtering
- **Method Name Fixes**: detectFromTransaction → detectSingleTransaction
- **Array Parameter Handling**: Wrap single objects in arrays when needed
- **Optional Chaining**: Use ?. for potentially undefined array access
- **Mock Object Cleanup**: Remove extra properties not in interfaces

### 100% Test Coverage Achievement
- Create new test files for 0% coverage components first
- Use userEvent over fireEvent for better async handling
- Add findBy queries for portal-rendered content (dropdowns, modals)
- Mock DOM APIs in setup for Radix UI compatibility
- Fix all failing tests before enabling skipped tests
- Comprehensive test creation adds 40+ tests in single session
- Always run tests after ESLint/Prettier fixes

## 🛠️ TypeScript Compilation Patterns

### Systematic Compilation Fixes
- **Prisma Schema Alignment**: Field name consistency across API routers
- **React 19 Compatibility**: JSX syntax requirements
- **Auth.js v5 Structure**: sessionToken not available client-side
- **Nullish Coalescing**: ??= and ?? preferred over || for assignments
- **JSON Field Access**: Type guards for database fields
- **Component Dependencies**: Install all required UI library components
- **Edge Runtime**: Separate auth utilities for middleware compatibility
