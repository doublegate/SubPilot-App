#!/usr/bin/env tsx
/**
 * Migration script to update encrypted data to use random salts
 * Run this script to migrate existing encrypted Plaid tokens
 */

import { PrismaClient } from '@prisma/client';
import { encrypt as oldEncrypt, decrypt as oldDecrypt } from '../src/server/lib/crypto';
import { encrypt as newEncrypt } from '../src/server/lib/crypto-v2';

const prisma = new PrismaClient();

async function migrateEncryptedData() {
  console.log('🔐 Starting encryption migration...');
  
  try {
    // Find all PlaidItems with encrypted access tokens
    const plaidItems = await prisma.plaidItem.findMany({
      where: {
        encryptedAccessToken: {
          not: null,
        },
      },
      select: {
        id: true,
        encryptedAccessToken: true,
      },
    });

    console.log(`Found ${plaidItems.length} PlaidItems to migrate`);

    let migrated = 0;
    let failed = 0;

    for (const item of plaidItems) {
      try {
        if (!item.encryptedAccessToken) continue;

        // Check if already in new format (4 parts)
        const parts = item.encryptedAccessToken.split(':');
        if (parts.length === 4) {
          console.log(`✅ PlaidItem ${item.id} already migrated`);
          migrated++;
          continue;
        }

        // Decrypt with old method
        const plainToken = await oldDecrypt(item.encryptedAccessToken);
        
        // Re-encrypt with new method (includes random salt)
        const newEncryptedToken = await newEncrypt(plainToken);

        // Update in database
        await prisma.plaidItem.update({
          where: { id: item.id },
          data: { encryptedAccessToken: newEncryptedToken },
        });

        console.log(`✅ Migrated PlaidItem ${item.id}`);
        migrated++;
      } catch (error) {
        console.error(`❌ Failed to migrate PlaidItem ${item.id}:`, error);
        failed++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total items: ${plaidItems.length}`);
    console.log(`   Successfully migrated: ${migrated}`);
    console.log(`   Failed: ${failed}`);

    if (failed > 0) {
      console.warn('\n⚠️  Some items failed to migrate. Please check the errors above.');
      process.exit(1);
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateEncryptedData().catch(console.error);