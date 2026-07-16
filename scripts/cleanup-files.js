const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // 1. Get all supabase files
  const { data: supabaseFiles } = await supabase.storage.from('uploads').list('public');
  const supabaseNames = new Set(supabaseFiles.map(f => f.name));
  console.log(`Supabase files: ${supabaseFiles.length}`);

  // 2. Collect all DB references
  const dbFileNames = new Set();

  // Post featuredImageUrl
  const posts = await pg.query(`SELECT "featuredImageUrl" FROM "Post" WHERE "featuredImageUrl" IS NOT NULL`);
  for (const r of posts.rows) {
    const fname = r.featuredImageUrl.split('/').pop();
    if (fname) dbFileNames.add(fname);
  }

  // Gallery images
  const gallery = await pg.query(`SELECT "imageUrl" FROM "GalleryImage" WHERE "imageUrl" IS NOT NULL`);
  for (const r of gallery.rows) {
    const fname = r.imageUrl.split('/').pop();
    if (fname) dbFileNames.add(fname);
  }

  // Announcements
  const announcements = await pg.query(`SELECT "imageUrl" FROM "Announcement" WHERE "imageUrl" IS NOT NULL`);
  for (const r of announcements.rows) {
    const fname = r.imageUrl.split('/').pop();
    if (fname) dbFileNames.add(fname);
  }

  // Post blocks (image types)
  const allPosts = await pg.query(`SELECT blocks FROM "Post" WHERE blocks IS NOT NULL`);
  for (const r of allPosts.rows) {
    if (Array.isArray(r.blocks)) {
      for (const b of r.blocks) {
        if ((b.type === 'image' || b.type === 'video') && b.url) {
          const fname = b.url.split('/').pop();
          if (fname && !b.url.startsWith('http') && !b.url.startsWith('youtube')) dbFileNames.add(fname);
        }
      }
    }
  }

  console.log(`DB referenced filenames: ${dbFileNames.size}`);

  // 3. Find unused Supabase files
  const unusedInSupabase = supabaseFiles.filter(f => !dbFileNames.has(f.name));
  console.log(`\nUnused in Supabase (${unusedInSupabase.length}):`);
  for (const f of unusedInSupabase) console.log(`  ${f.name}`);

  // 4. Clean up unused Supabase files
  if (unusedInSupabase.length > 0) {
    const toDelete = unusedInSupabase.map(f => `public/${f.name}`);
    const { data: delData, error: delError } = await supabase.storage.from('uploads').remove(toDelete);
    if (delError) console.error('Delete error:', delError);
    else console.log(`\nDeleted ${delData?.length || 0} unused files from Supabase`);
  }

  // 5. Delete unused local files (105 files with 175xxx timestamps)
  const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
  if (fs.existsSync(uploadDir)) {
    const localFiles = fs.readdirSync(uploadDir);
    let deleted = 0;
    for (const f of localFiles) {
      if (f.startsWith('175')) {
        fs.unlinkSync(path.join(uploadDir, f));
        deleted++;
      }
    }
    console.log(`\nDeleted ${deleted} old local files (175xxx)`);
  }

  await pg.end();
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
