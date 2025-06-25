# File Organization Updates - June 24, 2025

## Summary

Reorganized root-level configuration and documentation files into appropriate subdirectories for better project structure.

## Files Moved

### Documentation Files → `docs/`
- `DASHBOARD_FIXES.md` → `docs/DASHBOARD_FIXES.md`
- `RELEASE-NOTES-0.1.5.md` → `docs/RELEASE-NOTES-0.1.5.md`

### Configuration Files → `config/`

#### Build Configuration → `config/build/`
- `tsconfig.json` → `config/build/tsconfig.json`
- `tailwind.config.ts` → `config/build/tailwind.config.ts`
- `postcss.config.cjs` → `config/build/postcss.config.cjs`
- `vitest.config.ts` → `config/build/vitest.config.ts`
- `vercel.json` → `config/build/vercel.json`

#### Testing Configuration → `config/testing/`
- `playwright.config.ts` → `config/testing/playwright.config.ts`

#### Component Configuration → `config/`
- `components.json` → `config/components.json`

## Symlinks Created

To maintain compatibility with build tools that expect configuration files in the root directory:

```bash
tsconfig.json -> config/build/tsconfig.json
tailwind.config.ts -> config/build/tailwind.config.ts
postcss.config.cjs -> config/build/postcss.config.cjs
vitest.config.ts -> config/build/vitest.config.ts
vercel.json -> config/build/vercel.json
playwright.config.ts -> config/testing/playwright.config.ts
```

## Files Updated

- `config/components.json` - Updated tailwind config path to `./build/tailwind.config.ts`
- `config/README.md` - Updated to document the new structure
- `.gitignore` - Added `usage_tracking.json` to ignored files

## Files Kept in Root

The following files remain in the root directory as they are required there:

- `package.json` - NPM package file (must be in root)
- `package-lock.json` - NPM lock file (must be in root)
- `next-env.d.ts` - Next.js type definitions (auto-generated, must be in root)
- `next.config.js` - Next.js configuration (must be in root)
- `Dockerfile` - Docker build file (convention)
- `README.md` - Project readme (convention)
- `LICENSE` - License file (convention)
- `CHANGELOG.md` - Change log (convention)
- `CONTRIBUTING.md` - Contributing guide (convention)
- `SECURITY.md` - Security policy (convention)
- `VERSION` - Version file (convention)
- `.gitignore` - Git ignore file (must be in root)
- `CLAUDE.md` - Claude AI documentation (project root convention)
- `CLAUDE.local.md` - Local Claude AI notes (not in git)

## Benefits

1. **Cleaner Root Directory** - Reduced clutter in the project root
2. **Better Organization** - Related configuration files grouped together
3. **Maintained Compatibility** - Symlinks ensure build tools continue working
4. **Clear Structure** - `config/` directory now has clear subdirectories for different types of configuration

## Notes

- All build tools continue to work as before due to symlinks
- Git will track the symlinks, ensuring the structure works for all developers
- The actual configuration files are now organized in logical subdirectories