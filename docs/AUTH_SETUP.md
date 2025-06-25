# 🔐 Authentication Setup Guide

**Last Updated**: 2025-06-25 03:19 AM EDT

## Prerequisites

- Domain name (for production) or use localhost:3000 for development
- Email sending capability (Mailhog for dev, SendGrid for production)

---

## 1. 📧 Email Magic Link Setup

### Development Setup (Mailhog)

1. **Install Mailhog (email testing tool):**

   ```bash
   # macOS
   brew install mailhog

   # Linux
   go install github.com/mailhog/MailHog@latest

   # Or use Docker
   docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
   ```

2. **Start Mailhog:**

   ```bash
   mailhog
   ```

3. **Access Mailhog UI:**
   - Open browser: <http://localhost:8025>
   - All test emails will appear here

4. **Update .env.local:**

   ```env
   # Email (Development)
   SMTP_HOST="localhost"
   SMTP_PORT="1025"
   FROM_EMAIL="noreply@subpilot.com"
   # Leave SMTP_USER and SMTP_PASS empty for Mailhog
   ```

### Production Setup (SendGrid)

1. **Create SendGrid Account:**
   - Go to <https://sendgrid.com/>
   - Click "Start for free"
   - Fill out the form (use real info)
   - Verify your email

2. **Complete SendGrid Setup:**
   - Login to SendGrid Dashboard
   - Complete sender authentication:
     - Go to Settings → Sender Authentication
     - Choose "Single Sender Verification" (easier) or "Domain Authentication" (better)
     - Follow the verification steps

3. **Create API Key:**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name: "SubPilot Production"
   - API Key Permissions: "Full Access"
   - Click "Create & View"
   - **COPY THE KEY NOW** (shown only once!)

4. **Update .env.local:**

   ```env
   # Email (Production)
   SENDGRID_API_KEY="SG.xxxxx.xxxxx"  # Your actual API key
   FROM_EMAIL="noreply@yourdomain.com"  # Must match verified sender
   ```

---

## 2. 🔵 Google OAuth Setup

### Step-by-Step Guide

1. **Go to Google Cloud Console:**
   - Visit: <https://console.cloud.google.com/>
   - Sign in with your Google account

2. **Create a New Project (or select existing):**
   - Click the project dropdown (top left)
   - Click "New Project"
   - Project Name: "SubPilot"
   - Click "Create"

3. **Enable Google+ API:**
   - In search bar, type "Google+ API"
   - Click on "Google+ API"
   - Click "Enable"

4. **Configure OAuth Consent Screen:**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" (unless using Google Workspace)
   - Click "Create"
   - Fill out the form:
     - App name: "SubPilot"
     - User support email: Your email
     - App logo: Upload SubPilot logo (optional)
     - Application home page: <https://yourdomain.com>
     - Authorized domains: Add your domain
     - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Click "Add or Remove Scopes"
     - Check: .../auth/userinfo.email
     - Check: .../auth/userinfo.profile
     - Check: openid
   - Click "Save and Continue"
   - Test users: Add your email (for testing)
   - Click "Save and Continue"

5. **Create OAuth Client ID:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "SubPilot Web Client"
   - Authorized JavaScript origins:

     ```
     http://localhost:3000
     https://yourdomain.com
     ```

   - Authorized redirect URIs:

     ```
     http://localhost:3000/api/auth/callback/google
     https://yourdomain.com/api/auth/callback/google
     ```

   - Click "Create"

6. **Copy Credentials:**
   - You'll see a modal with:
     - Client ID: `xxxxx.apps.googleusercontent.com`
     - Client Secret: `GOCSPX-xxxxx`
   - Copy both values

7. **Update .env.local:**

   ```env
   GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"
   ```

---

## 3. ⚫ GitHub OAuth Setup

### Step-by-Step Guide

1. **Go to GitHub Settings:**
   - Visit: <https://github.com/settings/apps>
   - Or: Click your profile → Settings → Developer settings

2. **Create OAuth App:**
   - Click "OAuth Apps" (left sidebar)
   - Click "New OAuth App"

3. **Fill Out App Information:**
   - Application name: "SubPilot"
   - Homepage URL:
     - Development: `http://localhost:3000`
     - Production: `https://yourdomain.com`
   - Application description: "Smart subscription management platform"
   - Authorization callback URL:
     - Development: `http://localhost:3000/api/auth/callback/github`
     - Production: `https://yourdomain.com/api/auth/callback/github`
   - Click "Register application"

4. **Generate Client Secret:**
   - After creating, you'll see your app page
   - Copy the "Client ID"
   - Click "Generate a new client secret"
   - Copy the secret (shown only once!)

5. **Update .env.local:**

   ```env
   GITHUB_CLIENT_ID="Ov23lixxxxx"
   GITHUB_CLIENT_SECRET="xxxxx"
   ```

6. **For Multiple Environments:**
   - Create separate OAuth apps for dev/staging/production
   - Each needs its own callback URL

---

## 4. 🔑 NextAuth Configuration

### Complete .env.local Setup

```env
# ======================
# AUTH.JS CONFIGURATION
# ======================
NEXTAUTH_SECRET="your-super-secret-key-generate-this"
NEXTAUTH_URL="http://localhost:3000"  # Change for production

# ======================
# OAUTH PROVIDERS
# ======================
# Google OAuth
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"

# GitHub OAuth
GITHUB_CLIENT_ID="Ov23lixxxxx"
GITHUB_CLIENT_SECRET="xxxxx"

# ======================
# EMAIL CONFIGURATION
# ======================
# For Development (Mailhog)
SMTP_HOST="localhost"
SMTP_PORT="1025"
FROM_EMAIL="noreply@subpilot.com"

# For Production (SendGrid)
# SENDGRID_API_KEY="SG.xxxxx"
# FROM_EMAIL="noreply@yourdomain.com"
```

### Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

---

## 5. 🧪 Testing Each Provider

### Test Email Magic Link

1. Start Mailhog: `mailhog`
2. Go to <http://localhost:3000/login>
3. Enter any email address
4. Click "Send magic link"
5. Check Mailhog UI: <http://localhost:8025>
6. Click the link in the email

### Test Google OAuth

1. Go to <http://localhost:3000/login>
2. Click "Continue with Google"
3. Select your Google account
4. Grant permissions
5. Should redirect to dashboard

### Test GitHub OAuth

1. Go to <http://localhost:3000/login>
2. Click "Continue with GitHub"
3. Authorize the app
4. Should redirect to dashboard

---

## 6. 🚀 Production Deployment

### Vercel Environment Variables

1. Go to your Vercel project
2. Settings → Environment Variables
3. Add all the production values:

```env
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=<prod-client-id>
GOOGLE_CLIENT_SECRET=<prod-secret>
GITHUB_CLIENT_ID=<prod-client-id>
GITHUB_CLIENT_SECRET=<prod-secret>
SENDGRID_API_KEY=<your-api-key>
FROM_EMAIL=noreply@yourdomain.com
```

### Update OAuth Redirect URIs

Remember to update redirect URIs in:

- Google Cloud Console
- GitHub OAuth App Settings

Change from `http://localhost:3000` to `https://yourdomain.com`

---

## 🐛 Common Issues & Solutions

### Email Not Sending

- Check Mailhog is running: <http://localhost:8025>
- Verify SendGrid API key is correct
- Check SendGrid sender verification

### OAuth Redirect Mismatch

- Ensure redirect URI matches exactly (including trailing slashes)
- Check NEXTAUTH_URL matches your domain
- Verify you're using the correct environment's credentials

### Session Not Persisting

- Check NEXTAUTH_SECRET is set
- Ensure DATABASE_URL is correct
- Verify cookies are enabled

### Google OAuth 400 Error

- Verify redirect URI includes `/api/auth/callback/google`
- Check authorized domains in Google Console
- Ensure client ID/secret are from the same project

---

## 📋 Quick Checklist

- [ ] Mailhog installed and running (dev)
- [ ] SendGrid account created and verified (prod)
- [ ] Google Cloud project created
- [ ] Google OAuth consent screen configured
- [ ] Google OAuth client ID created
- [ ] GitHub OAuth app created
- [ ] All environment variables in .env.local
- [ ] NEXTAUTH_SECRET generated
- [ ] Test each auth method works

That's it! All three authentication methods should now be working.

---

## 🔧 OAuth Schema Fix (June 25, 2025)

### Issue Fixed
- OAuth login with Google/GitHub was failing with Prisma errors
- Error: "Unknown field `accounts`" and "Unknown argument `provider_providerAccountId`"
- Root cause: Naming conflict between OAuth Account model and Bank Account model

### Solution Applied
1. Added proper OAuth `Account` model to Prisma schema for Auth.js
2. Renamed existing `Account` model to `BankAccount` to avoid conflicts
3. Updated all code references throughout the codebase
4. Regenerated Prisma client and pushed to database

### Files Updated
- `/prisma/schema.prisma` - Added OAuth Account model, renamed to BankAccount
- `/src/server/api/routers/plaid.ts` - Updated all account references
- `/src/app/api/webhooks/plaid/route.ts` - Updated webhook handler
- `/src/server/api/routers/transactions.ts` - Updated transaction queries
- `/src/server/api/routers/analytics.ts` - Updated analytics queries

OAuth login with Google and GitHub now works correctly!
