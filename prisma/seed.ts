import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create a test user for development
  const email = 'test@subpilot.dev';
  const password = 'testpassword123';

  console.log('🌱 Seeding database...');

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
  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Email: test@subpilot.dev');
  console.log('   Password: testpassword123');
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
