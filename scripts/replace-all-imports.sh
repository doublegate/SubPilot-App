#!/bin/bash

# Find all TypeScript, JavaScript files and replace @/ with ~/
find /var/home/parobek/Code/SubPilot-App/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) | while read file; do
  # Replace both single and double quoted imports
  sed -i "s/from '@\//from '~\//g" "$file"
  sed -i 's/from "@\//from "~\//g' "$file"
done

echo "✅ Replaced all @/ imports with ~/"