const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

(async () => {
  try {
    // Check if exists
    const existing = await prisma.user.findUnique({
      where: { email: 'hello@bananhot.com' }
    });

    if (existing) {
      console.log('\n⚠️  User already exists: hello@bananhot.com');
      process.exit(0);
    }

    // Get pages for pageAccess
    const pages = await prisma.page.findMany();
    const pageAccess = {};
    pages.forEach(page => {
      pageAccess[page.slug] = false;
    });

    // Hash password
    const hashedPassword = await bcrypt.hash('hello123!', 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'hello@bananhot.com',
        firstName: 'BananHot',
        lastName: null,
        password: hashedPassword,
        isSuperadmin: false,
        pageAccess: pageAccess,
        project: null,
        projectName: null
      }
    });

    console.log('\n✅ User created successfully!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName}`);
    console.log(`   Password: hello123!`);
    console.log('\n📝 You can now see this user in the Admin page.\n');

  } catch (error) {
    if (error.code === 'P2002') {
      console.log('\n⚠️  User already exists: hello@bananhot.com\n');
    } else {
      console.error('\n❌ Error:', error.message);
      console.error(error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();

