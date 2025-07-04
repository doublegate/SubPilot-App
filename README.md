<!-- markdownlint-disable MD033 -->
# 🚀 SubPilot

<div align="center">
  <img src="images/SubPilot_NewLogo.png" alt="SubPilot Logo" width="400"/>

  <h3>Take Control of Your Recurring Finances</h3>

  <p>
    <a href="https://github.com/doublegate/SubPilot-App/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/doublegate/SubPilot-App/ci-cd-complete.yml?branch=main" alt="Build Status">
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

> **🔐 Version 1.6.0**: Enterprise Security & Compliance Release (July 4, 2025)
> **Live Demo**: [https://subpilot-test.vercel.app](https://subpilot-test.vercel.app)
> **Project Status**: Phase 3 Complete ✅ | Security Hardened ✅ | Production Ready
> **Latest Release**: [View Changelog](./CHANGELOG.md) | **Security Audit**: All Critical Issues Fixed

## 🎯 Key Features

### Core Functionality

- 🏦 **Bank Account Connection** - Secure integration via Plaid with encrypted token storage
- 🔍 **Smart Subscription Detection** - Automatic identification of recurring payments (95%+ accuracy)
- 🤖 **AI-Powered Assistant** - GPT-4 powered chat interface for natural language management
- 🚫 **Unified Cancellation System** - Multi-strategy approach (API → Automation → Manual)
- 📊 **Advanced Analytics** - Real-time dashboards, spending forecasts, and insights
- 📧 **Smart Notifications** - 8 types of alerts for subscription events and anomalies
- 🎨 **Modern UI/UX** - Beautiful interface with Light/Dark/Auto theme support
- 📱 **Progressive Web App** - Installable with offline support

### Premium Features

- 💳 **Stripe Billing Integration** - Subscription tiers with self-service portal
- 🔄 **Real-Time Synchronization** - Webhook-based updates for instant data refresh
- 📈 **Predictive Analytics** - Spending forecasts with confidence intervals
- 💾 **Data Export** - Multiple formats (CSV, JSON, PDF, Excel)
- 🔐 **Enterprise Security** - Audit logging, rate limiting, session management

## 🛠️ Technology Stack

<table>
<tr>
<td width="50%">

### Frontend

- **[Next.js 15.3.4](https://nextjs.org/)** - React framework with App Router
- **[TypeScript 5.8.3](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS 3.4](https://tailwindcss.com/)** - Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** - Component library
- **[React Hook Form 7.59](https://react-hook-form.com/)** - Form handling
- **[Zod](https://zod.dev/)** - Schema validation

</td>
<td width="50%">

### Backend

- **[tRPC v11.4.3](https://trpc.io/)** - Type-safe APIs
- **[Prisma 6.10.1](https://www.prisma.io/)** - Next-gen ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Database
- **[Auth.js v5](https://authjs.dev/)** - Authentication
- **[Plaid API](https://plaid.com/)** - Banking integration
- **[OpenAI API](https://openai.com/)** - AI capabilities

</td>
</tr>
</table>

### Infrastructure & DevOps

- **[Vercel](https://vercel.com/)** - Hosting & Edge Functions
- **[Neon](https://neon.tech/)** - Serverless PostgreSQL
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD Pipeline
- **[Docker](https://www.docker.com/)** - Containerization
- **[Playwright](https://playwright.dev/)** - E2E testing & automation

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

   # AI Assistant (optional but recommended)
   OPENAI_API_KEY="your-openai-api-key"
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

## 📚 Documentation

### Essential Guides

- 📖 [Quick Start Guide](./docs/QUICK-REFERENCE.md) - Get running in 5 minutes
- 🏗️ [Architecture Overview](./docs/ARCHITECTURE.md) - System design
- 🔐 [Authentication Guide](./docs/AUTHENTICATION.md) - Auth implementation
- 🏦 [Bank Integration Guide](./docs/BANK_INTEGRATION.md) - Plaid setup
- 🧪 [Testing Guide](./docs/TESTING_GUIDE.md) - Test strategy
- 🚀 [Production Deployment](./docs/PRODUCTION_DEPLOYMENT.md) - Deploy guide

### API & Technical Docs

- [tRPC API Reference](./docs/API_REFERENCE.md) - All endpoints
- [Database Schema](./docs/DATABASE_DESIGN.md) - Data models
- [Unified Cancellation System](./docs/UNIFIED_CANCELLATION_SYSTEM.md) - Architecture
- [UI Components](./docs/UI_COMPONENTS.md) - Component library

### Development Resources

- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Project Status](./docs/PROJECT-STATUS.md) - Current progress
- [Phase Roadmap](./docs/PROJECT_ROADMAP.md) - Development timeline

## 🔒 Security

SubPilot implements enterprise-grade security measures:

- 🔐 **Authentication** - OAuth providers + Magic Links
- 🔑 **Encryption** - End-to-end encryption for sensitive data
- 📝 **Audit Logging** - Comprehensive security event tracking
- 🛡️ **Protection** - CSRF, XSS prevention, CSP headers
- ⚡ **Rate Limiting** - DDoS protection on all endpoints
- 🚨 **Account Security** - Lockout after failed attempts

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## 🧪 Testing

```bash
# Run all tests
npm test

# Test commands
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run test:e2e      # E2E tests

# Code quality
npm run lint          # ESLint
npm run type-check    # TypeScript
npm run format        # Prettier
```

## 🔐 Security

SubPilot v1.6.0 implements enterprise-grade security measures:

### Security Features

- **Webhook Signature Verification** - All webhooks (Plaid, Stripe, internal) are cryptographically verified
- **Enhanced Encryption** - AES-256-GCM with random salts per operation
- **Authorization Middleware** - IDOR prevention with resource ownership verification
- **Input Validation** - Comprehensive schemas preventing XSS/SQL injection
- **Rate Limiting** - Multi-tier limits with premium benefits
- **Session Management** - Fingerprinting, concurrent limits, suspicious activity detection
- **Error Sanitization** - Automatic redaction of sensitive information
- **Audit Logging** - Comprehensive security event tracking

### Security Testing & Audit Results

- **Security Audit Complete**: 4 critical vulnerabilities identified and fixed
- **123 Dedicated Security Tests**: Comprehensive coverage of all attack vectors
- **Vulnerability Scan**: 0 vulnerabilities in production dependencies
- **Test Coverage**: 80.4% overall coverage with security-focused test suites
- **Build Status**: Passing (with non-blocking linting warnings)

See [SECURITY_FIXES_IMPLEMENTED.md](./docs/SECURITY_FIXES_IMPLEMENTED.md) for detailed security documentation.

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

See [Production Deployment Guide](./docs/PRODUCTION_DEPLOYMENT.md) for detailed instructions.

## 🗺️ Roadmap

### Phase 4: Launch & Marketing (Ready to Begin)

- 🚀 Production launch preparation and optimization
- 🌟 Marketing site and landing page development
- 📱 Native mobile app development (iOS/Android)
- 🌐 International expansion and localization
- 🤝 API platform for third-party integrations
- 📊 Advanced analytics and monitoring

### Future Enhancements

- 👥 Family account sharing
- 💳 Virtual cards for trials
- 🔗 Budgeting app integrations
- 🤝 B2B enterprise features

See [Project Roadmap](./docs/PROJECT_ROADMAP.md) for detailed timeline.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [T3 Stack](https://create.t3.gg/) - Amazing starter template
- [Plaid](https://plaid.com/) - Secure banking API
- [Vercel](https://vercel.com/) - Hosting platform
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- All our [contributors](https://github.com/doublegate/SubPilot-App/graphs/contributors)

## 📊 Project Stats

![GitHub Stars](https://img.shields.io/github/stars/doublegate/SubPilot-App?style=social)
![GitHub Forks](https://img.shields.io/github/forks/doublegate/SubPilot-App?style=social)
![GitHub Issues](https://img.shields.io/github/issues/doublegate/SubPilot-App)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/doublegate/SubPilot-App)
![Test Coverage](https://img.shields.io/badge/test%20coverage-80.4%25-brightgreen)
![Security](https://img.shields.io/badge/vulnerabilities-0-brightgreen)
![Security Audit](https://img.shields.io/badge/security%20audit-passed-brightgreen)

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
