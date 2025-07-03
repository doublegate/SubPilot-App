#!/bin/bash

# Script to help rotate credentials after potential exposure
# Run this script to generate new credentials and update configurations

echo "🔐 SubPilot Credential Rotation Script"
echo "====================================="
echo ""
echo "⚠️  IMPORTANT: This script helps generate new credentials."
echo "You must manually update these in their respective services."
echo ""

# Generate new NextAuth secret
echo "1. Generating new NEXTAUTH_SECRET..."
NEW_NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "   New NEXTAUTH_SECRET: $NEW_NEXTAUTH_SECRET"
echo ""

# Generate new encryption key
echo "2. Generating new ENCRYPTION_KEY..."
NEW_ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "   New ENCRYPTION_KEY: $NEW_ENCRYPTION_KEY"
echo ""

# Instructions for other services
echo "3. Manual Updates Required:"
echo "   ========================"
echo ""
echo "   📌 Google OAuth:"
echo "      - Go to: https://console.cloud.google.com/apis/credentials"
echo "      - Select your OAuth 2.0 Client ID"
echo "      - Click 'Reset Secret'"
echo "      - Update GOOGLE_CLIENT_SECRET in .env.local"
echo ""
echo "   📌 GitHub OAuth:"
echo "      - Go to: https://github.com/settings/developers"
echo "      - Select your OAuth App"
echo "      - Click 'Generate a new client secret'"
echo "      - Update GITHUB_CLIENT_SECRET in .env.local"
echo ""
echo "   📌 Plaid API:"
echo "      - Go to: https://dashboard.plaid.com/team/keys"
echo "      - Rotate your secret key"
echo "      - Update PLAID_SECRET in .env.local"
echo ""
echo "   📌 Neon Database:"
echo "      - Go to: https://console.neon.tech"
echo "      - Select your project"
echo "      - Go to Settings > Connection Details"
echo "      - Reset password"
echo "      - Update DATABASE_URL in .env.local"
echo ""

# Create a template for the new .env.local
echo "4. Creating .env.local.new template..."
cat > .env.local.new << EOF
# Database URL - UPDATE WITH NEW PASSWORD
DATABASE_URL="postgresql://[username]:[NEW_PASSWORD]@[host]/[database]"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$NEW_NEXTAUTH_SECRET"

# Encryption Key
ENCRYPTION_KEY="$NEW_ENCRYPTION_KEY"

# OAuth Providers - UPDATE WITH NEW SECRETS
GOOGLE_CLIENT_ID="[YOUR_GOOGLE_CLIENT_ID]"
GOOGLE_CLIENT_SECRET="[NEW_GOOGLE_CLIENT_SECRET]"
GITHUB_CLIENT_ID="[YOUR_GITHUB_CLIENT_ID]"
GITHUB_CLIENT_SECRET="[NEW_GITHUB_CLIENT_SECRET]"

# Plaid Configuration - UPDATE WITH NEW SECRET
PLAID_CLIENT_ID="[YOUR_PLAID_CLIENT_ID]"
PLAID_SECRET="[NEW_PLAID_SECRET]"
PLAID_ENV="sandbox"
PLAID_PRODUCTS="transactions,accounts,identity"
PLAID_COUNTRY_CODES="US,CA"

# Email Configuration (Development)
SMTP_HOST="localhost"
SMTP_PORT="1025"

# Email Configuration (Production - SendGrid)
# SMTP_HOST="smtp.sendgrid.net"
# SMTP_PORT="587"
# SMTP_USER="apikey"
# SMTP_PASS="[YOUR_SENDGRID_API_KEY]"
# FROM_EMAIL="noreply@yourdomain.com"

# Stripe Configuration (if using)
# STRIPE_PUBLISHABLE_KEY="[YOUR_STRIPE_PUBLISHABLE_KEY]"
# STRIPE_SECRET_KEY="[NEW_STRIPE_SECRET_KEY]"
# STRIPE_WEBHOOK_SECRET="[NEW_STRIPE_WEBHOOK_SECRET]"

# Admin Configuration
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="[STRONG_PASSWORD_MIN_12_CHARS]"
EOF

echo "   Created: .env.local.new"
echo ""

# Backup current .env.local
if [ -f .env.local ]; then
    BACKUP_NAME=".env.local.backup.$(date +%Y%m%d_%H%M%S)"
    echo "5. Backing up current .env.local..."
    cp .env.local "$BACKUP_NAME"
    echo "   Backed up to: $BACKUP_NAME"
    echo ""
fi

echo "📋 Next Steps:"
echo "=============="
echo "1. Update all credentials in their respective services"
echo "2. Fill in the placeholders in .env.local.new"
echo "3. Review and verify all values"
echo "4. When ready: mv .env.local.new .env.local"
echo "5. Restart your development server"
echo "6. Test all integrations to ensure they work"
echo ""
echo "⚠️  SECURITY REMINDER:"
echo "- Never commit .env.local to git"
echo "- Use strong, unique passwords"
echo "- Enable 2FA on all service accounts"
echo "- Regularly rotate credentials"
echo "- Consider using a secrets management service"
echo ""
echo "✅ Script completed. Please proceed with manual updates."