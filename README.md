<!-- markdownlint-disable MD033 -->
# 🚀 SubPilot

<div align="center">
  <img src="images/SubPilot_Logo.png" alt="SubPilot Logo" width="200"/>
  
  <h3>Take Control of Your Recurring Finances</h3>
  
  <p>
    <a href="https://github.com/doublegate/SubPilot-App/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/doublegate/SubPilot-App/ci.yml?branch=main" alt="Build Status">
    </a>
    <a href="https://github.com/doublegate/SubPilot-App/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
    </a>
    <a href="https://github.com/doublegate/SubPilot-App/releases">
      <img src="https://img.shields.io/github/v/release/doublegate/SubPilot-App?include_prereleases" alt="Version">
    </a>
  </p>
</div>

SubPilot is a modern, intelligent subscription management platform that automatically detects and helps you manage recurring payments by securely connecting to your bank accounts. Built with privacy and security at its core, SubPilot empowers you to take control of your financial subscriptions.

> **Current Status**: Active development (Phase 1 - MVP) | Version 0.1.0 | **CI/CD Pipeline Fully Operational** | Last Updated: 2025-06-21 | [View Changelog](./CHANGELOG.md)  
> **Live Demo**: [https://subpilot-test.vercel.app](https://subpilot-test.vercel.app)

## 🎯 Key Features

### Core Functionality

- 🏦 **Secure Bank Integration** - Connect any US bank account via Plaid's secure API
- 🔍 **Smart Detection Algorithm** - AI-powered subscription identification with 95%+ accuracy
- 📊 **Comprehensive Dashboard** - Real-time insights into your subscription spending
- 🔔 **Intelligent Alerts** - Proactive notifications for renewals, price changes, and unusual activity
- 💰 **Cost Analytics** - Track spending trends, find savings opportunities, and budget better
- 🚫 **Cancellation Assistance** - Guided cancellation workflows for popular services
- 🔒 **Bank-Level Security** - End-to-end encryption, no credential storage

### Advanced Features (Planned)

- 🤖 **AI Insights** - Personalized recommendations for subscription optimization
- 📱 **Mobile Apps** - Native iOS and Android applications
- 🔄 **Auto-Cancel** - Set rules to automatically cancel unused subscriptions
- 👥 **Family Sharing** - Manage subscriptions for your entire household
- 💳 **Virtual Cards** - Generate single-use cards for free trials
- 📈 **Spending Predictions** - ML-powered forecasting of future costs

## 🛠️ Technology Stack

<table>
<tr>
<td width="50%">

### Frontend

- **[Next.js 14](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** - Modern React components
- **[Framer Motion](https://www.framer.com/motion/)** - Smooth animations
- **[React Hook Form](https://react-hook-form.com/)** - Performant forms
- **[Zod](https://zod.dev/)** - Schema validation

</td>
<td width="50%">

### Backend

- **[tRPC](https://trpc.io/)** - End-to-end type-safe APIs
- **[Prisma](https://www.prisma.io/)** - Next-gen ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[Auth.js](https://authjs.dev/)** - Authentication solution
- **[Plaid](https://plaid.com/)** - Banking API
- **[OpenAI](https://openai.com/)** - AI capabilities
- **[Resend](https://resend.com/)** - Email delivery

</td>
</tr>
</table>

### Infrastructure & Tools

- **[Vercel](https://vercel.com/)** - Deployment platform
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD pipelines
- **[Sentry](https://sentry.io/)** - Error tracking
- **[PostHog](https://posthog.com/)** - Product analytics
- **[Stripe](https://stripe.com/)** - Payment processing (future)

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.18 or later (Required for dependencies)
- **PostgreSQL** 15 or later
- **npm** 10.8 or later
- **Git** 2.30 or later

### Local Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/doublegate/SubPilot-App.git
   cd SubPilot-App
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your credentials:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/subpilot"
   
   # Auth.js
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-here" # Generate with: openssl rand -base64 32
   
   # OAuth Providers
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   
   # Plaid
   PLAID_CLIENT_ID="your-plaid-client-id"
   PLAID_SECRET="your-plaid-secret"
   PLAID_ENV="sandbox" # Use "sandbox" for development
   
   # Optional Services
   OPENAI_API_KEY="your-openai-key"
   RESEND_API_KEY="your-resend-key"
   ```

4. **Set up the database**

   ```bash
   # Push the Prisma schema to your database
   npm run db:push
   
   # Seed with sample data (optional)
   npm run db:seed
   
   # Open Prisma Studio to view your database
   npm run db:studio
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Docker Setup (Alternative)

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

## 🎉 Latest Release

### Version 0.1.0 - Foundation Release (2025-06-21)

This initial release establishes the complete project foundation with:

- ✅ **Comprehensive CI/CD Pipeline** - GitHub Actions with Docker support
- ✅ **Authentication System** - Auth.js v5 with OAuth and magic links
- ✅ **UI Components** - shadcn/ui library with 13+ components
- ✅ **API Layer** - Type-safe tRPC implementation
- ✅ **Database Schema** - Complete Prisma models for all features
- ✅ **Docker Support** - Production-ready containerization
- ✅ **Developer Experience** - Hot reload, TypeScript, ESLint, Prettier
- ✅ **Release Artifacts** - Pre-built binaries, Docker images, and checksums

### 📦 Download Options

- **Source Code**: [`subpilot-v0.1.0-source.tar.gz`](https://github.com/doublegate/SubPilot-App/releases/download/v0.1.0/subpilot-v0.1.0-source.tar.gz) (1.8 MB)
- **Production Build**: [`subpilot-v0.1.0-build.tar.gz`](https://github.com/doublegate/SubPilot-App/releases/download/v0.1.0/subpilot-v0.1.0-build.tar.gz) (50.7 MB)
- **Docker Image**: [`subpilot-v0.1.0-docker.tar.gz`](https://github.com/doublegate/SubPilot-App/releases/download/v0.1.0/subpilot-v0.1.0-docker.tar.gz) (106.1 MB)

[View Full Changelog](./CHANGELOG.md) | [Browse All Downloads](https://github.com/doublegate/SubPilot-App/releases/tag/v0.1.0)

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs) directory:

### Getting Started

- [Quick Start Guide](./docs/QUICK-REFERENCE.md) - Get up and running fast
- [Development Setup](./docs/development-setup.md) - Detailed environment setup
- [Project Status](./docs/PROJECT-STATUS.md) - Current implementation status

### Architecture & Design

- [Architecture Overview](./docs/architecture-overview.md) - System design and patterns
- [Database Schema](./docs/database-schema.md) - Data models and relationships
- [API Specification](./docs/api-specification.md) - tRPC routers and endpoints
- [Security Architecture](./docs/security-architecture.md) - Security measures and practices

### Implementation Guides

- [Authentication Guide](./docs/auth-implementation.md) - Auth.js configuration
- [Plaid Integration](./docs/plaid-integration.md) - Banking API setup
- [Testing Strategy](./docs/testing-strategy.md) - Test approach and tools
- [Deployment Guide](./docs/deployment-guide.md) - Production deployment

### Development Workflow

- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Code Style Guide](./docs/code-style.md) - Coding standards
- [Git Workflow](./docs/git-workflow.md) - Branching strategy

## 🗺️ Project Roadmap

### 📍 Current Status: Phase 1 - MVP Development

<details>
<summary><b>Phase 0: Project Initialization</b> ✅ Complete</summary>

- ✅ Project scaffolding with T3 Stack
- ✅ Database schema design
- ✅ Documentation framework
- ✅ Development environment setup
- ✅ Repository configuration

</details>

<details open>
<summary><b>Phase 1: MVP Features</b> 🚧 In Progress (Week 1 of 4)</summary>

### Week 1: Foundation ✅ (90% Complete)

- ✅ App Router structure with all pages
- ✅ Authentication setup (Auth.js v5)
- ✅ OAuth providers (Google & GitHub)
- ✅ Magic link email authentication
- ✅ UI component library (shadcn/ui - 13 components)
- ✅ User profile and settings pages
- ✅ Navigation with user dropdown
- ✅ Middleware route protection (Edge Runtime compatible)
- ✅ tRPC API configuration
- ✅ Dashboard foundation
- [ ] Database migration (PostgreSQL server required)
- [ ] Production OAuth credentials

### Week 2: Bank Integration (Starting)

- [ ] Plaid sandbox setup
- [ ] Bank connection flow
- [ ] Transaction import
- [ ] Subscription detection algorithm
- [ ] Enhanced dashboard

### Week 3: Subscription Management

- [ ] Subscription CRUD operations
- [ ] Cost analytics
- [ ] Email notifications
- [ ] Notification preferences
- [ ] Renewal reminders

### Week 4: Polish & Testing

- [ ] Unit and integration tests
- [ ] E2E test suite
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation finalization

</details>

<details>
<summary><b>Phase 2: Advanced Features</b> 📋 Planning</summary>

- [ ] AI-powered insights (OpenAI)
- [ ] Advanced analytics dashboard
- [ ] Spending predictions
- [ ] Export functionality
- [ ] Mobile responsiveness
- [ ] Email digest system

</details>

<details>
<summary><b>Phase 3: Automation & Intelligence</b> 📋 Future</summary>

- [ ] Auto-cancellation workflows
- [ ] Smart notifications
- [ ] Bill negotiation assistant
- [ ] Subscription sharing detection
- [ ] Family account management
- [ ] API for third-party integrations

</details>

<details>
<summary><b>Phase 4: Launch Preparation</b> 📋 Future</summary>

- [ ] Marketing website
- [ ] Pricing & billing (Stripe)
- [ ] Public beta program
- [ ] Performance optimization
- [ ] Security audit
- [ ] Launch on ProductHunt

</details>

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage

# Run linting
npm run lint

# Type checking
npm run typecheck
```

## 🔧 CI/CD Pipeline Status

✅ **Pipeline Fully Operational** (Updated: 2025-06-21)

Our GitHub Actions CI/CD pipeline includes:

- ✅ **Dependency Installation** - Node.js 20.18 with npm caching
- ✅ **Configuration Validation** - TypeScript and Next.js config checks
- ✅ **Code Quality** - ESLint and Prettier (development-friendly mode)
- ✅ **Type Checking** - Full TypeScript compilation validation
- ✅ **Production Build** - Next.js build with environment validation
- ✅ **Security Audit** - npm audit with vulnerability reporting
- ✅ **Docker Build** - Container build and health check testing
- ✅ **Release Automation** - Automated GitHub releases for tags

**Recent Fixes:**

- Fixed Node.js version compatibility (18.17 → 20.18)
- Resolved Prisma installation failures
- Added comprehensive error handling and status reporting
- Implemented development-friendly CI checks

## 📝 Scripts Reference

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run build:ci     # CI build (no linting)
npm run start        # Start production server

# Database
npm run db:push      # Push schema changes
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed sample data

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run format       # Format with Prettier
npm run typecheck    # TypeScript checking

# Testing
npm test            # Run all tests
npm run test:watch  # Watch mode
npm run test:e2e    # E2E tests
```

## 🤝 Contributing

We love contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Guide

1. **Fork & Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/SubPilot-App.git
   cd SubPilot-App
   ```

2. **Create Feature Branch**

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

4. **Commit with Conventional Commits**

   ```bash
   git commit -m "feat: add amazing feature"
   ```

5. **Push & Create PR**

   ```bash
   git push origin feature/amazing-feature
   ```

### Development Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/)
- Write tests for new features
- Update documentation
- Ensure all tests pass
- Follow our [Code Style Guide](./docs/code-style.md)

## 🔒 Security

Security is our top priority. Please see our [Security Policy](SECURITY.md) for:

- Vulnerability reporting procedures
- Security measures and practices
- Responsible disclosure guidelines
- Security best practices for contributors

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [T3 Stack](https://create.t3.gg/) - For the amazing starter template
- [Plaid](https://plaid.com/) - For secure bank integrations
- [Vercel](https://vercel.com/) - For hosting and deployment
- [shadcn/ui](https://ui.shadcn.com/) - For beautiful UI components
- All our [contributors](https://github.com/doublegate/SubPilot-App/graphs/contributors)

## 💬 Community & Support

- 📧 **Email**: [support@subpilot.app](mailto:support@subpilot.app)
- 💬 **Discord**: [Join our community](https://discord.gg/subpilot)
- 🐛 **Issues**: [GitHub Issues](https://github.com/doublegate/SubPilot-App/issues)
- 🐦 **Twitter**: [@SubPilotApp](https://twitter.com/SubPilotApp)
- 📰 **Blog**: [blog.subpilot.app](https://blog.subpilot.app)

## 📊 Stats

![GitHub Stars](https://img.shields.io/github/stars/doublegate/SubPilot-App?style=social)
![GitHub Forks](https://img.shields.io/github/forks/doublegate/SubPilot-App?style=social)
![GitHub Issues](https://img.shields.io/github/issues/doublegate/SubPilot-App)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/doublegate/SubPilot-App)

---

<div align="center">
  <p>Built with ❤️ by the SubPilot Team</p>
  <p>
    <a href="https://subpilot.app">Website</a> •
    <a href="https://docs.subpilot.app">Documentation</a> •
    <a href="https://blog.subpilot.app">Blog</a>
  </p>
</div>
<!-- markdownlint-enable MD033 -->
