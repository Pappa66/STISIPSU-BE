const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = '/tmp/opencode/backup_uploads/public/uploads';

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // 1. Upload all files from backup to Supabase
  const files = fs.readdirSync(BACKUP_DIR);
  console.log(`Files in backup: ${files.length}`);

  let uploaded = 0;
  const urlMap = new Map(); // filename -> supabaseUrl

  for (const fname of files) {
    const filePath = path.join(BACKUP_DIR, fname);
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) continue;

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
  }

  console.log(`Uploaded/synced: ${uploaded} files`);
  console.log(`URL map size: ${urlMap.size}`);

  // 2. Update all DB references
  let totalUpdated = 0;

  // Post featuredImageUrl
  const posts = await pg.query(`SELECT id, "featuredImageUrl" FROM "Post" WHERE "featuredImageUrl" IS NOT NULL`);
  for (const r of posts.rows) {
    const fname = r.featuredImageUrl.split('/').pop();
    const newUrl = urlMap.get(fname);
    if (newUrl && newUrl !== r.featuredImageUrl) {
      await pg.query(`UPDATE "Post" SET "featuredImageUrl" = $1 WHERE id = $2`, [newUrl, r.id]);
      totalUpdated++;
    }
  }

  // GalleryImage
  const gallery = await pg.query(`SELECT id, "imageUrl" FROM "GalleryImage" WHERE "imageUrl" IS NOT NULL`);
  for (const r of gallery.rows) {
    const fname = r.imageUrl.split('/').pop();
    const newUrl = urlMap.get(fname);
    if (newUrl && newUrl !== r.imageUrl) {
      await pg.query(`UPDATE "GalleryImage" SET "imageUrl" = $1 WHERE id = $2`, [newUrl, r.id]);
      totalUpdated++;
    }
  }

  // Announcement
  const ann = await pg.query(`SELECT id, "imageUrl" FROM "Announcement" WHERE "imageUrl" IS NOT NULL`);
  for (const r of ann.rows) {
    const fname = r.imageUrl.split('/').pop();
    const newUrl = urlMap.get(fname);
    if (newUrl && newUrl !== r.imageUrl) {
      await pg.query(`UPDATE "Announcement" SET "imageUrl" = $1 WHERE id = $2`, [newUrl, r.id]);
      totalUpdated++;
    }
  }

  // Post blocks (image/video types)
  const allPosts = await pg.query(`SELECT id, blocks FROM "Post" WHERE blocks IS NOT NULL`);
  for (const r of allPosts.rows) {
    if (!Array.isArray(r.blocks)) continue;
    let changed = false;
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
          changed = true;
          totalUpdated++;
        }
      }
    }
  }

  console.log(`Total DB references updated: ${totalUpdated}`);

  // 3. Verify - show remaining local paths
  const remaining = await pg.query(`SELECT id, title, "featuredImageUrl" FROM "Post" WHERE "featuredImageUrl" LIKE 'uploads/%'`);
  console.log(`\nStill local paths: ${remaining.rows.length}`);
  for (const r of remaining.rows) console.log(`  ${r.title.substring(0,40)} | ${r.featuredImageUrl}`);

  await pg.end();
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
