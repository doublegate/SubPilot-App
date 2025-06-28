#!/bin/bash

echo "Updating all auth imports to use auth.config directly..."

# Find all files that import from @/server/auth
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -not -path "./dist/*" \
  -not -path "./build/*" \
  -exec grep -l "from ['\"]\@/server/auth['\"]" {} \; | while read file; do
    echo "Updating: $file"
    # Replace the import statement
    sed -i "s|from ['\"]\@/server/auth['\"]|from '@/server/auth.config'|g" "$file"
done

echo "Auth imports have been updated!"