# Vercel Deployment Guide for SubPilot

This guide will help you deploy SubPilot to Vercel for testing or production use.

## Prerequisites

1. A Vercel account (free tier works)
2. A PostgreSQL database (can use Vercel Postgres, Supabase, or Neon)
3. OAuth app credentials (optional for testing)

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdoublegate%2FSubPilot-App&env=DATABASE_URL,NEXTAUTH_SECRET,NEXTAUTH_URL&envDescription=Required%20environment%20variables&envLink=https%3A%2F%2Fgithub.com%2Fdoublegate%2FSubPilot-App%2Fblob%2Fmain%2F.env.example)

## Manual Deployment Steps

### 1. Install Vercel CLI (if not already installed)

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy the Project

```bash
# From the project root directory
vercel

# Follow the prompts:
# - Set up and deploy: Y
# - Which scope: Select your account
# - Link to existing project: N (for first deployment)
# - Project name: subpilot-test (or your preferred name)
# - Directory: ./ (current directory)
# - Override settings: N
```

### 4. Configure Environment Variables

After initial deployment, set up environment variables in Vercel dashboard:

1. Go to your project in Vercel dashboard
2. Navigate to Settings → Environment Variables
3. Add the following required variables:

#### Required Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Auth.js (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="https://your-project.vercel.app"

# Build
SKIP_ENV_VALIDATION="true"
```

#### Optional Variables (for full functionality)

```env
# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Email (for magic links)
FROM_EMAIL="noreply@yourdomain.com"
SENDGRID_API_KEY="your-sendgrid-api-key"

# Plaid (for bank connections)
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-secret"
PLAID_ENV="sandbox"
```

### 5. Set Up Database

#### Option A: Vercel Postgres

1. In Vercel dashboard, go to Storage
2. Create a new Postgres database
3. Copy the connection string
4. Update DATABASE_URL in environment variables

#### Option B: External Database (Supabase, Neon, etc.)

1. Create a PostgreSQL database
2. Get the connection string
3. Update DATABASE_URL in environment variables

### 6. Run Database Migrations

After setting up the database:

```bash
# Install dependencies locally
npm install

# Run migrations with production database
DATABASE_URL="your-production-database-url" npm run db:push
```

### 7. Redeploy with Environment Variables

```bash
vercel --prod
```

## Test Deployment Configuration

For a minimal test deployment without OAuth:

1. **Database**: Use Vercel Postgres or any PostgreSQL provider
2. **Environment Variables**:

   ```env
   DATABASE_URL="postgresql://..."
   NEXTAUTH_SECRET="test-secret-change-in-production"
   NEXTAUTH_URL="https://your-app.vercel.app"
   SKIP_ENV_VALIDATION="true"
   ```

3. **Features Available**:
   - ✅ Home page
   - ✅ Authentication pages (UI only)
   - ✅ Dashboard (requires login)
   - ❌ OAuth login (needs provider credentials)
   - ❌ Magic links (needs email service)
   - ❌ Bank connections (needs Plaid)

## Production Deployment Checklist

- [ ] Generate secure NEXTAUTH_SECRET
- [ ] Use production database with SSL
- [ ] Configure custom domain
- [ ] Set up OAuth providers with production URLs
- [ ] Configure SendGrid for email
- [ ] Set up Plaid with production credentials
- [ ] Enable Vercel Analytics
- [ ] Configure rate limiting
- [ ] Set up error monitoring (Sentry)

## Troubleshooting

### Build Errors

- **Environment validation errors**: Set `SKIP_ENV_VALIDATION="true"` during build
- **Type errors**: The project uses `npm run build:ci` which skips linting

### Runtime Errors

- **Database connection**: Ensure DATABASE_URL is correct and database is accessible
- **Authentication errors**: Verify NEXTAUTH_URL matches your deployment URL
- **404 on auth pages**: Database migrations may need to be run

### Edge Runtime

The project uses Edge-compatible middleware. No special configuration needed.

## Monitoring

1. **Vercel Dashboard**: Monitor deployments, functions, and errors
2. **Function Logs**: Check API route logs in Vercel dashboard
3. **Analytics**: Enable Vercel Analytics for performance monitoring

## Updates

To deploy updates:

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Rollback

To rollback to a previous deployment:

1. Go to Vercel dashboard
2. Navigate to Deployments
3. Find the previous working deployment
4. Click "..." menu → "Promote to Production"

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [SubPilot Issues](https://github.com/doublegate/SubPilot-App/issues)
