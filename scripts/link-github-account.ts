/**
 * Manual GitHub Account Linking Script
 *
 * This script manually links a GitHub OAuth account to an existing user.
 * Use this when you get OAuthAccountNotLinked error.
 *
 * Usage:
 * 1. First get your GitHub ID: curl https://api.github.com/users/YOUR_GITHUB_USERNAME
 * 2. Run: npx tsx scripts/link-github-account.ts --email=your@email.com --github-id=YOUR_GITHUB_ID
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function linkGitHubAccount() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const emailArg = args.find(arg => arg.startsWith('--email='));
  const githubIdArg = args.find(arg => arg.startsWith('--github-id='));

  if (!emailArg || !githubIdArg) {
    console.error(
      'Usage: npx tsx scripts/link-github-account.ts --email=your@email.com --github-id=YOUR_GITHUB_ID'
    );
    console.error(
      '\nTo get your GitHub ID, run: curl https://api.github.com/users/YOUR_GITHUB_USERNAME'
    );
    process.exit(1);
  }

  const email = emailArg.split('=')[1] ?? '';
  const githubId = githubIdArg.split('=')[1] ?? '';

  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    if (!user) {
      console.error(`Error: No user found with email ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(
      `Existing OAuth accounts: ${user.accounts.map(a => a.provider).join(', ')}`
    );

    // Check if GitHub account already linked
    const existingGitHub = user.accounts.find(a => a.provider === 'github');
    if (existingGitHub) {
      console.log('GitHub account is already linked to this user.');
      process.exit(0);
    }

    // Create the GitHub account link
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        type: 'oauth',
        provider: 'github',
        providerAccountId: githubId,
        // These fields will be populated on next sign-in
        access_token: null,
        token_type: null,
        scope: null,
        refresh_token: null,
        expires_at: null,
        id_token: null,
        session_state: null,
        refresh_token_expires_in: null,
      },
    });

    console.log('\n✅ Successfully linked GitHub account!');
    console.log(`   Provider: ${account.provider}`);
    console.log(`   Provider Account ID: ${account.providerAccountId}`);
    console.log(`   Linked to user: ${user.email ?? 'unknown'}`);
    console.log('\nYou can now sign in with GitHub!');
  } catch (error) {
    console.error('Error linking account:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
linkGitHubAccount();
