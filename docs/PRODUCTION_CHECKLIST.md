# Production Deployment Checklist

This comprehensive checklist ensures all production requirements are met before launching SubPilot.

## 🎯 Pre-Deployment Requirements

### Phase 1: OAuth Provider Setup ✅

#### Google OAuth Production App
- [ ] Google Cloud project created ("SubPilot Production")
- [ ] Google+ API and People API enabled
- [ ] OAuth consent screen configured with production details
- [ ] Production OAuth 2.0 credentials created
- [ ] Authorized redirect URIs configured:
  - `https://subpilot.com/api/auth/callback/google`
  - `https://www.subpilot.com/api/auth/callback/google`
- [ ] Domain verification completed (optional but recommended)
- [ ] Test Google OAuth flow in production

**Environment Variables:**
```bash
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret"
```

#### GitHub OAuth Production App
- [ ] GitHub OAuth app created
- [ ] Application details configured (name, homepage, description)
- [ ] Authorization callback URL set: `https://subpilot.com/api/auth/callback/github`
- [ ] Client secret generated
- [ ] Application logo uploaded
- [ ] Test GitHub OAuth flow in production

**Environment Variables:**
```bash
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### Phase 2: Email Service Setup ✅

#### SendGrid Configuration
- [ ] SendGrid account created and verified
- [ ] Appropriate pricing tier selected
- [ ] Domain authentication completed for `subpilot.com`
- [ ] DNS records added and verified:
  - [ ] DKIM records (s1._domainkey, s2._domainkey)
  - [ ] SPF record (`v=spf1 include:sendgrid.net ~all`)
  - [ ] Link branding CNAME
- [ ] API key created with full access
- [ ] Sender identity verified (`noreply@subpilot.com`)

**Environment Variables:**
```bash
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
FROM_EMAIL="noreply@subpilot.com"
SUPPORT_EMAIL="support@subpilot.com"
```

#### Email Templates
- [ ] Welcome email template created and tested
- [ ] Magic link template created and tested
- [ ] Subscription alert template created and tested
- [ ] Template IDs updated in code (`src/lib/email-templates/production.ts`)
- [ ] Email tracking enabled (clicks, opens)
- [ ] Test email delivery to multiple providers (Gmail, Outlook, Yahoo)

### Phase 3: Monitoring & Error Tracking ✅

#### Sentry Configuration
- [ ] Sentry account created
- [ ] Next.js project created in Sentry
- [ ] Sentry SDK installed (`@sentry/nextjs`)
- [ ] Sentry configuration files created:
  - [ ] `sentry.client.config.js`
  - [ ] `sentry.server.config.js`
  - [ ] `sentry.edge.config.js`
- [ ] `next.config.js` updated with Sentry webpack plugin
- [ ] Test error tracking in production

**Environment Variables:**
```bash
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="subpilot-production"
SENTRY_AUTH_TOKEN="your-auth-token"
```

#### Vercel Analytics
- [ ] Vercel Analytics enabled in dashboard
- [ ] `@vercel/analytics` package installed and configured
- [ ] Custom events configured for key user actions
- [ ] Performance monitoring enabled

### Phase 4: Database & Infrastructure ✅

#### Neon PostgreSQL Production
- [ ] Neon production database created
- [ ] Connection pooling enabled
- [ ] SSL connections enforced
- [ ] Automated backups configured
- [ ] Database monitoring enabled
- [ ] Connection string secured

**Environment Variables:**
```bash
DATABASE_URL="postgresql://user:pass@production-host.neon.tech/subpilot_prod?sslmode=require"
```

#### Vercel Deployment
- [ ] Vercel project connected to GitHub
- [ ] Production domain configured (`subpilot.com`)
- [ ] Custom domain SSL certificate issued
- [ ] Environment variables configured in Vercel dashboard
- [ ] Automatic deployments enabled for main branch
- [ ] Preview deployments configured for pull requests

### Phase 5: Plaid Production Setup ✅

#### Plaid Production Environment
- [ ] Plaid production application submitted and approved
- [ ] Business documentation provided
- [ ] Security review completed
- [ ] Production API credentials received
- [ ] Webhook endpoint configured and secured
- [ ] Test bank connections in production environment

**Environment Variables:**
```bash
PLAID_CLIENT_ID="your-production-plaid-client-id"
PLAID_SECRET="your-production-plaid-secret"
PLAID_ENV="production"
PLAID_PRODUCTS="transactions,identity,accounts"
PLAID_COUNTRY_CODES="US,CA"
PLAID_REDIRECT_URI="https://subpilot.com/dashboard"
PLAID_WEBHOOK_URL="https://subpilot.com/api/webhooks/plaid"
```

### Phase 6: Security & Performance ✅

#### Security Configuration
- [ ] HTTPS enforced across all endpoints
- [ ] Security headers configured in `next.config.js`:
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Referrer-Policy: origin-when-cross-origin
- [ ] Rate limiting implemented and tested
- [ ] CSRF protection enabled
- [ ] Input validation implemented
- [ ] SQL injection protection verified
- [ ] XSS protection enabled

#### SSL/TLS Configuration
- [ ] SSL certificate automatically provisioned by Vercel
- [ ] Certificate renewal automated
- [ ] HSTS policy configured
- [ ] Mixed content warnings resolved

### Phase 7: Environment Variables ✅

#### Required Production Environment Variables
```bash
# Core Application
NODE_ENV="production"
NEXTAUTH_SECRET="64-character-production-secret"
NEXTAUTH_URL="https://subpilot.com"

# Database
DATABASE_URL="postgresql://production-connection-string"

# OAuth Providers
GOOGLE_CLIENT_ID="production-google-client-id"
GOOGLE_CLIENT_SECRET="production-google-client-secret"
GITHUB_CLIENT_ID="production-github-client-id"
GITHUB_CLIENT_SECRET="production-github-client-secret"

# Plaid
PLAID_CLIENT_ID="production-plaid-client-id"
PLAID_SECRET="production-plaid-secret"
PLAID_ENV="production"
PLAID_PRODUCTS="transactions,identity,accounts"
PLAID_COUNTRY_CODES="US,CA"
PLAID_REDIRECT_URI="https://subpilot.com/dashboard"
PLAID_WEBHOOK_URL="https://subpilot.com/api/webhooks/plaid"

# Email
SENDGRID_API_KEY="production-sendgrid-api-key"
FROM_EMAIL="noreply@subpilot.com"
SUPPORT_EMAIL="support@subpilot.com"

# Monitoring
SENTRY_DSN="production-sentry-dsn"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="subpilot-production"

# Security
WEBHOOK_SECRET="webhook-verification-secret"
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW="900000"

# Features
FEATURE_PLAID_ENABLED="true"
FEATURE_EMAIL_ENABLED="true"
FEATURE_ANALYTICS_ENABLED="true"
FEATURE_SENTRY_ENABLED="true"
```

## 🧪 Testing & Validation

### Automated Testing
- [ ] Run production integration tests: `npm run test:production`
- [ ] Verify health endpoint: `GET https://subpilot.com/api/health`
- [ ] Test email delivery: `npm run test:email`
- [ ] Validate all environment variables are configured
- [ ] Confirm database connectivity and migrations

### Manual Testing Checklist
- [ ] User registration flow (email verification)
- [ ] Google OAuth login flow
- [ ] GitHub OAuth login flow
- [ ] Magic link authentication
- [ ] Password reset flow
- [ ] Bank account connection via Plaid
- [ ] Transaction sync and import
- [ ] Subscription detection algorithm
- [ ] Email notifications (welcome, alerts)
- [ ] Dashboard functionality
- [ ] Mobile responsiveness
- [ ] Error pages (404, 500)
- [ ] Performance under load

### Security Testing
- [ ] SSL certificate validation
- [ ] Security headers present
- [ ] Rate limiting functional
- [ ] CSRF protection working
- [ ] Input validation active
- [ ] Error handling doesn't expose sensitive data
- [ ] Session management secure

## 🚀 Deployment Process

### Step 1: Pre-Deployment
1. [ ] Complete all checklist items above
2. [ ] Run final test suite: `npm run test:all`
3. [ ] Verify production environment variables in Vercel
4. [ ] Create deployment backup plan
5. [ ] Notify team of deployment schedule

### Step 2: Deployment
1. [ ] Merge final changes to main branch
2. [ ] Verify automatic Vercel deployment succeeds
3. [ ] Run post-deployment health checks
4. [ ] Verify custom domain accessibility
5. [ ] Test critical user flows

### Step 3: Post-Deployment Validation
1. [ ] Verify health endpoint: `https://subpilot.com/api/health`
2. [ ] Test user registration and login flows
3. [ ] Verify email delivery working
4. [ ] Check Sentry error tracking
5. [ ] Validate Plaid integration
6. [ ] Monitor performance metrics
7. [ ] Check database connectivity and queries

## 📊 Monitoring Setup

### Production Monitoring
- [ ] Vercel Analytics dashboard monitoring
- [ ] Sentry error tracking and alerts
- [ ] Database performance monitoring (Neon)
- [ ] Email delivery monitoring (SendGrid)
- [ ] Uptime monitoring (external service recommended)
- [ ] Performance budgets and alerts

### Key Metrics to Monitor
- [ ] Application uptime (>99.9%)
- [ ] Response time (<500ms p95)
- [ ] Error rate (<1%)
- [ ] Email delivery rate (>95%)
- [ ] Database connection success rate
- [ ] User authentication success rate

### Alerting Configuration
- [ ] Application errors → Sentry → Slack/Email
- [ ] High response times → Vercel → Team notification
- [ ] Email delivery failures → SendGrid → Email alert
- [ ] Database issues → Neon → Email alert
- [ ] SSL certificate expiration → Calendar reminder

## 📞 Emergency Procedures

### Incident Response
- [ ] Primary on-call contact identified
- [ ] Secondary on-call contact identified
- [ ] Emergency rollback procedure documented
- [ ] Service provider emergency contacts available
- [ ] Communication plan for user notifications

### Rollback Procedure
1. [ ] Revert to previous working deployment in Vercel
2. [ ] Verify rollback deployment health
3. [ ] Communicate with affected users
4. [ ] Investigate and document incident
5. [ ] Plan fix for re-deployment

## ✅ Sign-Off

### Technical Review
- [ ] **Lead Developer**: All technical requirements met
- [ ] **DevOps/Infrastructure**: Deployment pipeline ready
- [ ] **Security**: Security requirements validated
- [ ] **QA**: Testing completed successfully

### Business Review
- [ ] **Product Manager**: Features ready for launch
- [ ] **Customer Support**: Support documentation ready
- [ ] **Marketing**: Launch communications prepared
- [ ] **Legal**: Terms of service and privacy policy reviewed

### Final Approval
- [ ] **Technical Lead**: _________________ Date: _______
- [ ] **Product Manager**: _________________ Date: _______
- [ ] **CEO/CTO**: _________________ Date: _______

---

## 📋 Post-Launch Tasks (Week 1)

### Daily Monitoring (Days 1-7)
- [ ] Monitor error rates and performance
- [ ] Review user feedback and support tickets
- [ ] Check email delivery metrics
- [ ] Verify OAuth provider functioning
- [ ] Monitor database performance

### Weekly Review (Week 1)
- [ ] Analyze usage metrics and user behavior
- [ ] Review and optimize performance bottlenecks
- [ ] Update documentation based on learnings
- [ ] Plan next iteration improvements

---

**Status**: Ready for production deployment  
**Last Updated**: 2025-06-25  
**Next Review**: After production launch

**Deployment Approval**: ⏳ Pending checklist completion