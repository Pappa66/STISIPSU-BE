const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restore() {
  const backupPath = path.join(__dirname, '..', '..', 'database.json');
  if (!fs.existsSync(backupPath)) {
    // Try looking in the deliverable
    const altPath = '/tmp/stisipsu-project/database.json';
    if (fs.existsSync(altPath)) {
      console.log('Found backup at:', altPath);
      var data = JSON.parse(fs.readFileSync(altPath, 'utf-8'));
    } else {
      console.error('Backup not found at:', backupPath);
      console.error('Please place database.json in the backend directory');
      process.exit(1);
    }
  } else {
    data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  }

  // Skip user, notification (empty), _exportedAt, _version
  const tables = [
    { key: 'menuItem', name: 'MenuItem' },
    { key: 'subMenuItem', name: 'SubMenuItem' },
    { key: 'bimbingan', name: 'Bimbingan' },
    { key: 'post', name: 'Post' },
    { key: 'banner', name: 'Banner' },
    { key: 'galleryImage', name: 'GalleryImage' },
    { key: 'announcement', name: 'Announcement' },
    { key: 'setting', name: 'Setting' },
    { key: 'repositoryItem', name: 'RepositoryItem' },
    { key: 'fileItem', name: 'FileItem' },
    { key: 'footerLink', name: 'FooterLink' },
    { key: 'citation', name: 'Citation' },
    { key: 'contactMessage', name: 'ContactMessage' },
  ];

  for (const table of tables) {
    const records = data[table.key];
    if (!records || records.length === 0) {
      console.log(`${table.name}: 0 records, skipped`);
      continue;
    }
    console.log(`${table.name}: ${records.length} records`);
  }

  console.log('\nWARNING: This will delete existing data and replace with backup.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds...');
  await new Promise(r => setTimeout(r, 5000));

  for (const table of tables) {
    const records = data[table.key];
    if (!records || records.length === 0) continue;
    try {
      // Delete existing
      await prisma[table.name].deleteMany({});
      // Insert backup
      for (const record of records) {
        await prisma[table.name].create({ data: record });
      }
      console.log(`✓ ${table.name}: ${records.length} restored`);
    } catch (e) {
      console.error(`✗ ${table.name}: ${e.message}`);
    }
  }

  console.log('\nRestore complete. Users need to be re-seeded with: node prisma/seed.js');
  await prisma.$disconnect();
}

restore().catch(e => {
  console.error(e);
  process.exit(1);
});
