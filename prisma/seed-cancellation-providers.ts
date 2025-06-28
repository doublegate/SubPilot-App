import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const cancellationProviders = [
  {
    name: "Netflix",
    normalizedName: "netflix",
    type: "api",
    apiEndpoint: "https://api.netflix.com/v1/cancel",
    requiresAuth: true,
    authType: "oauth",
    logo: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/netflix.svg",
    category: "streaming",
    difficulty: "easy",
    averageTime: 5,
    successRate: 0.95,
    supportsRefunds: false,
    requires2FA: false,
    requiresRetention: true,
    isActive: true,
    instructions: [
      {
        title: "Sign in to Netflix",
        description: "Go to netflix.com and sign in to your account",
      },
      {
        title: "Go to Account Settings",
        description: "Click on your profile icon and select 'Account'",
      },
      {
        title: "Cancel Membership",
        description: "Click 'Cancel Membership' and follow the prompts",
      },
    ],
    phoneNumber: "1-866-579-7172",
    email: "support@netflix.com",
  },
  {
    name: "Spotify",
    normalizedName: "spotify",
    type: "api",
    apiEndpoint: "https://api.spotify.com/v1/subscription/cancel",
    requiresAuth: true,
    authType: "oauth",
    logo: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/spotify.svg",
    category: "streaming",
    difficulty: "easy",
    averageTime: 3,
    successRate: 0.98,
    supportsRefunds: true,
    requires2FA: false,
    requiresRetention: false,
    isActive: true,
    instructions: [
      {
        title: "Log in to Spotify",
        description: "Visit spotify.com/account and log in",
      },
      {
        title: "Go to Subscription",
        description: "Navigate to your subscription page",
      },
      {
        title: "Cancel Premium",
        description: "Click 'Cancel Premium' and confirm",
      },
    ],
  },
  {
    name: "Adobe Creative Cloud",
    normalizedName: "adobe",
    type: "web_automation",
    loginUrl: "https://account.adobe.com",
    selectors: {
      username: "#username",
      password: "#password",
      submit: "button[type='submit']",
    },
    automationScript: {
      steps: [
        { action: "click", selector: "a[href*='plans']" },
        { action: "click", selector: "button[data-action='manage-plan']" },
        { action: "click", selector: "button[data-action='cancel-plan']" },
      ],
    },
    logo: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/adobe.svg",
    category: "software",
    difficulty: "hard",
    averageTime: 20,
    successRate: 0.75,
    supportsRefunds: false,
    requires2FA: true,
    requiresRetention: true,
    isActive: true,
    phoneNumber: "1-800-833-6687",
    instructions: [
      {
        title: "Sign in to Adobe Account",
        description: "Go to account.adobe.com and sign in",
        warning: "Adobe may charge early termination fees for annual plans",
      },
      {
        title: "Navigate to Plans",
        description: "Click on 'Plans' in your account dashboard",
      },
      {
        title: "Manage Plan",
        description: "Find your subscription and click 'Manage Plan'",
      },
      {
        title: "Cancel Plan",
        description: "Select 'Cancel Plan' and follow the cancellation flow",
        tip: "Take screenshots of the cancellation confirmation",
      },
    ],
  },
  {
    name: "Amazon Prime",
    normalizedName: "amazonprime",
    type: "api",
    apiEndpoint: "https://api.amazon.com/prime/cancel",
    requiresAuth: true,
    authType: "session",
    logo: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/amazonprime.svg",
    category: "shopping",
    difficulty: "medium",
    averageTime: 10,
    successRate: 0.85,
    supportsRefunds: true,
    requires2FA: true,
    requiresRetention: true,
    isActive: true,
    phoneNumber: "1-888-280-4331",
    email: "prime@amazon.com",
    instructions: [
      {
        title: "Sign in to Amazon",
        description: "Go to amazon.com and sign in to your account",
      },
      {
        title: "Go to Prime Membership",
        description: "Navigate to 'Accounts & Lists' > 'Your Prime Membership'",
      },
      {
        title: "End Membership",
        description: "Click 'End Membership' and follow the prompts",
        tip: "You may be offered to pause instead of cancel",
      },
    ],
  },
  {
    name: "Apple Music",
    normalizedName: "applemusic",
    type: "manual",
    logo: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/applemusic.svg",
    category: "streaming",
    difficulty: "medium",
    averageTime: 15,
    successRate: 0.80,
    supportsRefunds: false,
    requires2FA: false,
    requiresRetention: false,
    isActive: true,
    phoneNumber: "1-800-APL-CARE",
    instructions: [
      {
        title: "Open Settings on iPhone/iPad",
        description: "Go to Settings > [Your Name] > Subscriptions",
        warning: "Must be done from an Apple device",
      },
      {
        title: "Select Apple Music",
        description: "Tap on Apple Music from your subscriptions list",
      },
      {
        title: "Cancel Subscription",
        description: "Tap 'Cancel Subscription' and confirm",
      },
    ],
  },
  {
    name: "Hulu",
    normalizedName: "hulu",
    type: "web_automation",
    loginUrl: "https://secure.hulu.com/account",
    logo: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/hulu.svg",
    category: "streaming",
    difficulty: "easy",
    averageTime: 5,
    successRate: 0.92,
    supportsRefunds: false,
    requires2FA: false,
    requiresRetention: true,
    isActive: true,
    phoneNumber: "1-888-265-6650",
    instructions: [
      {
        title: "Log in to Hulu",
        description: "Visit hulu.com and sign in to your account",
      },
      {
        title: "Go to Account",
        description: "Click on your profile and select 'Account'",
      },
      {
        title: "Cancel Subscription",
        description: "Under 'Your Subscription', click 'Cancel' and follow prompts",
      },
    ],
  },
  {
    name: "Disney+",
    normalizedName: "disneyplus",
    type: "api",
    apiEndpoint: "https://api.disneyplus.com/v1/subscription/cancel",
    requiresAuth: true,
    authType: "oauth",
    logo: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/disneyplus.svg",
    category: "streaming",
    difficulty: "easy",
    averageTime: 5,
    successRate: 0.90,
    supportsRefunds: false,
    requires2FA: false,
    requiresRetention: false,
    isActive: true,
    phoneNumber: "1-888-905-7888",
    instructions: [
      {
        title: "Sign in to Disney+",
        description: "Go to disneyplus.com and sign in",
      },
      {
        title: "Go to Account",
        description: "Click on your profile icon and select 'Account'",
      },
      {
        title: "Cancel Subscription",
        description: "Select 'Cancel Subscription' and confirm",
      },
    ],
  },
  {
    name: "YouTube Premium",
    normalizedName: "youtubepremium",
    type: "manual",
    logo: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/youtube.svg",
    category: "streaming",
    difficulty: "medium",
    averageTime: 10,
    successRate: 0.88,
    supportsRefunds: false,
    requires2FA: false,
    requiresRetention: false,
    isActive: true,
    instructions: [
      {
        title: "Go to YouTube",
        description: "Visit youtube.com and sign in",
      },
      {
        title: "Open Paid Memberships",
        description: "Click your profile picture > 'Paid memberships'",
      },
      {
        title: "Manage Membership",
        description: "Click 'Manage membership' next to YouTube Premium",
      },
      {
        title: "Cancel Membership",
        description: "Click 'Cancel membership' and confirm",
      },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding cancellation providers...");

  for (const provider of cancellationProviders) {
    try {
      await prisma.cancellationProvider.upsert({
        where: { name: provider.name },
        update: provider,
        create: provider,
      });
      console.log(`✅ Created/Updated provider: ${provider.name}`);
    } catch (error) {
      console.error(`❌ Error creating provider ${provider.name}:`, error);
    }
  }

  console.log("✨ Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });