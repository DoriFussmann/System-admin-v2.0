const fs = require('fs').promises;
const path = require('path');
const prisma = require('../lib/prisma');

/**
 * Export users from database to JSON file
 * This keeps the JSON files in sync with the database
 */
async function syncUsersToJson() {
  try {
    console.log('🔄 Syncing users from database to JSON...');
    
    // Fetch all users from database
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`👥 Found ${users.length} users in database`);
    
    // Convert to plain objects (Prisma returns special objects)
    const plainUsers = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.password,
      project: user.project,
      projectName: user.projectName,
      pageAccess: user.pageAccess,
      isSuperadmin: user.isSuperadmin,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }));
    
    // Write to content/users.json
    const usersPath = path.join(__dirname, '../content/users.json');
    await fs.writeFile(usersPath, JSON.stringify(plainUsers, null, 2), 'utf8');
    console.log(`✅ Synced to ${usersPath}`);
    
    // Also update backup
    const backupPath = path.join(__dirname, '../backup_users.json');
    await fs.writeFile(backupPath, JSON.stringify(plainUsers, null, 2), 'utf8');
    console.log(`✅ Synced to ${backupPath}`);
    
    // Display summary
    console.log('\n📊 User Summary:');
    plainUsers.forEach(user => {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const adminBadge = user.isSuperadmin ? ' [SUPERADMIN]' : '';
      const pages = Object.keys(user.pageAccess || {}).filter(p => user.pageAccess[p]).join(', ') || 'none';
      console.log(`  - ${user.email} (${name})${adminBadge}`);
      console.log(`    Access: ${pages}`);
    });
    
    console.log('\n✨ Sync complete!');
    
  } catch (error) {
    console.error('❌ Error syncing users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  syncUsersToJson();
}

module.exports = syncUsersToJson;

