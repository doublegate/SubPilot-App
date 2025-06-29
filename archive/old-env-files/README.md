# Archived Environment Files

This directory contains archived environment configuration files that have been consolidated into the main `.env.example` file.

## ⚠️ SECURITY NOTICE

**IMPORTANT**: Several files containing actual secrets have been removed from this archive for security reasons. Never commit files with real credentials to version control.

## Current Structure

The project now uses a simplified environment configuration:
- **`.env.example`** - Comprehensive example with all configuration options (in project root)
- **`.env.local`** - Your actual environment configuration (git-ignored)

## Archived Files

### Removed for Security (contained actual secrets):
- `.env.development.local` - Contained Vercel/Neon database credentials
- `.env.local.docker` - Contained Plaid sandbox credentials
- `.env` - Contained Neon database credentials

### Remaining Archives:
- **`.env.production.example`** - Template for production environment variables
- **`.env.security.example`** - Security-specific configuration options
- **`.env.example.simple`** - Simplified quick-start configuration
- **`.env.temp`** - Temporary file (duplicate of old .env.example)

## Migration Guide

All unique configuration options from these files have been consolidated into the main `.env.example` file with:
- Clear section headers
- Development vs production value examples
- Helpful comments and generation commands
- Phase 3 automation settings (Stripe, Playwright, AI Assistant)

## Best Practices

1. **Never commit real secrets** - Use `.env.local` for actual values
2. **Use example files as templates** - Copy `.env.example` to `.env.local`
3. **Production secrets in deployment platform** - Use Vercel/hosting environment variables
4. **Generate secure secrets** - Use `openssl rand -base64 32` for secret keys
5. **Review .gitignore** - Ensure all sensitive files are excluded

## Configuration Categories

The consolidated `.env.example` includes:
- Database configuration (PostgreSQL/Neon)
- Authentication (Auth.js, OAuth providers)
- Bank integration (Plaid API)
- Email services (SendGrid, SMTP)
- Security settings (encryption, rate limiting)
- External APIs (OpenAI, monitoring)
- Feature flags and analytics
- PWA configuration
- Production/deployment settings
- Phase 3 automation (NEW)

For detailed setup instructions, see `/docs/DEVELOPMENT_SETUP.md`.