# Changelog

All notable changes to SubPilot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Vercel Deployment** - 2025-06-21
  - Successfully deployed to Vercel test environment
  - Configured Neon PostgreSQL serverless database
  - Set up all environment variables properly
  - Created comprehensive deployment documentation
  - Application live at https://subpilot-test.vercel.app
  - Created automated deployment testing script
  - Added Vercel-specific .gitignore patterns

### Fixed

- **Edge Runtime Compatibility** - 2025-06-21
  - Fixed middleware incompatibility with Edge Runtime due to Nodemailer imports
  - Created Edge-compatible authentication check (`auth-edge.ts`)
  - Refactored middleware to use lightweight JWT-based auth verification
  - Resolved "The edge runtime does not support Node.js 'stream' module" error
  - Improved middleware performance by running in Edge Runtime

### Changed

- **Project Organization** - 2025-06-21
  - Moved Vercel documentation to docs/ directory
  - Moved Vercel scripts to scripts/ directory
  - Updated documentation index with new files

## [0.1.0] - 2025-06-21

### 🎉 Initial Release - Project Foundation & CI/CD Infrastructure

This is the first official release of SubPilot, marking the completion of Phase 0 (Project Initialization) and significant progress on Phase 1 (MVP Development). This release establishes the complete project foundation with comprehensive documentation, CI/CD pipeline, and initial authentication implementation.

### CI/CD Pipeline & Infrastructure Updates - 2025-06-21

#### Major CI/CD Pipeline Overhaul

- **Node.js Version Compatibility Resolution**
  - **Fixed**: Updated Node.js from 18.17 to 20.18 across all environments
  - **Fixed**: Resolved Prisma installation failures due to unsupported Node.js version
  - **Fixed**: Updated `@types/node` to ^20.18.0 for TypeScript compatibility
  - **Added**: Engine specifications in package.json to enforce version requirements
  - **Updated**: Package manager specification to npm@10.9.0

- **CI/CD Workflow Enhancements**
  - **Added**: Comprehensive configuration validation before build steps
  - **Added**: Development-friendly error handling with informative messages
  - **Added**: Build status summaries with detailed pipeline tables
  - **Added**: Docker image health testing with endpoint verification
  - **Added**: Security audit improvements with vulnerability reporting
  - **Removed**: Silent failure flags (`continue-on-error`) that masked critical issues
  - **Added**: Environment variable management for CI builds
  - **Created**: Separate `build:ci` script for CI environments without linting

- **Build Process Improvements**
  - **Fixed**: Next.js build configuration for CI/CD compatibility
  - **Added**: Module type specification to eliminate Node.js warnings
  - **Disabled**: Experimental optimizeCss feature causing module resolution issues
  - **Added**: Production build testing with proper environment variables
  - **Improved**: Docker build process with health check validation

- **Dockerfile & Container Updates**
  - **Updated**: Base images from Node.js 18.17-alpine to 20.18-alpine
  - **Verified**: Docker build process with new Node.js version
  - **Added**: Container health testing in CI pipeline
  - **Improved**: Build layer optimization and security

- **Development Workflow Improvements**
  - **Added**: Proper error messaging for different failure types
  - **Added**: Development mode considerations in CI (non-blocking quality checks)
  - **Added**: Comprehensive pipeline status reporting
  - **Added**: Future test job structure (commented for when tests are implemented)
  - **Improved**: Security audit output with actionable recommendations

#### Docker & Container Infrastructure

- **Docker Build Environment**
  - **Fixed**: Missing environment variables during Docker build (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
  - **Added**: SKIP_ENV_VALIDATION=true with placeholder values for build-time environment
  - **Fixed**: npm version mismatch - updated package.json to require npm >=10.8.0 (from >=10.9.0)
  - **Fixed**: Docker build using full lint checks - changed to `npm run build:ci` (no-lint build)
  - **Fixed**: Legacy ENV format warnings - updated all ENV declarations to key=value format
  - **Added**: Next.js standalone output mode for optimized container size
  - **Enhanced**: Docker health check with retry logic and proper environment variables

#### Release Automation & Artifacts

- **Automated Artifact Generation**
  - **Added**: Automatic creation of source code archive (tar.gz) for each release
  - **Added**: Production build artifact with all necessary files for deployment
  - **Added**: Docker image export as downloadable artifact (106MB)
  - **Added**: Docker Compose configuration for easy deployment
  - **Added**: SHA256 checksums for all artifacts for integrity verification
  - **Added**: Comprehensive README for Docker deployment instructions

- **CI/CD Release Improvements**
  - **Enhanced**: Release workflow to check for existing releases before creating new ones
  - **Added**: Conditional logic to preserve manually edited release notes
  - **Added**: Artifact upload to existing releases using gh CLI
  - **Fixed**: Release notes being overwritten by automated workflow
  - **Added**: Automated artifact attachment to GitHub releases

### Phase 1 MVP Implementation Progress - 2025-06-21

#### Enhanced Authentication & UI Implementation

- **Email Magic Link Authentication**
  - Implemented Nodemailer integration for magic link emails
  - Created custom email templates with brand styling
  - Built verify-request page for email confirmation flow
  - Added auth-error page with detailed error messages
  - Configured both development (Mailhog) and production (SendGrid) email transports
  
- **User Profile & Settings**
  - Created comprehensive profile page with editable user information
  - Built settings page with tabbed interface (Notifications, Security, Billing, Advanced)
  - Implemented notification preferences UI with switches and selects
  - Added security settings with session management
  - Created billing/subscription plan display
  - Built advanced settings with data export and account deletion options
  
- **UI Component Library (shadcn/ui)**
  - Successfully integrated shadcn/ui components with React 19
  - Added essential components: Button, Input, Label, Card, Dialog, Tooltip
  - Added Avatar, Checkbox, Dropdown Menu, Select, Switch, Tabs, Badge, Alert
  - Created reusable navigation header component
  - Built consistent UI patterns across all pages
  
- **Enhanced Navigation & Layout**
  - Created NavHeader component with user dropdown menu
  - Implemented consistent navigation across protected pages
  - Added user avatar with initials fallback
  - Built responsive navigation with mobile support
  - Integrated sign-out functionality in dropdown
  
- **Authentication Middleware Enhancements**
  - Implemented route protection with automatic redirects
  - Added auth route handling (redirect authenticated users from login)
  - Created protected route configuration
  - Added callback URL support for post-login redirects
  
- **Development Improvements**
  - Updated react-plaid-link to v4.0.1 for React 19 compatibility
  - Created custom auth hook (useAuth) for client components
  - Fixed dependency conflicts with legacy peer deps
  - Set up local .env file with development defaults
  
- **Additional Pages & Features**
  - Created comprehensive settings page with multiple tabs
  - Built notification timing controls with quiet hours
  - Added two-factor authentication placeholder
  - Implemented active sessions display
  - Created data export and privacy controls

### Phase 1 MVP Implementation Begins - 2025-06-21

#### Initial Implementation

- **Next.js App Router Implementation**
  - Created complete App Router structure with layouts and pages
  - Implemented root layout with metadata configuration
  - Added global styles and font configuration (Inter)
  - Set up TRPCReactProvider for type-safe API calls
  - Created landing page with call-to-action buttons
  
- **Authentication System (Auth.js v5)**
  - Configured Auth.js with App Router integration
  - Created authentication API routes (`/api/auth/[...nextauth]`)
  - Implemented OAuth provider setup (Google & GitHub ready)
  - Built login and signup pages with modern UI
  - Added protected routes with session management
  - Created sign-out functionality with client-side handling
  
- **tRPC API Layer**
  - Set up tRPC with Next.js App Router adapter
  - Created type-safe API client for React components
  - Implemented server-side tRPC helpers for RSC
  - Added example router demonstrating public/protected procedures
  - Configured error handling and logging for development
  
- **UI Components & Styling**
  - Configured shadcn/ui component library
  - Created authentication form components
  - Built dashboard with statistics cards
  - Implemented responsive layouts with Tailwind CSS
  - Added loading states and error handling UI
  
- **Dashboard Foundation**
  - Created protected dashboard route
  - Built overview cards for subscription metrics
  - Added placeholder for bank connection CTA
  - Implemented user greeting with session data
  
- **Development Infrastructure**
  - Fixed TypeScript path aliases for both `~/` and `@/` imports
  - Created middleware structure for future auth protection
  - Added public directory for static assets
  - Configured components.json for shadcn/ui
  - Set up environment variable handling with validation

### Project Initialization - 2025-06-21

#### Project Foundation Added

- **Project Foundation**
  - Initialized project using create-t3-app with TypeScript, tRPC, Tailwind CSS, and Prisma
  - Configured Next.js 14 with App Router architecture
  - Set up ESLint and Prettier for code quality
  - Implemented strict TypeScript configuration

- **Database Schema** (Prisma)
  - **User Management**
    - User model with Auth.js integration
    - Account model for OAuth providers
    - Session management tables
    - Email verification token support
  
  - **Financial Data Models**
    - PlaidItem: Secure bank connection storage
    - PlaidAccount: Individual account tracking
    - Transaction: Full transaction history with categorization
    - Merchant: Merchant data normalization
    - Category: Transaction categorization system
  
  - **Subscription Management**
    - Subscription: Core subscription tracking with status management
    - SubscriptionHistory: Price and plan change tracking
    - SubscriptionAlert: Notification preferences
    - CancellationRequest: Cancellation workflow management
  
  - **Analytics & Insights**
    - SpendingInsight: AI-generated spending analysis
    - SavingsOpportunity: Potential savings identification
    - UsagePattern: Subscription usage tracking
  
  - **System Features**
    - Notification: Multi-channel notification system
    - UserPreferences: User settings and preferences
    - Webhook: External event handling

- **Documentation Structure**
  - **Architecture Documentation**
    - Comprehensive system architecture overview
    - Component interaction diagrams
    - Data flow documentation
    - Security architecture design
  
  - **API Specifications**
    - Complete tRPC router specifications
    - RESTful endpoint documentation
    - WebSocket event definitions
    - Webhook payload schemas
  
  - **Implementation Guides**
    - Auth.js configuration guide
    - Plaid integration documentation
    - Database migration strategies
    - Testing methodology
  
  - **Development Documentation**
    - Development environment setup
    - Code style guidelines
    - Git workflow documentation
    - Deployment strategies

- **Phase-Based Planning System**
  - Phase 0: Project Initialization (Complete)
  - Phase 1: MVP Development (4 weeks)
  - Phase 2: Advanced Features
  - Phase 3: Automation & Intelligence
  - Phase 4: Launch Preparation

- **Repository Configuration**
  - MIT License
  - Comprehensive .gitignore for Node.js/Next.js projects
  - Security policy (SECURITY.md)
  - Contributing guidelines (CONTRIBUTING.md)
  - Issue and PR templates structure
  - GitHub Actions workflow preparation

- **Development Tools Configuration**
  - Environment variable template (.env.example)
  - TypeScript path aliases (@/ imports)
  - Tailwind CSS with custom theme configuration
  - PostCSS configuration
  - Next.js configuration with security headers

#### Technical Specifications

- **Frontend Stack**
  - Next.js 14.2.16 (App Router)
  - React 18 with TypeScript 5
  - Tailwind CSS 3.4 with custom design system
  - Framer Motion (planned for animations)
  - React Hook Form + Zod for form handling

- **Backend Stack**
  - tRPC v11 for type-safe APIs
  - Prisma ORM 6.0.1 with PostgreSQL
  - Auth.js 5.0 for authentication
  - Node.js runtime with ES modules

- **External Integrations**
  - Plaid API for banking (configured, not implemented)
  - OpenAI API for insights (planned)
  - Resend for transactional emails (planned)
  - Stripe for payments (planned)

- **Development Infrastructure**
  - npm workspace configuration
  - Hot module replacement setup
  - Database connection pooling ready
  - Error tracking preparation (Sentry planned)

#### Security Measures

- Comprehensive security policy documentation
- Environment-based configuration system
- Prepared for:
  - JWT token management
  - OAuth 2.0 implementation
  - API rate limiting
  - Input validation schemas
  - XSS and CSRF protection

#### Testing Strategy

- Documented testing approach including:
  - Unit testing with Vitest (planned)
  - Integration testing strategy
  - E2E testing with Playwright (planned)
  - API testing methodology
  - Performance testing guidelines

### Project Status Changes

- **Changed**: N/A (Initial Release)
- **Deprecated**: N/A (Initial Release)  
- **Removed**: N/A (Initial Release)
- **Fixed**: N/A (Initial Release)

### Security

- Established security policy and vulnerability reporting process
- Configured secure environment variable handling
- Prepared authentication and authorization framework
- Documented security best practices for contributors

## Version History

### [0.1.0] - 2025-06-21 (Released)

- Initial release with complete project foundation
- Comprehensive CI/CD pipeline with Docker support
- Authentication system implementation (Auth.js v5)
- UI component library integration (shadcn/ui)
- Database schema and Prisma ORM setup
- tRPC API layer implementation
- Dashboard foundation with protected routes
- Complete documentation framework
- GitHub repository with all standard files

---

## Upcoming Releases

### [0.2.0] - Target: End of Phase 1 (3 weeks remaining)

Planned features:

- Complete OAuth integration (Google & GitHub)
- Bank account connection via Plaid
- Automatic subscription detection
- Basic subscription management
- Full dashboard implementation with metrics

### [0.3.0] - Target: End of Phase 2

Planned features:

- AI-powered insights
- Advanced analytics dashboard
- Spending predictions
- Bulk subscription management
- Email notifications

### [0.4.0] - Target: End of Phase 3

Planned features:

- Automated cancellation assistance
- Smart notifications
- Bill negotiation features
- Subscription sharing detection
- Mobile app considerations

### [1.0.0] - Target: End of Phase 4

Planned features:

- Full production deployment
- Marketing website
- Complete feature set
- Performance optimizations
- Comprehensive documentation

---

*For detailed task tracking, see the [TODO files](./to-dos/) in the project repository.*
