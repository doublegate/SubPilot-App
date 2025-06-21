# Archived Environment Files

These files were moved here to reduce confusion about which environment files to use.

## Why Archived?

- **Too many similar files**: Having `.env`, `.env.local`, `.env.development.local`, etc. was confusing
- **Redundant configurations**: Most had overlapping or duplicate settings
- **Simplified structure**: Now we use just `.env.local` for development and templates in `config/`

## Old Files

- `.env` - Generic environment file (ambiguous purpose)
- `.env.development.local` - Redundant with `.env.local`
- `.env.production` - Production configs should be in deployment platform
- `.env.local.docker` - Consolidated into `config/docker/docker.env.development`

## New Structure

See `/config/ENV_SETUP.md` for the new simplified structure.