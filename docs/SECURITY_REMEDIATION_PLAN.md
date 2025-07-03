# Security Remediation Plan - SubPilot v1.6.0

Generated: 2025-07-03 19:30 EDT

## Executive Summary

This document outlines the security vulnerabilities identified during the comprehensive security audit of SubPilot v1.5.0 and provides a detailed remediation plan. While the application demonstrates excellent security architecture overall, we identified **4 critical issues** requiring immediate attention and several medium-priority improvements.

## Critical Security Issues (Immediate Action Required)

### 1. ❗ EXPOSED PRODUCTION CREDENTIALS
**Severity**: CRITICAL  
**Location**: `/var/home/parobek/Code/SubPilot-App/.env.local`  
**Impact**: Full system compromise if credentials are leaked

**Exposed Credentials**:
- Database URL with password
- Google OAuth Client Secret
- GitHub OAuth Client Secret  
- Plaid API Secret
- NextAuth Secret

**Remediation Steps**:
1. **IMMEDIATELY** rotate all exposed credentials:
   ```bash
   # Generate new NextAuth secret
   openssl rand -base64 32
   
   # Update OAuth apps in Google/GitHub consoles
   # Generate new Plaid API keys
   # Update database password in Neon console
   ```
2. Remove `.env.local` from repository if accidentally committed
3. Add `.env.local` to `.gitignore` (verify it's there)
4. Implement secrets management service (AWS Secrets Manager recommended)
5. Audit git history for any credential exposure

### 2. ❗ UNSAFE CONTENT SECURITY POLICY
**Severity**: HIGH  
**Location**: `src/middleware.ts:119`  
**Impact**: XSS vulnerability exposure

**Current Issue**: CSP includes `'unsafe-inline'` and `'unsafe-eval'`

**Remediation Steps**:
1. Audit all inline JavaScript usage:
   ```bash
   grep -r "onclick\|onload\|<script" src/
   ```
2. Move inline scripts to external files
3. Implement nonce-based CSP:
   ```typescript
   const nonce = crypto.randomBytes(16).toString('base64');
   response.headers.set(
     'Content-Security-Policy',
     `script-src 'self' 'nonce-${nonce}' https://vercel.live https://cdn.plaid.com;`
   );
   ```
4. Update React components to use nonce
5. Replace any `eval()` usage with safer alternatives

### 3. ❗ DANGEROUS OAUTH ACCOUNT LINKING
**Severity**: HIGH  
**Location**: `src/server/auth.config.ts:172,177`  
**Impact**: Account takeover vulnerability

**Current Issue**: `allowDangerousEmailAccountLinking: true`

**Remediation Steps**:
1. **Immediately** set to `false`:
   ```typescript
   GoogleProvider({
     clientId: env.GOOGLE_CLIENT_ID,
     clientSecret: env.GOOGLE_CLIENT_SECRET,
     allowDangerousEmailAccountLinking: false, // CRITICAL CHANGE
   }),
   ```
2. Implement secure account linking flow:
   - Add account linking page in user settings
   - Require password verification
   - Send confirmation email
   - Add audit logging for linking attempts

### 4. ❗ FAILING SECURITY TESTS
**Severity**: HIGH  
**Impact**: Security vulnerabilities may go undetected

**Issues**:
- 92 failing tests (15.3% of total)
- Security-related tests failing due to import errors
- Test coverage dropped to 80.4%

**Remediation Steps**:
1. Fix module resolution issues:
   ```json
   // vitest.config.ts
   resolve: {
     alias: {
       '@/': path.resolve(__dirname, './src/'),
       '~/': path.resolve(__dirname, './src/')
     }
   }
   ```
2. Update mock data to match current Prisma schema
3. Fix TypeScript compilation errors in tests
4. Achieve 100% test passage before deployment

## High Priority Issues (Within 1 Week)

### 5. ⚠️ TypeScript Safety Issues
**Severity**: MEDIUM  
**Impact**: Reduced type safety, potential runtime errors

**Issues**: ~300+ ESLint errors including unsafe `any` usage

**Remediation**:
1. Enable strict TypeScript rules:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true
     }
   }
   ```
2. Fix all `any` type usage systematically
3. Add pre-commit hooks to prevent new issues

### 6. ⚠️ Decentralized Authorization Logic
**Severity**: MEDIUM  
**Impact**: Risk of IDOR vulnerabilities in new endpoints

**Remediation**:
1. Create centralized authorization middleware:
   ```typescript
   export const requireOwnership = (resourceType: ResourceType) => {
     return middleware(async ({ ctx, next, input }) => {
       await authz.requireResourceOwnership(
         resourceType,
         input.id,
         ctx.session.user.id
       );
       return next();
     });
   };
   ```
2. Apply to all resource endpoints automatically
3. Add automated tests for authorization

## Medium Priority Issues (Within 1 Month)

### 7. 📊 Implement Missing Security Features

**Two-Factor Authentication**:
```typescript
// Add to user model
model User {
  // ... existing fields
  totpSecret    String?
  totpEnabled   Boolean @default(false)
  backupCodes   String[]
}
```

**API Key Rotation**:
- Implement versioned API keys
- Add grace period for old keys
- Automated rotation reminders

### 8. 🔍 Security Monitoring Enhancements

1. Implement real-time security alerts:
   - Failed login attempts > threshold
   - Unusual OAuth linking attempts
   - Rate limit violations
   - CSP violations

2. Add security dashboard for admins

### 9. 📝 Documentation Updates

1. Security best practices guide
2. Secure development guidelines
3. Incident response playbook
4. Security testing procedures

## Implementation Timeline

### Week 1 (Critical):
- [ ] Day 1: Rotate all credentials
- [ ] Day 2: Fix OAuth account linking
- [ ] Day 3-4: Fix failing tests
- [ ] Day 5: Update CSP configuration
- [ ] Day 6-7: TypeScript safety fixes

### Week 2-4 (High Priority):
- [ ] Centralize authorization logic
- [ ] Implement 2FA
- [ ] Add security monitoring
- [ ] Complete documentation

### Month 2-3 (Enhancement):
- [ ] External security audit
- [ ] Penetration testing
- [ ] API key rotation system
- [ ] Advanced threat detection

## Security Testing Checklist

Before deploying fixes:
- [ ] All tests passing (100%)
- [ ] No TypeScript errors
- [ ] No ESLint security warnings
- [ ] CSP violation monitoring enabled
- [ ] Audit logs reviewed
- [ ] Credentials rotated and secured
- [ ] Security tests added for each fix

## Monitoring & Validation

Post-deployment monitoring:
1. Monitor for CSP violations
2. Track failed authentication attempts
3. Review OAuth linking patterns
4. Analyze authorization failures
5. Check for any credential exposure

## Success Criteria

- Zero critical vulnerabilities
- 100% test coverage and passage
- No unsafe TypeScript usage
- Strict CSP without unsafe directives
- Secure OAuth configuration
- Centralized authorization
- Real-time security monitoring

## Next Steps

1. **Immediate**: Begin credential rotation
2. **Today**: Fix critical configuration issues
3. **This Week**: Resolve all high-priority items
4. **This Month**: Complete medium-priority enhancements
5. **Ongoing**: Regular security audits and updates

---

**Note**: This plan should be reviewed with the security team and updated based on any additional findings. Priority should be given to the critical issues that could lead to immediate compromise.