# AI Categorization Quick Start Guide

## Overview

SubPilot's AI Categorization system uses OpenAI to automatically categorize your subscriptions and transactions into meaningful categories like Streaming, Music, Software, etc. This helps you better understand your spending patterns and manage subscriptions more effectively.

## Setup (2 minutes)

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (it starts with `sk-`)

### 2. Configure Environment

Add your OpenAI API key to `.env.local`:

```env
OPENAI_API_KEY="sk-your-api-key-here"
```

### 3. Seed Categories (First Time Only)

```bash
npx tsx scripts/seed-categories.ts
```

This creates the default categories and sample merchant aliases.

## Usage

### Via UI Components

1. **Category Selector** - Available on each subscription card
   - Click the dropdown to manually select a category
   - Click "Categorize" to use AI categorization
   - AI badge shows when AI was used

2. **Bulk Categorization** - Available on the subscriptions page
   - Click "Categorize All with AI" button
   - Processes all uncategorized items

3. **Categorization Stats** - Dashboard widget showing:
   - Percentage of categorized items
   - Top categories breakdown
   - AI system status

### Via API

```typescript
// Single transaction
await trpc.categorization.categorizeTransaction.mutate({
  transactionId: "trans123"
});

// Bulk categorization
await trpc.categorization.bulkCategorize.mutate({
  transactionIds: ["trans1", "trans2"], // Optional, all if omitted
});

// Single subscription
await trpc.categorization.categorizeSubscription.mutate({
  subscriptionId: "sub123"
});

// Manual override
await trpc.categorization.updateCategory.mutate({
  subscriptionId: "sub123",
  category: "streaming"
});
```

### Background Processing

Start the background job processor to automatically categorize new transactions:

```bash
npx tsx scripts/start-categorization-job.ts
```

This runs every 5 minutes by default and:
- Finds uncategorized transactions
- Uses AI to categorize them in batches
- Caches results for performance
- Respects rate limits

## Available Categories

| Category | Icon | Examples |
|----------|------|----------|
| Streaming | 🎬 | Netflix, Hulu, Disney+ |
| Music | 🎵 | Spotify, Apple Music |
| Software | 💻 | Adobe, Microsoft 365 |
| Gaming | 🎮 | Xbox Game Pass, PS Plus |
| News | 📰 | NY Times, WSJ |
| Fitness | 💪 | Peloton, Strava |
| Education | 📚 | Coursera, MasterClass |
| Storage | ☁️ | Dropbox, Google One |
| Food | 🍔 | DoorDash Pass, Uber One |
| Utilities | 📱 | Verizon, AT&T |
| Finance | 💳 | QuickBooks, YNAB |
| Other | 📦 | Everything else |

## Testing

Run the test script to verify everything is working:

```bash
npx tsx scripts/test-categorization.ts
```

This will:
- Test OpenAI connection
- Create sample transactions
- Run categorization
- Display results

## Cost Management

The system uses cost-effective strategies:

1. **Model Selection** - Uses GPT-4o-mini by default (~$0.0002 per categorization)
2. **Caching** - Results are cached to avoid duplicate API calls
3. **Batch Processing** - Multiple items processed in single API call
4. **Merchant Aliases** - Common merchants cached in database

Typical monthly costs:
- Small usage (100 categorizations): ~$0.02
- Medium usage (1000 categorizations): ~$0.20
- Heavy usage (10000 categorizations): ~$2.00

## Troubleshooting

### "OpenAI API key is required"
- Ensure `OPENAI_API_KEY` is set in `.env.local`
- Restart the development server

### Low Confidence Scores
- AI confidence below 70% triggers keyword fallback
- Manual overrides always take precedence
- Merchant aliases improve over time

### Rate Limit Errors
- Default: 60 requests/minute per user
- Implement caching to reduce API calls
- Use batch processing for bulk operations

### No Categories Showing
- Run `npx tsx scripts/seed-categories.ts`
- Check database connection
- Verify categories table exists

## Advanced Features

### Custom Prompts

The system uses optimized prompts for categorization. You can modify them in:
- `src/server/lib/openai-client.ts` - `buildCategorizationPrompt()` method

### Merchant Aliases

View and manage merchant name mappings:

```typescript
const aliases = await trpc.categorization.getMerchantAliases.query({
  category: "streaming",
  verified: true
});
```

### Statistics

Get categorization progress:

```typescript
const stats = await trpc.categorization.getStats.query();
// Returns percentage categorized, category breakdown, etc.
```

## Best Practices

1. **Start with Bulk Categorization** - Process existing data first
2. **Review AI Results** - Check categorizations periodically
3. **Use Manual Overrides** - Correct any miscategorizations
4. **Monitor Costs** - Track API usage in OpenAI dashboard
5. **Enable Background Jobs** - Keep data categorized automatically

## Next Steps

1. Integrate the `<CategorySelector>` component in your subscription cards
2. Add `<CategorizationStats>` to your dashboard
3. Enable background processing for new transactions
4. Monitor and adjust categorization accuracy

For more details, see the full [AI Categorization Documentation](./AI_CATEGORIZATION.md).