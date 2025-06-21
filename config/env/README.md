# Environment Configuration Templates

This directory contains environment configuration templates to simplify setup.

## Quick Start

```bash
# Copy template to create your local environment file
cp config/env/.env.template .env.local

# Edit .env.local with your values
nano .env.local
```

## Files

### .env.template
Complete template with all available environment variables, organized by category with helpful comments.

## Environment Variables Guide

### Required Variables

1. **DATABASE_URL**: PostgreSQL connection string
   - Local: `postgresql://user:pass@localhost:5432/db`
   - Neon: `postgresql://user:pass@host.neon.tech/db?sslmode=require`

2. **NEXTAUTH_SECRET**: Secret for JWT encryption
   - Generate: `openssl rand -base64 32`

3. **NEXTAUTH_URL**: Your app's URL
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

### Optional Features

- **OAuth**: Google/GitHub login
- **Plaid**: Bank account integration
- **Email**: SendGrid for production emails
- **Monitoring**: Sentry error tracking
- **Analytics**: Vercel Analytics

## Best Practices

1. Never commit `.env.local` files
2. Use strong, unique secrets in production
3. Keep development and production configs separate
4. Document any new environment variables here