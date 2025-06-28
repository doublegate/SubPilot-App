import { env } from '@/env.js';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  cacheService,
  cacheKeys,
  cacheTTL,
} from '@/server/services/cache.service';
import { checkRateLimit } from '@/server/lib/rate-limiter';

// OpenAI API configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 500;
const TEMPERATURE = 0.3; // Lower temperature for more consistent categorization

// Rate limiting for OpenAI API
const OPENAI_RATE_LIMIT_PER_MINUTE = 60;
const OPENAI_RATE_LIMIT_PER_DAY = 1000;

// Cost tracking constants (approximate costs per 1k tokens)
const MODEL_COSTS = {
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
} as const;

// Subscription categories with descriptions
export const SUBSCRIPTION_CATEGORIES = {
  streaming: {
    name: 'Streaming',
    description: 'Video and media streaming services',
    icon: '🎬',
    keywords: [
      'netflix',
      'hulu',
      'disney',
      'hbo',
      'paramount',
      'peacock',
      'amazon prime',
      'youtube',
    ],
  },
  music: {
    name: 'Music',
    description: 'Music streaming and audio services',
    icon: '🎵',
    keywords: [
      'spotify',
      'apple music',
      'pandora',
      'tidal',
      'soundcloud',
      'deezer',
      'amazon music',
    ],
  },
  software: {
    name: 'Software',
    description: 'Software subscriptions and tools',
    icon: '💻',
    keywords: [
      'adobe',
      'microsoft',
      'notion',
      'slack',
      'zoom',
      'figma',
      'canva',
      'grammarly',
    ],
  },
  gaming: {
    name: 'Gaming',
    description: 'Gaming subscriptions and services',
    icon: '🎮',
    keywords: [
      'xbox',
      'playstation',
      'nintendo',
      'steam',
      'epic',
      'discord',
      'twitch',
    ],
  },
  news: {
    name: 'News',
    description: 'News and publication subscriptions',
    icon: '📰',
    keywords: [
      'nytimes',
      'wsj',
      'washington post',
      'economist',
      'bloomberg',
      'reuters',
    ],
  },
  fitness: {
    name: 'Fitness',
    description: 'Fitness and wellness subscriptions',
    icon: '💪',
    keywords: [
      'peloton',
      'strava',
      'myfitnesspal',
      'headspace',
      'calm',
      'fitbit',
      'apple fitness',
    ],
  },
  education: {
    name: 'Education',
    description: 'Educational and learning platforms',
    icon: '📚',
    keywords: [
      'coursera',
      'udemy',
      'masterclass',
      'skillshare',
      'duolingo',
      'brilliant',
    ],
  },
  storage: {
    name: 'Storage',
    description: 'Cloud storage and backup services',
    icon: '☁️',
    keywords: ['dropbox', 'google', 'icloud', 'onedrive', 'box', 'backblaze'],
  },
  food: {
    name: 'Food',
    description: 'Food delivery and meal subscriptions',
    icon: '🍔',
    keywords: [
      'doordash',
      'uber eats',
      'grubhub',
      'hellofresh',
      'blue apron',
      'instacart',
    ],
  },
  utilities: {
    name: 'Utilities',
    description: 'Internet, phone, and utility services',
    icon: '📱',
    keywords: [
      'verizon',
      'at&t',
      'comcast',
      'spectrum',
      'cox',
      'electric',
      'gas',
      'water',
    ],
  },
  finance: {
    name: 'Finance',
    description: 'Financial services and tools',
    icon: '💳',
    keywords: [
      'bank',
      'credit',
      'insurance',
      'quickbooks',
      'mint',
      'ynab',
      'trading',
    ],
  },
  other: {
    name: 'Other',
    description: 'Other subscriptions',
    icon: '📦',
    keywords: [],
  },
} as const;

export type SubscriptionCategory = keyof typeof SUBSCRIPTION_CATEGORIES;

// Response schemas
const categorizationResponseSchema = z.object({
  category: z.enum(
    Object.keys(SUBSCRIPTION_CATEGORIES) as [
      SubscriptionCategory,
      ...SubscriptionCategory[],
    ]
  ),
  confidence: z.number().min(0).max(1),
  merchantName: z.string(),
  reasoning: z.string().optional(),
});

const bulkCategorizationResponseSchema = z.object({
  categorizations: z.array(
    z.object({
      originalName: z.string(),
      category: z.enum(
        Object.keys(SUBSCRIPTION_CATEGORIES) as [
          SubscriptionCategory,
          ...SubscriptionCategory[],
        ]
      ),
      confidence: z.number().min(0).max(1),
      normalizedName: z.string(),
    })
  ),
});

export type CategorizationResponse = z.infer<
  typeof categorizationResponseSchema
>;
export type BulkCategorizationResponse = z.infer<
  typeof bulkCategorizationResponseSchema
>;

/**
 * OpenAI client for subscription categorization
 */
export class OpenAICategorizationClient {
  private apiKey: string;
  private model: string;
  private costTracker = new Map<string, number>();

  constructor(apiKey?: string, model?: string) {
    if (!apiKey && !env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required');
    }

    this.apiKey = apiKey ?? env.OPENAI_API_KEY!;
    this.model = model ?? DEFAULT_MODEL;
  }

  /**
   * Categorize a single transaction/merchant
   */
  async categorizeTransaction(
    merchantName: string,
    description?: string,
    amount?: number,
    userId?: string
  ): Promise<CategorizationResponse> {
    // Check cache first
    const cacheKey = `ai-categorization:${merchantName.toLowerCase()}`;
    const cached = cacheService.get<CategorizationResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // Rate limiting check
    if (userId) {
      const rateLimit = await checkRateLimit(userId, 'openai-categorize');
      if (!rateLimit.allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded for AI categorization',
        });
      }
    }

    // Build prompt
    const prompt = this.buildCategorizationPrompt(
      merchantName,
      description,
      amount
    );

    try {
      const response = await this.callOpenAI(prompt, 'categorization');
      const result = categorizationResponseSchema.parse(response);

      // Cache the result
      cacheService.set(cacheKey, result, cacheTTL.veryLong);

      // Track costs
      if (userId) {
        await this.trackCost(userId, 'categorization');
      }

      return result;
    } catch (error) {
      console.error('OpenAI categorization error:', error);

      // Fallback to keyword-based categorization
      return this.fallbackCategorization(merchantName);
    }
  }

  /**
   * Categorize multiple merchants in a single request
   */
  async bulkCategorize(
    merchants: Array<{ name: string; description?: string; amount?: number }>,
    userId?: string
  ): Promise<BulkCategorizationResponse> {
    // Check cache for all merchants
    const uncachedMerchants: typeof merchants = [];
    const cachedResults: BulkCategorizationResponse['categorizations'] = [];

    for (const merchant of merchants) {
      const cacheKey = `ai-categorization:${merchant.name.toLowerCase()}`;
      const cached = cacheService.get<CategorizationResponse>(cacheKey);

      if (cached) {
        cachedResults.push({
          originalName: merchant.name,
          category: cached.category,
          confidence: cached.confidence,
          normalizedName: cached.merchantName,
        });
      } else {
        uncachedMerchants.push(merchant);
      }
    }

    // If all are cached, return immediately
    if (uncachedMerchants.length === 0) {
      return { categorizations: cachedResults };
    }

    // Rate limiting check
    if (userId) {
      const rateLimit = await checkRateLimit(userId, 'openai-bulk-categorize');
      if (!rateLimit.allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded for AI categorization',
        });
      }
    }

    // Build bulk prompt
    const prompt = this.buildBulkCategorizationPrompt(uncachedMerchants);

    try {
      const response = await this.callOpenAI(prompt, 'bulk-categorization');
      const result = bulkCategorizationResponseSchema.parse(response);

      // Cache individual results
      for (const categorization of result.categorizations) {
        const cacheKey = `ai-categorization:${categorization.originalName.toLowerCase()}`;
        cacheService.set(
          cacheKey,
          {
            category: categorization.category,
            confidence: categorization.confidence,
            merchantName: categorization.normalizedName,
          },
          cacheTTL.veryLong
        );
      }

      // Track costs
      if (userId) {
        await this.trackCost(
          userId,
          'bulk-categorization',
          uncachedMerchants.length
        );
      }

      // Combine cached and new results
      return {
        categorizations: [...cachedResults, ...result.categorizations],
      };
    } catch (error) {
      console.error('OpenAI bulk categorization error:', error);

      // Fallback to keyword-based categorization for all
      const fallbackResults = uncachedMerchants.map(merchant => {
        const fallback = this.fallbackCategorization(merchant.name);
        return {
          originalName: merchant.name,
          category: fallback.category,
          confidence: fallback.confidence,
          normalizedName: fallback.merchantName,
        };
      });

      return {
        categorizations: [...cachedResults, ...fallbackResults],
      };
    }
  }

  /**
   * Normalize a merchant name using AI
   */
  async normalizeMerchantName(merchantName: string): Promise<string> {
    const cacheKey = `ai-normalize:${merchantName.toLowerCase()}`;
    const cached = cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const prompt = `
      Normalize this merchant name to its canonical form. Remove any transaction IDs, 
      location information, or extra characters. Return just the clean merchant name.
      
      Examples:
      - "NETFLIX.COM *123456" → "Netflix"
      - "SPOTIFY USA 8884407" → "Spotify"
      - "Amazon Prime*2V4GH8" → "Amazon Prime"
      
      Merchant name: "${merchantName}"
      
      Return only the normalized name, nothing else.
    `;

    try {
      const response = await this.callOpenAI(prompt, 'normalization', 100);
      const normalized = response.trim();

      cacheService.set(cacheKey, normalized, cacheTTL.veryLong);
      return normalized;
    } catch (error) {
      // Fallback normalization
      return this.basicNormalization(merchantName);
    }
  }

  /**
   * Build categorization prompt
   */
  private buildCategorizationPrompt(
    merchantName: string,
    description?: string,
    amount?: number
  ): string {
    const categoriesJson = JSON.stringify(
      Object.entries(SUBSCRIPTION_CATEGORIES).map(([key, value]) => ({
        id: key,
        name: value.name,
        description: value.description,
      }))
    );

    return `
      You are a financial categorization expert. Categorize this subscription/transaction 
      into one of the provided categories.

      Categories:
      ${categoriesJson}

      Transaction details:
      - Merchant: ${merchantName}
      ${description ? `- Description: ${description}` : ''}
      ${amount ? `- Amount: $${amount}` : ''}

      Return a JSON object with:
      {
        "category": "category_id",
        "confidence": 0.0-1.0,
        "merchantName": "normalized merchant name",
        "reasoning": "brief explanation"
      }

      Focus on accuracy. Use context clues from the merchant name and description.
      Normalize the merchant name (e.g., "NETFLIX.COM" → "Netflix").
    `;
  }

  /**
   * Build bulk categorization prompt
   */
  private buildBulkCategorizationPrompt(
    merchants: Array<{ name: string; description?: string; amount?: number }>
  ): string {
    const categoriesJson = JSON.stringify(
      Object.entries(SUBSCRIPTION_CATEGORIES).map(([key, value]) => ({
        id: key,
        name: value.name,
        description: value.description,
      }))
    );

    const merchantsJson = JSON.stringify(merchants);

    return `
      You are a financial categorization expert. Categorize these subscriptions/transactions 
      into the provided categories.

      Categories:
      ${categoriesJson}

      Merchants to categorize:
      ${merchantsJson}

      Return a JSON object with:
      {
        "categorizations": [
          {
            "originalName": "original merchant name",
            "category": "category_id",
            "confidence": 0.0-1.0,
            "normalizedName": "normalized merchant name"
          }
        ]
      }

      Focus on accuracy. Normalize merchant names (e.g., "NETFLIX.COM" → "Netflix").
    `;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(
    prompt: string,
    type: string,
    maxTokens: number = MAX_TOKENS
  ): Promise<any> {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that categorizes financial transactions. Always return valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: TEMPERATURE,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid OpenAI response format');
    }

    try {
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      throw new Error('Failed to parse OpenAI response as JSON');
    }
  }

  /**
   * Fallback categorization using keywords
   */
  private fallbackCategorization(merchantName: string): CategorizationResponse {
    const normalizedName = this.basicNormalization(merchantName);
    const lowerName = normalizedName.toLowerCase();

    // Check each category's keywords
    for (const [categoryId, category] of Object.entries(
      SUBSCRIPTION_CATEGORIES
    )) {
      if (categoryId === 'other') continue; // Skip 'other' in first pass

      for (const keyword of category.keywords) {
        if (lowerName.includes(keyword)) {
          return {
            category: categoryId as SubscriptionCategory,
            confidence: 0.7, // Lower confidence for keyword matching
            merchantName: normalizedName,
            reasoning: `Matched keyword: ${keyword}`,
          };
        }
      }
    }

    // Default to 'other'
    return {
      category: 'other',
      confidence: 0.5,
      merchantName: normalizedName,
      reasoning: 'No matching keywords found',
    };
  }

  /**
   * Basic merchant name normalization
   */
  private basicNormalization(merchantName: string): string {
    return merchantName
      .replace(/\*\w+$/g, '') // Remove transaction IDs like *ABC123
      .replace(/\s+\d{5,}$/g, '') // Remove trailing numbers
      .replace(/\.com|\.COM/g, '') // Remove .com
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Track API costs
   */
  private async trackCost(
    userId: string,
    operation: string,
    count = 1
  ): Promise<void> {
    const costKey = `${userId}:${new Date().toISOString().slice(0, 7)}`; // Monthly tracking
    const currentCost = this.costTracker.get(costKey) ?? 0;

    // Estimate tokens (rough approximation)
    const estimatedTokens = operation === 'categorization' ? 200 : 200 * count;
    const modelCost =
      MODEL_COSTS[this.model as keyof typeof MODEL_COSTS] ??
      MODEL_COSTS['gpt-4o-mini'];
    const cost =
      (estimatedTokens / 1000) * (modelCost.input + modelCost.output);

    this.costTracker.set(costKey, currentCost + cost);

    // Log high usage
    if (currentCost + cost > 10) {
      // Alert if monthly cost exceeds $10
      console.warn(
        `High OpenAI usage for user ${userId}: $${(currentCost + cost).toFixed(2)}`
      );
    }
  }

  /**
   * Get cost statistics
   */
  getCostStats(userId?: string): {
    total: number;
    byUser: Record<string, number>;
  } {
    const byUser: Record<string, number> = {};
    let total = 0;

    for (const [key, cost] of this.costTracker.entries()) {
      const [user] = key.split(':');
      if (!userId || user === userId) {
        byUser[user!] = (byUser[user!] ?? 0) + cost;
        total += cost;
      }
    }

    return { total, byUser };
  }
}

// Export singleton instance
export const openAIClient = new OpenAICategorizationClient();
