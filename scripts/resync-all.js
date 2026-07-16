const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = '/tmp/opencode/backup_uploads/public/uploads';

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // Collect ALL DB-referenced filenames
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

  // Check what exists in Supabase
  const { data: files } = await supabase.storage.from('uploads').list('public');
  const supabaseSet = new Set(files.map(f => f.name));

  // Find missing files and re-upload
  const backupFiles = fs.readdirSync(BACKUP_DIR);
  const backupSet = new Set(backupFiles);

  let uploaded = 0;
  for (const fname of dbRefs) {
    if (supabaseSet.has(fname)) continue;
    if (!backupSet.has(fname)) {
      console.log(`Cannot upload ${fname} - not in backup`);
      continue;
    }

    const filePath = path.join(BACKUP_DIR, fname);
    const fileBuf = fs.readFileSync(filePath);
    const ext = fname.split('.').pop().toLowerCase();
    const contentType = ext === 'mp4' ? 'video/mp4' : ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg';

    const { error } = await supabase.storage.from('uploads').upload(`public/${fname}`, fileBuf, {
      contentType, upsert: true,
    });
    if (error) {
      console.error(`Error ${fname}: ${error.message}`);
      continue;
    }
    uploaded++;
    if (uploaded % 10 === 0) process.stdout.write('.');
  }
  console.log(`\nRe-uploaded: ${uploaded}`);

  // Also fix Announcement local path
  const annLocal = await pg.query(`SELECT id, "imageUrl" FROM "Announcement" WHERE "imageUrl" LIKE 'uploads/%'`);
  for (const r of annLocal.rows) {
    const fname = r.imageUrl.split('/').pop();
    const { data: pub } = supabase.storage.from('uploads').getPublicUrl(`public/${fname}`);
    await pg.query(`UPDATE "Announcement" SET "imageUrl" = $1 WHERE id = $2`, [pub.publicUrl, r.id]);
    console.log(`Fixed Announcement: ${fname}`);
  }

  // Clean up unused Supabase files (not in DB refs)
  const toDelete = files.filter(f => !dbRefs.has(f.name)).map(f => `public/${f.name}`);
  if (toDelete.length > 0) {
    const { data: del } = await supabase.storage.from('uploads').remove(toDelete);
    console.log(`Cleaned up ${del?.length || 0} unused Supabase files`);
  }

  // Final check
  const { data: finalFiles } = await supabase.storage.from('uploads').list('public');
  console.log(`\nFinal Supabase count: ${finalFiles.length}`);

  let stillMissing = 0;
  const finalSet = new Set(finalFiles.map(f => f.name));
  for (const f of dbRefs) {
    if (!finalSet.has(f)) {
      console.log(`  STILL MISSING: ${f}`);
      stillMissing++;
    }
  }
  console.log(`Still missing: ${stillMissing}`);

  await pg.end();
}

main().catch(e => { console.error(e); process.exit(1); });
