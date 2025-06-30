import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user if it doesn't exist
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@subpilot.app';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
  
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { isAdmin: true },
      ],
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
    console.log('   Password:', adminPassword);
    console.log('   User ID:', adminUser.id);
  } else {
    console.log('✅ Admin user already exists');
  }

  // Create a test user for development
  const email = 'test@subpilot.dev';
  const password = 'testpassword123';

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
  console.log('   Password:', password);
  console.log('   User ID:', user.id);

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
    const { seedPricingPlans } = await import('./seed-pricing-plans');
    await seedPricingPlans();
  } catch (error) {
    console.log('⚠️ Could not seed pricing plans:', error);
  }
  
  console.log('\n🔌 Seeding cancellation providers...');
  try {
    const { seedCancellationProviders } = await import('./seed-cancellation-providers');
    await seedCancellationProviders();
  } catch (error) {
    console.log('⚠️ Could not seed cancellation providers:', error);
  }
  
  console.log('\n📁 Seeding categories...');
  try {
    const { seedCategories } = await import('../scripts/seed-categories');
    await seedCategories();
  } catch (error) {
    console.log('⚠️ Could not seed categories:', error);
  }
  
  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Admin User:');
  console.log('     Email:', adminEmail);
  console.log('     Password:', adminPassword);
  console.log('\n   Test User:');
  console.log('     Email: test@subpilot.dev');
  console.log('     Password: testpassword123');
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
