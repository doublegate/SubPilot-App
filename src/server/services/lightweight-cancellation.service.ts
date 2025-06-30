import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Simple provider registry - no complex database lookups
interface ProviderTemplate {
  id: string;
  name: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // minutes
  logo?: string;

  // Contact methods
  website?: string;
  phone?: string;
  email?: string;
  chatUrl?: string;

  // Manual instructions
  steps: string[];
  tips: string[];
  warnings: string[];

  // Metadata
  requiresLogin: boolean;
  hasRetentionOffers: boolean;
  supportsRefunds: boolean;
  notes?: string;
}

// Built-in provider registry - easily maintainable
const PROVIDER_REGISTRY: Record<string, ProviderTemplate> = {
  netflix: {
    id: 'netflix',
    name: 'Netflix',
    category: 'streaming',
    difficulty: 'easy',
    estimatedTime: 3,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/netflix.svg',
    website: 'https://www.netflix.com/account',
    phone: '1-866-579-7172',
    requiresLogin: true,
    hasRetentionOffers: false,
    supportsRefunds: false,
    steps: [
      'Go to netflix.com and sign in to your account',
      'Click on your profile icon in the top right corner',
      'Select "Account" from the dropdown menu',
      'Under "Membership & Billing", click "Cancel Membership"',
      'Follow the cancellation prompts',
      'Confirm cancellation and note the effective date',
    ],
    tips: [
      'You can continue watching until your current billing period ends',
      'Netflix allows you to reactivate your account at any time',
      'Your viewing history and preferences will be saved for 10 months',
    ],
    warnings: [
      'Cancel before your next billing date to avoid charges',
      'Downloaded content will expire when your subscription ends',
    ],
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    category: 'music',
    difficulty: 'easy',
    estimatedTime: 2,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/spotify.svg',
    website: 'https://www.spotify.com/account',
    requiresLogin: true,
    hasRetentionOffers: true,
    supportsRefunds: false,
    steps: [
      'Go to spotify.com/account and log in',
      'Click on "Subscription" in the left sidebar',
      'Scroll down and click "Cancel Premium"',
      'Choose a reason for canceling (optional)',
      'Click "Continue" to confirm cancellation',
      'Save the confirmation email',
    ],
    tips: [
      'Premium features continue until the end of your billing period',
      'You can reactivate Premium at any time',
      'Your playlists and saved music remain intact',
    ],
    warnings: [
      'You may be offered a discount to stay - consider your options',
      'Offline downloads will become unavailable immediately after cancellation',
    ],
  },
  'adobe-creative-cloud': {
    id: 'adobe-creative-cloud',
    name: 'Adobe Creative Cloud',
    category: 'software',
    difficulty: 'medium',
    estimatedTime: 8,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/adobe.svg',
    website: 'https://account.adobe.com',
    phone: '1-800-833-6687',
    chatUrl: 'https://helpx.adobe.com/contact/chat.html',
    requiresLogin: true,
    hasRetentionOffers: true,
    supportsRefunds: true,
    steps: [
      'Sign in to your Adobe account at account.adobe.com',
      'Go to "Plans & Billing" section',
      'Find your Creative Cloud subscription',
      'Click "Manage Plan" next to your subscription',
      'Select "Cancel Plan" from the options',
      'Choose a cancellation reason',
      'Review any retention offers if presented',
      'Confirm cancellation and note any fees',
    ],
    tips: [
      'Annual plans may have early termination fees',
      'Consider downgrading to Photography plan if you only need Photoshop/Lightroom',
      'Student discounts available if eligible',
    ],
    warnings: [
      'Early cancellation of annual plan may incur 50% fee of remaining payments',
      'Creative Cloud files may become inaccessible',
      'Consider downloading your work before cancellation',
    ],
    notes:
      'Adobe often offers retention discounts. Chat support may waive early termination fees in some cases.',
  },
  'amazon-prime': {
    id: 'amazon-prime',
    name: 'Amazon Prime',
    category: 'shopping',
    difficulty: 'easy',
    estimatedTime: 4,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/amazon.svg',
    website: 'https://www.amazon.com/gp/primecentral',
    phone: '1-888-280-4331',
    requiresLogin: true,
    hasRetentionOffers: false,
    supportsRefunds: true,
    steps: [
      'Go to amazon.com and sign in to your account',
      'Click on "Account & Lists" in the top right',
      'Select "Prime Membership" from the dropdown',
      'Click "Update, cancel and more" on the left side',
      'Select "End Membership" from the options',
      'Choose to end now or at the next renewal date',
      'Confirm your cancellation choice',
    ],
    tips: [
      'You can get a refund for unused portion if you cancel early',
      'Prime benefits continue until the end of your billing period',
      'Amazon may offer a partial refund based on usage',
    ],
    warnings: [
      "You'll lose free shipping, Prime Video, and other benefits",
      'Some purchases may become ineligible for return',
    ],
  },
  'apple-icloud': {
    id: 'apple-icloud',
    name: 'iCloud+',
    category: 'cloud',
    difficulty: 'medium',
    estimatedTime: 5,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/icloud.svg',
    website: 'https://www.icloud.com',
    requiresLogin: true,
    hasRetentionOffers: false,
    supportsRefunds: false,
    steps: [
      'Open Settings on your iPhone/iPad or System Preferences on Mac',
      'Tap/click on your Apple ID at the top',
      'Select "Media & Purchases" then "View Account"',
      'Tap "Subscriptions"',
      'Find iCloud+ and tap on it',
      'Tap "Cancel Subscription"',
      'Confirm cancellation',
    ],
    tips: [
      'You can also manage via App Store > Apple ID > Subscriptions',
      'Storage plan downgrades at the end of billing period',
      'Free 5GB storage remains available',
    ],
    warnings: [
      'Data exceeding free 5GB limit may be deleted after 30 days',
      'Backup and sync features may stop working',
      'Consider downloading important data first',
    ],
  },
  default: {
    id: 'default',
    name: 'Generic Service',
    category: 'other',
    difficulty: 'medium',
    estimatedTime: 10,
    requiresLogin: true,
    hasRetentionOffers: true,
    supportsRefunds: false,
    steps: [
      'Log into your account on the service website',
      'Look for "Account Settings", "Billing", or "Subscription" in the menu',
      'Find the cancellation or subscription management option',
      'Follow the prompts to cancel your subscription',
      'Save any confirmation emails or reference numbers',
      'Verify the effective cancellation date',
    ],
    tips: [
      'Check for cancellation deadlines relative to billing dates',
      'Look for customer service contact information if needed',
      'Consider taking screenshots of confirmation pages',
    ],
    warnings: [
      'Some services require advance notice before billing date',
      'Read terms for any early termination fees',
      'Ensure you have access to important data before canceling',
    ],
  },
};

// Input validation
const LightweightCancellationInput = z.object({
  subscriptionId: z.string(),
  notes: z.string().optional(),
});

const ManualConfirmationInput = z.object({
  confirmationCode: z.string().optional(),
  effectiveDate: z.date().optional(),
  notes: z.string().optional(),
  wasSuccessful: z.boolean(),
});

// Service response types
interface CancellationInstructions {
  provider: ProviderTemplate;
  instructions: {
    overview: string;
    steps: string[];
    tips: string[];
    warnings: string[];
    contactInfo: {
      website?: string;
      phone?: string;
      email?: string;
      chatUrl?: string;
    };
    estimatedTime: string;
    difficulty: string;
  };
}

interface LightweightCancellationResult {
  requestId: string;
  status: 'instructions_provided' | 'completed' | 'failed';
  instructions?: CancellationInstructions;
  confirmationCode?: string;
  effectiveDate?: Date;
  error?: string;
}

export class LightweightCancellationService {
  constructor(private db: PrismaClient) {}

  /**
   * Provide cancellation instructions for a subscription
   */
  async provideCancellationInstructions(
    userId: string,
    input: z.infer<typeof LightweightCancellationInput>
  ): Promise<LightweightCancellationResult> {
    const validatedInput = LightweightCancellationInput.parse(input);

    // Verify subscription exists and belongs to user
    const subscription = await this.db.subscription.findFirst({
      where: {
        id: validatedInput.subscriptionId,
        userId,
      },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found',
      });
    }

    if (subscription.status === 'cancelled') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Subscription is already cancelled',
      });
    }

    // Check for existing pending cancellation
    const existingRequest = await this.db.cancellationRequest.findFirst({
      where: {
        subscriptionId: validatedInput.subscriptionId,
        userId,
        status: { in: ['pending', 'processing'] },
      },
    });

    if (existingRequest) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cancellation request already in progress',
      });
    }

    // Find provider template
    const provider = this.findProviderTemplate(subscription.name);

    // Create a simple cancellation request record
    const request = await this.db.cancellationRequest.create({
      data: {
        userId,
        subscriptionId: validatedInput.subscriptionId,
        method: 'manual',
        status: 'pending',
        attempts: 1,
        userNotes: validatedInput.notes,
        manualInstructions: {
          providerId: provider.id,
          providerName: provider.name,
          generatedAt: new Date().toISOString(),
          estimatedTime: provider.estimatedTime,
          difficulty: provider.difficulty,
        } as any,
      },
    });

    // Log the activity
    await this.logActivity(
      request.id,
      'instructions_generated',
      'success',
      `Generated cancellation instructions for ${provider.name}`
    );

    const instructions = this.generateInstructions(provider, subscription.name);

    return {
      requestId: request.id,
      status: 'instructions_provided',
      instructions,
    };
  }

  /**
   * Confirm manual cancellation completion
   */
  async confirmCancellation(
    userId: string,
    requestId: string,
    confirmation: z.infer<typeof ManualConfirmationInput>
  ): Promise<LightweightCancellationResult> {
    const validatedConfirmation = ManualConfirmationInput.parse(confirmation);

    const request = await this.db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId,
        method: 'manual',
      },
      include: {
        subscription: true,
      },
    });

    if (!request) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Cancellation request not found',
      });
    }

    const status = validatedConfirmation.wasSuccessful ? 'completed' : 'failed';
    const effectiveDate = validatedConfirmation.effectiveDate || new Date();

    // Update the cancellation request
    await this.db.cancellationRequest.update({
      where: { id: requestId },
      data: {
        status,
        confirmationCode: validatedConfirmation.confirmationCode,
        effectiveDate,
        userConfirmed: validatedConfirmation.wasSuccessful,
        userNotes: validatedConfirmation.notes,
        completedAt: new Date(),
      },
    });

    // Update subscription if successful
    if (validatedConfirmation.wasSuccessful) {
      await this.db.subscription.update({
        where: { id: request.subscriptionId },
        data: {
          status: 'cancelled',
          isActive: false,
          cancellationInfo: {
            requestId,
            confirmationCode: validatedConfirmation.confirmationCode,
            effectiveDate,
            method: 'manual',
            confirmedAt: new Date(),
          },
        },
      });

      await this.logActivity(
        requestId,
        'confirmed_successful',
        'success',
        `User confirmed successful cancellation. Code: ${validatedConfirmation.confirmationCode}`
      );
    } else {
      await this.logActivity(
        requestId,
        'confirmed_failed',
        'failure',
        `User reported cancellation failure: ${validatedConfirmation.notes}`
      );
    }

    return {
      requestId,
      status,
      confirmationCode: validatedConfirmation.confirmationCode,
      effectiveDate,
    };
  }

  /**
   * Get simple cancellation status
   */
  async getCancellationStatus(
    userId: string,
    requestId: string
  ): Promise<{
    request: any;
    instructions?: CancellationInstructions;
  }> {
    const request = await this.db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
      include: {
        subscription: {
          select: {
            id: true,
            name: true,
            amount: true,
          },
        },
      },
    });

    if (!request) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Cancellation request not found',
      });
    }

    let instructions: CancellationInstructions | undefined;

    if (
      request.manualInstructions &&
      typeof request.manualInstructions === 'object' &&
      'providerId' in request.manualInstructions
    ) {
      const provider = this.findProviderTemplate(request.subscription.name);
      instructions = this.generateInstructions(
        provider,
        request.subscription.name
      );
    }

    return {
      request: {
        id: request.id,
        status: request.status,
        method: request.method,
        createdAt: request.createdAt,
        completedAt: request.completedAt,
        confirmationCode: request.confirmationCode,
        effectiveDate: request.effectiveDate,
        subscription: request.subscription,
        userNotes: request.userNotes,
      },
      instructions,
    };
  }

  /**
   * Get user's cancellation history
   */
  async getCancellationHistory(userId: string, limit = 10): Promise<any[]> {
    const requests = await this.db.cancellationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        subscription: {
          select: {
            id: true,
            name: true,
            amount: true,
          },
        },
      },
    });

    return requests.map(request => ({
      id: request.id,
      subscription: {
        id: request.subscription.id,
        name: request.subscription.name,
        amount: parseFloat(request.subscription.amount.toString()),
      },
      status: request.status,
      method: request.method,
      confirmationCode: request.confirmationCode,
      effectiveDate: request.effectiveDate,
      createdAt: request.createdAt,
      completedAt: request.completedAt,
    }));
  }

  /**
   * Get available providers with basic info
   */
  getAvailableProviders(search?: string): Array<{
    id: string;
    name: string;
    category: string;
    difficulty: string;
    estimatedTime: number;
    hasPhone: boolean;
    hasChat: boolean;
    supportsRefunds: boolean;
  }> {
    let providers = Object.values(PROVIDER_REGISTRY).filter(
      p => p.id !== 'default'
    );

    if (search) {
      const searchTerm = search.toLowerCase();
      providers = providers.filter(
        p =>
          p.name.toLowerCase().includes(searchTerm) ||
          p.category.toLowerCase().includes(searchTerm)
      );
    }

    return providers.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      difficulty: p.difficulty,
      estimatedTime: p.estimatedTime,
      hasPhone: Boolean(p.phone),
      hasChat: Boolean(p.chatUrl),
      supportsRefunds: p.supportsRefunds,
    }));
  }

  // Private helper methods

  /**
   * Find provider template for a subscription
   */
  private findProviderTemplate(subscriptionName: string): ProviderTemplate {
    const normalizedName = subscriptionName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/plus$|premium$|pro$/, ''); // Remove common suffixes

    // Direct matches
    const directMatch = PROVIDER_REGISTRY[normalizedName];
    if (directMatch) return directMatch;

    // Partial matches
    for (const [key, provider] of Object.entries(PROVIDER_REGISTRY)) {
      if (key === 'default') continue;

      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return provider;
      }
    }

    // Fallback to default template
    const defaultTemplate = PROVIDER_REGISTRY.default;
    return {
      ...defaultTemplate!,
      id: 'default',
      name: subscriptionName,
      category: defaultTemplate?.category || 'other',
      difficulty: defaultTemplate?.difficulty || 'medium',
      estimatedTime: defaultTemplate?.estimatedTime || 10,
      requiresLogin: defaultTemplate?.requiresLogin ?? true,
      hasRetentionOffers: defaultTemplate?.hasRetentionOffers ?? false,
      supportsRefunds: defaultTemplate?.supportsRefunds ?? false,
      steps: defaultTemplate?.steps || [],
      tips: defaultTemplate?.tips || [],
      warnings: defaultTemplate?.warnings || [],
    };
  }

  /**
   * Generate cancellation instructions
   */
  private generateInstructions(
    provider: ProviderTemplate,
    subscriptionName: string
  ): CancellationInstructions {
    const overview =
      provider.id === 'default'
        ? `To cancel your ${subscriptionName} subscription, you'll typically need to access your account settings and look for subscription management options.`
        : `To cancel your ${provider.name} subscription, follow these verified steps. The process is rated as ${provider.difficulty} difficulty and typically takes ${provider.estimatedTime} minutes.`;

    return {
      provider,
      instructions: {
        overview,
        steps: provider.steps,
        tips: provider.tips,
        warnings: provider.warnings,
        contactInfo: {
          website: provider.website,
          phone: provider.phone,
          email: provider.email,
          chatUrl: provider.chatUrl,
        },
        estimatedTime: `${provider.estimatedTime} minutes`,
        difficulty: provider.difficulty,
      },
    };
  }

  /**
   * Simple activity logging
   */
  private async logActivity(
    requestId: string,
    action: string,
    status: string,
    message: string
  ): Promise<void> {
    await this.db.cancellationLog.create({
      data: {
        requestId,
        action,
        status,
        message,
        metadata: {
          timestamp: new Date(),
          service: 'lightweight',
        },
      },
    });
  }
}
