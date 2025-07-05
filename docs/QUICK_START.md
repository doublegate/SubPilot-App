# 🚀 SubPilot Quick Start Guide

Get SubPilot running in **15 minutes** with this streamlined setup guide.

## Prerequisites

- **Node.js 18+** ([Download here](https://nodejs.org/))
- **PostgreSQL** ([Install guide](https://www.postgresql.org/download/))
- **Git** ([Download here](https://git-scm.com/))
- **Plaid Account** ([Sign up](https://dashboard.plaid.com/signup))

## Step 1: Clone & Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/your-org/subpilot-app.git
cd subpilot-app

# Install dependencies
npm install
```

## Step 2: Environment Setup (5 minutes)

Create your environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` with these essential variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/subpilot"

# Authentication (Auth.js)
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Plaid API (Sandbox)
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-sandbox-secret"
PLAID_ENV="sandbox"

# OAuth Providers (Optional for development)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 🔑 Getting Plaid Credentials

1. Visit [Plaid Dashboard](https://dashboard.plaid.com/)
2. Create a new application
3. Choose "Sandbox" environment
4. Copy Client ID and Secret key

## Step 3: Database Setup (3 minutes)

```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma db push

# (Optional) Seed with sample data
npx prisma db seed
```

## Step 4: Start Development (1 minute)

```bash
# Start the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) 🎉

## Step 5: Verify Setup (4 minutes)

### Test Authentication
1. Click "Sign In" button
2. Try Google OAuth or email magic link
3. Verify successful login

### Test Bank Connection
1. Navigate to "Connect Bank" 
2. Use Plaid sandbox credentials:
   - **Username**: `user_good`
   - **Password**: `pass_good`
3. Select "First Platypus Bank"
4. Verify transactions appear

### Test Dashboard
1. Check subscription detection
2. Verify transaction categorization
3. Test notification settings

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Run database studio
npx prisma studio

# Run tests
npm run test

# Run linter
npm run lint

# Build for production
npm run build
```

## 🐛 Common Issues

### Database Connection Error
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Verify database exists
psql -U username -l
```

### Plaid Sandbox Issues
- Ensure you're using **sandbox** environment
- Use test credentials from [Plaid docs](https://plaid.com/docs/sandbox/test-credentials/)

### Port Already in Use
```bash
# Kill process on port 3000
sudo lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- --port 3003
```

### Missing Environment Variables
```bash
# Check all required vars are set
npm run check-env
```

## 📱 Testing with Sample Data

Use these Plaid sandbox accounts for testing:

| Bank | Username | Password | Account Type |
|------|----------|----------|--------------|
| First Platypus Bank | `user_good` | `pass_good` | Checking/Savings |
| Tattersall FCU | `user_good` | `pass_good` | Credit Card |
| Houndstooth Bank | `user_good` | `pass_good` | Investment |

## 🎯 Next Steps

Once you have SubPilot running:

1. **[Read Architecture](./ARCHITECTURE.md)** - Understand the system design
2. **[API Reference](./API_REFERENCE.md)** - Explore tRPC endpoints
3. **[Development Setup](./DEVELOPMENT_SETUP.md)** - Detailed development guide
4. **[Database Design](./DATABASE_DESIGN.md)** - Learn the data models

## 🆘 Need Help?

- 📖 Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
- 🐛 [Open an Issue](https://github.com/your-org/subpilot-app/issues)
- 💬 Ask in [Discord](https://discord.gg/subpilot)

---

**Total Setup Time: ~15 minutes**  
**Status**: ✅ You're ready to develop!