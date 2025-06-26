# 🛠️ SubPilot Development Setup

**Last Updated**: 2025-06-26 12:24 AM EDT  
**Project Status**: Production Ready (v0.1.9)  
**Phase 1**: 95% Complete

Complete guide for setting up your local development environment for SubPilot.

## 🎉 Project Status

SubPilot is now **95% complete** with all core features implemented:
- ✅ Complete authentication system with OAuth
- ✅ Full Plaid bank integration
- ✅ Automatic subscription detection (85%+ accuracy)
- ✅ Theme switching system (Light/Dark/Auto)
- ✅ Email notification system
- ✅ Comprehensive dashboard and analytics
- ✅ Production-ready CI/CD pipeline
- ✅ 100% test pass rate (147/147 tests)

## Prerequisites

### Required Software

- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm 9+** (comes with Node.js)
- **PostgreSQL 15+** ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/))
- **VS Code** (recommended) ([Download](https://code.visualstudio.com/))

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

## Project Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/subpilot-app.git
cd subpilot-app

# Install dependencies
npm install

# Install global tools (optional)
npm install -g prisma
npm install -g @next/codemod
```

### 2. Environment Configuration

Create environment files:

```bash
# Copy environment template
cp .env.example .env.local

# Create additional environment files
cp .env.example .env.development
cp .env.example .env.test
```

#### `.env.local` Configuration

```env
# ======================
# DATABASE
# ======================
DATABASE_URL="postgresql://subpilot:password@localhost:5432/subpilot_dev"

# ======================
# AUTH.JS CONFIGURATION
# ======================
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"

# ======================
# OAUTH PROVIDERS
# ======================
# Google OAuth (optional for development)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth (optional for development)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# ======================
# PLAID CONFIGURATION
# ======================
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-sandbox-secret"
PLAID_ENV="sandbox"
PLAID_PRODUCTS="transactions,accounts,identity"
PLAID_COUNTRY_CODES="US,CA"

# ======================
# EMAIL CONFIGURATION
# ======================
# SendGrid (for production)
SENDGRID_API_KEY="your-sendgrid-api-key"
FROM_EMAIL="noreply@subpilot.com"

# Mailhog (for development)
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_USER=""
SMTP_PASS=""

# ======================
# REDIS (OPTIONAL)
# ======================
REDIS_URL="redis://localhost:6379"

# ======================
# EXTERNAL APIS
# ======================
# OpenAI (for AI categorization - Phase 2)
OPENAI_API_KEY="your-openai-api-key"

# ======================
# MONITORING
# ======================
# Sentry (optional)
SENTRY_DSN="your-sentry-dsn"

# ======================
# DEVELOPMENT
# ======================
NODE_ENV="development"
LOG_LEVEL="debug"
ENABLE_QUERY_LOGGING="true"
```

### 3. Database Setup

#### Install PostgreSQL (if not installed)

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
- Download installer from [PostgreSQL website](https://www.postgresql.org/download/windows/)

#### Create Database and User

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create user and database
CREATE USER subpilot WITH PASSWORD 'password';
CREATE DATABASE subpilot_dev OWNER subpilot;
CREATE DATABASE subpilot_test OWNER subpilot;
GRANT ALL PRIVILEGES ON DATABASE subpilot_dev TO subpilot;
GRANT ALL PRIVILEGES ON DATABASE subpilot_test TO subpilot;

# Exit PostgreSQL
\q
```

#### Initialize Database Schema

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed database with sample data
npx prisma db seed

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. External Service Setup

#### Plaid Account Setup

1. **Create Plaid Account**
   - Visit [Plaid Dashboard](https://dashboard.plaid.com/)
   - Sign up for a free account
   - Verify your email

2. **Create Application**
   - Click "Create a new app"
   - Choose "Sandbox" environment
   - Select products: "Transactions", "Accounts", "Identity"
   - Note your `client_id` and `secret`

3. **Update Environment**
   ```env
   PLAID_CLIENT_ID="your_client_id_here"
   PLAID_SECRET="your_secret_here"
   PLAID_ENV="sandbox"
   ```

#### OAuth Provider Setup (Optional)

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs

**GitHub OAuth:**
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Set Authorization callback URL to `http://localhost:3000/api/auth/callback/github`

#### Email Setup (Development)

**Option 1: Mailhog (Recommended for development)**
```bash
# Install Mailhog
brew install mailhog  # macOS
# or
go install github.com/mailhog/MailHog@latest  # Any OS with Go

# Start Mailhog
mailhog

# View emails at http://localhost:8025
```

**Option 2: SendGrid (Production-like)**
1. Create SendGrid account
2. Generate API key
3. Add to `.env.local`

### 5. Redis Setup (Optional)

Redis is used for session storage and caching.

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Docker (Any OS):**
```bash
docker run -d -p 6379:6379 redis:alpine
```

## Development Workflow

### Daily Development

```bash
# Start all services
npm run dev:all

# Or start services individually
npm run dev          # Next.js development server
npm run db:studio    # Prisma Studio (database GUI)
npm run email:dev    # Mailhog email server
```

### Code Quality Tools

```bash
# Linting
npm run lint         # Run ESLint
npm run lint:fix     # Fix auto-fixable issues

# Type checking
npm run type-check   # TypeScript compilation check

# Formatting
npm run format       # Format with Prettier
npm run format:check # Check formatting

# Testing
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run end-to-end tests
```

### Database Operations

```bash
# Schema changes
npx prisma db push          # Push schema changes to database
npx prisma generate         # Regenerate Prisma client
npx prisma migrate dev      # Create and apply migration
npx prisma migrate reset    # Reset database and apply all migrations

# Data operations
npx prisma db seed          # Seed database with test data
npx prisma studio           # Open database GUI

# Schema introspection
npx prisma db pull          # Pull schema from database
npx prisma format           # Format schema file
```

## Project Structure

```
subpilot-app/
├── .env.local                 # Local environment variables
├── .env.example               # Environment template
├── next.config.js             # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies and scripts
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── seed.ts               # Database seeding
│   └── migrations/           # Database migrations
├── public/                   # Static assets
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/          # Authentication routes
│   │   ├── (dashboard)/     # Protected dashboard routes
│   │   ├── api/             # API routes
│   │   ├── globals.css      # Global styles
│   │   └── layout.tsx       # Root layout
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── auth/            # Authentication components
│   │   ├── dashboard/       # Dashboard components
│   │   └── common/          # Shared components
│   ├── lib/                 # Utility libraries
│   │   ├── auth.ts          # Auth.js configuration
│   │   ├── db.ts            # Prisma client
│   │   ├── plaid.ts         # Plaid client
│   │   ├── utils.ts         # General utilities
│   │   └── validations.ts   # Zod schemas
│   ├── server/              # Server-side code
│   │   ├── api/             # tRPC routers
│   │   └── db.ts            # Database connection
│   ├── styles/              # CSS files
│   └── types/               # TypeScript type definitions
├── tests/                   # Test files
│   ├── __mocks__/          # Test mocks
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
├── docs/                   # Documentation
└── css_theme/              # Design system
```

## Development Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:all": "concurrently \"npm run dev\" \"npm run db:studio\" \"mailhog\"",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset --force",
    "postinstall": "prisma generate"
  }
}
```

## Configuration Files

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "checkJs": false,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./src/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    ".eslintrc.cjs",
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "**/*.cjs",
    "**/*.mjs",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

### ESLint Configuration

```javascript
// .eslintrc.cjs
const config = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "next/core-web-vitals",
    "@typescript-eslint/recommended-type-checked",
    "@typescript-eslint/stylistic-type-checked",
  ],
  rules: {
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        prefer: "type-only",
        fixStyle: "inline-type-imports",
      },
    ],
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: { attributes: false },
      },
    ],
  },
};

module.exports = config;
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 80,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

## Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Check PostgreSQL is running
pg_ctl status

# Check database exists
psql -U subpilot -d subpilot_dev -c "\dt"

# Reset database if corrupted
npm run db:reset
```

**Prisma Issues:**
```bash
# Clear Prisma cache
rm -rf node_modules/.prisma
npx prisma generate

# Fix Prisma client issues
npm install @prisma/client
npx prisma generate
```

**Node.js Version Issues:**
```bash
# Check Node.js version
node --version

# Use Node Version Manager
nvm install 18
nvm use 18
```

**Port Conflicts:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Use different port
npm run dev -- --port 3001
```

### Performance Optimization

**Development Performance:**
```javascript
// next.config.js
const config = {
  experimental: {
    optimizeCss: true,
    swcMinify: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};
```

**Database Performance:**
```bash
# Monitor slow queries during development
echo "log_min_duration_statement = 100" >> postgresql.conf
```

## Git Workflow

### Branch Naming

```bash
# Feature branches
git checkout -b feature/subscription-detection
git checkout -b feature/plaid-integration

# Bug fixes
git checkout -b fix/auth-redirect-loop
git checkout -b fix/dashboard-loading

# Hotfixes
git checkout -b hotfix/security-patch
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add subscription detection algorithm"
git commit -m "fix: resolve Plaid webhook authentication"
git commit -m "docs: update API reference for notifications"
git commit -m "test: add unit tests for transaction parser"
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run type-check && npm run test"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{md,json}": ["prettier --write"]
  }
}
```

## Next Steps

Once your development environment is set up:

1. **[Authentication Setup](./AUTHENTICATION.md)** - Configure Auth.js
2. **[Bank Integration](./BANK_INTEGRATION.md)** - Set up Plaid
3. **[Testing Guide](./TESTING_GUIDE.md)** - Write and run tests
4. **[API Reference](./API_REFERENCE.md)** - Explore tRPC endpoints

---

## Recent Fixes (2025-06-26)

### Theme System Improvements
- Fixed text input fields not following dark/light theme on Profile page
- Fixed text input fields not following dark/light theme on Settings/Billing page
- All form inputs now properly respect theme settings across all pages

### UI Enhancements
- Removed redundant "Settings" from "Profile Settings" title (now just "Profile")
- Fixed upcoming renewals calendar overflow issues in Analytics page
- Implemented hover tooltips for calendar dates with many subscriptions
- Calendar now shows truncated lists with "..." indicator

---

**Development Environment Status: ✅ Ready to code!**