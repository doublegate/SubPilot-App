# AI Categorization System

## Overview

SubPilot's AI Categorization system uses OpenAI's GPT models to automatically categorize subscriptions and transactions into meaningful categories. This helps users better understand their spending patterns and manage their subscriptions more effectively.

## Features

### 1. Smart Transaction Categorization

- Automatically categorizes transactions using AI
- Normalizes merchant names (e.g., "NETFLIX.COM *123456" → "Netflix")
- Provides confidence scores for each categorization
- Falls back to keyword-based categorization when AI is unavailable

### 2. Merchant Name Normalization

- Cleans up transaction descriptions
- Removes transaction IDs and extra characters
- Standardizes merchant names for better grouping

### 3. Caching & Performance

- Caches categorization results to reduce API calls
- Batch processing for efficiency
- Background job processing for large datasets
- Smart merchant alias system

### 4. Manual Override Capability

- Users can manually override AI categorizations
- Manual overrides are preserved and take precedence
- Helps train the system for better accuracy

## Categories

The system supports the following subscription categories:

| Category | Icon | Description | Example Services |
|----------|------|-------------|------------------|
| Streaming | 🎬 | Video and media streaming | Netflix, Hulu, Disney+ |
| Music | 🎵 | Music streaming and audio | Spotify, Apple Music |
| Software | 💻 | Software subscriptions | Adobe, Microsoft 365 |
| Gaming | 🎮 | Gaming subscriptions | Xbox Game Pass, PS Plus |
| News | 📰 | News and publications | NY Times, WSJ |
| Fitness | 💪 | Fitness and wellness | Peloton, Strava |
| Education | 📚 | Educational platforms | Coursera, MasterClass |
| Storage | ☁️ | Cloud storage services | Dropbox, Google One |
| Food | 🍔 | Food delivery subscriptions | DoorDash Pass, Uber One |
| Utilities | 📱 | Internet, phone, utilities | Verizon, AT&T |
| Finance | 💳 | Financial services | QuickBooks, YNAB |
| Other | 📦 | Other subscriptions | Everything else |

## API Endpoints

### Categorization Router (`/api/trpc/categorization`)

#### `categorizeTransaction`

Categorize a single transaction.

```typescript
const result = await trpc.categorization.categorizeTransaction.mutate({
  transactionId: "trans123",
  forceRecategorize: false // Optional, defaults to false
});

// Returns:
{
  success: true,
  category: "streaming",
  confidence: 0.95,
  normalizedName: "Netflix"
}
```

#### `bulkCategorize`

Categorize multiple transactions at once.

```typescript
const result = await trpc.categorization.bulkCategorize.mutate({
  transactionIds: ["trans1", "trans2"], // Optional, processes all uncategorized if not provided
  forceRecategorize: false
});

// Returns:
{
  categorized: 5,
  failed: 1,
  results: [
    {
      transactionId: "trans1",
      category: "streaming",
      confidence: 0.95,
      normalizedName: "Netflix"
    },
    // ...
  ]
}
```

#### `categorizeSubscription`

Categorize a subscription.

```typescript
const result = await trpc.categorization.categorizeSubscription.mutate({
  subscriptionId: "sub123",
  forceRecategorize: false
});
```

#### `updateCategory`

Manually update a subscription's category.

```typescript
await trpc.categorization.updateCategory.mutate({
  subscriptionId: "sub123",
  category: "music"
});
```

#### `getCategories`

Get all available categories.

```typescript
const categories = await trpc.categorization.getCategories.query();
```

#### `getMerchantAliases`

Get merchant name mappings.

```typescript
const aliases = await trpc.categorization.getMerchantAliases.query({
  category: "streaming", // Optional
  verified: true,        // Optional
  search: "netflix",     // Optional
  limit: 50,
  offset: 0
});
```

#### `getStats`

Get categorization statistics.

```typescript
const stats = await trpc.categorization.getStats.query();

// Returns:
{
  transactions: {
    total: 100,
    categorized: 85,
    percentage: 85
  },
  subscriptions: {
    total: 20,
    categorized: 18,
    percentage: 90
  },
  categoryBreakdown: [
    { category: "streaming", count: 5 },
    { category: "music", count: 3 }
  ]
}
```

## Configuration

### Environment Variables

```env
# Required for AI categorization
OPENAI_API_KEY=your-openai-api-key

# Optional Redis for production caching
REDIS_URL=redis://localhost:6379
```

### Cost Management

The system tracks API usage and costs:

- Uses GPT-4o-mini by default (most cost-effective)
- Implements aggressive caching to minimize API calls
- Batch processing reduces per-request overhead
- Rate limiting prevents abuse

Approximate costs:

- GPT-4o-mini: ~$0.0002 per categorization
- GPT-4o: ~$0.003 per categorization
- GPT-3.5-turbo: ~$0.0007 per categorization

## Database Schema

### Transaction Table Updates

```prisma
model Transaction {
  // ... existing fields
  
  // AI Categorization
  aiCategory            String?  // AI-detected category
  aiCategoryConfidence  Decimal? // Confidence score
  normalizedMerchantName String? // AI-normalized merchant name
}
```

### Subscription Table Updates

```prisma
model Subscription {
  // ... existing fields
  
  // AI Categorization
  aiCategory            String?  // AI-detected category
  aiCategoryConfidence  Decimal? // Confidence score
  categoryOverride      String?  // Manual override by user
}
```

### New Tables

#### Category Table

Stores the category hierarchy:

```prisma
model Category {
  id          String   @id
  name        String   @unique
  description String?
  icon        String?
  keywords    Json     // Array of keywords
  isActive    Boolean
  sortOrder   Int
}
```

#### MerchantAlias Table

Caches merchant name mappings:

```prisma
model MerchantAlias {
  id               String   @id
  originalName     String   @unique
  normalizedName   String
  category         String?
  confidence       Decimal
  isVerified       Boolean
  usageCount       Int
}
```

## Background Processing

The system includes a background job processor that:

1. **Automatically categorizes new transactions**
   - Runs every 5 minutes by default
   - Processes uncategorized transactions in batches
   - Respects rate limits

2. **Updates merchant aliases**
   - Learns from categorization patterns
   - Improves accuracy over time

3. **Cleans up old data**
   - Removes unused merchant aliases
   - Maintains database performance

To start the job processor:

```typescript
import { getCategorizationJobProcessor } from '@/server/services/categorization-job';

const jobProcessor = getCategorizationJobProcessor(prisma);
jobProcessor.start(5); // Run every 5 minutes
```

## Implementation Guide

### 1. Initial Setup

```bash
# Run database migrations
npm run db:push

# Seed default categories
npx tsx scripts/seed-categories.ts

# Set up environment variables
echo "OPENAI_API_KEY=your-key-here" >> .env.local
```

### 2. Categorize Existing Data

```typescript
// In your application initialization or admin panel
const categorizationService = getCategorizationService(prisma);

// Categorize all uncategorized transactions for a user
const result = await categorizationService.bulkCategorizeTransactions(userId);
console.log(`Categorized ${result.categorized} transactions`);
```

### 3. UI Integration

```tsx
// Example: Category selector component
function CategorySelector({ subscriptionId, currentCategory }) {
  const utils = api.useContext();
  const { data: categories } = api.categorization.getCategories.useQuery();
  const updateCategory = api.categorization.updateCategory.useMutation({
    onSuccess: () => {
      utils.subscriptions.invalidate();
    }
  });

  return (
    <Select 
      value={currentCategory} 
      onValueChange={(category) => 
        updateCategory.mutate({ subscriptionId, category })
      }
    >
      {Object.entries(categories ?? {}).map(([id, cat]) => (
        <SelectItem key={id} value={id}>
          {cat.icon} {cat.name}
        </SelectItem>
      ))}
    </Select>
  );
}
```

### 4. Display Categorization Stats

```tsx
function CategorizationStats() {
  const { data: stats } = api.categorization.getStats.useQuery();

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h3>Categorization Progress</h3>
      <div>
        Transactions: {stats.transactions.categorized}/{stats.transactions.total} 
        ({stats.transactions.percentage}%)
      </div>
      <div>
        Subscriptions: {stats.subscriptions.categorized}/{stats.subscriptions.total}
        ({stats.subscriptions.percentage}%)
      </div>
    </div>
  );
}
```

## Best Practices

1. **Rate Limiting**
   - Implement user-based rate limits
   - Use batch processing for bulk operations
   - Cache results aggressively

2. **Error Handling**
   - Always provide fallback categorization
   - Log API errors for monitoring
   - Gracefully degrade when AI is unavailable

3. **Performance**
   - Use background jobs for large datasets
   - Implement pagination for merchant aliases
   - Monitor API costs and usage

4. **User Experience**
   - Show confidence scores to users
   - Allow easy manual overrides
   - Provide category statistics

## Troubleshooting

### Common Issues

1. **"OpenAI API key is required"**
   - Ensure `OPENAI_API_KEY` is set in environment variables
   - Restart the development server after adding the key

2. **Rate limit errors**
   - Implement proper rate limiting
   - Use caching to reduce API calls
   - Consider upgrading OpenAI plan if needed

3. **Low confidence scores**
   - Improve merchant name normalization
   - Add more keywords to categories
   - Verify merchant aliases

4. **Slow categorization**
   - Enable Redis caching in production
   - Use batch processing
   - Run background jobs during off-peak hours

## Future Enhancements

1. **Multi-language Support**
   - Categorize transactions in different languages
   - Localized category names

2. **Custom Categories**
   - Allow users to create custom categories
   - Personal categorization rules

3. **Machine Learning**
   - Train custom models on user data
   - Improve accuracy over time

4. **Advanced Analytics**
   - Category spending trends
   - Predictive categorization
   - Anomaly detection
