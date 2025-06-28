#!/bin/bash

# Generate Prisma migration for security features
echo "🔒 Generating security migration for SubPilot..."

# Generate the migration
npx prisma migrate dev --name add_security_features --create-only

echo "✅ Migration created! Review the migration file before applying."
echo "📝 To apply the migration, run: npx prisma migrate dev"