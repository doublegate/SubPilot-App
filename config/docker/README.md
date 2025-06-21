# Docker Configuration

This directory contains all Docker-related configuration files.

## Files

### docker-compose.yml
Main development compose file. Includes:
- Next.js app container
- PostgreSQL database
- Mailhog for email testing

Usage:
```bash
docker-compose -f config/docker/docker-compose.yml up
```

### docker-compose.dev.yml
Extended development configuration with additional services.

### docker.env.development
Environment variables for Docker development. Pre-configured for Docker networking.

### docker.env.production
Minimal production configuration for Docker builds.

## Quick Start

1. **Development with Docker**:
   ```bash
   # From project root
   docker-compose -f config/docker/docker-compose.yml up
   ```

2. **Production Build**:
   ```bash
   docker build -t subpilot .
   ```

## Notes

- Database host is `postgres` (not `localhost`) in Docker
- Mailhog UI available at http://localhost:8025
- App runs at http://localhost:3000