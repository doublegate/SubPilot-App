#!/bin/bash
# Setup script for SubPilot environment configuration

echo "🚀 SubPilot Environment Setup"
echo "============================"
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
fi

# Copy template
cp config/env/.env.template .env.local

echo "✅ Created .env.local from template"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env.local with your credentials"
echo "2. Set up your database connection"
echo "3. Add any OAuth provider credentials (optional)"
echo "4. Run 'npm run dev' to start developing!"
echo ""
echo "📚 See config/ENV_SETUP.md for detailed documentation"