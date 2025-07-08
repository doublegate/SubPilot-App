# GitHub OAuth Account Linking Fix

## Problem
GitHub OAuth returns `OAuthAccountNotLinked` error when trying to sign in with an email that already exists in the database (from Google OAuth).

## Root Cause
- User already has an account created with Google OAuth
- GitHub OAuth attempts to create a new account with the same email
- NextAuth.js prevents automatic email-based account linking for security
- Both providers have `allowDangerousEmailAccountLinking: false` (correct security setting)

## Solutions Applied

### 1. Added Missing Database Field
GitHub requires a `refresh_token_expires_in` field in the Account model:
```prisma
refresh_token_expires_in Int? // Required for GitHub OAuth
```

### 2. Created Manual Account Linking Script
Location: `/scripts/link-github-account.ts`

### 3. Enhanced Error Page
The auth-error page already provides clear instructions for the OAuthAccountNotLinked error.

## How to Link Your GitHub Account (Manual Process)

1. **Get your GitHub ID**:
   ```bash
   curl https://api.github.com/users/doublegate
   ```
   Look for the `id` field in the response.

2. **Apply the database migration**:
   ```bash
   npm run db:push
   ```

3. **Run the linking script**:
   ```bash
   npx tsx scripts/link-github-account.ts --email=parobek@gmail.com --github-id=YOUR_GITHUB_ID
   ```

4. **Sign in with GitHub**
   You should now be able to sign in with GitHub!

## Security Considerations

- **DO NOT** enable `allowDangerousEmailAccountLinking` - this is a security vulnerability
- The current behavior (preventing auto-linking) is the secure default
- Manual linking ensures user consent and prevents account takeover attacks

## Future Improvements

1. **Add Account Linking UI** in the profile/settings page
2. **Create tRPC endpoints** for linking/unlinking OAuth accounts
3. **Implement secure linking flow**:
   - User signs in with original provider
   - Initiates linking from profile
   - Redirects to OAuth provider
   - Verifies and links account

## Important Notes

- Google OAuth continues to work perfectly - no changes made to it
- The error page provides helpful instructions to users
- This is a security feature, not a bug - it prevents unauthorized account access