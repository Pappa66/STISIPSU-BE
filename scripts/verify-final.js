const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // Count files in Supabase
  const { data: files } = await supabase.storage.from('uploads').list('public');
  console.log(`Supabase files: ${files.length}`);

  // Collect all DB references
  const dbRefs = new Set();
  const posts = await pg.query(`SELECT "featuredImageUrl" FROM "Post" WHERE "featuredImageUrl" IS NOT NULL`);
  for (const r of posts.rows) {
    const fname = r.featuredImageUrl.split('/').pop();
    if (fname) dbRefs.add(fname);
  }
  const gallery = await pg.query(`SELECT "imageUrl" FROM "GalleryImage" WHERE "imageUrl" IS NOT NULL`);
  for (const r of gallery.rows) {
    const fname = r.imageUrl.split('/').pop();
    if (fname) dbRefs.add(fname);
  }
  const ann = await pg.query(`SELECT "imageUrl" FROM "Announcement" WHERE "imageUrl" IS NOT NULL`);
  for (const r of ann.rows) {
    const fname = r.imageUrl.split('/').pop();
    if (fname) dbRefs.add(fname);
  }
  const allPosts = await pg.query(`SELECT blocks FROM "Post" WHERE blocks IS NOT NULL`);
  for (const r of allPosts.rows) {
    if (!Array.isArray(r.blocks)) continue;
    for (const b of r.blocks) {
      if ((b.type === 'image' || b.type === 'video') && b.url && !b.url.startsWith('youtube')) {
        const fname = b.url.split('/').pop();
        if (fname) dbRefs.add(fname);
      }
    }
  }

  console.log(`DB referenced files: ${dbRefs.size}`);

  // Check all DB refs exist in Supabase
  const supabaseNames = new Set(files.map(f => f.name));
  let missing = 0;
  for (const f of dbRefs) {
    if (!supabaseNames.has(f)) {
      console.log(`  MISSING in Supabase: ${f}`);
      missing++;
    }
  }
  console.log(`Missing from Supabase: ${missing}`);

  // Check for unused Supabase files
  let unused = 0;
  for (const f of files) {
    if (!dbRefs.has(f.name)) {
      unused++;
    }
  }
  console.log(`Unused Supabase files (no DB ref): ${unused}`);

  // Verify no local paths in DB
  const local = await pg.query(`
    SELECT COUNT(*)::int as cnt FROM "Post" WHERE "featuredImageUrl" LIKE 'uploads/%'
    UNION ALL
    SELECT COUNT(*)::int FROM "GalleryImage" WHERE "imageUrl" LIKE 'uploads/%'
    UNION ALL
    SELECT COUNT(*)::int FROM "Announcement" WHERE "imageUrl" LIKE 'uploads/%'
  `);
  console.log(`Local paths (Post/Gallery/Announce): ${local.rows.map(r => r.cnt).join('/')}`);

  // Check all featuredImageUrls start with http
  const bad = await pg.query(`SELECT COUNT(*)::int as cnt FROM "Post" WHERE "featuredImageUrl" IS NOT NULL AND "featuredImageUrl" NOT LIKE 'http%'`);
  console.log(`Non-URL featured images: ${bad.rows[0].cnt}`);

  await pg.end();
}

main().catch(e => { console.error(e); process.exit(1); });
