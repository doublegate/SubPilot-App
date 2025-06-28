# SubPilot Product Plan and Technical Implementation Roadmap

**Status**: ✅ PHASE 3 COMPLETE - Living document for Phase 4+  
**Phase**: Phase 1, 2, and 3 Complete, Phase 4 Planning Ready  
**Last Updated**: 2025-06-28

## Overview

SubPilot is a modern web-based platform for monitoring, managing, and canceling recurring subscriptions. The platform is designed with a sleek, interactive user interface powered by the T3 Stack (TypeScript, Tailwind CSS, tRPC, Prisma, Next.js). It will help users gain visibility into their financial commitments and take control of recurring payments.

---

## Core Features

- **Subscription Dashboard**: Visual timeline and list of all active and historical subscriptions
- **Bank Integration**: Automatic transaction parsing via Plaid or similar APIs
- **Smart Categorization**: AI-assisted labeling of subscription types
- **Notifications & Alerts**: Alerts for upcoming renewals, changes in charges, or free trials ending
- **One-Click Cancel**: Where supported, cancel subscriptions directly from the dashboard
- **Analytics & Trends**: Monthly spending summaries, category breakdowns
- **Multi-Device Sync**: Responsive UI across desktop, tablet, mobile
- **Secure Auth**: OAuth-based login with optional 2FA

---

## Tech Stack (T3 Stack-Based)

- **Frontend**: Next.js + Tailwind CSS + TypeScript + shadcn/ui
- **Backend**: tRPC API routes
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: Auth.js (OAuth providers + email magic links)
- **Bank APIs**: Plaid (or Yodlee/Finnhub as fallback options)
- **Payments (optional)**: Stripe integration for premium features
- **Hosting**: Vercel or Fly.io

---

## Phase 0: Project Initialization

### Phase 0 Goals

- Define core product scope
- Set up repo, base configuration, and brand identity

### Phase 0 Tasks

- ✅ Finalize name, logo, and brand identity ("SubPilot")
- ✅ Create Tailwind theme and design tokens
- ✅ Bootstrap project using Create T3 App
- ✅ Setup GitHub Actions for CI/CD
- ✅ Setup dev/staging/production environments (Vercel + Neon)

---

## Phase 1: MVP Buildout

### Phase 1 Goals

Build the core functionality and allow users to connect a bank account, view subscriptions, and receive notifications.

### Phase 1 Tasks

- ✅ User onboarding flow (Auth.js, profile setup)
- ✅ Bank integration (Plaid)
- ✅ Transaction ingestion and normalization
- ✅ Initial subscription recognition logic (regex + heuristics)
- ✅ Subscription dashboard with timeline and category view
- ✅ Notification system (email, in-app toasts)
- ✅ Basic UI components (cards, charts, nav)
- ✅ Deploy to staging

---

## Phase 2: Advanced Features

### Phase 2 Goals

Enable automated insights and partial automation.

### Phase 2 Tasks

- ✅ Smart categorization using OpenAI API or HuggingFace model
- ✅ Trial tracking and renew alerting logic
- ✅ Analytics: monthly reports, churn predictions
- ✅ Export data (CSV, JSON, PDF, Excel)
- ✅ Responsive and accessible layout improvements
- ✅ Unit + e2e testing suite (Vitest + Playwright)

---

## Phase 3: Subscription Management Automation ✅ COMPLETE

### Phase 3 Goals

Make SubPilot a true control center for managing and canceling subs.

### Phase 3 Tasks

- ✅ One-click cancel API integration (where supported by provider)
- ✅ Chatbot or assistant for managing queries (LLM-powered)
- ✅ Premium feature set (multi-account support, AI summaries)
- ✅ Stripe payments + subscription tiering
- ✅ PWA support for mobile
- ✅ **Unified Cancellation System** - Three-agent architecture with intelligent orchestration
  - API-First approach with webhook support
  - Event-Driven approach with job queue and workflows
  - Lightweight approach with manual instructions
  - Real-time status updates via SSE
  - Automatic fallback between methods

---

## Phase 4: Marketing & Monetization

### Phase 4 Goals

Public launch, user acquisition, and revenue generation.

### Phase 4 Tasks

- [ ] Landing page + SEO optimization
- [ ] Marketing site analytics (Plausible/Umami)
- [ ] Launch on ProductHunt, IndieHackers, HackerNews
- [ ] Social media integrations
- [ ] Paid marketing campaigns (Google Ads, Reddit)
- [ ] Collect user feedback and iterate

---

## Security & Privacy

- All data encrypted in transit (TLS) and at rest
- No banking credentials stored directly
- User-controlled data deletion and GDPR compliance
- Strict content security policy and OWASP hardening

---

## Timeline Estimate (Agile Sprints)

- Phase 0: 1 week
- Phase 1: 4 weeks
- Phase 2: 3 weeks
- Phase 3: 3 weeks
- Phase 4: 2 weeks

---

## Team Roles (Suggested)

- **Tech Lead / Full-Stack Dev**: Architecture, backend, integrations
- **Frontend Dev**: UI implementation with Tailwind + shadcn/ui
- **Product Designer**: UX/UI, prototyping, Figma assets
- **Data Engineer**: Transaction parsing, categorization logic
- **DevOps**: CI/CD, environment setup, observability

---

## Future Extensions

- Mobile-native apps (React Native or Flutter)
- Subscription scraping from email receipts (via Gmail API)
- International currency and bank support
- Business account dashboards
- AI assistant for finance coaching

---

**SubPilot is not just a tracker — it's a command center for your recurring finances.**
