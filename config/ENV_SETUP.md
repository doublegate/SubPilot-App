# 🔧 Environment Configuration Guide

## Quick Start

1. **For Local Development**: Copy the template to `.env.local`
   ```bash
   cp config/env/.env.template .env.local
   ```

2. **Edit `.env.local`** with your credentials

3. **Start developing**:
   ```bash
   npm run dev
   ```

## New Organized Structure

### Configuration Templates (config/env/)

#### `.env.template` (Master Template)
- Complete template with ALL environment variables
- Well-documented with categories and examples
- Use this to create your `.env.local`

### Docker Configuration (config/docker/)

#### `docker.env.development`
- Pre-configured for Docker networking
- Database points to `postgres` service
- Email points to `mailhog` service

#### `docker.env.production`
- Minimal production build configuration
- Sets SKIP_ENV_VALIDATION for builds

#### `docker-compose.yml`
- Main development compose file
- Includes app, database, and mailhog

### Your Local Files (Git Ignored)

#### `.env.local` (Primary Development File)
- Your personal development configuration
- Created from `.env.template`
- **NEVER commit this file**

## Which File to Use When?

| Scenario | Use This File | Command |
|----------|--------------|---------|
| Local development | `.env.local` | `cp config/env/.env.template .env.local` |
| Docker development | `config/docker/docker.env.development` | `docker-compose -f config/docker/docker-compose.yml up` |
| Production deployment | Set in Vercel/platform | N/A |
| CI/CD testing | Automatic | N/A |

## Docker Commands (New Paths)

### Development with Docker
```bash
# From project root - start all services
docker-compose -f config/docker/docker-compose.yml up

# Start specific service
docker-compose -f config/docker/docker-compose.yml up app

# Run with custom env file
docker-compose -f config/docker/docker-compose.yml --env-file config/docker/docker.env.development up
```

## Essential Variables Only

For most development, you only need:

```env
# Database (if not using Docker)
DATABASE_URL="postgresql://localhost:5432/subpilot"

# Auth
NEXTAUTH_SECRET="any-random-string-for-dev"
NEXTAUTH_URL="http://localhost:3000"

# That's it! Everything else has defaults
```

## Platform-Specific Notes

### Vercel
- Set environment variables in Vercel dashboard
- Don't use .env files in production

### Docker
- Use docker-compose environment files
- Network names are automatic (e.g., `postgres` not `localhost`)

### Local Development
- Just use `.env.local`
- All other files are for specific deployment scenarios