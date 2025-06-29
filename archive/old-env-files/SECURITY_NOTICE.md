# 🚨 SECURITY NOTICE - ARCHIVED ENVIRONMENT FILES

## Files Removed for Security

The following files have been permanently deleted from this archive because they contained actual credentials:

1. **`.env.development.local`** - Contained:
   - Real Neon database credentials
   - Vercel OIDC tokens
   - Stack secret keys

2. **`.env.local.docker`** - Contained:
   - Plaid sandbox API credentials (even sandbox creds should not be committed)

3. **`.env`** - Contained:
   - Neon database connection strings with passwords

## Security Best Practices

- **NEVER** commit files with real credentials, even to archive directories
- **ALWAYS** use `.env.example` files with placeholder values
- **STORE** production secrets in your deployment platform (Vercel, etc.)
- **ROTATE** any credentials that may have been exposed
- **AUDIT** your git history if you suspect credentials were committed

## Remaining Files

The files that remain in this directory contain only:
- Example/template values
- Placeholder credentials
- Configuration structure documentation

These are safe to keep for reference but should not be used directly.