import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for test user...');

  const user = await prisma.user.findUnique({
    where: { email: 'test@subpilot.dev' },
  });

  if (user) {
    console.log('✅ Test user found!');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Email Verified:', user.emailVerified ? 'Yes' : 'No');
    console.log('   Has Password:', user.password ? 'Yes' : 'No');

    // If no password, set one
    if (!user.password) {
      console.log('\n⚠️  User has no password. Setting password...');
      const hashedPassword = await hash('testpassword123', 12);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      console.log('✅ Password set to: testpassword123');
    } else {
      console.log('\n🔐 Resetting password to ensure it works...');
      const hashedPassword = await hash('testpassword123', 12);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      console.log('✅ Password reset to: testpassword123');
    }
  } else {
    console.log('❌ Test user not found. Creating...');

    const hashedPassword = await hash('testpassword123', 12);

    const newUser = await prisma.user.create({
      data: {
        email: 'test@subpilot.dev',
        name: 'Test User',
        password: hashedPassword,
        emailVerified: new Date(),
      },
    });

    console.log('✅ Created test user!');
    console.log('   ID:', newUser.id);
    console.log('   Email:', newUser.email);
    console.log('   Password: testpassword123');
  }

  console.log('\n📝 Login credentials:');
  console.log('   Email: test@subpilot.dev');
  console.log('   Password: testpassword123');
}

main()
  .catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
