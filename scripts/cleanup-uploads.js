const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // Collect DB-referenced filenames
  const refs = new Set();

  const g = await pg.query(`SELECT "imageUrl" FROM "GalleryImage"`);
  for (const r of g.rows) if (r.imageUrl) refs.add(r.imageUrl.split('/').pop());

  const p = await pg.query(`SELECT "featuredImageUrl" FROM "Post" WHERE "featuredImageUrl" IS NOT NULL`);
  for (const r of p.rows) if (r.featuredImageUrl) refs.add(r.featuredImageUrl.split('/').pop());

  const p2 = await pg.query(`SELECT blocks FROM "Post"`);
  for (const r of p2.rows) {
    if (Array.isArray(r.blocks)) {
      for (const b of r.blocks) {
        if (b.url && typeof b.url === 'string') {
          const name = b.url.split('/').pop();
          if (name && !name.startsWith('http')) refs.add(name);
        }
      }
    }
  }

  const a = await pg.query(`SELECT "imageUrl" FROM "Announcement" WHERE "imageUrl" IS NOT NULL`);
  for (const r of a.rows) if (r.imageUrl) refs.add(r.imageUrl.split('/').pop());

  console.log(`DB-referenced: ${refs.size} files`);

  // List all files in Supabase
  const { data: files, error } = await supabase.storage.from('uploads').list('public');
  if (error) throw error;
  console.log(`Supabase has: ${files.length} files`);

  let deleted = 0;
  for (const file of files) {
    if (!refs.has(file.name)) {
      const { error: delErr } = await supabase.storage.from('uploads').remove([`public/${file.name}`]);
      if (delErr) {
        console.error(`  FAIL: ${file.name} - ${delErr.message}`);
      } else {
        deleted++;
      }
    }
  }

  console.log(`Deleted unused: ${deleted} files`);
  await pg.end();
}

main().catch(e => { console.error(e); process.exit(1); });
