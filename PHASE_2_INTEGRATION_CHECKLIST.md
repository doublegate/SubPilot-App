# Phase 2 Integration Checklist

## 🔧 Environment Setup

### AI Categorization
- [ ] Add `OPENAI_API_KEY` to `.env.local`
- [ ] Configure `OPENAI_MODEL` (default: gpt-4o-mini)
- [ ] Set `OPENAI_MAX_TOKENS` (default: 150)
- [ ] Run `npx tsx scripts/seed-categories.ts` to initialize categories

### Analytics
- [ ] Configure `ANALYTICS_CACHE_TTL` (default: 3600)
- [ ] Set `ENABLE_PREDICTIONS` to true
- [ ] Verify database indexes are created

### Export & PWA
- [ ] Set `MAX_EXPORT_ROWS` limit (default: 10000)
- [ ] Configure `EXPORT_RATE_LIMIT` (default: 10)
- [ ] Generate PWA icons (192px, 512px, 1024px)
- [ ] Update manifest.json with production URL

## 🗃️ Database Migrations

```bash
# Update database schema with new tables
npm run db:push

# Verify new tables exist
npm run db:studio
```

Tables to verify:
- [ ] Category table with default categories
- [ ] MerchantAlias table for caching
- [ ] AI categorization fields in Transaction
- [ ] AI categorization fields in Subscription

## 🎨 UI Integration

### Dashboard Page
- [ ] Add `CategorizationStats` widget to show AI statistics
- [ ] Integrate predictive analytics chart
- [ ] Add insights card for recommendations
- [ ] Include export button in header

### Subscriptions Page
- [ ] Add `BulkCategorySelector` for batch categorization
- [ ] Replace desktop list with `MobileSubscriptionList` on mobile
- [ ] Add swipe gestures to subscription cards
- [ ] Include category filter dropdown

### Analytics Page
- [ ] Link to `/analytics/advanced` from dashboard
- [ ] Ensure charts are responsive
- [ ] Add loading states for all charts
- [ ] Include export functionality

### Mobile Navigation
- [ ] Conditionally render `MobileNav` on mobile devices
- [ ] Add `MobileQuickActions` FAB
- [ ] Ensure bottom padding for navigation
- [ ] Test pull-to-refresh on all pages

## 🧪 Testing Checklist

### AI Categorization
```bash
# Test categorization
npx tsx scripts/test-categorization.ts

# Start background job (optional)
npx tsx scripts/start-categorization-job.ts
```

### Analytics
- [ ] Verify time-series charts load correctly
- [ ] Test prediction accuracy
- [ ] Check anomaly detection triggers
- [ ] Validate export data integrity

### Mobile & PWA
- [ ] Test on real iOS device (Safari)
- [ ] Test on real Android device (Chrome)
- [ ] Verify PWA installation
- [ ] Test offline functionality
- [ ] Check service worker updates

## 📱 PWA Deployment

### Before Production
<<<<<<< HEAD
1. Generate actual icon files:
=======

1. Generate actual icon files:

>>>>>>> b7d1a55 (feat: release v1.1.0 - AI-powered analytics and mobile PWA)
   ```bash
   # Use a tool like PWA Asset Generator
   npx pwa-asset-generator logo.png ./public/icons
   ```

2. Update manifest.json:
   - [ ] Set correct `start_url`
   - [ ] Update icon paths
   - [ ] Verify theme colors

3. Service Worker:
   - [ ] Review cache strategies
   - [ ] Set appropriate cache expiration
   - [ ] Test update flow

## 🚀 Performance Verification

### Lighthouse Scores
<<<<<<< HEAD
Run Lighthouse audit and verify:
=======

Run Lighthouse audit and verify:

>>>>>>> b7d1a55 (feat: release v1.1.0 - AI-powered analytics and mobile PWA)
- [ ] Performance > 90
- [ ] Accessibility > 90
- [ ] Best Practices > 90
- [ ] SEO > 90
- [ ] PWA - All checks pass

### Bundle Size
<<<<<<< HEAD
```bash
npm run analyze
```
=======

```bash
npm run analyze
```

>>>>>>> b7d1a55 (feat: release v1.1.0 - AI-powered analytics and mobile PWA)
- [ ] Check for large dependencies
- [ ] Verify code splitting works
- [ ] Ensure tree shaking is effective

## 📊 Feature Verification

### AI Categorization
- [ ] Single transaction categorization works
- [ ] Bulk categorization processes efficiently
- [ ] Manual overrides persist
- [ ] Merchant aliases are cached
- [ ] Cost tracking is accurate

### Analytics
- [ ] All chart types render correctly
- [ ] Predictions show confidence intervals
- [ ] Comparisons calculate accurately
- [ ] Reports generate successfully
- [ ] Insights are actionable

### Mobile Experience
- [ ] Bottom navigation is accessible
- [ ] Swipe gestures feel natural
- [ ] Pull-to-refresh works smoothly
- [ ] Charts are readable on small screens
- [ ] Export works on mobile

### Data Export
- [ ] CSV includes all selected fields
- [ ] JSON structure is valid
- [ ] PDF generates with proper formatting
- [ ] Date filtering works correctly
- [ ] Large exports handle gracefully

## 🐛 Common Issues & Solutions

### OpenAI Rate Limiting
- Solution: Implement exponential backoff
- Check: Rate limiter is configured

### Analytics Performance
- Solution: Enable caching
- Check: Database indexes exist

### PWA Not Installing
- Solution: Ensure HTTPS in production
- Check: Manifest and service worker paths

### Mobile Gestures Laggy
- Solution: Use CSS transforms
- Check: Animations use GPU acceleration

## ✅ Final Checklist

Before considering Phase 2 complete:
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] UI components integrated
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Accessibility audit passed

## 📝 Notes

- Monitor OpenAI API costs daily
- Set up alerts for anomaly detection
- Plan icon generation before production
- Consider CDN for static assets
- Review service worker cache size
