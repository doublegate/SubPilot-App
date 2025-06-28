# 🚀 SubPilot Production Setup Guide

**Status**: ✅ COMPLETE - Production deployment guide created  
**Phase**: Phase 1 MVP Complete  
**Purpose**: Step-by-step production deployment instructions

This guide provides step-by-step instructions for deploying SubPilot to production with all required integrations and monitoring.

## 📋 Quick Start Checklist

1. **OAuth Setup** → [OAUTH_SETUP.md](docs/OAUTH_SETUP.md)
2. **Email Service** → [SENDGRID_SETUP.md](docs/SENDGRID_SETUP.md)  
3. **Environment Validation** → [Run validation script](#validation)
4. **Production Deployment** → [PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)

## 🔧 Production Requirements

### Core Services Required

| Service | Purpose | Status | Setup Guide |
|---------|---------|--------|-------------|
| **Vercel** | Hosting & Deployment | ✅ Ready | Auto-configured |
| **Neon PostgreSQL** | Production Database | ✅ Ready | Auto-configured |
| **Google OAuth** | User Authentication | ⏳ Manual Setup | [Setup Guide](docs/OAUTH_SETUP.md#google-oauth-setup) |
| **GitHub OAuth** | User Authentication | ⏳ Manual Setup | [Setup Guide](docs/OAUTH_SETUP.md#github-oauth-setup) |
| **SendGrid** | Email Delivery | ⏳ Manual Setup | [Setup Guide](docs/SENDGRID_SETUP.md) |
| **Plaid** | Bank Integration | ⏳ Manual Setup | [Production Application Required](docs/PRODUCTION_DEPLOYMENT.md#plaid-production-setup) |
| **Sentry** | Error Tracking | ⏳ Optional | [Auto-configured when DSN provided](docs/PRODUCTION_DEPLOYMENT.md#sentry-error-tracking) |

### Optional Services

| Service | Purpose | Priority | Setup |
|---------|---------|----------|-------|
| **Redis** | Session Storage | Low | Environment variable |
| **OpenAI** | AI Categorization | Low | API key only |

## 🏗️ Setup Process

### Step 1: Environment Validation

Validate your current environment configuration:

```bash
npm run validate:production
```

This will check all required environment variables and provide specific guidance for missing configurations.

### Step 2: OAuth Provider Setup

#### Google OAuth (Required for Google Sign-in)
1. Follow [Google OAuth Setup Guide](docs/OAUTH_SETUP.md#google-oauth-setup)
2. Add environment variables:
   ```bash
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret"
   ```

#### GitHub OAuth (Required for GitHub Sign-in)
1. Follow [GitHub OAuth Setup Guide](docs/OAUTH_SETUP.md#github-oauth-setup)
2. Add environment variables:
   ```bash
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"
   ```

### Step 3: Email Service Setup

#### SendGrid (Required for Email Delivery)
1. Follow [SendGrid Setup Guide](docs/SENDGRID_SETUP.md)
2. Add environment variables:
   ```bash
   SENDGRID_API_KEY="SG.your-sendgrid-api-key"
   FROM_EMAIL="noreply@subpilot.com"
   ```

### Step 4: Plaid Production Application

#### Production Bank Integration
1. Apply for Plaid production access
2. Complete business verification
3. Add production credentials:
   ```bash
   PLAID_CLIENT_ID="your-production-plaid-client-id"
   PLAID_SECRET="your-production-plaid-secret"
   PLAID_ENV="production"
   ```

### Step 5: Error Tracking (Optional)

#### Sentry Configuration
1. Create Sentry account and project
2. Add environment variable:
   ```bash
   SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
   ```

## 🧪 Testing & Validation

### Automated Testing

```bash
# Validate environment configuration
npm run validate:production

# Test all production integrations
npm run test:production

# Test email delivery specifically
npm run test:email
```

### Manual Testing

1. **Authentication Flows**
   - Google OAuth login
   - GitHub OAuth login  
   - Magic link email authentication

2. **Bank Integration**
   - Connect bank account via Plaid
   - Verify transaction sync
   - Test subscription detection

3. **Email Delivery**
   - Welcome email on signup
   - Magic link email delivery
   - Subscription alert notifications

## 🌐 Environment Variables

### Required for Production

```bash
# Core Application
NODE_ENV="production"
NEXTAUTH_SECRET="your-64-character-production-secret"
NEXTAUTH_URL="https://subpilot.com"

# Database
DATABASE_URL="postgresql://production-connection-string"

# OAuth Providers (at least one required)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"  
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Email Service (required)
SENDGRID_API_KEY="your-sendgrid-api-key"
FROM_EMAIL="noreply@subpilot.com"

# Bank Integration (required)
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-secret"
PLAID_ENV="production"
PLAID_WEBHOOK_URL="https://subpilot.com/api/webhooks/plaid"
```

### Optional for Production

```bash
# Error Tracking
SENTRY_DSN="your-sentry-dsn"

# Additional Features
OPENAI_API_KEY="your-openai-api-key"
REDIS_URL="your-redis-connection-string"
```

## 🚀 Deployment Process

### Vercel Deployment

1. **Connect Repository**
   ```bash
   # Link to Vercel (one-time setup)
   vercel --prod
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all required production environment variables
   - Ensure "Production" environment is selected

3. **Deploy to Production**
   ```bash
   # Automatic deployment on main branch push
   git push origin main
   
   # Or manual deployment
   vercel --prod
   ```

### Custom Domain Setup

1. **Add Domain in Vercel**
   - Go to Vercel Dashboard → Project → Settings → Domains
   - Add `subpilot.com` and `www.subpilot.com`

2. **Configure DNS**
   ```dns
   # A Record
   subpilot.com → [Vercel IP from dashboard]
   
   # CNAME Record  
   www.subpilot.com → subpilot.com
   ```

## 📊 Monitoring & Health Checks

### Application Health

```bash
# Check application health
curl https://subpilot.com/api/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-06-25T...",
  "version": "0.1.8",
  "environment": "production",
  "checks": {
    "database": "healthy",
    "email": "configured", 
    "plaid": "configured",
    "sentry": "configured"
  },
  "responseTime": 145
}
```

### Monitoring Dashboards

- **Vercel Analytics**: Application performance and usage
- **Sentry**: Error tracking and performance monitoring
- **Neon**: Database performance and connection monitoring
- **SendGrid**: Email delivery metrics and reputation

## 🚨 Troubleshooting

### Common Issues

#### OAuth Login Fails
- Verify redirect URIs match exactly in provider settings
- Check client ID and secret are correct
- Ensure HTTPS is used in production

#### Email Not Delivered
- Check SendGrid domain authentication
- Verify API key has correct permissions
- Check sender reputation in SendGrid dashboard

#### Database Connection Issues
- Verify DATABASE_URL is correct
- Check SSL requirements (sslmode=require)
- Monitor connection limits in Neon dashboard

#### Plaid Integration Issues
- Ensure production environment is approved
- Verify webhook URL is accessible
- Check Plaid production credentials

### Getting Help

1. **Check Application Logs**
   - Vercel: Function logs in dashboard
   - Sentry: Error details and stack traces

2. **Health Check Endpoint**
   ```bash
   curl https://subpilot.com/api/health
   ```

3. **Service Status Pages**
   - [Vercel Status](https://www.vercel-status.com/)
   - [Neon Status](https://status.neon.tech/)
   - [SendGrid Status](https://status.sendgrid.com/)
   - [Plaid Status](https://status.plaid.com/)

## 📞 Support Contacts

### Service Providers
- **Vercel**: Enterprise support (if applicable)
- **Neon**: Support tickets via dashboard
- **SendGrid**: Support portal
- **Plaid**: Developer support
- **Sentry**: Support tickets

### Documentation
- [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT.md)
- [OAuth Setup Guide](docs/OAUTH_SETUP.md)
- [SendGrid Setup Guide](docs/SENDGRID_SETUP.md)
- [Production Checklist](docs/PRODUCTION_CHECKLIST.md)

---

## 🎯 Next Steps

1. **Run Environment Validation**
   ```bash
   npm run validate:production
   ```

2. **Follow Setup Guides**
   - Complete OAuth provider setup
   - Configure SendGrid email service
   - Apply for Plaid production access

3. **Test Integrations**
   ```bash
   npm run test:production
   ```

4. **Deploy to Production**
   - Configure environment variables in Vercel
   - Deploy via GitHub integration
   - Verify all services working

**Status**: Ready for production setup  
**Last Updated**: 2025-06-25  
**Version**: 0.1.8