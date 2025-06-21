#!/bin/bash

# Update Vercel environment variables

echo "Updating Vercel environment variables..."

# First, let's check current deployment
echo "Current deployment URL: https://subpilot-test.vercel.app"

# Create a file with all required environment variables
cat > .env.production.local << EOF
DATABASE_URL=postgresql://neondb_owner:npg_4LR0SiNGjYmb@ep-holy-violet-a42z7uby-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_SECRET=OukHDYCz0xJKYzl7Khs05+iu6O7AFL6MkTzxrW+ZHMc=
NEXTAUTH_URL=https://subpilot-test.vercel.app
SKIP_ENV_VALIDATION=true
FROM_EMAIL=noreply@subpilot-test.vercel.app
EOF

echo "Environment variables prepared in .env.production.local"
echo ""
echo "Please follow these steps:"
echo "1. Go to: https://vercel.com/doublegate-projects/subpilot-test/settings/environment-variables"
echo "2. Update DATABASE_URL to use the Neon database URL (shown above)"
echo "3. Verify NEXTAUTH_URL is set to: https://subpilot-test.vercel.app"
echo "4. Click 'Save' for each variable"
echo "5. Redeploy the project"
echo ""
echo "Or use these commands to update via CLI:"
echo "vercel env rm DATABASE_URL --yes"
echo "vercel env add DATABASE_URL production < .env.production.local"