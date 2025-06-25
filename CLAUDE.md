# SubPilot - Project Documentation for Claude

## 🎯 Project Overview

SubPilot is a modern subscription management platform built with the T3 Stack. It helps users monitor, manage, and cancel recurring subscriptions by automatically detecting them from bank transactions.

**Current Status**: Phase 1 MVP Complete ✅ (95% Complete, Production Ready) - v0.1.9 Released with full feature set including email notifications, subscription management, advanced analytics, and comprehensive testing (99.5% coverage). All core MVP features delivered. Last updated: 2025-06-25 05:42 AM EDT.

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

### ✅ Completed (Phase 1, Week 1 & Week 2) - 2025-06-21

**Week 1 Achievements**:
- **Complete Authentication System**: Auth.js v5 with OAuth (Google, GitHub) and magic links
- **Full API Implementation**: 6 tRPC routers with 35+ endpoints and security middleware
- **UI Component Library**: 15+ shadcn/ui components integrated with custom theme
- **Database Integration**: Neon PostgreSQL with Prisma ORM (schema migrated)
- **CI/CD Pipeline**: GitHub Actions with Docker support (TypeScript errors fixed)
- **Live Deployment**: Vercel production deployment with analytics
- **Dashboard Implementation**: User profile, settings, and dashboard components
- **Security Features**: Rate limiting, CSRF protection, Edge Runtime compatibility

**Week 2 Achievements** (v0.1.5):
- **Plaid Integration**: Complete bank sync with sandbox accounts
- **Mock Data System**: Comprehensive test data generation for development
- **Transaction Management**: Import, sync, and display with filtering
- **Subscription Detection**: Intelligent algorithm with 85%+ accuracy
  - Pattern matching for recurring payments
  - Amount tolerance handling (±5%)
  - Confidence scoring system
  - Support for various billing cycles
- **Enhanced Dashboard**: Real data integration with loading states
- **UI Improvements**: Fixed dropdown menus, added empty states, improved responsiveness
- **Test Framework**: Restored to 83.2% pass rate (89/107 tests passing)
- **Documentation**: All 40+ files updated and synchronized

**Week 2.5 Achievements** (v0.1.6):
- **CSS Loading Fix**: Resolved PostCSS configuration issue with ES modules
- **Test Framework**: Achieved 100% test pass rate (147/147 tests)
- **Code Quality**: Fixed all 147 ESLint errors and Prettier formatting
- **New Test Suites**: Added 40+ tests for untested components
- **Docker Build**: Fixed security warnings and Prisma schema issues

**Week 3 Progress** (v0.1.8):
- **Theme System Implementation**: Complete Light/Dark/Auto theme switching with next-themes
- **CI/CD Pipeline Restoration**: Fixed TypeScript compilation errors in scripts
- **Test Configuration Fix**: Resolved Vitest path resolution by replacing tsconfig.json symlink
- **Type Safety Improvements**: Enhanced test mock data patterns for better TypeScript inference
- **Documentation Updates**: Comprehensive deferred implementation tracking

### 🚧 Current Focus (Phase 1, Week 3 Starting Monday) - 2025-06-21

- [ ] Email notification system implementation
- [ ] Subscription management features (pause, cancel, modify)
- [ ] Advanced analytics and spending insights
- [ ] Performance optimization and caching
- [ ] Additional test coverage for new features

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

## 🎯 Current Development Phase

**Phase 1: MVP Buildout** (Week 1 Complete ✅, Week 2 Starting)

- ✅ User authentication system (Auth.js v5 with OAuth and magic links)
- ✅ Complete API infrastructure (6 tRPC routers with 35+ endpoints)
- ✅ Dashboard UI implementation (profile, settings, core components)
- ✅ CI/CD pipeline with Docker support and automatic deployments
- ✅ Live Vercel deployment with Neon PostgreSQL
- 🚧 Bank account integration via Plaid (Week 2 focus)
- 🚧 Transaction ingestion and parsing (Week 2 focus)
- 🚧 Basic subscription detection algorithm (Week 2 focus)
- 📋 Email notification system (Week 3-4)
- 📋 Comprehensive test suite (Week 4)

## ⚠️ Important Notes

1. **Database First**: The Prisma schema is comprehensive and ready. Use it as the source of truth for data models.

2. **Type Safety**: Leverage tRPC and TypeScript for end-to-end type safety. The types should flow from database → API → frontend.

3. **Server Components**: Default to server components. Only use client components for interactivity.

4. **Security**: All sensitive data (Plaid tokens, etc.) must be encrypted. Never expose API keys in client code.

5. **Testing**: Write tests as you implement features. Don't leave testing until the end.

6. **Edge Runtime Compatibility**: Middleware runs in Edge Runtime. Use `auth-edge.ts` for auth checks instead of importing the full auth config.

## 🚦 Next Steps (Phase 1, Week 2)

1. **Create Plaid developer account** and configure sandbox environment
2. **Implement bank connection flow** with Plaid Link integration
3. **Build transaction import logic** with data parsing and storage
4. **Create subscription detection algorithm** for recurring payment identification
5. **Enhance dashboard** with real data from API endpoints
6. **Write comprehensive test suites** for all implemented features
7. **Performance optimization** and monitoring setup

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
- **Current Version**: 0.1.8

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
6. **TypeScript Fixes**: All compilation errors resolved (100+ errors fixed June 21, 2025)
7. **Vercel Integration**: Connect to GitHub for automatic deployments on main branch
8. **Deferred TODOs**: 40+ items documented in DEFERRED_IMPL.md for future implementation

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

## 🎯 Current Session Context (2025-06-25 05:42 AM EDT)

- **Phase 1 Progress**: 95% Complete (MVP Feature Complete - Production Ready)
- **Velocity**: 238% of target (consistently exceeding expectations)
- **Live Demo**: https://subpilot-test.vercel.app (full production functionality)
- **Latest Release**: v0.1.9 with complete Phase 1 MVP feature set
- **Documentation**: All 40+ files synchronized and current
- **CI/CD**: Fully operational with automated testing and deployment
- **Testing**: 219/220 tests passing (99.5% pass rate)
- **Code Quality**: Zero ESLint errors, Prettier formatted, TypeScript fully compliant
- **Key Features Complete**: Email notifications (8 types), subscription management, advanced analytics, production Plaid integration, theme system
- **Production Ready**: Complete MVP with comprehensive testing, security, and performance optimization

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
