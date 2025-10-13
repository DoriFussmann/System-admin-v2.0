const prisma = require('../lib/prisma');

(async () => {
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        firstName: true,
        lastName: true,
        isSuperadmin: true,
      }
    });
    
    console.log('\n=== Users in database ===');
    if (users.length === 0) {
      console.log('No users found.');
    } else {
      users.forEach(user => {
        console.log(`- ${user.email} (${user.firstName} ${user.lastName}) ${user.isSuperadmin ? '[ADMIN]' : ''}`);
      });
    }
    console.log('\n');
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();

