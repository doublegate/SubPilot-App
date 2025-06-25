# SubPilot Quick Reference Guide

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/yourusername/subpilot-app.git
cd subpilot-app
npm install
cp .env.example .env.local

# Configure environment variables in .env.local

# Database setup
npm run db:push

# Start development
npm run dev
```

## 📁 Key Documentation

### Getting Started
- [README.md](../README.md) - Project overview
- [CONTRIBUTING.md](../CONTRIBUTING.md) - How to contribute
- [Development Setup](./development-setup.md) - Detailed setup guide

### Architecture & Technical
- [Architecture Overview](./architecture-overview.md) - System design
- [API Specification](./api-specification.md) - API endpoints
- [Database Schema](./database-schema.md) - Data models
- [Technology Stack](./technology-stack.md) - Tech details

### Implementation Guides
- [Authentication](./auth-implementation.md) - Auth.js setup
- [Plaid Integration](./plaid-integration.md) - Bank connections
- [Testing Strategy](./testing-strategy.md) - Test approach

### Phase Documentation
- [Phase 0 - Initialization](../to-dos/phase-0-initialization.md) ✅
- [Phase 1 - MVP](../to-dos/phase-1-mvp.md) 🚧
- [Phase 2 - Advanced](../to-dos/phase-2-advanced.md) 📋
- [Phase 3 - Automation](../to-dos/phase-3-automation.md) 📋
- [Phase 4 - Launch](../to-dos/phase-4-launch.md) 📋

### Current Tasks
- [Master TODO](../to-dos/00-MASTER-TODO.md) - All tasks
- [Week 1 Tasks](../to-dos/phase-1-mvp.md#week-1-foundation-ui--auth) - Current focus

## 🛠️ Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed test data

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run format       # Format with Prettier
npm run typecheck    # Type checking

# Testing (when configured)
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run test:e2e     # E2E tests
```

## 🔑 Environment Variables

Required variables in `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl"

# OAuth Providers
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Plaid
PLAID_CLIENT_ID=""
PLAID_SECRET=""
PLAID_ENV="sandbox"

# Optional
OPENAI_API_KEY=""
RESEND_API_KEY=""
```

## 📂 Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── (auth)/       # Auth pages
│   ├── (dashboard)/  # Protected pages
│   └── api/          # API routes
├── components/       # React components
│   ├── ui/           # shadcn/ui components
│   └── features/     # Feature components
├── server/           # Backend logic
│   ├── api/          # tRPC routers
│   └── db.ts         # Database client
├── lib/              # Utilities
├── hooks/            # Custom React hooks
└── types/            # TypeScript types
```

## 🎯 Current Implementation Status

| Feature | Status | Location |
|---------|--------|----------|
| Project Setup | ✅ | Complete |
| Documentation | ✅ | `/docs` |
| Database Schema | ✅ | `/prisma/schema.prisma` |
| App Router | ✅ | `/src/app` |
| Authentication | ✅ | `/src/app/(auth)` |
| UI Components | ✅ | `/src/components` |
| API Routes | ✅ | `/src/server/api` |
| Testing | ✅ | 82.4% pass rate |
| CI/CD Pipeline | ✅ | GitHub Actions |
| Live Deployment | ✅ | Vercel |
| Plaid Integration | 🚧 | `/src/lib/plaid` |

## 🔗 Important Links

### Internal
- [Project Status](./PROJECT-STATUS.md)
- [Security Policy](../SECURITY.md)
- [Changelog](../CHANGELOG.md)

### External
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [tRPC Docs](https://trpc.io/docs)
- [Auth.js Docs](https://authjs.dev)
- [Plaid Docs](https://plaid.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

## 💡 Development Tips

1. **Always run linting before commits**
   ```bash
   npm run lint:fix && npm run format
   ```

2. **Check TypeScript errors**
   ```bash
   npm run typecheck
   ```

3. **Use Prisma Studio for database inspection**
   ```bash
   npm run db:studio
   ```

4. **Follow the implementation order in phase docs**

5. **Reference existing patterns in the codebase**

## 🆘 Getting Help

- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Review relevant phase documentation
- Check [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines
- Open an issue with the `question` label

---

*Last Updated: 2025-06-25 01:57 AM EDT*  
*For detailed information on any topic, refer to the full documentation in the `/docs` directory.*