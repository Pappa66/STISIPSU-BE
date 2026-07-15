const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Collect all referenced image filenames
  const refs = new Set();

  // GalleryImage URLs
  const g = await client.query('SELECT "imageUrl" FROM "GalleryImage"');
  for (const r of g.rows) {
    if (r.imageUrl) refs.add(r.imageUrl.replace(/^\//, ''));
  }

  // Post featuredImageUrl
  const p = await client.query('SELECT "featuredImageUrl" FROM "Post" WHERE "featuredImageUrl" IS NOT NULL');
  for (const r of p.rows) {
    if (r.featuredImageUrl) refs.add(r.featuredImageUrl);
  }

  // Post blocks  
  const p2 = await client.query('SELECT blocks FROM "Post"');
  for (const r of p2.rows) {
    if (Array.isArray(r.blocks)) {
      for (const b of r.blocks) {
        if (b.url && typeof b.url === 'string' && b.url.includes('/')) {
          refs.add(b.url);
        }
      }
    }
  }

  const uploadDir = '/home/papabear/Documents/PROJECT/STISIP2025 (copy)/www/backend/public/uploads';
  const files = new Set(fs.readdirSync(uploadDir));

  console.log('=== Referenced files vs available ===\n');
  let found = 0, missing = 0;
  for (const ref of refs) {
    const fname = ref.split('/').pop();
    if (files.has(fname)) {
      console.log('  OK:', ref);
      found++;
    } else {
      console.log('  MISSING:', ref);
      missing++;
    }
  }
  console.log(`\nFound: ${found}, Missing: ${missing}`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
