#!/usr/bin/env tsx
/**
 * Script to seed the database with default subscription categories
 * Run with: npx tsx scripts/seed-categories.ts
 */

import { PrismaClient } from '@prisma/client';
import { SUBSCRIPTION_CATEGORIES } from '@/server/lib/openai-client';

const prisma = new PrismaClient();

async function seedCategories() {
  console.log('🌱 Seeding subscription categories...');

  try {
    // Check if categories already exist
    const existingCount = await prisma.category.count();
    
    if (existingCount > 0) {
      console.log(`✅ Categories already exist (${existingCount} found). Skipping seed.`);
      return;
    }

    // Prepare category data
    const categories = Object.entries(SUBSCRIPTION_CATEGORIES).map(([id, data], index) => ({
      id,
      name: data.name,
      description: data.description,
      icon: data.icon,
      keywords: data.keywords,
      sortOrder: index,
      isActive: true,
    }));

    // Create categories
    const result = await prisma.category.createMany({
      data: categories,
      skipDuplicates: true,
    });

    console.log(`✅ Successfully created ${result.count} categories:`);
    
    // Display created categories
    for (const category of categories) {
      console.log(`   ${category.icon} ${category.name} (${category.id})`);
    }

    // Create some sample merchant aliases for common services
    const sampleAliases = [
      // Streaming
      { originalName: 'netflix.com', normalizedName: 'Netflix', category: 'streaming' },
      { originalName: 'hulu', normalizedName: 'Hulu', category: 'streaming' },
      { originalName: 'disney plus', normalizedName: 'Disney+', category: 'streaming' },
      { originalName: 'hbo max', normalizedName: 'HBO Max', category: 'streaming' },
      { originalName: 'amazon prime video', normalizedName: 'Amazon Prime Video', category: 'streaming' },
      
      // Music
      { originalName: 'spotify', normalizedName: 'Spotify', category: 'music' },
      { originalName: 'apple music', normalizedName: 'Apple Music', category: 'music' },
      { originalName: 'youtube music', normalizedName: 'YouTube Music', category: 'music' },
      
      // Software
      { originalName: 'adobe creative cloud', normalizedName: 'Adobe Creative Cloud', category: 'software' },
      { originalName: 'microsoft 365', normalizedName: 'Microsoft 365', category: 'software' },
      { originalName: 'dropbox', normalizedName: 'Dropbox', category: 'storage' },
      { originalName: 'google storage', normalizedName: 'Google One', category: 'storage' },
      
      // Gaming
      { originalName: 'xbox game pass', normalizedName: 'Xbox Game Pass', category: 'gaming' },
      { originalName: 'playstation plus', normalizedName: 'PlayStation Plus', category: 'gaming' },
      { originalName: 'nintendo switch online', normalizedName: 'Nintendo Switch Online', category: 'gaming' },
      
      // Fitness
      { originalName: 'peloton', normalizedName: 'Peloton', category: 'fitness' },
      { originalName: 'apple fitness+', normalizedName: 'Apple Fitness+', category: 'fitness' },
      { originalName: 'strava', normalizedName: 'Strava', category: 'fitness' },
    ];

    console.log('\n🏷️  Creating merchant aliases...');
    
    let aliasCount = 0;
    for (const alias of sampleAliases) {
      try {
        await prisma.merchantAlias.create({
          data: {
            originalName: alias.originalName.toLowerCase(),
            normalizedName: alias.normalizedName,
            category: alias.category,
            confidence: 1.0,
            isVerified: true,
            usageCount: 0,
          },
        });
        aliasCount++;
      } catch (error) {
        // Skip if alias already exists
        if ((error as any).code !== 'P2002') {
          console.error(`Failed to create alias for ${alias.originalName}:`, error);
        }
      }
    }

    console.log(`✅ Successfully created ${aliasCount} merchant aliases`);

  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedCategories()
  .then(() => {
    console.log('\n✨ Category seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Category seeding failed:', error);
    process.exit(1);
  });