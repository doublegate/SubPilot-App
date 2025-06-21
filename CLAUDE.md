# SubPilot - Project Documentation for Claude

## 🎯 Project Overview

SubPilot is a modern subscription management platform built with the T3 Stack. It helps users monitor, manage, and cancel recurring subscriptions by automatically detecting them from bank transactions.

**Current Status**: Early development phase - Project structure initialized, database schema designed, documentation in place. Implementation of core features is pending.

## 🏗️ Architecture Overview

### Tech Stack (T3 Stack)

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: tRPC for type-safe APIs
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: Auth.js (NextAuth v5) with OAuth + Magic Links
- **Bank Integration**: Plaid API for transaction data
- **Deployment**: Vercel (app) + Railway (database)

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
├── to-dos/                # Task tracking (currently empty)
├── src/
│   ├── app/               # Next.js App Router (to be implemented)
│   ├── components/        # React components (to be implemented)
│   ├── server/           # Backend code
│   │   ├── api/          # tRPC routers
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

### ✅ Completed

- Project initialization and structure
- Database schema design
- Documentation framework
- Tailwind CSS theme configuration
- TypeScript configuration
- Development environment setup guide

### 🚧 In Progress / To Do

- [ ] Next.js App Router implementation
- [ ] Authentication setup with Auth.js
- [ ] Component library with shadcn/ui
- [ ] tRPC router implementation
- [ ] Plaid integration for bank connections
- [ ] Transaction parsing and subscription detection
- [ ] Dashboard UI implementation
- [ ] Notification system
- [ ] Testing setup and test writing

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

**Phase 1: MVP Buildout** (Current Focus)

- User authentication system
- Bank account integration via Plaid
- Transaction ingestion and parsing
- Basic subscription detection
- Dashboard UI with subscription list
- Email notification system

## ⚠️ Important Notes

1. **Database First**: The Prisma schema is comprehensive and ready. Use it as the source of truth for data models.

2. **Type Safety**: Leverage tRPC and TypeScript for end-to-end type safety. The types should flow from database → API → frontend.

3. **Server Components**: Default to server components. Only use client components for interactivity.

4. **Security**: All sensitive data (Plaid tokens, etc.) must be encrypted. Never expose API keys in client code.

5. **Testing**: Write tests as you implement features. Don't leave testing until the end.

## 🚦 Next Steps

1. **Set up App Router structure** in `src/app/`
2. **Implement authentication** with Auth.js
3. **Create base UI components** with shadcn/ui
4. **Set up tRPC routers** for API endpoints
5. **Implement Plaid integration** for bank connections
6. **Build dashboard UI** for subscription management

## 📞 External Services

### Plaid (Bank Integration)

- Use sandbox environment for development
- Test credentials available in Plaid dashboard
- Webhook support for real-time updates

### Email Service

- Mailhog for local development
- SendGrid for production

## 🔍 Debugging Tips

1. **Database Issues**: Check Prisma Studio (`npm run db:studio`)
2. **Type Errors**: Run `npm run type-check`
3. **API Issues**: Check tRPC error messages in browser console
4. **Auth Issues**: Check Auth.js logs and session data

## 📝 Repository Information

- **GitHub URL**: <https://github.com/doublegate/SubPilot-App>
- **Visibility**: Public repository
- **License**: MIT License
- **Current Version**: 0.1.0-dev

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

---

**Remember**: This is a T3 Stack project. When in doubt, refer to the T3 Stack documentation and best practices. The project follows standard T3 conventions with some customizations for the subscription management domain.
