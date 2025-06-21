# Configuration Directory

This directory contains all configuration files and templates organized by type.

## Directory Structure

```
config/
├── ENV_SETUP.md          # Main environment setup guide
├── docker/               # Docker-related configuration
│   ├── README.md         # Docker setup guide
│   ├── docker-compose.yml # Main compose file
│   ├── docker-compose.dev.yml # Development overrides
│   ├── docker.env.development # Docker dev environment
│   └── docker.env.production  # Docker prod environment
└── env/                  # Environment templates
    ├── README.md         # Environment guide
    └── .env.template     # Master template file
```

## Quick Start

1. **For local development**: Run the setup script
   ```bash
   ./scripts/setup-env.sh
   ```

2. **For Docker development**: Use Docker compose
   ```bash
   docker-compose -f config/docker/docker-compose.yml up
   ```

## Why This Organization?

Previously, we had many confusing environment files in the root:
- `.env`, `.env.local`, `.env.development.local`, `.env.production`, etc.

Now we have:
- **One template**: `config/env/.env.template` with all options
- **One local file**: `.env.local` (created from template)
- **Clear Docker config**: Separate Docker environments in `config/docker/`

## Need Help?

- Environment setup: See [ENV_SETUP.md](./ENV_SETUP.md)
- Docker setup: See [docker/README.md](./docker/README.md)
- Templates: See [env/README.md](./env/README.md)