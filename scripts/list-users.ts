import { db } from '../src/server/db';

async function listUsers() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`\n📊 Total users: ${users.length}\n`);

    users.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.name || 'Not set'}`);
      console.log(`Admin: ${user.isAdmin ? '✅ Yes' : '❌ No'}`);
      console.log(`Created: ${user.createdAt.toLocaleDateString()}`);
      console.log('---');
    });

    const adminCount = users.filter(u => u.isAdmin).length;
    console.log(`\n👑 Admin users: ${adminCount}`);
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await db.$disconnect();
  }
}

listUsers();
