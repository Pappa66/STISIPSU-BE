const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Find the published page that has "MEMILIH" or intro content
  const r = await client.query(`SELECT id, title, slug, type, "isPublished" FROM "Post" WHERE title LIKE '%MEMILIH%' OR title LIKE '%ULUM%' OR slug LIKE '%memilih%'`);
  console.log('Found posts:');
  for (const p of r.rows) console.log('  ', p.id, '|', p.title, '| slug:', p.slug, '|', p.type, p.isPublished ? 'PUB' : 'DRF');

  // Also check what the "PENDAHULUAN" page is
  const r2 = await client.query(`SELECT id, title, slug FROM "Post" WHERE title = 'PENDAHULUAN'`);
  console.log('\nPENDAHULUAN:');
  for (const p of r2.rows) console.log('  ', p.id, '|', p.title, '| slug:', p.slug);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
