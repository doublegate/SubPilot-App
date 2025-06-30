# Troubleshooting Guide

## Known Issues

### Node.js Deprecation Warning: url.parse()

**Issue**: You may see the following warning in the terminal:
```
(node:XXXXX) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead.
```

**Cause**: This warning originates from the Plaid SDK (version 36.0.0) which internally uses the deprecated `url.parse()` method.

**Impact**: 
- ⚠️ **Security**: No immediate security risk for our application
- 🔧 **Functionality**: No impact on application functionality
- 📊 **Performance**: No performance impact

**Status**: 
- **Third-party dependency issue** - Cannot be fixed in our codebase
- **Plaid SDK team aware** - This is a known issue in the Node.js Plaid SDK
- **Tracking**: Monitor Plaid SDK releases for updates that address this

**Workarounds**:
1. **Suppress warning in development** (not recommended for production):
   ```bash
   NODE_NO_WARNINGS=1 npm run dev
   ```

2. **Filter specific deprecation** (if needed):
   ```bash
   NODE_OPTIONS="--no-deprecation" npm run dev
   ```

**When this will be resolved**:
- When Plaid releases an updated SDK that uses the WHATWG URL API
- Or when Node.js removes the deprecated `url.parse()` method entirely

---

## Development Issues

### TypeScript Compilation Errors

If you encounter TypeScript compilation errors:

1. **Check imports**: Ensure all required components are imported
2. **Update types**: Run `npm run db:generate` after schema changes
3. **Clear cache**: Delete `.next` folder and restart dev server

### Database Issues

If you encounter database connection issues:

1. **Check environment variables**: Ensure `DATABASE_URL` is correctly set
2. **Database migrations**: Run `npm run db:push` or `npm run db:migrate`
3. **Reset database**: Use `npm run db:reset` (⚠️ destroys all data)

### Plaid Integration Issues

If bank connections fail:

1. **Check Plaid credentials**: Verify `PLAID_CLIENT_ID` and `PLAID_SECRET`
2. **Environment mismatch**: Ensure `PLAID_ENV` matches your credentials
3. **Webhook URL**: Verify `PLAID_WEBHOOK_URL` is accessible

---

## Production Deployment

### Build Failures

Common build issues and solutions:

1. **Environment validation**: Set `SKIP_ENV_VALIDATION=true` for builds
2. **TypeScript errors**: Run `npm run type-check` locally first
3. **Linting errors**: Use `npm run build:ci` for CI/CD builds

### Runtime Errors

1. **Database connectivity**: Check connection string and SSL settings
2. **Missing environment variables**: Verify all required vars are set
3. **CORS issues**: Check `CORS_ORIGINS` configuration

---

## Getting Help

1. **Check this guide first** for known issues and solutions
2. **Review logs** for specific error messages
3. **Search existing GitHub issues** for similar problems
4. **Create new issue** with detailed reproduction steps if needed

Last updated: 2025-06-30