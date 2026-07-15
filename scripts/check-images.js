const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // GalleryImage URLs
  const g = await client.query('SELECT id, title, "imageUrl" FROM "GalleryImage" ORDER BY "order"');
  console.log('=== GALLERY IMAGES ===');
  for (const r of g.rows) {
    console.log(r.title, '|', r.imageUrl);
  }

  // Posts with featuredImageUrl
  const p = await client.query('SELECT id, title, "featuredImageUrl" FROM "Post" WHERE "featuredImageUrl" IS NOT NULL');
  console.log('\n=== POSTS WITH FEATURED IMAGE ===');
  for (const r of p.rows) {
    console.log(r.title, '|', r.featuredImageUrl);
  }

  // Extract all upload URLs from blocks JSON
  const p2 = await client.query('SELECT id, title, blocks FROM "Post" WHERE blocks::text LIKE \'%uploads/%\'');
  console.log('\n=== POSTS WITH uploads IN blocks ===');
  for (const r of p2.rows) {
    const blocks = r.blocks;
    if (Array.isArray(blocks)) {
      for (const b of blocks) {
        if (b.url && b.url.startsWith('uploads/')) {
          console.log(r.title, '|', b.url);
        }
      }
    }
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
