<!-- markdownlint-disable MD033 -->
# 🚀 SubPilot

<div align="center">
  <img src="images/SubPilot_NewLogo.png" alt="SubPilot Logo" width="400"/>

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
    <a href="https://subpilot-test.vercel.app">
      <img src="https://img.shields.io/badge/demo-live-brightgreen" alt="Live Demo">
    </a>
  </p>
</div>

SubPilot is a modern, intelligent subscription management platform that automatically detects and helps you manage recurring payments by securely connecting to your bank accounts. Built with privacy and security at its core, SubPilot empowers you to take control of your financial subscriptions.

> **Current Status**: Active Development (Phase 1 - MVP, 70% Complete) | Version 0.1.7 | **Live Demo Available** | Last Updated: 2025-06-25 03:16 AM EDT | [View Changelog](./CHANGELOG.md)
> **Live Demo**: [https://subpilot-test.vercel.app](https://subpilot-test.vercel.app) - Bank sync working, subscription detection active, real-time dashboard

## 🔥 Recent Updates (v0.1.7 - June 24, 2025)

### 🎉 v0.1.7 Dashboard Debugging Release

- ✅ **Dashboard Aggregation Fix** - Fixed zero-value display issue for all metrics
- ✅ **Plaid Sandbox Solution** - Created test data population for development
- ✅ **Subscription Detection** - Improved thresholds and frequency windows
- ✅ **Debugging Tools** - Comprehensive scripts for data flow analysis
- ✅ **CI/CD Pipeline** - Fixed TypeScript compilation errors in test mocks

### 📊 v0.1.6 Maintenance Release (June 22, 2025)

- ✅ **CSS Loading Fix** - Resolved critical issue preventing styles from loading
- ✅ **Test Coverage** - Achieved 100% pass rate (147/147 tests)
- ✅ **ESLint Fixes** - Resolved all 147 ESLint errors
- ✅ **Docker Security** - Fixed ARG/ENV warnings for secrets
- ✅ **Code Quality** - Prettier formatting applied throughout

### 📊 v0.1.5 Major Features (June 21, 2025)

- ✅ **Complete Bank Synchronization** - Plaid integration with automatic transaction import
- ✅ **Automatic Subscription Detection** - Intelligent pattern matching algorithm
- ✅ **Dashboard Overhaul** - Fixed UI issues, real-time data updates
- ✅ **Enhanced Security** - Content Security Policy fixes for Plaid
- ✅ **Test Coverage** - 100% pass rate (147/147 tests passing)

### 📊 Progress Metrics

- **Phase 1 Progress**: 70% complete (Weeks 1-2 done)
- **Story Points**: 65+ completed (162.5% velocity)
- **Components**: 20+ React components
- **API Endpoints**: 35+ tRPC procedures
- **Live Features**: Bank sync, subscription detection, real dashboard

## 🎯 Key Features

### Currently Working ✅

- 🏦 **Bank Account Connection** - Connect via Plaid Link
- 🔄 **Transaction Synchronization** - Import 30+ days of history
- 🔍 **Subscription Detection** - Automatic recurring payment identification
- 📊 **Real-Time Dashboard** - Live statistics from your bank data
- 🔔 **Notifications** - Alerts when new subscriptions detected
- 🔐 **Secure Authentication** - OAuth (Google/GitHub) + Magic Links
- 💾 **Data Persistence** - PostgreSQL with Prisma ORM

### In Development 🚧

- 📧 **Email Notifications** - Renewal reminders (Week 3)
- 🚫 **Cancellation Assistance** - Guided workflows (Week 3)
- 📈 **Spending Analytics** - Detailed insights (Week 3)
- 🔍 **Advanced Search** - Filter and find subscriptions (Week 3)

### Planned Features 📋

- 🤖 **AI Insights** - Personalized recommendations
- 📱 **Mobile Apps** - iOS and Android native apps
- 🔄 **Auto-Cancel** - Rule-based cancellations
- 👥 **Family Sharing** - Household management
- 💳 **Virtual Cards** - Free trial protection

## 🛠️ Technology Stack

<table>
<tr>
<td width="50%">

### Frontend

- **[Next.js 15.1.8](https://nextjs.org/)** - React framework with App Router
- **[TypeScript 5.x](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS 3.4](https://tailwindcss.com/)** - Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** - 15+ React components
- **[React Hook Form](https://react-hook-form.com/)** - Form handling
- **[Zod](https://zod.dev/)** - Schema validation
- **[Sonner](https://sonner.emilkowal.ski/)** - Toast notifications

</td>
<td width="50%">

### Backend

- **[tRPC v11](https://trpc.io/)** - Type-safe APIs
- **[Prisma 6.2](https://www.prisma.io/)** - Next-gen ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Database
- **[Auth.js v5](https://authjs.dev/)** - Authentication
- **[Plaid API](https://plaid.com/)** - Banking integration
- **[Nodemailer](https://nodemailer.com/)** - Email delivery
- **[date-fns](https://date-fns.org/)** - Date manipulation

</td>
</tr>
</table>

### Infrastructure & DevOps

- **[Vercel](https://vercel.com/)** - Hosting & Edge Functions
- **[Neon](https://neon.tech/)** - Serverless PostgreSQL
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD
- **[Docker](https://www.docker.com/)** - Containerization
- **[Vitest](https://vitest.dev/)** - Unit testing
- **[Playwright](https://playwright.dev/)** - E2E testing

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.18+ (Required for Next.js 15)
- **npm** 10.8+
- **PostgreSQL** 15+ (or use Neon cloud)
- **Git** 2.30+

### Quick Start (5 minutes)

1. **Clone and install**

   ```bash
   git clone https://github.com/doublegate/SubPilot-App.git
   cd SubPilot-App
   npm install
   ```

2. **Set up environment**

   ```bash
   cp .env.example .env.local
   ```

3. **Configure minimum required variables in `.env.local`**

   ```env
   # Database (use Neon for quick setup)
   DATABASE_URL="postgresql://..."

   # Auth.js (generate with: openssl rand -base64 32)
   NEXTAUTH_SECRET="your-secret-here"
   NEXTAUTH_URL="http://localhost:3000"

   # Plaid (get from dashboard.plaid.com)
   PLAID_CLIENT_ID="your-client-id"
   PLAID_SECRET="your-secret"
   PLAID_ENV="sandbox"
   PLAID_PRODUCTS="transactions"
   PLAID_COUNTRY_CODES="US"
   ```

4. **Initialize database**

   ```bash
   npm run db:push
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

6. **Open browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Detailed Setup Guide

For comprehensive setup instructions including OAuth configuration, see our [Development Setup Guide](./docs/DEVELOPMENT_SETUP.md).

## 🎉 Latest Release

### v0.1.6 - Maintenance Release (2025-06-22)

### Fixes and Improvements

- ✅ Fixed critical CSS loading issue
- ✅ Dashboard statistics display improvements
- ✅ Enhanced mock data generator
- ✅ Build system optimizations
- ✅ Development workflow improvements

### Previous Release: v0.1.5 - Bank Sync & Dashboard (2025-06-21)

- ✅ Complete Plaid bank integration
- ✅ Automatic subscription detection algorithm
- ✅ Real-time dashboard with live data
- ✅ Fixed all UI layout issues
- ✅ Enhanced security and error handling

[View Release Notes](https://github.com/doublegate/SubPilot-App/releases/tag/v0.1.6) | [Full Changelog](./CHANGELOG.md)

## 📚 Documentation

### Essential Guides

- 📖 [Quick Start Guide](./docs/QUICK-REFERENCE.md) - Get running in 5 minutes
- 🏗️ [Architecture Overview](./docs/ARCHITECTURE.md) - System design
- 🔐 [Authentication Guide](./docs/AUTHENTICATION.md) - Auth implementation
- 🏦 [Bank Integration Guide](./docs/BANK_INTEGRATION.md) - Plaid setup
- 🧪 [Testing Guide](./docs/TESTING_GUIDE.md) - Test strategy
- 🚀 [Deployment Guide](./docs/VERCEL-DEPLOYMENT.md) - Production deploy

### API Documentation

- [tRPC API Reference](./docs/API_REFERENCE.md) - All endpoints
- [Database Schema](./docs/DATABASE_DESIGN.md) - Data models
- [Environment Variables](./config/ENV_SETUP.md) - Configuration

### Development Resources

- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Project Status](./docs/PROJECT-STATUS.md) - Current progress
- [Phase Roadmap](./docs/PROJECT_ROADMAP.md) - Development timeline

## 🗺️ Development Roadmap

### Phase 1: MVP (70% Complete) 🚧

<details open>
<summary><b>Current Sprint - Week 3: Email & Subscriptions</b></summary>

### Starting Monday, June 24, 2025

- [ ] Email notification system
- [ ] Subscription management UI
- [ ] Cancellation workflows
- [ ] Advanced filtering
- [ ] Spending analytics

</details>

<details>
<summary><b>✅ Week 1-2 Completed Features</b></summary>

### Week 1: Foundation (100% Complete)

- ✅ Complete authentication system (OAuth + Magic Links)
- ✅ 15+ UI components with shadcn/ui
- ✅ All 6 API routers (35+ endpoints)
- ✅ User dashboard and settings
- ✅ CI/CD pipeline with Docker
- ✅ Live Vercel deployment

### Week 2: Bank Integration (100% Complete)

- ✅ Plaid integration
- ✅ Transaction sync
- ✅ Subscription detection
- ✅ Dashboard improvements
- ✅ Test framework (83.2% pass rate)

</details>

### Phase 2-4: Future Roadmap 📋

<details>
<summary><b>Phase 2: Advanced Features</b></summary>

- AI-powered insights
- Advanced analytics
- Spending predictions
- Data export
- Mobile optimization

</details>

<details>
<summary><b>Phase 3: Automation</b></summary>

- Auto-cancellation
- Smart notifications
- Bill negotiation
- Family management
- API platform

</details>

<details>
<summary><b>Phase 4: Launch</b></summary>

- Marketing website
- Billing system
- Beta program
- Performance optimization
- ProductHunt launch

</details>

## 🧪 Testing

```bash
# Run all tests (83.2% pass rate)
npm test

# Test commands
npm run test:watch    # Watch mode
npm run test:unit     # Unit tests only
npm run test:e2e      # E2E tests
npm run test:coverage # Coverage report

# Code quality
npm run lint          # ESLint
npm run lint:fix      # Auto-fix
npm run format        # Prettier
npm run type-check    # TypeScript
```

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server

# Database
npm run db:push      # Sync schema to database
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio GUI
npm run db:seed      # Seed sample data
npm run db:reset     # Reset database (caution!)

# Utilities
npm run analyze      # Bundle analyzer
npm run clean        # Clean build artifacts
```

## 🚀 Deployment

### Vercel (Recommended)

1. Fork this repository
2. Import to Vercel
3. Add environment variables
4. Deploy!

### Docker

```bash
# Using Docker Compose
docker-compose up -d

# Using Docker directly
docker build -t subpilot .
docker run -p 3000:3000 --env-file .env.local subpilot
```

See [Deployment Guide](./docs/VERCEL-DEPLOYMENT.md) for detailed instructions.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Use [Conventional Commits](https://www.conventionalcommits.org/)
- Write tests for new features
- Update relevant documentation
- Ensure CI/CD passes
- Follow TypeScript best practices

## 🔒 Security

Security is our top priority. See [SECURITY.md](SECURITY.md) for:

- Vulnerability reporting
- Security measures
- Best practices
- Responsible disclosure

**Report vulnerabilities to**: <security@subpilot.app>

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [T3 Stack](https://create.t3.gg/) - Amazing starter template
- [Plaid](https://plaid.com/) - Secure banking API
- [Vercel](https://vercel.com/) - Hosting platform
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful components
- All our [contributors](https://github.com/doublegate/SubPilot-App/graphs/contributors)

## 💬 Connect With Us

- 🌐 **Website**: [subpilot.app](https://subpilot.app) (coming soon)
- 📧 **Email**: [hello@subpilot.app](mailto:hello@subpilot.app)
- 🐛 **Issues**: [GitHub Issues](https://github.com/doublegate/SubPilot-App/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/doublegate/SubPilot-App/discussions)

## 📊 Project Stats

![GitHub Stars](https://img.shields.io/github/stars/doublegate/SubPilot-App?style=social)
![GitHub Forks](https://img.shields.io/github/forks/doublegate/SubPilot-App?style=social)
![GitHub Issues](https://img.shields.io/github/issues/doublegate/SubPilot-App)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/doublegate/SubPilot-App)
![Test Coverage](https://img.shields.io/badge/test%20coverage-83.2%25-brightgreen)

---

<div align="center">
  <p>Built with ❤️ by the SubPilot Team</p>
  <p>
    <a href="https://subpilot-test.vercel.app">Live Demo</a> •
    <a href="./docs">Documentation</a> •
    <a href="https://github.com/doublegate/SubPilot-App/releases">Releases</a>
  </p>
</div>
<!-- markdownlint-enable MD033 -->
