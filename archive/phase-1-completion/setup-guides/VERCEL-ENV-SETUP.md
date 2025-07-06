# Vercel Environment Variables Setup

Your SubPilot app is now deployed at: https://subpilot-app-r0zks06p2-doublegate-projects.vercel.app

However, it needs environment variables to function properly. Follow these steps:

## 1. Access Vercel Dashboard

Go to: https://vercel.com/doublegate-projects/subpilot-app/settings/environment-variables

## 2. Add Required Environment Variables

Click "Add Variable" and add each of these:

### Minimum Required Variables

| Key | Value | Environment |
|-----|-------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host/db` | Production |
| `NEXTAUTH_SECRET` | Generate with: `openssl rand -base64 32` | Production |
| `NEXTAUTH_URL` | `https://subpilot-app.vercel.app` | Production |

### Build Variables (Already Set)

| Key | Value | Environment |
|-----|-------|-------------|
| `SKIP_ENV_VALIDATION` | `true` | All |

## 3. Database Quick Setup Options

### Option A: Vercel Postgres (Recommended for Testing)

1. Go to: https://vercel.com/doublegate-projects/subpilot-app/stores
2. Click "Create Database"
3. Select "Postgres"
4. Click "Create"
5. It automatically sets `DATABASE_URL`

### Option B: Supabase (Free)

1. Sign up at https://supabase.com
2. Create new project
3. Go to Settings → Database
4. Copy "Connection string" (URI)
5. Add as `DATABASE_URL` in Vercel

### Option C: Neon (Free)

1. Sign up at https://neon.tech
2. Create database
3. Copy connection string
4. Add as `DATABASE_URL` in Vercel

## 4. Generate NEXTAUTH_SECRET

Run this command locally:
```bash
openssl rand -base64 32
```

Copy the output and use it as the value for `NEXTAUTH_SECRET`.

## 5. Run Database Migrations

After setting up the database:

```bash
# Replace with your actual DATABASE_URL
DATABASE_URL="postgresql://..." npm run db:push
```

## 6. Redeploy

After adding all environment variables, redeploy:

```bash
vercel --prod
```

Or use the Vercel dashboard to redeploy.

## Current Deployment Status

- **URL**: https://subpilot-app-r0zks06p2-doublegate-projects.vercel.app
- **Status**: Deployed but needs environment variables
- **Expected Error**: "Server error" or build errors until database is configured

## Testing the Deployment

Once environment variables are set:

1. Visit the homepage
2. Try to sign up or login
3. Check that pages load without errors

## Optional: Full Feature Setup

For OAuth and email features, add:

| Key | Value | Environment |
|-----|-------|-------------|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | Production |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | Production |
| `GITHUB_CLIENT_ID` | From GitHub OAuth App | Production |
| `GITHUB_CLIENT_SECRET` | From GitHub OAuth App | Production |
| `FROM_EMAIL` | `noreply@yourdomain.com` | Production |
| `SENDGRID_API_KEY` | From SendGrid | Production |

## Troubleshooting

- **500 Error**: Usually means DATABASE_URL is not set
- **Build Failed**: Check build logs in Vercel dashboard
- **Auth Error**: Verify NEXTAUTH_URL matches your deployment URL
- **Database Error**: Ensure database is accessible from Vercel's IPs