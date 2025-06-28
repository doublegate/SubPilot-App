# Security Policy

## Supported Versions

SubPilot is currently in development. Security updates will be provided for:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of SubPilot seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do NOT

- Open a public GitHub issue
- Post about it on social media
- Exploit the vulnerability

### Please DO

- Email us at: <security@subpilot.app>
- Include "SECURITY" in the subject line
- Provide detailed steps to reproduce the issue
- Include the impact of the vulnerability
- Suggest a fix if you have one

### What to expect

- Acknowledgment within 48 hours
- Regular updates on our progress
- Credit in our security acknowledgments (unless you prefer anonymity)
- A fix released as soon as possible

## Security Measures

SubPilot implements multiple layers of security:

### Authentication & Authorization

- **Auth.js** for secure authentication
- JWT tokens with proper expiration
- Session management with secure cookies
- OAuth 2.0 for third-party providers
- Role-based access control (RBAC)
- **Account lockout protection** (5 failed attempts, 30-minute lockout)
- **Failed login tracking** with automatic unlock

### Data Protection

- **Encryption at rest** for sensitive data
- **Encryption in transit** using TLS 1.3
- Secure storage of API keys and tokens
- PII data anonymization where possible
- Regular data backups with encryption
- **Audit logging** for compliance and security monitoring

### API Security

- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention via Prisma ORM
- XSS protection headers
- CSRF protection
- **Request signing** for sensitive operations
- **Webhook signature verification**

### Third-Party Integrations

- **Plaid**: Bank-level security for financial data
  - Token-based access (no credentials stored)
  - Webhook signature verification
  - Encrypted data transmission
- **OAuth Providers**: Industry-standard implementations
- Regular security audits of dependencies

### Infrastructure Security

- Environment variables for secrets
- No secrets in version control
- Secure deployment pipelines
- Regular dependency updates
- Container security scanning
- **Error boundaries** for fault isolation
- **Comprehensive audit trail** for security events
- **In-memory/Redis rate limiting** with automatic failover

## Security Best Practices for Contributors

When contributing to SubPilot, please follow these security guidelines:

### Code Security

```typescript
// ❌ DON'T: Hardcode secrets
const apiKey = "sk_live_abc123";

// ✅ DO: Use environment variables
const apiKey = process.env.API_KEY;
```

### Database Queries

```typescript
// ❌ DON'T: Concatenate user input
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ DO: Use Prisma ORM
const user = await prisma.user.findUnique({
  where: { id: userId }
});
```

### Authentication Checks

```typescript
// ❌ DON'T: Trust client-side data
if (req.body.isAdmin) { /* ... */ }

// ✅ DO: Verify server-side
const session = await getServerSession(authOptions);
if (session?.user?.role === 'admin') { /* ... */ }
```

### Error Handling

```typescript
// ❌ DON'T: Expose internal errors
catch (error) {
  return res.status(500).json({ error: error.message });
}

// ✅ DO: Log internally, return generic message
catch (error) {
  console.error('Internal error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}
```

## Security Checklist for New Features

Before submitting a PR, ensure:

- [ ] No hardcoded secrets or credentials
- [ ] All user inputs are validated and sanitized
- [ ] Authentication is required for protected routes
- [ ] Authorization checks are in place
- [ ] Sensitive data is encrypted
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies are up to date
- [ ] Security headers are configured
- [ ] Rate limiting is implemented
- [ ] Logging doesn't include sensitive data

## Dependency Management

- Regular automated dependency updates via Dependabot
- Security vulnerability scanning with `npm audit`
- Critical updates applied within 24 hours
- Major updates reviewed for breaking changes

## Incident Response

In case of a security incident:

1. **Assess** the impact and scope
2. **Contain** the vulnerability
3. **Investigate** root cause
4. **Remediate** with a fix
5. **Communicate** to affected users
6. **Review** and improve processes

## Security Acknowledgments

We thank the following researchers for responsibly disclosing vulnerabilities:

- *List will be updated as vulnerabilities are reported and fixed*

## Contact

- Security Team: <security@subpilot.app>
- General Inquiries: <support@subpilot.app>

---

Last Updated: 2025-06-27
