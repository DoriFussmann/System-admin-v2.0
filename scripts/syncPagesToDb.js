const fs = require('fs').promises;
const path = require('path');
const prisma = require('../lib/prisma');

/**
 * Sync pages from JSON to database
 * This ensures the admin sees all pages for managing user access
 */
async function syncPagesToDb() {
  try {
    console.log('🔄 Syncing pages from JSON to database...');
    
    // Read pages from JSON
    const pagesPath = path.join(__dirname, '../content/pages.json');
    const pagesData = await fs.readFile(pagesPath, 'utf8');
    const pages = JSON.parse(pagesData);
    
    console.log(`📄 Found ${pages.length} pages in JSON:`);
    pages.forEach(page => {
      console.log(`  - ${page.slug} (${page.label})`);
    });
    
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Sync each page to database
    for (const page of pages) {
      const existingPage = await prisma.page.findUnique({
        where: { slug: page.slug }
      });
      
      if (existingPage) {
        // Update if label changed
        if (existingPage.label !== page.label) {
          await prisma.page.update({
            where: { slug: page.slug },
            data: { label: page.label }
          });
          console.log(`✅ Updated: ${page.slug} → ${page.label}`);
          updatedCount++;
        } else {
          console.log(`⏭️  Skipped: ${page.slug} (unchanged)`);
          skippedCount++;
        }
      } else {
        // Create new page
        await prisma.page.create({
          data: {
            slug: page.slug,
            label: page.label
          }
        });
        console.log(`✨ Created: ${page.slug} → ${page.label}`);
        createdCount++;
      }
    }
    
    // Check for pages in DB that are not in JSON (orphaned pages)
    const dbPages = await prisma.page.findMany();
    const jsonSlugs = new Set(pages.map(p => p.slug));
    const orphanedPages = dbPages.filter(p => !jsonSlugs.has(p.slug));
    
    if (orphanedPages.length > 0) {
      console.log(`\n⚠️  Found ${orphanedPages.length} orphaned page(s) in database:`);
      orphanedPages.forEach(page => {
        console.log(`  - ${page.slug} (${page.label})`);
      });
      console.log('  Consider removing these manually if they are no longer needed.');
    }
    
    console.log(`\n✨ Sync complete! Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);
    
    // Display final state
    const finalPages = await prisma.page.findMany({
      orderBy: { slug: 'asc' }
    });
    console.log('\n📊 Current pages in database:');
    finalPages.forEach(page => {
      console.log(`  - ${page.slug} → ${page.label}`);
    });
    
  } catch (error) {
    console.error('❌ Error syncing pages:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  syncPagesToDb();
}

module.exports = syncPagesToDb;

