const fs = require('fs').promises;
const path = require('path');
const prisma = require('../lib/prisma');

/**
 * Update all users to have all pages in their pageAccess
 * This ensures the admin can see and manage access to all pages
 */
async function updateAllUserPageAccess() {
  try {
    console.log('🔄 Updating user page access...');
    
    // Read the current pages from pages.json
    const pagesPath = path.join(__dirname, '../content/pages.json');
    const pagesData = await fs.readFile(pagesPath, 'utf8');
    const pages = JSON.parse(pagesData);
    
    console.log(`📄 Found ${pages.length} pages:`);
    pages.forEach(page => {
      console.log(`  - ${page.slug} (${page.label})`);
    });
    
    // Get all users from database
    const users = await prisma.user.findMany();
    console.log(`\n👥 Found ${users.length} users to update`);
    
    let updatedCount = 0;
    
    for (const user of users) {
      const currentAccess = user.pageAccess || {};
      const newAccess = {};
      
      // Ensure all pages exist in pageAccess
      // Preserve existing access settings, add new pages as false by default
      pages.forEach(page => {
        if (page.slug in currentAccess) {
          // Keep existing access setting
          newAccess[page.slug] = currentAccess[page.slug];
        } else {
          // New page - set to false for regular users, true for superadmins
          newAccess[page.slug] = user.isSuperadmin;
        }
      });
      
      // Check if we need to update
      const needsUpdate = JSON.stringify(currentAccess) !== JSON.stringify(newAccess);
      
      if (needsUpdate) {
        await prisma.user.update({
          where: { id: user.id },
          data: { pageAccess: newAccess }
        });
        
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        const adminBadge = user.isSuperadmin ? ' [SUPERADMIN]' : '';
        console.log(`✅ Updated ${user.email} (${name})${adminBadge}`);
        console.log(`   Old: ${JSON.stringify(currentAccess)}`);
        console.log(`   New: ${JSON.stringify(newAccess)}`);
        updatedCount++;
      } else {
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        console.log(`⏭️  Skipped ${user.email} (${name}) - already up to date`);
      }
    }
    
    console.log(`\n✨ Updated ${updatedCount} user(s)`);
    
    // Now sync to JSON
    console.log('\n🔄 Syncing to JSON files...');
    const syncModule = require('./syncUsersToJson');
    await syncModule();
    
  } catch (error) {
    console.error('❌ Error updating page access:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  updateAllUserPageAccess();
}

module.exports = updateAllUserPageAccess;

