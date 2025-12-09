const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function fixUser() {
  try {
    const email = 'hello@bananhot.com';
    const password = 'hello123!';
    
    // Get pages for pageAccess
    const pages = await prisma.page.findMany();
    const pageAccess = {};
    pages.forEach(page => {
      pageAccess[page.slug] = false;
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Upsert user (create or update)
    const user = await prisma.user.upsert({
      where: { email: email },
      update: { 
        password: hashedPassword,
        firstName: 'BananHot',
        lastName: null
      },
      create: {
        email: email,
        firstName: 'BananHot',
        lastName: null,
        password: hashedPassword,
        isSuperadmin: false,
        pageAccess: pageAccess,
        project: null,
        projectName: null
      }
    });

    console.log('\n✅ User ready!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${user.firstName}\n`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixUser();

