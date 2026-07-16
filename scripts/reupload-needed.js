const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = '/tmp/opencode/backup_uploads/public/uploads';

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // Collect all filenames needed by DB
  const neededFiles = new Set();

  const posts = await pg.query(`SELECT "featuredImageUrl" FROM "Post" WHERE "featuredImageUrl" IS NOT NULL`);
  for (const r of posts.rows) {
    const fname = r.featuredImageUrl.split('/').pop();
    if (fname && !r.featuredImageUrl.startsWith('http')) neededFiles.add(fname);
  }

  const gallery = await pg.query(`SELECT "imageUrl" FROM "GalleryImage" WHERE "imageUrl" IS NOT NULL`);
  for (const r of gallery.rows) {
    const fname = r.imageUrl.split('/').pop();
    if (fname && !r.imageUrl.startsWith('http')) neededFiles.add(fname);
  }

  const ann = await pg.query(`SELECT "imageUrl" FROM "Announcement" WHERE "imageUrl" IS NOT NULL`);
  for (const r of ann.rows) {
    const fname = r.imageUrl.split('/').pop();
    if (fname && !r.imageUrl.startsWith('http')) neededFiles.add(fname);
  }

  const allPosts = await pg.query(`SELECT blocks FROM "Post" WHERE blocks IS NOT NULL`);
  for (const r of allPosts.rows) {
    if (!Array.isArray(r.blocks)) continue;
    for (const b of r.blocks) {
      if ((b.type === 'image' || b.type === 'video') && b.url && !b.url.startsWith('http') && !b.url.startsWith('youtube')) {
        const fname = b.url.split('/').pop();
        if (fname) neededFiles.add(fname);
      }
    }
  }

  console.log(`Files needed by DB: ${neededFiles.size}`);

  // Show which needed files exist in backup
  const backupFiles = new Set(fs.readdirSync(BACKUP_DIR));
  let found = 0, missing = 0;
  for (const f of neededFiles) {
    if (backupFiles.has(f)) found++;
    else {
      console.log(`  MISSING from backup: ${f}`);
      missing++;
    }
  }
  console.log(`Found in backup: ${found}, Missing: ${missing}`);

  // Upload only needed files
  let uploaded = 0;
  const urlMap = new Map();

  for (const fname of neededFiles) {
    if (!backupFiles.has(fname)) {
      console.log(`Skipping ${fname} - not in backup`);
      continue;
    }

    const filePath = path.join(BACKUP_DIR, fname);
    const fileBuf = fs.readFileSync(filePath);
    const contentType = fname.match(/\.(mp4|pdf)$/i) 
      ? (fname.endsWith('.mp4') ? 'video/mp4' : 'application/pdf')
      : (fname.match(/\.png$/i) ? 'image/png' : 'image/jpeg');

    const { error } = await supabase.storage
      .from('uploads')
      .upload(`public/${fname}`, fileBuf, {
        contentType,
        upsert: true,
      });

    if (error && !error.message?.includes('already exists')) {
      console.error(`Upload error ${fname}:`, error.message);
      continue;
    }

    const { data: pub } = supabase.storage.from('uploads').getPublicUrl(`public/${fname}`);
    urlMap.set(fname, pub.publicUrl);
    uploaded++;
    if (uploaded % 10 === 0) process.stdout.write('.');
  }
  console.log(`\nUploaded: ${uploaded}`);

  // Update DB
  let updated = 0;

  for (const r of posts.rows) {
    const fname = r.featuredImageUrl.split('/').pop();
    const newUrl = urlMap.get(fname);
    if (newUrl) {
      await pg.query(`UPDATE "Post" SET "featuredImageUrl" = $1 WHERE id = $2`, [newUrl, r.id]);
      updated++;
    }
  }

  for (const r of gallery.rows) {
    const fname = r.imageUrl.split('/').pop();
    const newUrl = urlMap.get(fname);
    if (newUrl) {
      await pg.query(`UPDATE "GalleryImage" SET "imageUrl" = $1 WHERE id = $2`, [newUrl, r.id]);
      updated++;
    }
  }

  for (const r of ann.rows) {
    const fname = r.imageUrl.split('/').pop();
    const newUrl = urlMap.get(fname);
    if (newUrl) {
      await pg.query(`UPDATE "Announcement" SET "imageUrl" = $1 WHERE id = $2`, [newUrl, r.id]);
      updated++;
    }
  }

  for (const r of allPosts.rows) {
    if (!Array.isArray(r.blocks)) continue;
    for (let bi = 0; bi < r.blocks.length; bi++) {
      const b = r.blocks[bi];
      if ((b.type === 'image' || b.type === 'video') && b.url && !b.url.startsWith('http') && !b.url.startsWith('youtube')) {
        const fname = b.url.split('/').pop();
        const newUrl = urlMap.get(fname);
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

  console.log(`DB references updated: ${updated}`);

  // Verify no local paths remain
  const rem = await pg.query(`SELECT COUNT(*)::int as cnt FROM "Post" WHERE "featuredImageUrl" LIKE 'uploads/%'`);
  console.log(`Remaining local-path featured images: ${rem.rows[0].cnt}`);

  await pg.end();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
