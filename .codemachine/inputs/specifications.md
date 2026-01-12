# SubPilot - Project Specification

**Document Version:** 1.8.8
**Publication Date:** December 11, 2025
**Project Status:** Phase 4 Active - Commercial Launch Ready
**Technology Stack:** Next.js 15, TypeScript 5.7, tRPC 11, Prisma 6, PostgreSQL, Auth.js v5
**Production URL:** https://subpilot-app.vercel.app
**Repository:** https://github.com/doublegate/SubPilot-App

---

## Part 1: The Essentials (Core Requirements)

### 1.0 Project Overview

#### 1.1 Project Name
**SubPilot** - Your Command Center for Recurring Finances

#### 1.2 Project Goal
SubPilot is an enterprise-grade subscription management platform that automatically detects, tracks, and manages recurring subscriptions by integrating with users' bank accounts. The platform provides AI-powered insights, predictive analytics, and automated cancellation workflows to help users take control of their recurring financial commitments.

#### 1.3 Target Audience
- **Primary:** Individual consumers managing multiple subscription services (streaming, SaaS, memberships)
- **Secondary:** Small businesses tracking recurring vendor payments
- **Demographics:** Tech-savvy users comfortable with bank account integration
- **Geographic Focus:** United States and Canada (Plaid-supported regions)

### 2.0 Core Functionality & User Journeys

#### 2.1 Core Features List

**Authentication & User Management:**
- Multi-provider OAuth authentication (Google, GitHub)
- Email magic link authentication
- Two-factor authentication (SMS + TOTP authenticator apps)
- User profile management with notification preferences
- Admin role management system

**Bank Integration & Transaction Processing:**
- Plaid API integration for secure bank connections
- Automatic transaction synchronization (30-day history)
- Encrypted bank access token storage (AES-256-GCM)
- Multi-account support per user

**Subscription Detection & Management:**
- AI-powered subscription detection algorithm (85%+ accuracy)
- Automatic categorization using OpenAI GPT-4o-mini
- Subscription status tracking (active, cancelled, trial ending)
- Billing cycle detection (monthly, annual, quarterly)
- Price change detection and alerts

**Automated Cancellation System (Three-Agent Architecture):**
- API-First Agent: Direct provider integration with webhooks
- Event-Driven Agent: Background job processing with workflow orchestration
- Lightweight Agent: Manual cancellation instructions with confirmation
- Intelligent method selection and automatic fallback
- Real-time progress updates via Server-Sent Events (SSE)

**AI Assistant:**
- GPT-4 powered conversational interface
- Natural language subscription management
- Spending analysis and recommendations
- Action execution with user confirmation

**Analytics & Insights:**
- Interactive spending dashboard with visualizations
- Category-based spending breakdowns
- Predictive analytics with forecasting
- Anomaly detection for unusual charges
- Monthly spending trends with heatmaps

**Notifications & Alerts:**
- Email notifications via SendGrid
- In-app notifications with real-time updates
- 8 notification types: renewal reminders, price changes, trial ending, new subscription detected, spending threshold alerts, cancellation confirmations, failed payment alerts, monthly summaries

**Premium Features (Stripe Integration):**
- Free tier: Basic subscription tracking
- Premium tier ($9.99/month): Advanced analytics, priority support, unlimited accounts, AI assistant
- Feature flag-based access control
- Stripe billing portal integration
- Usage tracking per tier

**Admin Panel (6 Sections):**
- System Management: Feature flags, environment monitoring, background jobs, cache
- Security Center: Audit logs, active sessions, threat detection, 2FA enforcement
- Database Tools: Statistics, performance metrics, backup management, migrations
- API Keys Manager: Service configurations, rotation, usage statistics
- Monitoring Dashboard: Real-time metrics, system resources, API performance
- Error Tracking: Comprehensive logs, stack traces, resolution tracking

**Data Export:**
- CSV export for transaction data
- JSON export for API integration
- PDF reports for financial records
- Excel exports with formatting

**Progressive Web App (PWA):**
- Offline support with service worker
- Mobile-optimized UI with touch gestures
- Native-like experience with app manifest
- Push notifications (planned)

#### 2.2 User Journeys

**User Journey 1: Bank Connection & Subscription Discovery**
1. User clicks "Connect Bank" → app **MUST** redirect to Plaid Link UI → user authorizes bank connection
2. Plaid returns access token → app **MUST** encrypt token with AES-256-GCM → store in database with unique salt
3. App fetches transactions → app **MUST** sync last 30 days of transaction history → store in database
4. Background job analyzes transactions → app **MUST** run subscription detection algorithm → identify recurring patterns
5. Detected subscriptions appear in dashboard → app **MUST** display subscription cards with merchant, amount, frequency → user can confirm/dismiss

**User Journey 2: Subscription Cancellation (Three-Agent System)**
1. User selects subscription → clicks "Cancel" → app **MUST** show cancellation modal with method selection
2. UnifiedCancellationOrchestrator evaluates provider → app **MUST** select optimal method (API → Automation → Manual)
3. **If API-First:** App calls provider API → **MUST** process webhook confirmation → update status to "cancelled"
4. **If Event-Driven:** App queues cancellation job → **MUST** execute workflow → update progress via SSE → notify user on completion
5. **If Lightweight:** App displays manual instructions → **MUST** show step-by-step guide → user confirms completion → app updates status
6. Confirmation sent → app **MUST** send email notification → show success message → refresh dashboard

**User Journey 3: AI Assistant Interaction**
1. User opens AI chat → types "How much am I spending on streaming?" → app **MUST** send to GPT-4 with conversation context
2. AI analyzes subscriptions → app **MUST** calculate category totals → format response with breakdown
3. AI suggests action → "Would you like to cancel [service]?" → user confirms → app **MUST** initiate cancellation workflow (Journey 2)
4. App logs conversation → **MUST** store in database with user_id → maintain conversation history

**User Journey 4: Premium Upgrade**
1. User clicks "Upgrade to Premium" → app **MUST** redirect to Stripe Checkout → pass user email and plan ID
2. User completes payment → Stripe sends webhook → app **MUST** verify webhook signature → update user tier
3. App grants premium features → **MUST** check feature flags → enable AI assistant, advanced analytics → show success message
4. User accesses billing portal → app **MUST** generate Stripe portal session → redirect to billing management

**User Journey 5: Two-Factor Authentication Setup**
1. User navigates to Settings → Security → clicks "Enable 2FA" → app **MUST** show method selection (SMS/Authenticator)
2. **If TOTP:** App generates secret → **MUST** create QR code → display setup instructions → user scans with app
3. User enters verification code → app **MUST** validate TOTP code → save encrypted secret → enable 2FA flag
4. App generates backup codes → **MUST** display 10 single-use codes → user saves codes → confirms acknowledgment
5. Next login requires 2FA → app **MUST** prompt for code → validate → grant session access

**User Journey 6: Admin User Management**
1. Admin opens Admin Panel → Security section → clicks "User Management" → app **MUST** display user list with search
2. Admin searches user by email → types query → app **MUST** query database → return matching users
3. Admin promotes user to admin → clicks "Make Admin" → app **MUST** update role → log audit event → show confirmation
4. Audit log records action → app **MUST** store user ID, IP address, timestamp, action details → send admin notification

### 3.0 Data Models

**Entity: User**
- `id` (REQUIRED, UUID, primary key)
- `email` (REQUIRED, unique, valid email, indexed)
- `emailVerified` (OPTIONAL, timestamp)
- `name` (OPTIONAL, string, 100 chars max)
- `password` (OPTIONAL, hashed with bcryptjs, min 8 chars) - only for email/password auth
- `image` (OPTIONAL, URL)
- `isAdmin` (REQUIRED, boolean, default=false)
- `isTwoFactorEnabled` (REQUIRED, boolean, default=false)
- `twoFactorSecret` (OPTIONAL, encrypted string) - for TOTP
- `twoFactorBackupCodes` (OPTIONAL, encrypted JSON array)
- `phoneNumber` (OPTIONAL, E.164 format) - for SMS 2FA
- `tier` (REQUIRED, enum: 'free' | 'premium', default='free')
- `preferences` (REQUIRED, JSONB, notification settings, theme)
- `createdAt` (REQUIRED, timestamp, auto)
- `updatedAt` (REQUIRED, timestamp, auto)

**Entity: Account** (OAuth Provider)
- `id` (REQUIRED, UUID, primary key)
- `userId` (REQUIRED, UUID, foreign key to User)
- `type` (REQUIRED, string: 'oauth' | 'email')
- `provider` (REQUIRED, string: 'google' | 'github' | 'email')
- `providerAccountId` (REQUIRED, string, unique per provider)
- `refresh_token` (OPTIONAL, encrypted string)
- `access_token` (OPTIONAL, encrypted string)
- `expires_at` (OPTIONAL, integer, Unix timestamp)
- `token_type` (OPTIONAL, string: 'Bearer')
- `scope` (OPTIONAL, string, space-separated scopes)
- `id_token` (OPTIONAL, encrypted string)
- `session_state` (OPTIONAL, string)

**Entity: PlaidItem** (Bank Connection)
- `id` (REQUIRED, UUID, primary key)
- `userId` (REQUIRED, UUID, foreign key to User)
- `plaidItemId` (REQUIRED, string, unique, from Plaid)
- `accessToken` (REQUIRED, encrypted string, AES-256-GCM)
- `encryptionSalt` (REQUIRED, string, unique per token)
- `institutionId` (REQUIRED, string, from Plaid)
- `institutionName` (OPTIONAL, string)
- `status` (REQUIRED, enum: 'active' | 'error' | 'inactive', default='active')
- `lastSync` (OPTIONAL, timestamp)
- `createdAt` (REQUIRED, timestamp, auto)
- `updatedAt` (REQUIRED, timestamp, auto)

**Entity: Account** (Bank Account)
- `id` (REQUIRED, UUID, primary key)
- `plaidItemId` (REQUIRED, UUID, foreign key to PlaidItem)
- `plaidAccountId` (REQUIRED, string, unique, from Plaid)
- `name` (REQUIRED, string, account nickname)
- `type` (REQUIRED, enum: 'depository' | 'credit' | 'loan' | 'investment')
- `subtype` (OPTIONAL, string: 'checking' | 'savings' | 'credit card')
- `mask` (OPTIONAL, string, last 4 digits)
- `currentBalance` (OPTIONAL, decimal, 2 decimal places)
- `availableBalance` (OPTIONAL, decimal)
- `currency` (REQUIRED, string: 'USD' | 'CAD', default='USD')
- `isActive` (REQUIRED, boolean, default=true)
- `createdAt` (REQUIRED, timestamp, auto)
- `updatedAt` (REQUIRED, timestamp, auto)

**Entity: Transaction**
- `id` (REQUIRED, UUID, primary key)
- `accountId` (REQUIRED, UUID, foreign key to Account)
- `plaidTransactionId` (REQUIRED, string, unique, from Plaid)
- `amount` (REQUIRED, decimal, 2 decimal places, positive for debit)
- `date` (REQUIRED, date, transaction posting date)
- `name` (REQUIRED, string, merchant name)
- `merchantName` (OPTIONAL, string, normalized merchant)
- `category` (OPTIONAL, JSON array, Plaid categories)
- `pending` (REQUIRED, boolean, default=false)
- `subscriptionId` (OPTIONAL, UUID, foreign key to Subscription)
- `createdAt` (REQUIRED, timestamp, auto)
- `updatedAt` (REQUIRED, timestamp, auto)

**Entity: Subscription**
- `id` (REQUIRED, UUID, primary key)
- `userId` (REQUIRED, UUID, foreign key to User)
- `merchantName` (REQUIRED, string, subscription service name)
- `amount` (REQUIRED, decimal, 2 decimal places)
- `currency` (REQUIRED, string: 'USD' | 'CAD', default='USD')
- `frequency` (REQUIRED, enum: 'monthly' | 'annual' | 'quarterly' | 'weekly')
- `status` (REQUIRED, enum: 'active' | 'cancelled' | 'pending_cancellation' | 'trial', default='active')
- `category` (OPTIONAL, string, AI-assigned category)
- `categorySource` (OPTIONAL, enum: 'ai' | 'manual' | 'plaid')
- `detectionConfidence` (REQUIRED, decimal, 0.0-1.0, algorithm confidence)
- `detectionMethod` (REQUIRED, string: 'recurring_pattern' | 'merchant_match' | 'manual')
- `firstChargeDate` (REQUIRED, date)
- `lastChargeDate` (REQUIRED, date)
- `nextBillingDate` (OPTIONAL, date, calculated)
- `cancellationRequestId` (OPTIONAL, UUID, foreign key to CancellationRequest)
- `notes` (OPTIONAL, text, user notes)
- `isConfirmed` (REQUIRED, boolean, default=false) - user verified
- `createdAt` (REQUIRED, timestamp, auto)
- `updatedAt` (REQUIRED, timestamp, auto)

**Entity: CancellationRequest**
- `id` (REQUIRED, UUID, primary key)
- `userId` (REQUIRED, UUID, foreign key to User)
- `subscriptionId` (REQUIRED, UUID, foreign key to Subscription)
- `providerId` (OPTIONAL, UUID, foreign key to CancellationProvider)
- `method` (REQUIRED, enum: 'api' | 'automation' | 'manual')
- `status` (REQUIRED, enum: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled')
- `statusMessage` (OPTIONAL, text, user-facing status)
- `errorDetails` (OPTIONAL, JSONB, error context)
- `progress` (REQUIRED, integer, 0-100, percentage)
- `requestedAt` (REQUIRED, timestamp, auto)
- `completedAt` (OPTIONAL, timestamp)
- `createdAt` (REQUIRED, timestamp, auto)
- `updatedAt` (REQUIRED, timestamp, auto)

**Entity: CancellationProvider**
- `id` (REQUIRED, UUID, primary key)
- `name` (REQUIRED, string, unique, provider name: 'Netflix', 'Spotify')
- `capabilities` (REQUIRED, JSON array: ['api', 'automation', 'manual'])
- `apiEndpoint` (OPTIONAL, URL, for API-first)
- `webhookUrl` (OPTIONAL, URL, for confirmations)
- `automationScriptPath` (OPTIONAL, string, Playwright script path)
- `manualInstructions` (OPTIONAL, JSON, step-by-step guide)
- `isActive` (REQUIRED, boolean, default=true)
- `createdAt` (REQUIRED, timestamp, auto)
- `updatedAt` (REQUIRED, timestamp, auto)

**Entity: CancellationLog**
- `id` (REQUIRED, UUID, primary key)
- `requestId` (REQUIRED, UUID, foreign key to CancellationRequest)
- `level` (REQUIRED, enum: 'info' | 'warning' | 'error' | 'success')
- `message` (REQUIRED, text)
- `metadata` (OPTIONAL, JSONB, contextual data)
- `createdAt` (REQUIRED, timestamp, auto)

**Entity: Conversation** (AI Assistant)
- `id` (REQUIRED, UUID, primary key)
- `userId` (REQUIRED, UUID, foreign key to User)
- `messages` (REQUIRED, JSONB array, message history)
- `lastMessageAt` (REQUIRED, timestamp)
- `createdAt` (REQUIRED, timestamp, auto)
- `updatedAt` (REQUIRED, timestamp, auto)

**Entity: Notification**
- `id` (REQUIRED, UUID, primary key)
- `userId` (REQUIRED, UUID, foreign key to User)
- `type` (REQUIRED, enum: 8 types listed in features)
- `title` (REQUIRED, string, 100 chars max)
- `message` (REQUIRED, text)
- `link` (OPTIONAL, URL, deep link to relevant page)
- `isRead` (REQUIRED, boolean, default=false)
- `sentAt` (OPTIONAL, timestamp, when email sent)
- `createdAt` (REQUIRED, timestamp, auto)

**Entity: AuditLog** (Security)
- `id` (REQUIRED, UUID, primary key)
- `userId` (OPTIONAL, UUID, foreign key to User) - nullable for system events
- `action` (REQUIRED, string, action type)
- `resource` (REQUIRED, string, affected resource)
- `resourceId` (OPTIONAL, string)
- `ipAddress` (OPTIONAL, string, IP address)
- `userAgent` (OPTIONAL, string)
- `metadata` (OPTIONAL, JSONB, action details)
- `createdAt` (REQUIRED, timestamp, auto, indexed)

**Entity: BillingSubscription** (Stripe)
- `id` (REQUIRED, UUID, primary key)
- `userId` (REQUIRED, UUID, foreign key to User, unique)
- `stripeCustomerId` (REQUIRED, string, unique, from Stripe)
- `stripeSubscriptionId` (OPTIONAL, string, unique, from Stripe)
- `status` (REQUIRED, enum: 'active' | 'cancelled' | 'past_due' | 'trialing')
- `currentPeriodStart` (OPTIONAL, timestamp)
- `currentPeriodEnd` (OPTIONAL, timestamp)
- `cancelAtPeriodEnd` (REQUIRED, boolean, default=false)
- `createdAt` (REQUIRED, timestamp, auto)
- `updatedAt` (REQUIRED, timestamp, auto)

### 4.0 Essential Error Handling

**Authentication Errors:**
- **Invalid Credentials:** App **MUST** show "Invalid email or password" → highlight email/password fields in red
- **OAuth Failure:** App **MUST** show "Authentication failed with [provider]" → offer retry or alternative method
- **2FA Code Invalid:** App **MUST** show "Invalid verification code" → allow retry with remaining attempts count
- **Session Expired:** App **MUST** redirect to login → preserve return URL → show "Session expired, please log in"

**Bank Integration Errors:**
- **Plaid Link Error:** App **MUST** show error message from Plaid → log error details → offer "Try Again" button
- **Token Expired:** App **MUST** detect expired token → prompt user to reconnect bank → initiate Plaid Link flow
- **Transaction Sync Failure:** App **MUST** log error → show "Unable to sync transactions" → schedule retry in 15 minutes
- **Encryption Error:** App **MUST** log critical error → notify admin → show generic "Something went wrong" to user

**Subscription Detection Errors:**
- **Low Confidence Detection:** App **SHOULD** show subscription with warning badge → prompt user to confirm or dismiss
- **Detection Algorithm Failure:** App **MUST** log error → continue processing other transactions → notify admin if persistent

**Cancellation Errors:**
- **API Method Failure:** App **MUST** fallback to automation method → update progress message → retry with new method
- **Automation Script Timeout:** App **MUST** log timeout → fallback to manual method → show instructions to user
- **Provider Not Supported:** App **MUST** show "Manual cancellation required" → display provider contact info → offer instruction guide
- **Webhook Verification Failure:** App **MUST** reject webhook → log security event → return 401 status code

**Payment & Billing Errors:**
- **Stripe Payment Failed:** App **MUST** show error from Stripe → offer retry → send email notification → downgrade to free tier after 3 days
- **Webhook Signature Invalid:** App **MUST** reject webhook → log security warning → return 401 status code
- **Upgrade Flow Interrupted:** App **MUST** preserve user state → allow retry → check Stripe for existing session

**AI Assistant Errors:**
- **OpenAI API Error:** App **MUST** show "AI temporarily unavailable" → save user message → offer retry button
- **Rate Limit Exceeded:** App **MUST** show "Please wait a moment" → retry with exponential backoff → upgrade users get priority
- **Action Confirmation Timeout:** App **MUST** cancel pending action → notify user "Action cancelled due to no response"

**System Errors:**
- **Database Connection Lost:** App **MUST** show "Service temporarily unavailable" → retry connection → alert on-call engineer
- **Network Error:** App **MUST** detect offline state → show offline banner → queue operations for retry when online (PWA)
- **Server Error (500):** App **MUST** show "Something went wrong" → log error with stack trace to Sentry → show error ID to user
- **Rate Limit (429):** App **MUST** show "Too many requests" → implement client-side backoff → respect Retry-After header

**Data Validation Errors:**
- **Invalid Email Format:** App **MUST** highlight email field → show "Please enter a valid email address"
- **Password Too Weak:** App **MUST** show strength meter → list requirements (8+ chars, uppercase, number, special char)
- **Amount Out of Range:** App **MUST** show "Amount must be between $0.01 and $999,999.99" → prevent form submission
- **Date in Past:** App **MUST** show "Date cannot be in the past" → suggest current date

---

## Part 2: Advanced Specifications (Enterprise-Grade Project)

### 5.0 Formal Project Controls & Scope

#### 5.1 Document Control
- **Version:** 1.8.8
- **Status:** Production - Active Commercial Operation
- **Date:** December 11, 2025
- **Phase:** Phase 4 Active (Phases 0-3 Complete)
- **Last Major Update:** July 9, 2025 (Admin Panel Node.js Runtime Fix)

#### 5.2 Detailed Scope

**In Scope (Delivered Features):**
- ✅ Multi-provider authentication (OAuth, email magic links, 2FA)
- ✅ Plaid bank integration with encrypted token storage
- ✅ Automatic subscription detection algorithm (85%+ accuracy)
- ✅ AI-powered categorization using OpenAI GPT-4o-mini
- ✅ Three-agent cancellation system (API, automation, manual)
- ✅ GPT-4 powered AI assistant with action execution
- ✅ Interactive analytics dashboard with predictive insights
- ✅ Email notification system (8 notification types)
- ✅ Premium billing with Stripe integration
- ✅ Admin panel with 6 management sections
- ✅ Two-factor authentication (SMS + TOTP)
- ✅ Progressive Web App with offline support
- ✅ Data export (CSV, JSON, PDF, Excel)
- ✅ Comprehensive test suite (1,049+ tests)
- ✅ CI/CD pipeline with Docker support
- ✅ Production deployment on Vercel + Neon PostgreSQL

**Out of Scope (Not Delivered):**
- ❌ Mobile native applications (iOS/Android) - planned for future
- ❌ Cryptocurrency subscription tracking - deferred
- ❌ Multi-currency support beyond USD/CAD - planned Phase 5
- ❌ Enterprise team accounts with multi-user access - planned Phase 5
- ❌ Subscription scraping from email receipts - research phase
- ❌ Blockchain-based supply chain tracking - not planned
- ❌ Physical product delivery integration - not applicable
- ❌ Third-party API platform for external integrations - planned Phase 5

#### 5.3 Glossary of Terms & Acronyms

| Term | Definition |
|------|------------|
| **2FA** | Two-Factor Authentication - additional security layer requiring a second verification method |
| **AES-256-GCM** | Advanced Encryption Standard with 256-bit key and Galois/Counter Mode - encryption algorithm |
| **API** | Application Programming Interface - interface for software communication |
| **Auth.js** | Authentication library (formerly NextAuth.js) - handles OAuth and session management |
| **CBAM** | Cross-Browser Authentication Module (not applicable to SubPilot) |
| **CI/CD** | Continuous Integration/Continuous Deployment - automated testing and deployment pipeline |
| **Edge Runtime** | Serverless execution environment with Web Standard APIs only (no Node.js APIs) |
| **ESG** | Environmental, Social, Governance (not applicable to SubPilot) |
| **GPT-4** | Generative Pre-trained Transformer 4 - OpenAI's large language model |
| **HMAC** | Hash-based Message Authentication Code - webhook signature verification |
| **OAuth** | Open Authorization - standard for access delegation (Google, GitHub login) |
| **ORM** | Object-Relational Mapping - Prisma abstracts database queries |
| **Plaid** | Financial technology company providing bank integration API |
| **PWA** | Progressive Web App - web application with native app features |
| **SSE** | Server-Sent Events - real-time server-to-client communication |
| **TOTP** | Time-based One-Time Password - 6-digit codes from authenticator apps |
| **tRPC** | TypeScript Remote Procedure Call - type-safe API framework |
| **T3 Stack** | TypeScript + Tailwind + tRPC stack for Next.js applications |

### 6.0 Granular & Traceable Requirements

| ID | Requirement Name / User Story | Description | Priority |
|:---|:---|:---|:---|
| **FR-AUTH-001** | OAuth Authentication | The system **MUST** support OAuth login with Google and GitHub providers using Auth.js v5. | Critical |
| **FR-AUTH-002** | Email Magic Links | The system **MUST** allow users to log in via passwordless email magic links. | High |
| **FR-AUTH-003** | Two-Factor Authentication | The system **MUST** support 2FA with both SMS and TOTP authenticator apps. | Critical |
| **FR-AUTH-004** | Session Management | The system **MUST** maintain secure sessions with JWT tokens and fingerprinting. | Critical |
| **FR-BANK-001** | Plaid Integration | The system **MUST** integrate with Plaid API to connect user bank accounts securely. | Critical |
| **FR-BANK-002** | Token Encryption | The system **MUST** encrypt all Plaid access tokens using AES-256-GCM with unique salts. | Critical |
| **FR-BANK-003** | Transaction Sync | The system **MUST** sync the last 30 days of transactions upon bank connection. | High |
| **FR-BANK-004** | Multi-Account Support | The system **MUST** allow users to connect multiple bank accounts per PlaidItem. | High |
| **FR-SUB-001** | Subscription Detection | The system **MUST** automatically detect recurring subscriptions from transaction patterns. | Critical |
| **FR-SUB-002** | Detection Accuracy | The system **MUST** achieve >85% accuracy in subscription detection with confidence scoring. | High |
| **FR-SUB-003** | AI Categorization | The system **MUST** categorize subscriptions using OpenAI GPT-4o-mini. | High |
| **FR-SUB-004** | Manual Confirmation | The system **SHOULD** prompt users to confirm detected subscriptions before marking as active. | Medium |
| **FR-CANCEL-001** | Unified Cancellation | The system **MUST** implement three-agent cancellation architecture (API, automation, manual). | Critical |
| **FR-CANCEL-002** | Intelligent Routing | The system **MUST** select optimal cancellation method based on provider capabilities. | High |
| **FR-CANCEL-003** | Automatic Fallback | The system **MUST** fallback to next method if primary cancellation fails. | High |
| **FR-CANCEL-004** | Progress Updates | The system **MUST** provide real-time progress updates via Server-Sent Events. | Medium |
| **FR-AI-001** | AI Assistant | The system **MUST** provide GPT-4 powered conversational interface for subscription management. | High |
| **FR-AI-002** | Action Execution | The system **MUST** allow AI to execute actions (cancellations, analysis) with user confirmation. | High |
| **FR-AI-003** | Conversation History | The system **MUST** maintain persistent conversation history per user. | Medium |
| **FR-ANALYTICS-001** | Spending Dashboard | The system **MUST** display interactive visualizations of subscription spending. | High |
| **FR-ANALYTICS-002** | Predictive Analytics | The system **MUST** provide spending forecasts and anomaly detection. | Medium |
| **FR-ANALYTICS-003** | Category Breakdowns | The system **MUST** show spending breakdowns by subscription category. | High |
| **FR-NOTIFY-001** | Email Notifications | The system **MUST** send email notifications for 8 event types via SendGrid. | High |
| **FR-NOTIFY-002** | In-App Notifications | The system **MUST** display in-app notification toasts with read/unread status. | Medium |
| **FR-NOTIFY-003** | Notification Preferences | The system **MUST** allow users to customize notification settings per type. | Medium |
| **FR-BILLING-001** | Stripe Integration | The system **MUST** integrate with Stripe for premium subscription billing. | Critical |
| **FR-BILLING-002** | Feature Flags | The system **MUST** implement tier-based access control using feature flags. | High |
| **FR-BILLING-003** | Billing Portal | The system **MUST** provide Stripe billing portal for subscription management. | High |
| **FR-ADMIN-001** | Admin Panel | The system **MUST** provide admin panel with 6 management sections. | High |
| **FR-ADMIN-002** | User Role Management | The system **MUST** allow admins to promote/demote user admin roles with audit logging. | High |
| **FR-ADMIN-003** | System Monitoring | The system **MUST** display real-time system metrics and API performance. | Medium |
| **FR-EXPORT-001** | Data Export | The system **MUST** support data export in CSV, JSON, PDF, and Excel formats. | Medium |
| **FR-PWA-001** | Offline Support | The system **MUST** implement service worker for offline access to dashboard. | Low |
| **FR-PWA-002** | Mobile Optimization | The system **MUST** provide mobile-optimized UI with touch gesture support. | High |

### 7.0 Measurable Non-Functional Requirements (NFRs)

| ID | Category | Requirement | Metric / Acceptance Criteria |
|:---|:---|:---|:---|
| **NFR-PERF-001** | Performance | Page Load Time | 95% of page loads **MUST** complete in <2 seconds (Lighthouse target). |
| **NFR-PERF-002** | Performance | API Response Time | 95% of tRPC calls **MUST** respond in <500ms for read operations. |
| **NFR-PERF-003** | Performance | Subscription Detection | Detection algorithm **MUST** process 100 transactions in <5 seconds. |
| **NFR-PERF-004** | Performance | Cancellation Processing | Cancellation requests **MUST** complete within 60 seconds for API method. |
| **NFR-ACC-001** | Accuracy | Subscription Detection | Detection algorithm **MUST** achieve >85% accuracy on production data. |
| **NFR-ACC-002** | Accuracy | AI Categorization | GPT-4 categorization **MUST** achieve >90% consistency with manual review. |
| **NFR-REL-001** | Reliability | System Uptime | The platform **MUST** maintain 99.5% uptime (Vercel SLA). |
| **NFR-REL-002** | Reliability | Database Availability | Neon PostgreSQL **MUST** provide 99.9% availability with automated backups. |
| **NFR-REL-003** | Reliability | Error Recovery | Failed background jobs **MUST** retry with exponential backoff (max 3 retries). |
| **NFR-SEC-001** | Security | Data Encryption | All sensitive data **MUST** be encrypted at rest (AES-256) and in transit (TLS 1.3). |
| **NFR-SEC-002** | Security | Token Security | Plaid tokens **MUST** use AES-256-GCM with unique salts and key rotation every 90 days. |
| **NFR-SEC-003** | Security | Webhook Verification | All webhooks **MUST** verify HMAC signatures before processing. |
| **NFR-SEC-004** | Security | Rate Limiting | API endpoints **MUST** enforce rate limits: 100 req/min (free), 500 req/min (premium). |
| **NFR-SEC-005** | Security | OWASP Compliance | The platform **MUST** pass OWASP Top 10 security checks with zero critical findings. |
| **NFR-SCALE-001** | Scalability | Concurrent Users | The system **MUST** support 1,000 concurrent users without performance degradation. |
| **NFR-SCALE-002** | Scalability | Database Connections | Prisma connection pooling **MUST** handle 100 concurrent database connections. |
| **NFR-SCALE-003** | Scalability | Storage Growth | The system **MUST** support 1M+ transactions without query performance issues. |
| **NFR-USAB-001** | Usability | Mobile Responsiveness | All pages **MUST** render correctly on screens ≥320px width. |
| **NFR-USAB-002** | Usability | Accessibility | The platform **MUST** achieve WCAG 2.1 Level AA compliance. |
| **NFR-USAB-003** | Usability | Error Messages | All errors **MUST** display user-friendly messages with actionable guidance. |
| **NFR-MAINT-001** | Maintainability | Code Quality | The codebase **MUST** maintain zero TypeScript errors and zero ESLint errors. |
| **NFR-MAINT-002** | Maintainability | Test Coverage | The project **MUST** maintain >85% test pass rate across 1,049+ tests. |
| **NFR-MAINT-003** | Maintainability | Documentation | All tRPC procedures **MUST** have JSDoc comments with examples. |
| **NFR-TEST-001** | Testability | Unit Tests | All business logic **MUST** have unit tests with >80% coverage. |
| **NFR-TEST-002** | Testability | E2E Tests | Critical user flows **MUST** have Playwright E2E tests. |
| **NFR-DEPLOY-001** | Deployability | Build Time | CI/CD pipeline **MUST** complete builds in <10 minutes. |
| **NFR-DEPLOY-002** | Deployability | Zero-Downtime | Deployments **MUST** complete with zero downtime using Vercel previews. |

### 8.0 Technical & Architectural Constraints

#### 8.1 Technology Stack

**Frontend Stack:**
- **Framework:** Next.js 15.1.8 (App Router, React Server Components)
- **Language:** TypeScript 5.7.3 (strict mode)
- **Styling:** Tailwind CSS 3.4.17 with custom design system
- **UI Components:** shadcn/ui (20+ components) + Radix UI primitives
- **State Management:** React Query (tRPC integration), Context API (theme)
- **Animations:** Framer Motion 12.19.2
- **Icons:** Lucide React 0.468.0
- **Charts:** Recharts 2.13.3
- **Forms:** React Hook Form 7.54.2 + Zod 3.24.1 validation

**Backend Stack:**
- **API Framework:** tRPC 11.0.0-rc.673 (type-safe APIs)
- **Runtime:** Node.js ≥20.18.0 (enforced in admin panel)
- **Authentication:** Auth.js v5.0.0-beta.25 (NextAuth)
- **ORM:** Prisma 6.11.1
- **Database:** PostgreSQL 15 (Neon Serverless)
- **Validation:** Zod 3.24.1 (shared between frontend/backend)
- **Data Serialization:** SuperJSON 2.2.1 (Date, Map, Set support)

**Third-Party Integrations:**
- **Bank API:** Plaid 36.0.0
- **AI:** OpenAI GPT-4 (via OpenAI SDK)
- **Payments:** Stripe 18.2.1
- **Email:** SendGrid 8.1.4
- **Analytics:** Vercel Analytics 1.5.0 + Speed Insights 1.2.0
- **Error Tracking:** Sentry 9.35.0
- **2FA:** Speakeasy 2.0.0 (TOTP), QRCode 1.5.4

**Testing Stack:**
- **Unit/Integration:** Vitest 3.2.4 + Testing Library 16.1.0
- **E2E:** Playwright 1.53.1
- **Mocking:** MSW 2.7.0 (Mock Service Worker)
- **Coverage:** @vitest/coverage-v8 3.2.4

**DevOps & Infrastructure:**
- **Deployment:** Vercel (app) + Neon PostgreSQL (database)
- **CI/CD:** GitHub Actions
- **Containerization:** Docker (multi-platform support)
- **Package Manager:** npm 10.8.0
- **Linting:** ESLint 9.17.0 (flat config)
- **Formatting:** Prettier 3.6.2 + Prettier Tailwind Plugin

#### 8.2 Architectural Principles

**1. T3 Stack Architecture:**
- App **MUST** follow Create T3 App conventions (Next.js App Router + tRPC + Prisma + Tailwind)
- Type safety **MUST** flow end-to-end: Database schema → tRPC procedures → Frontend components
- Server Components **MUST** be default, Client Components only when needed (interactivity, hooks)

**2. Edge Runtime Compatibility:**
- Middleware **MUST** run in Edge Runtime (Web Standard APIs only)
- Heavy operations (database, file system, email) **MUST** be in API routes or Server Components
- Admin panel **MUST** enforce Node.js runtime via layout configuration

**3. Three-Agent Cancellation Architecture:**
- UnifiedCancellationOrchestratorService **MUST** select optimal method based on provider capabilities
- System **MUST** fallback: API-First → Event-Driven → Lightweight
- Progress updates **MUST** use Server-Sent Events for real-time feedback

**4. Status-Object Pattern:**
- Services **MUST** return status objects instead of throwing exceptions
- Status objects **MUST** include: success flag, data, error message, actionable guidance
- tRPC procedures **MUST** validate status and throw TRPCError with appropriate codes

**5. Security-First Design:**
- All sensitive data **MUST** be encrypted (tokens, secrets, 2FA)
- Webhook endpoints **MUST** verify signatures (HMAC)
- Admin operations **MUST** log to AuditLog with user, IP, timestamp
- Rate limiting **MUST** be enforced per tier (free: 100/min, premium: 500/min)

**6. Progressive Enhancement:**
- Core functionality **MUST** work without JavaScript
- PWA features **MUST** enhance experience without breaking basic usage
- Offline mode **MUST** gracefully degrade with informative messages

#### 8.3 Deployment Environment

**Production Environment:**
- **Platform:** Vercel (Serverless Next.js hosting)
- **Database:** Neon PostgreSQL (Serverless, connection pooling via Prisma)
- **Domain:** subpilot-app.vercel.app (custom domain supported)
- **Edge Network:** Vercel Edge Network (global CDN)
- **Environment Variables:** Managed via Vercel dashboard + .env.local for local dev
- **SSL/TLS:** Automatic HTTPS via Vercel + Let's Encrypt

**Development Environment:**
- **Local Server:** `npm run dev` (Next.js dev server on port 3000)
- **Database:** PostgreSQL 15 (local or Neon dev branch)
- **Email Testing:** Mailhog on port 1025 (SMTP mock server)
- **API Mocking:** MSW for testing third-party APIs

**CI/CD Pipeline:**
- **Build Command:** `npm run build:ci` (no-lint build for CI)
- **Test Command:** `npm run test:coverage && npm run test:e2e`
- **Deployment:** Automatic on push to main branch (Vercel GitHub integration)
- **Preview Deployments:** Automatic for pull requests
- **Environment Validation:** SKIP_ENV_VALIDATION=true for builds

### 9.0 Assumptions, Dependencies & Risks

#### 9.1 Assumptions

1. **Plaid Availability:** Plaid API will remain stable and available with ≥99.9% uptime
2. **Sandbox Limitations:** Plaid sandbox has no default transactions; test data must be generated manually
3. **OpenAI API Access:** GPT-4 API will be accessible with reasonable rate limits and pricing
4. **Stripe Reliability:** Stripe payment processing will maintain enterprise-grade reliability
5. **User Trust:** Users will trust the platform with bank account connection (OAuth flow)
6. **Email Deliverability:** SendGrid will maintain high deliverability rates (>95%)
7. **Browser Support:** Target browsers support ES2020+ features (Chrome, Firefox, Safari, Edge)
8. **Mobile Usage:** 60% of users will access platform via mobile devices
9. **Subscription Patterns:** Recurring transactions follow predictable patterns (same amount, regular intervals)
10. **Provider Cooperation:** Subscription providers will not actively block cancellation automation

#### 9.2 Dependencies

**External Service Dependencies:**
1. **Plaid API:** Bank connection and transaction data retrieval
   - **Risk:** API downtime prevents new bank connections
   - **Mitigation:** Queue failed requests, retry with exponential backoff
2. **OpenAI API:** AI categorization and assistant features
   - **Risk:** Rate limits or outages disable AI features
   - **Mitigation:** Implement caching, fallback to rule-based categorization
3. **Stripe API:** Payment processing and subscription billing
   - **Risk:** Payment failures prevent premium upgrades
   - **Mitigation:** Handle webhooks asynchronously, retry failed payments
4. **SendGrid API:** Email notification delivery
   - **Risk:** Email delivery failures reduce user engagement
   - **Mitigation:** Queue emails, retry failed sends, provide in-app notifications
5. **Vercel Platform:** Application hosting and deployment
   - **Risk:** Platform issues affect production availability
   - **Mitigation:** Rely on Vercel's 99.99% SLA, monitor uptime
6. **Neon PostgreSQL:** Database hosting and persistence
   - **Risk:** Database downtime prevents all operations
   - **Mitigation:** Use Neon's Multi-AZ setup, implement connection pooling
7. **Auth0 (via Auth.js):** OAuth provider for Google/GitHub login
   - **Risk:** Provider outages prevent new logins
   - **Mitigation:** Support multiple auth methods (email magic links)

**Technical Dependencies:**
1. **Next.js 15:** Framework updates may introduce breaking changes
   - **Mitigation:** Pin major versions, test upgrades in preview branches
2. **tRPC 11:** Beta version may have stability issues
   - **Mitigation:** Monitor releases, contribute bug reports to maintainers
3. **Prisma 6:** Schema migrations require careful planning
   - **Mitigation:** Use migration files, test in dev environment first
4. **Node.js 20+:** Runtime compatibility required
   - **Mitigation:** Enforce version in package.json engines field

**Regulatory Dependencies:**
1. **Plaid Token Expiration:** Tokens expire after 90 days
   - **Risk:** Users lose bank connection without warning
   - **Mitigation:** Detect expired tokens, prompt reconnection, send email reminders
2. **PCI DSS Compliance:** Payment data handling must follow standards
   - **Risk:** Non-compliance prevents payment processing
   - **Mitigation:** Use Stripe's hosted checkout, never store card data
3. **GDPR/Privacy Laws:** User data must be deletable on request
   - **Risk:** Legal liability for data retention
   - **Mitigation:** Implement data deletion endpoints, audit logging

#### 9.3 Risks

**Technical Risks:**
1. **Subscription Detection Accuracy:** Algorithm may miss edge cases (annual subscriptions, variable pricing)
   - **Severity:** Medium
   - **Probability:** High
   - **Mitigation:** Continuous algorithm improvement, user confirmation workflow, manual entry option
2. **Plaid Sandbox Limitations:** No default transactions make testing difficult
   - **Severity:** Low
   - **Probability:** High
   - **Mitigation:** Create comprehensive test data generation scripts
3. **Edge Runtime Restrictions:** Middleware cannot access Node.js APIs
   - **Severity:** Medium
   - **Probability:** Medium
   - **Mitigation:** Move heavy operations to API routes, use runtime enforcement for admin panel
4. **Cancellation Automation Reliability:** Providers may change UI/API without notice
   - **Severity:** High
   - **Probability:** Medium
   - **Mitigation:** Monitor provider changes, maintain fallback to manual instructions
5. **TypeScript Compilation Errors:** Complex types may cause build failures
   - **Severity:** Low
   - **Probability:** Low
   - **Mitigation:** Strict type checking in development, comprehensive test coverage

**Security Risks:**
1. **Token Theft:** Encrypted Plaid tokens could be compromised
   - **Severity:** Critical
   - **Probability:** Low
   - **Mitigation:** AES-256-GCM encryption, unique salts, key rotation every 90 days
2. **Webhook Spoofing:** Fake webhooks could manipulate data
   - **Severity:** High
   - **Probability:** Medium
   - **Mitigation:** HMAC signature verification, reject invalid signatures
3. **2FA Bypass:** Attackers may try to circumvent 2FA
   - **Severity:** High
   - **Probability:** Low
   - **Mitigation:** Enforce 2FA for admin accounts, rate limit verification attempts
4. **IDOR Attacks:** Users may access other users' data
   - **Severity:** Critical
   - **Probability:** Low
   - **Mitigation:** Enforce userId checks in all tRPC procedures, comprehensive authorization tests

**Business Risks:**
1. **Plaid Pricing Changes:** Transaction costs may increase
   - **Severity:** Medium
   - **Probability:** Medium
   - **Mitigation:** Monitor pricing, implement transaction limits for free tier
2. **OpenAI API Costs:** GPT-4 usage may become prohibitively expensive
   - **Severity:** Medium
   - **Probability:** Low
   - **Mitigation:** Implement caching, optimize prompts, consider alternative LLMs
3. **User Adoption:** Users may not connect bank accounts due to trust concerns
   - **Severity:** High
   - **Probability:** Medium
   - **Mitigation:** Clear security messaging, Plaid's trusted brand, educational content
4. **Competition:** Existing players (Truebill, Rocket Money) have market dominance
   - **Severity:** High
   - **Probability:** High
   - **Mitigation:** Differentiate with AI features, superior UX, transparent pricing

**Operational Risks:**
1. **Support Load:** High support requests for bank connection issues
   - **Severity:** Medium
   - **Probability:** High
   - **Mitigation:** Comprehensive documentation, in-app help guides, admin panel for support
2. **Compliance Burden:** Privacy regulations may require frequent updates
   - **Severity:** Medium
   - **Probability:** Medium
   - **Mitigation:** Legal review of data handling, audit logging for compliance
3. **Scaling Costs:** Vercel and Neon costs increase with usage
   - **Severity:** Medium
   - **Probability:** High
   - **Mitigation:** Optimize queries, implement caching, monitor usage metrics

---

## Appendix A: Key File Paths & Patterns

### Directory Structure
```
/home/parobek/Code/SubPilot-App/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Auth routes (login, register, verify)
│   │   ├── (dashboard)/         # Protected dashboard routes
│   │   │   ├── admin/           # Admin panel (Node.js runtime enforced)
│   │   │   ├── analytics/       # Analytics page
│   │   │   ├── billing/         # Billing page (standalone)
│   │   │   ├── profile/         # User profile
│   │   │   ├── settings/        # User settings
│   │   │   └── subscriptions/   # Subscription management
│   │   ├── api/                 # API routes (tRPC, webhooks, health)
│   │   └── layout.tsx           # Root layout
│   ├── components/              # React components
│   │   ├── admin/               # Admin panel components
│   │   ├── analytics/           # Analytics components
│   │   ├── auth/                # Auth components
│   │   ├── subscriptions/       # Subscription components
│   │   └── ui/                  # shadcn/ui components
│   ├── server/
│   │   ├── api/
│   │   │   └── routers/         # tRPC routers (8 routers, 50+ endpoints)
│   │   ├── auth.ts              # Auth.js configuration
│   │   ├── auth-edge.ts         # Edge-compatible auth utilities
│   │   └── db.ts                # Prisma client singleton
│   ├── lib/
│   │   ├── crypto-v2.ts         # AES-256-GCM encryption
│   │   ├── plaid.ts             # Plaid API client
│   │   ├── stripe.ts            # Stripe API client
│   │   ├── sendgrid.ts          # SendGrid API client
│   │   └── openai.ts            # OpenAI API client
│   └── env.js                   # Environment variable validation (T3 env)
├── prisma/
│   ├── schema.prisma            # Database schema (20+ models)
│   ├── seed.ts                  # Database seeding
│   └── migrations/              # Prisma migrations
├── docs/                        # Documentation
├── to-dos/                      # Task tracking
├── tests/                       # Test files
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── e2e/                     # Playwright E2E tests
└── public/                      # Static assets
```

### Key Code Patterns

**tRPC Router Pattern:**
```typescript
// src/server/api/routers/example.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const exampleRouter = createTRPCRouter({
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.example.findMany({
        where: { userId: ctx.session.user.id },
      });
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.example.create({
        data: {
          name: input.name,
          userId: ctx.session.user.id,
        },
      });
    }),
});
```

**Status-Object Pattern:**
```typescript
// Service returns status object instead of throwing
type ServiceResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// tRPC procedure validates and throws appropriate error
.mutation(async ({ ctx, input }) => {
  const result = await service.doSomething(input);

  if (!result.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: result.error ?? "Operation failed",
    });
  }

  return result.data;
});
```

**Encryption Pattern:**
```typescript
import { encryptToken, decryptToken } from "~/lib/crypto-v2";

// Encrypt with unique salt
const { encrypted, salt } = await encryptToken(plaintext);
await db.save({ encrypted, salt });

// Decrypt
const plaintext = await decryptToken(encrypted, salt);
```

### Testing Patterns

**Unit Test Pattern (Vitest):**
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('SubscriptionDetection', () => {
  it('should detect monthly recurring transactions', () => {
    const transactions = createMockTransactions();
    const result = detectSubscriptions(transactions);
    expect(result).toHaveLength(1);
    expect(result[0].frequency).toBe('monthly');
  });
});
```

**E2E Test Pattern (Playwright):**
```typescript
import { test, expect } from '@playwright/test';

test('user can connect bank account', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Connect Bank');
  await expect(page).toHaveURL(/plaid/);
  // Plaid sandbox flow...
});
```

---

## Appendix B: Database Schema Overview

**20+ Prisma Models:**
- User (auth + preferences)
- Account (OAuth providers)
- Session (Auth.js sessions)
- VerificationToken (magic links)
- PlaidItem (bank connections)
- Account (bank accounts)
- Transaction (transaction data)
- Subscription (detected subscriptions)
- CancellationRequest (cancellation workflows)
- CancellationProvider (provider configs)
- CancellationLog (cancellation history)
- Conversation (AI assistant)
- Notification (user notifications)
- AuditLog (security events)
- BillingSubscription (Stripe billing)
- AdminFeatureFlag (feature toggles)
- BackgroundJob (job queue)

**Key Relationships:**
- User → PlaidItem (1:many)
- PlaidItem → Account (1:many)
- Account → Transaction (1:many)
- User → Subscription (1:many)
- Subscription → CancellationRequest (1:1)
- User → Conversation (1:many)
- User → BillingSubscription (1:1)

---

## Appendix C: CI/CD Pipeline Details

**GitHub Actions Workflows:**
1. **ci-cd-complete.yml** - Unified workflow
   - Linting (ESLint, Prettier)
   - Type checking (TypeScript)
   - Unit tests (Vitest)
   - E2E tests (Playwright)
   - Docker builds (multi-platform)
   - Security scanning (npm audit)
   - Automatic releases (on version tags)

**Deployment Process:**
1. Push to main → Automatic deployment to Vercel production
2. Pull request → Preview deployment with unique URL
3. Tagged release → Docker images published to GitHub Container Registry

**Environment Variables:**
- Development: .env.local
- CI/CD: GitHub Secrets
- Production: Vercel Environment Variables

---

**End of Specification Document**

**Total Sections:** 9 (Part 1) + 5 (Part 2) = 14
**Total Pages:** ~30+ pages (comprehensive enterprise specification)
**Coverage:** 100% of current SubPilot features, architecture, and deployment
