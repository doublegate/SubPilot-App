import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const providers = [
  {
    name: 'Netflix',
    normalizedName: 'netflix',
    type: 'api',
    apiEndpoint: 'https://api.netflix.com/cancel',
    requiresAuth: true,
    authType: 'oauth',
    loginUrl: 'https://netflix.com/account',
    phoneNumber: '1-866-579-7172',
    email: 'help@netflix.com',
    instructions: [
      'Visit netflix.com and sign in to your account',
      'Click on your profile icon in the top right corner',
      'Select "Account" from the dropdown menu',
      'Under "Membership & Billing", click "Cancel Membership"',
      'Confirm your cancellation',
      'Save the confirmation code displayed on screen'
    ],
    logo: 'https://assets.nflxext.com/ffe/siteui/common/icons/nficon2016.ico',
    category: 'Streaming',
    difficulty: 'easy',
    averageTime: 5,
    successRate: 0.95,
    isActive: true,
    supportsRefunds: false,
    requires2FA: false,
    requiresRetention: true,
  },
  {
    name: 'Spotify',
    normalizedName: 'spotify',
    type: 'api',
    apiEndpoint: 'https://api.spotify.com/v1/subscription/cancel',
    requiresAuth: true,
    authType: 'oauth',
    loginUrl: 'https://accounts.spotify.com/en/login',
    phoneNumber: null,
    email: 'support@spotify.com',
    chatUrl: 'https://support.spotify.com/contact/',
    instructions: [
      'Log in to your Spotify account at spotify.com',
      'Go to your Account Overview page',
      'Click "CHANGE OR CANCEL" in the Your plan section',
      'Select "Cancel Premium"',
      'Follow the cancellation flow',
      'Note down any confirmation details'
    ],
    logo: 'https://www.spotify.com/favicon.ico',
    category: 'Music',
    difficulty: 'easy',
    averageTime: 3,
    successRate: 0.92,
    isActive: true,
    supportsRefunds: false,
    requires2FA: false,
    requiresRetention: true,
  },
  {
    name: 'Adobe Creative Cloud',
    normalizedName: 'adobe',
    type: 'manual',
    requiresAuth: true,
    loginUrl: 'https://account.adobe.com/',
    phoneNumber: '1-800-833-6687',
    email: 'customercare@adobe.com',
    chatUrl: 'https://helpx.adobe.com/contact/chat.html',
    instructions: [
      'Sign in to your Adobe account at account.adobe.com',
      'Click "Plans" in the left sidebar',
      'Find your Creative Cloud subscription',
      'Click "Manage plan"',
      'Select "Cancel plan"',
      'You may need to call customer service to complete cancellation',
      'Be prepared for retention offers'
    ],
    logo: 'https://www.adobe.com/favicon.ico',
    category: 'Software',
    difficulty: 'hard',
    averageTime: 15,
    successRate: 0.75,
    isActive: true,
    supportsRefunds: true,
    requires2FA: true,
    requiresRetention: true,
  },
  {
    name: 'Amazon Prime',
    normalizedName: 'amazon',
    type: 'manual',
    requiresAuth: true,
    loginUrl: 'https://www.amazon.com/gp/css/account/info/view.html',
    phoneNumber: '1-888-280-4331',
    email: 'prime@amazon.com',
    instructions: [
      'Sign in to your Amazon account',
      'Go to "Your Account" and select "Prime membership"',
      'Click "Update, cancel and more"',
      'Select "End membership"',
      'Choose whether to end now or at the end of current period',
      'Follow the prompts to confirm cancellation'
    ],
    logo: 'https://www.amazon.com/favicon.ico',
    category: 'Shopping',
    difficulty: 'medium',
    averageTime: 8,
    successRate: 0.88,
    isActive: true,
    supportsRefunds: true,
    requires2FA: false,
    requiresRetention: true,
  },
  {
    name: 'Hulu',
    normalizedName: 'hulu',
    type: 'api',
    apiEndpoint: 'https://api.hulu.com/cancel',
    requiresAuth: true,
    authType: 'session',
    loginUrl: 'https://secure.hulu.com/account',
    phoneNumber: '1-888-631-4858',
    email: 'help@hulu.com',
    instructions: [
      'Log in to your Hulu account',
      'Go to your Account page',
      'Click "Cancel" in the Your Subscription section',
      'Select your cancellation date',
      'Confirm the cancellation'
    ],
    logo: 'https://www.hulu.com/favicon.ico',
    category: 'Streaming',
    difficulty: 'easy',
    averageTime: 4,
    successRate: 0.90,
    isActive: true,
    supportsRefunds: false,
    requires2FA: false,
    requiresRetention: false,
  },
  {
    name: 'Disney Plus',
    normalizedName: 'disneyplus',
    type: 'webhook',
    requiresAuth: true,
    loginUrl: 'https://www.disneyplus.com/account',
    phoneNumber: '1-888-905-7888',
    email: 'help@disneyplus.com',
    instructions: [
      'Visit DisneyPlus.com and sign in',
      'Click on your profile and select "Account"',
      'Go to "Subscription" section',
      'Click "Cancel Subscription"',
      'Follow the cancellation process',
      'Save any confirmation information'
    ],
    logo: 'https://www.disneyplus.com/favicon.ico',
    category: 'Streaming',
    difficulty: 'easy',
    averageTime: 6,
    successRate: 0.93,
    isActive: true,
    supportsRefunds: false,
    requires2FA: false,
    requiresRetention: true,
  },
  {
    name: 'YouTube Premium',
    normalizedName: 'youtubepremium',
    type: 'manual',
    requiresAuth: true,
    loginUrl: 'https://www.youtube.com/paid_memberships',
    phoneNumber: '1-855-836-3987',
    email: 'youtube-support@google.com',
    instructions: [
      'Go to youtube.com/paid_memberships',
      'Find your YouTube Premium membership',
      'Click "MANAGE"',
      'Select "Cancel membership"',
      'Choose when to cancel',
      'Confirm your cancellation'
    ],
    logo: 'https://www.youtube.com/favicon.ico',
    category: 'Streaming',
    difficulty: 'easy',
    averageTime: 5,
    successRate: 0.91,
    isActive: true,
    supportsRefunds: false,
    requires2FA: false,
    requiresRetention: false,
  },
  {
    name: 'Microsoft 365',
    normalizedName: 'microsoft365',
    type: 'manual',
    requiresAuth: true,
    loginUrl: 'https://account.microsoft.com/services',
    phoneNumber: '1-800-642-7676',
    email: 'support@microsoft.com',
    instructions: [
      'Sign in to account.microsoft.com',
      'Go to the Services & subscriptions page',
      'Find your Microsoft 365 subscription',
      'Select "Manage"',
      'Choose "Cancel subscription"',
      'Follow the cancellation wizard'
    ],
    logo: 'https://www.microsoft.com/favicon.ico',
    category: 'Software',
    difficulty: 'medium',
    averageTime: 10,
    successRate: 0.85,
    isActive: true,
    supportsRefunds: true,
    requires2FA: true,
    requiresRetention: true,
  },
  {
    name: 'Dropbox',
    normalizedName: 'dropbox',
    type: 'api',
    apiEndpoint: 'https://api.dropbox.com/cancel',
    requiresAuth: true,
    authType: 'oauth',
    loginUrl: 'https://www.dropbox.com/account/plan',
    phoneNumber: null,
    email: 'support@dropbox.com',
    chatUrl: 'https://help.dropbox.com/contact',
    instructions: [
      'Log in to dropbox.com',
      'Click your avatar and select "Settings"',
      'Go to the "Plan" tab',
      'Click "Cancel plan"',
      'Confirm your cancellation',
      'Note the effective date'
    ],
    logo: 'https://www.dropbox.com/static/30168/images/favicon.ico',
    category: 'Storage',
    difficulty: 'easy',
    averageTime: 4,
    successRate: 0.94,
    isActive: true,
    supportsRefunds: true,
    requires2FA: false,
    requiresRetention: false,
  },
  {
    name: 'Zoom Pro',
    normalizedName: 'zoom',
    type: 'manual',
    requiresAuth: true,
    loginUrl: 'https://zoom.us/account/billing',
    phoneNumber: '1-888-799-9666',
    email: 'support@zoom.us',
    instructions: [
      'Sign in to zoom.us',
      'Go to Account Management > Billing',
      'Find your subscription plan',
      'Click "Cancel Subscription"',
      'Select cancellation date',
      'Confirm the cancellation'
    ],
    logo: 'https://zoom.us/favicon.ico',
    category: 'Software',
    difficulty: 'easy',
    averageTime: 6,
    successRate: 0.89,
    isActive: true,
    supportsRefunds: true,
    requires2FA: false,
    requiresRetention: false,
  },
];

async function seedCancellationProviders() {
  console.log('🌱 Seeding cancellation providers...');

  try {
    // Clear existing providers
    await prisma.cancellationProvider.deleteMany({});
    console.log('Cleared existing providers');

    // Insert new providers
    const results = await Promise.all(
      providers.map(provider =>
        prisma.cancellationProvider.create({
          data: {
            ...provider,
            successRate: provider.successRate, // Prisma will handle Decimal conversion
            automationScript: provider.type === 'api' ? {
              endpoint: provider.apiEndpoint,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              authRequired: provider.requiresAuth,
            } : {},
            selectors: provider.type === 'web_automation' ? {} : {},
            instructions: provider.instructions || [],
          },
        })
      )
    );

    console.log(`✅ Successfully seeded ${results.length} cancellation providers:`);
    results.forEach(provider => {
      console.log(`  - ${provider.name} (${provider.type}, ${Math.round(provider.successRate.toNumber() * 100)}% success rate)`);
    });

  } catch (error) {
    console.error('❌ Error seeding cancellation providers:', error);
    throw error;
  }
}

async function main() {
  await seedCancellationProviders();
  await prisma.$disconnect();
}

// Run if script is executed directly
main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export { seedCancellationProviders };