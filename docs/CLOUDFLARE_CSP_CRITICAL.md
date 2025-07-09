# CRITICAL: Cloudflare Rocket Loader CSP Conflict

## Issue Summary

The production website is currently broken due to a conflict between Cloudflare's Rocket Loader and our strict Content Security Policy (CSP). 

## Problem Details

1. **Rocket Loader** automatically injects inline JavaScript that violates our CSP
2. Our production CSP deliberately excludes `'unsafe-inline'` for security
3. This causes multiple "Refused to execute inline script" errors
4. The site fails to load properly in production

## Immediate Solution Required

### Option 1: Disable Rocket Loader (RECOMMENDED)

1. Log into Cloudflare Dashboard
2. Navigate to **Speed** → **Optimization**
3. Find **Rocket Loader** setting
4. Toggle it to **OFF**
5. Wait 5 minutes for changes to propagate

### Option 2: Re-enable 'unsafe-inline' (NOT RECOMMENDED)

This would compromise the security improvements we just implemented.

## Technical Details

Rocket Loader dynamically injects scripts with unpredictable content, making it impossible to whitelist them using CSP hashes or nonces. The scripts change based on page content and cannot be predetermined.

## Long-term Solutions

1. **Use Cloudflare Workers** for performance optimization instead of Rocket Loader
2. **Implement proper code splitting** in Next.js for better performance
3. **Use Next.js built-in optimizations** which are CSP-friendly

## Status

- Added `ajax.cloudflare.com` to CSP script-src (helps but doesn't fully resolve)
- Fixed Permissions-Policy error (removed invalid 'browsing-topics')
- Documentation created for immediate action

## Action Required

**Please disable Rocket Loader in Cloudflare Dashboard immediately to restore site functionality.**

---

Created: 2025-07-08
Priority: CRITICAL - Site is currently broken in production