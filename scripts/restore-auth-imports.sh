#!/bin/bash

echo "Restoring all auth imports to use barrel file..."

# Find all files that import from @/server/auth.config
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -not -path "./dist/*" \
  -not -path "./build/*" \
  -exec grep -l "from ['\"]\@/server/auth\.config['\"]" {} \; | while read file; do
    echo "Updating: $file"
    # Replace the import statement
    sed -i "s|from ['\"]\@/server/auth\.config['\"]|from '@/server/auth'|g" "$file"
done

echo "Auth imports have been restored!"