const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // Get all files in Supabase
  const { data: files } = await supabase.storage.from('uploads').list('public');
  const fileMap = new Map();
  for (const f of files) {
    const { data: pub } = supabase.storage.from('uploads').getPublicUrl(`public/${f.name}`);
    fileMap.set(f.name, pub.publicUrl);
  }
  console.log(`Supabase files: ${fileMap.size}`);

  let updated = 0;

  // Fix Post featuredImageUrl
  const posts = await pg.query(`SELECT id, "featuredImageUrl" FROM "Post" WHERE "featuredImageUrl" IS NOT NULL AND "featuredImageUrl" NOT LIKE '%supabase%'`);
  for (const r of posts.rows) {
    const fname = r.featuredImageUrl.split('/').pop();
    const newUrl = fileMap.get(fname);
    if (newUrl) {
      await pg.query(`UPDATE "Post" SET "featuredImageUrl" = $1 WHERE id = $2`, [newUrl, r.id]);
      updated++;
    }
  }

  // Fix Post blocks
  const p2 = await pg.query(`SELECT id, blocks FROM "Post"`);
  for (const r of p2.rows) {
    if (Array.isArray(r.blocks)) {
      for (let bi = 0; bi < r.blocks.length; bi++) {
        const b = r.blocks[bi];
        if (b.url && typeof b.url === 'string' && !b.url.startsWith('http') && !b.url.startsWith('youtube')) {
          const fname = b.url.split('/').pop();
          const newUrl = fileMap.get(fname);
          if (newUrl && newUrl !== b.url) {
            await pg.query(
              `UPDATE "Post" SET blocks = jsonb_set(blocks, ARRAY[$1::text, 'url'], to_jsonb($2::text)) WHERE id = $3`,
              [bi.toString(), newUrl, r.id]
            );
            updated++;
          }
        }
      }
    }
  }

  console.log(`Updated: ${updated} URLs`);
  await pg.end();
}

main().catch(e => { console.error(e); process.exit(1); });
