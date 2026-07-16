const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const r = await client.query(`SELECT id, title, "isPublished", type FROM "Post" ORDER BY "createdAt" DESC`);
  console.log('POSTS:', r.rows.length);
  for (const p of r.rows) {
    console.log(p.isPublished ? 'PUB' : 'DRF', '|', (p.title || '').substring(0, 50), '|', p.type);
  }

  const r3 = await client.query(`SELECT COUNT(*)::int as cnt FROM "GalleryImage"`);
  console.log('\nGALLERY:', r3.rows[0].cnt);

  const r4 = await client.query(`SELECT id, title, LEFT("imageUrl",80) as url FROM "GalleryImage" LIMIT 3`);
  for (const g of r4.rows) console.log('  ', g.title, '|', g.url);

  // Check featured images for news
  const r5 = await client.query(`SELECT title, LEFT("featuredImageUrl",80) as url FROM "Post" WHERE "featuredImageUrl" IS NOT NULL`);
  console.log('\nNEWS FEATURED:');
  for (const p of r5.rows) console.log('  ', (p.title || '').substring(0, 40), '|', p.url);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
