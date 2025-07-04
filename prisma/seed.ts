import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user if it doesn't exist
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Validate admin credentials are properly set
  if (!adminEmail || !adminPassword) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set. ' +
        'Please set these in your .env file before running seed.'
    );
  }

  // Prevent use of default or weak passwords
  if (adminPassword === 'admin123456' || adminPassword.length < 12) {
    throw new Error(
      'ADMIN_PASSWORD must be at least 12 characters and cannot be a default value. ' +
        'Please use a strong, unique password.'
    );
  }

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ email: adminEmail }, { isAdmin: true }],
    },
  });

  if (!existingAdmin) {
    console.log('🔑 Creating admin user...');
    const hashedAdminPassword = await hash(adminPassword, 12);

    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        password: hashedAdminPassword,
        emailVerified: new Date(),
        isAdmin: true,
      },
    });

    console.log('✅ Created admin user:');
    console.log('   Email:', adminEmail);
    console.log('   User ID:', adminUser.id);
    console.log('   [Password hidden for security]');
  } else {
    console.log('✅ Admin user already exists');
  }

  // Create a test user for development (only in non-production environments)
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️ Skipping test user creation in production environment');
    return;
  }

  const email = process.env.TEST_USER_EMAIL || 'test@subpilot.dev';
  const password = process.env.TEST_USER_PASSWORD || 'testpassword123';

  // Warn about test user in development
  if (!process.env.TEST_USER_PASSWORD) {
    console.log(
      '⚠️ Using default test user password. Set TEST_USER_PASSWORD for custom password.'
    );
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log('✅ Test user already exists:', email);
    return;
  }

  // Create test user
  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name: 'Test User',
      password: hashedPassword,
      emailVerified: new Date(), // Mark as verified for easy testing
    },
  });

  console.log('✅ Created test user:');
  console.log('   Email:', email);
  console.log('   User ID:', user.id);
  console.log('   [Password hidden for security]');

  // Create some sample data for the user (optional)
  console.log('\n🔔 Creating welcome notification...');

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'new_subscription',
      title: 'Welcome to SubPilot! 🎉',
      message:
        'Get started by connecting your first bank account to automatically track your subscriptions.',
      scheduledFor: new Date(),
    },
  });

  console.log('✅ Sample data created!');

  // Run other seed files
  console.log('\n🏷️ Seeding pricing plans...');
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - seed files are TypeScript files that will be compiled to JS
    const { seedPricingPlans } = await import('./seed-pricing-plans.js');
    await seedPricingPlans();
  } catch (error) {
    console.log('⚠️ Could not seed pricing plans:', error);
  }

  console.log('\n🔌 Seeding cancellation providers...');
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - seed files are TypeScript files that will be compiled to JS
    const { seedCancellationProviders } = await import(
      './seed-cancellation-providers.js'
    );
    await seedCancellationProviders();
  } catch (error) {
    console.log('⚠️ Could not seed cancellation providers:', error);
  }

  console.log('\n📁 Seeding categories...');
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - seed files are TypeScript files that will be compiled to JS
    const { seedCategories } = await import('../scripts/seed-categories.js');
    await seedCategories();
  } catch (error) {
    console.log('⚠️ Could not seed categories:', error);
  }

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Login credentials saved in environment variables');
  console.log('   Admin User:');
  console.log('     Email:', adminEmail);
  console.log('     [Password from ADMIN_PASSWORD env var]');

  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    console.log('\n   Test User:');
    console.log('     Email:', email);
    console.log(
      '     [Password from TEST_USER_PASSWORD env var or default in dev]'
    );
  }
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
