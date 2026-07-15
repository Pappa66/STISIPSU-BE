const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Check blocks for supabase URLs
  const p2 = await client.query(`SELECT id, title FROM "Post" WHERE blocks::text LIKE '%supabase%'`);
  console.log('Posts with blocks containing supabase URLs:', p2.rows.length);

  // Check if any blocks still have old uploads/ paths
  const p3 = await client.query(`SELECT id, title FROM "Post" WHERE blocks::text LIKE '%uploads/%' AND blocks::text NOT LIKE '%supabase%'`);
  console.log('Posts with OLD uploads/ paths (no supabase):', p3.rows.length);
  for (const r of p3.rows) {
    console.log('  STILL OLD:', r.title);
  }

  // Verify GalleryImage URLs
  const g = await client.query(`SELECT COUNT(*)::int as cnt FROM "GalleryImage" WHERE "imageUrl" LIKE '%supabase%'`);
  console.log('Gallery with supabase URLs:', g.rows[0].cnt);

  // Verify Post featuredImageUrl URLs
  const p = await client.query(`SELECT COUNT(*)::int as cnt FROM "Post" WHERE "featuredImageUrl" IS NOT NULL AND "featuredImageUrl" LIKE '%supabase%'`);
  console.log('Posts with supabase featured images:', p.rows[0].cnt);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
