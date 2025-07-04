#!/usr/bin/env tsx
/**
 * Admin Initialization Script
 *
 * This script creates the initial admin user for SubPilot.
 * Run this after setting up the database for the first time.
 *
 * Usage:
 *   npm run init:admin
 *
 * Environment Variables:
 *   ADMIN_EMAIL - Email for the admin user (default: admin@subpilot.app)
 *   ADMIN_PASSWORD - Password for the admin user (will prompt if not set)
 *   ADMIN_NAME - Display name for the admin user (default: Admin)
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';
import { promisify } from 'util';

const prisma = new PrismaClient();

// Create readline interface for password input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = promisify(rl.question).bind(rl);

async function promptPassword(): Promise<string> {
  // Hide password input
  const password = await question('Enter admin password: ');
  console.log(); // New line after password
  return String(password);
}

async function main() {
  console.log('🔧 SubPilot Admin Initialization');
  console.log('================================\n');

  // Get admin credentials from environment or prompt
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@subpilot.app';
  const adminName = process.env.ADMIN_NAME ?? 'Admin';
  let adminPassword = process.env.ADMIN_PASSWORD;

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ email: adminEmail }, { isAdmin: true }],
    },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists:');
    console.log(`   Email: ${existingAdmin.email}`);
    console.log(`   Name: ${existingAdmin.name ?? 'Not set'}`);
    console.log(`   Is Admin: ${existingAdmin.isAdmin ? 'Yes' : 'No'}`);

    if (!existingAdmin.isAdmin) {
      console.log('\n🔄 Upgrading existing user to admin...');
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { isAdmin: true },
      });
      console.log('✅ User upgraded to admin successfully!');
    } else {
      console.log('\n✅ Admin user is already set up!');
    }

    process.exit(0);
  }

  // Prompt for password if not provided
  if (!adminPassword) {
    console.log('Please set a secure password for the admin account.');
    console.log('Password requirements: minimum 8 characters\n');

    adminPassword = await promptPassword();

    // Validate password
    if (!adminPassword || adminPassword.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
      process.exit(1);
    }
  }

  console.log('\n📝 Creating admin user with:');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Name: ${adminName}`);
  console.log(`   Password: ${'*'.repeat(adminPassword.length)}`);

  try {
    // Hash password
    const hashedPassword = await hash(adminPassword, 12);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        emailVerified: new Date(),
        isAdmin: true,
        notificationPreferences: {
          emailAlerts: true,
          pushNotifications: true,
          weeklyReports: true,
          adminAlerts: true,
        },
      },
    });

    console.log('\n✅ Admin user created successfully!');
    console.log(`   User ID: ${adminUser.id}`);

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: adminUser.id,
        type: 'admin_welcome',
        title: 'Welcome to SubPilot Admin! 🚀',
        message:
          'You now have full administrative access. Visit /admin to manage your SubPilot instance.',
        severity: 'info',
        scheduledFor: new Date(),
      },
    });

    // Log the creation in audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'admin.created',
        resource: adminUser.id,
        result: 'success',
        metadata: {
          email: adminEmail,
          name: adminName,
          createdBy: 'init-script',
        },
      },
    });

    console.log('\n🎉 Admin initialization complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Start the application: npm run dev');
    console.log('   2. Log in with your admin credentials');
    console.log('   3. Visit /admin to access the admin panel');
    console.log('\n⚠️  Security reminder:');
    console.log('   - Keep your admin credentials secure');
    console.log('   - Consider enabling 2FA when available');
    console.log('   - Regularly review audit logs for security');

    // Save admin email to .env.local if not already there
    try {
      const envPath = join(process.cwd(), '.env.local');
      let envContent = '';

      try {
        envContent = readFileSync(envPath, 'utf-8');
      } catch {
        // File doesn't exist, that's okay
      }

      if (!envContent.includes('ADMIN_EMAIL=')) {
        const adminEnvLine = `\n# Admin configuration\nADMIN_EMAIL="${adminEmail}"\n`;
        require('fs').appendFileSync(envPath, adminEnvLine);
        console.log('\n📝 Added ADMIN_EMAIL to .env.local');
      }
    } catch (error) {
      console.log(
        '\n⚠️  Could not update .env.local - please add ADMIN_EMAIL manually'
      );
    }
  } catch (error) {
    console.error('\n❌ Failed to create admin user:', error);
    process.exit(1);
  }
}

main()
  .catch(error => {
    console.error('❌ Initialization error:', error);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
