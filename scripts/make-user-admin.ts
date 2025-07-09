import { db } from '../src/server/db';

async function makeUserAdmin(email: string) {
  try {
    // First, check if the user exists
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, isAdmin: true },
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      const allUsers = await db.user.findMany({
        select: { email: true, isAdmin: true },
      });
      console.log('\nExisting users:');
      allUsers.forEach(u => {
        console.log(`- ${u.email} (admin: ${u.isAdmin})`);
      });
      return;
    }

    if (user.isAdmin) {
      console.log(`✅ User ${email} is already an admin`);
      return;
    }

    // Make the user an admin
    const updatedUser = await db.user.update({
      where: { email },
      data: { isAdmin: true },
    });

    console.log(`✅ Successfully made ${email} an admin`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('Please provide an email address as an argument');
  console.error('Usage: npm run make-admin <email>');
  process.exit(1);
}

makeUserAdmin(email);
