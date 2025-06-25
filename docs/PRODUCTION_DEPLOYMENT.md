# Production Deployment Guide

This guide walks through the complete production setup for SubPilot, ensuring all systems are properly configured for a live environment.

## 🎯 Production Readiness Checklist

### Phase 1: OAuth Provider Setup ✅

#### Google OAuth Production App
1. **Create Production Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project: "SubPilot Production"
   - Enable Google+ API and OAuth consent screen

2. **Configure OAuth Consent Screen**
   ```
   Application name: SubPilot
   User support email: support@subpilot.com
   Developer contact email: dev@subpilot.com
   Application homepage: https://subpilot.com
   Privacy policy: https://subpilot.com/privacy
   Terms of service: https://subpilot.com/terms
   ```

3. **Create OAuth 2.0 Credentials**
   - Application type: Web application
   - Name: SubPilot Production
   - Authorized redirect URIs:
     - `https://subpilot.com/api/auth/callback/google`
     - `https://www.subpilot.com/api/auth/callback/google`

4. **Domain Verification**
   - Verify domain ownership in Google Search Console
   - Add domain to authorized domains list

#### GitHub OAuth Production App
1. **Create GitHub OAuth App**
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Application name: SubPilot
   - Homepage URL: `https://subpilot.com`
   - Authorization callback URL: `https://subpilot.com/api/auth/callback/github`

2. **Configure Application**
   - Upload application logo
   - Set application description
   - Configure webhook URL (if needed)

### Phase 2: Email Service Setup ✅

#### SendGrid Production Configuration
1. **Create SendGrid Account**
   - Sign up at [SendGrid](https://sendgrid.com/)
   - Choose appropriate pricing tier
   - Complete account verification

2. **Domain Authentication**
   ```bash
   # Add these DNS records to your domain provider:
   
   # CNAME Records for Domain Authentication
   s1._domainkey.subpilot.com → s1.domainkey.u12345.wl123.sendgrid.net
   s2._domainkey.subpilot.com → s2.domainkey.u12345.wl123.sendgrid.net
   
   # CNAME for Link Branding
   12345.subpilot.com → sendgrid.net
   
   # TXT Record for SPF
   subpilot.com → "v=spf1 include:sendgrid.net ~all"
   ```

3. **Create API Key**
   - Go to Settings > API Keys
   - Create new API key with "Full Access"
   - Store securely in environment variables

4. **Configure Sender Identity**
   - Verify sender email: `noreply@subpilot.com`
   - Set up domain authentication
   - Configure reverse DNS (optional)

#### Email Templates Setup
1. **Create Production Email Templates**
   - Welcome email template
   - Password reset template
   - Magic link template
   - Subscription alert template
   - Weekly summary template

2. **Template Variables**
   ```handlebars
   Subject: Welcome to SubPilot, {{user.name}}!
   
   Body:
   Hi {{user.name}},
   
   Welcome to SubPilot! We're excited to help you manage your subscriptions.
   
   Get started: {{verificationUrl}}
   
   Best regards,
   The SubPilot Team
   ```

### Phase 3: Monitoring & Error Tracking ✅

#### Sentry Error Tracking
1. **Create Sentry Project**
   - Sign up at [Sentry](https://sentry.io/)
   - Create new project for Next.js
   - Note the DSN for environment variables

2. **Install Sentry SDK**
   ```bash
   npm install @sentry/nextjs @sentry/tracing
   ```

3. **Configure Sentry**
   - Create `sentry.client.config.js`
   - Create `sentry.server.config.js`
   - Create `sentry.edge.config.js`
   - Add to `next.config.js`

#### Vercel Analytics & Monitoring
1. **Enable Vercel Analytics**
   - Already configured with `@vercel/analytics`
   - Enable in Vercel dashboard
   - Configure custom events

2. **Database Monitoring (Neon)**
   - Enable query insights
   - Set up connection pooling
   - Configure alerts for high usage

### Phase 4: Environment Variables ✅

#### Production Environment Setup
```bash
# Database
DATABASE_URL="postgresql://user:pass@neon-prod.neon.tech/subpilot_prod"

# Auth.js
NEXTAUTH_SECRET="production-super-secret-key-64-chars-minimum"
NEXTAUTH_URL="https://subpilot.com"

# OAuth Providers
GOOGLE_CLIENT_ID="prod-google-client-id"
GOOGLE_CLIENT_SECRET="prod-google-client-secret"
GITHUB_CLIENT_ID="prod-github-client-id"
GITHUB_CLIENT_SECRET="prod-github-client-secret"

# Plaid Production
PLAID_CLIENT_ID="prod-plaid-client-id"
PLAID_SECRET="prod-plaid-secret"
PLAID_ENV="production"
PLAID_PRODUCTS="transactions,identity,accounts"
PLAID_COUNTRY_CODES="US,CA"
PLAID_REDIRECT_URI="https://subpilot.com/dashboard"
PLAID_WEBHOOK_URL="https://subpilot.com/api/webhooks/plaid"

# Email
SENDGRID_API_KEY="SG.prod-sendgrid-api-key"
FROM_EMAIL="noreply@subpilot.com"

# Monitoring
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"

# Production Settings
NODE_ENV="production"
LOG_LEVEL="info"
ENABLE_QUERY_LOGGING="false"
```

### Phase 5: Plaid Production Setup ✅

#### Plaid Production Environment
1. **Apply for Plaid Production Access**
   - Complete Plaid production application
   - Provide business documentation
   - Pass security review

2. **Production Configuration**
   ```typescript
   // Configure for production environment
   const plaidConfig = {
     env: 'production', // vs 'sandbox'
     clientId: process.env.PLAID_CLIENT_ID,
     secret: process.env.PLAID_SECRET,
     products: ['transactions', 'identity', 'accounts'],
     countryCodes: ['US', 'CA'],
   };
   ```

3. **Webhook Security**
   - Verify webhook signatures
   - Use HTTPS endpoints
   - Implement proper error handling

### Phase 6: Security Hardening ✅

#### SSL/TLS Configuration
- Ensure HTTPS-only in production
- Configure proper security headers
- Implement HSTS

#### Database Security
- Use connection pooling
- Enable SSL connections
- Regular security patches

#### API Security
- Rate limiting (already implemented)
- CSRF protection (already implemented)
- Input validation and sanitization

### Phase 7: Performance Optimization ✅

#### Caching Strategy
```typescript
// Redis for session storage (optional)
REDIS_URL="redis://prod-redis-url"

// CDN configuration
// Static assets served via Vercel Edge Network
```

#### Database Optimization
- Connection pooling
- Query optimization
- Index analysis

### Phase 8: Backup & Recovery ✅

#### Database Backups
- Automated daily backups (Neon)
- Point-in-time recovery
- Cross-region backup storage

#### Application Backups
- Git repository backups
- Environment variable backups (encrypted)
- Configuration backups

## 🚀 Deployment Steps

### 1. Vercel Production Deployment
```bash
# Connect to GitHub for automatic deployments
vercel --prod

# Configure environment variables in Vercel dashboard
# Set up custom domain
# Configure DNS records
```

### 2. Domain Configuration
```bash
# DNS Records
A     subpilot.com → Vercel IP
CNAME www.subpilot.com → subpilot.com
CNAME api.subpilot.com → subpilot.com

# Email DNS (SendGrid)
TXT   subpilot.com → "v=spf1 include:sendgrid.net ~all"
CNAME s1._domainkey.subpilot.com → [SendGrid CNAME]
CNAME s2._domainkey.subpilot.com → [SendGrid CNAME]
```

### 3. Final Testing Checklist
- [ ] OAuth login flows (Google, GitHub, Email)
- [ ] Email delivery (welcome, magic link, notifications)
- [ ] Plaid bank connections
- [ ] Transaction sync and processing
- [ ] Subscription detection algorithm
- [ ] Dashboard functionality
- [ ] Mobile responsiveness
- [ ] Error tracking and logging
- [ ] Performance metrics
- [ ] Security headers
- [ ] SSL certificate validation

## 🔧 Maintenance Tasks

### Daily
- Monitor error rates in Sentry
- Check email delivery metrics
- Verify Plaid webhook processing

### Weekly
- Review performance metrics
- Check database performance
- Update dependencies (security patches)

### Monthly
- SSL certificate renewal check
- Security audit
- Performance optimization review
- Backup restoration testing

## 📞 Emergency Contacts

### Service Providers
- **Vercel Support**: Enterprise support channel
- **Neon Database**: Support tickets
- **SendGrid Support**: Email support
- **Plaid Support**: Developer support
- **Sentry Support**: Error tracking support

### On-Call Procedures
1. Check Sentry for error details
2. Verify Vercel deployment status
3. Check database connectivity
4. Review email delivery status
5. Validate Plaid API status

---

**Status**: Ready for production deployment
**Last Updated**: 2025-06-25
**Next Review**: After production launch