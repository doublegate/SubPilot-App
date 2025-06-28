#!/bin/bash

# Script to convert ALL ~/ imports to @/ throughout the entire project
# This script starts at the project root and checks EVERYTHING

PROJECT_ROOT="/var/home/parobek/Code/SubPilot-App"

echo "🔄 Converting ALL ~/ imports to @/ in the entire project..."
echo "📁 Project root: $PROJECT_ROOT"

# Change to project root
cd "$PROJECT_ROOT" || exit 1

# Count initial occurrences
INITIAL_COUNT=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.mjs" -o -name "*.cjs" \) \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -not -path "./dist/*" \
  -not -path "./build/*" \
  -exec grep -l "~/" {} \; 2>/dev/null | wc -l)

echo "📊 Found $INITIAL_COUNT files with ~/ imports"

# Convert all ~/ to @/ in all relevant files
echo "🔧 Converting imports..."

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.mjs" -o -name "*.cjs" \) \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -not -path "./dist/*" \
  -not -path "./build/*" \
  -exec sed -i "s/from '~\//from '@\//g" {} \; \
  -exec sed -i 's/from "~\//from "@\//g' {} \; \
  -exec sed -i "s/import('~\//import('@\//g" {} \; \
  -exec sed -i 's/import("~\//import("@\//g' {} \; \
  -exec sed -i "s/require('~\//require('@\//g" {} \; \
  -exec sed -i 's/require("~\//require("@\//g' {} \; \
  -exec sed -i "s/vi.mock('~\//vi.mock('@\//g" {} \; \
  -exec sed -i 's/vi.mock("~\//vi.mock("@\//g' {} \; \
  -exec sed -i "s/jest.mock('~\//jest.mock('@\//g" {} \; \
  -exec sed -i 's/jest.mock("~\//jest.mock("@\//g' {} \;

# Also check .json files (like tsconfig.json)
echo "🔧 Checking JSON files..."
find . -type f -name "*.json" \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -not -path "./dist/*" \
  -not -path "./build/*" \
  -exec sed -i 's/"~\//"@\//g' {} \;

# Check specific config files that might have imports
echo "🔧 Checking config files..."
for file in .eslintrc.cjs .eslintrc.js next.config.js next.config.mjs tailwind.config.ts postcss.config.mjs vitest.config.ts; do
  if [ -f "$file" ]; then
    sed -i "s/'~\//'@\//g" "$file"
    sed -i 's/"~\/"/"@\//g' "$file"
  fi
done

# Verify results
echo "✅ Conversion complete. Verifying..."

# Count remaining ~/ imports
REMAINING_COUNT=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.mjs" -o -name "*.cjs" \) \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -not -path "./dist/*" \
  -not -path "./build/*" \
  -exec grep -l "~/" {} \; 2>/dev/null | wc -l)

echo "📊 Remaining files with ~/ imports: $REMAINING_COUNT"

# Show any remaining ~/ imports for debugging
if [ "$REMAINING_COUNT" -gt 0 ]; then
  echo "⚠️  Found remaining ~/ imports in these files:"
  find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.mjs" -o -name "*.cjs" \) \
    -not -path "./node_modules/*" \
    -not -path "./.next/*" \
    -not -path "./dist/*" \
    -not -path "./build/*" \
    -exec grep -l "~/" {} \; 2>/dev/null
else
  echo "✅ All ~/ imports have been successfully converted to @/"
fi

# Show summary
echo ""
echo "📋 Summary:"
echo "  - Files checked: All .ts, .tsx, .js, .jsx, .mjs, .cjs, and .json files"
echo "  - Excluded: node_modules/, .next/, dist/, build/"
echo "  - Initial files with ~/: $INITIAL_COUNT"
echo "  - Remaining files with ~/: $REMAINING_COUNT"
echo ""
echo "✅ Conversion script completed!"