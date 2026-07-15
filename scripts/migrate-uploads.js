// Migrate local uploads to Supabase Storage and update DB URLs
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const BUCKET = process.env.SUPABASE_BUCKET || 'uploads';
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY diperlukan');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const pg = new Client({ connectionString: DATABASE_URL });
  await pg.connect();
  console.log('Connected to DB');

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  let bucket = buckets.find(b => b.name === BUCKET);
  if (!bucket) {
    const { data, error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw error;
    console.log(`Created bucket: ${BUCKET}`);
  } else {
    console.log(`Bucket exists: ${BUCKET}`);
  }

  // Read all local files
  const files = fs.readdirSync(UPLOAD_DIR);
  console.log(`Local files: ${files.length}`);

  // Check what's already in Supabase
  const { data: existing } = await supabase.storage.from(BUCKET).list('public');
  const existingNames = new Set((existing || []).map(f => f.name));
  console.log(`Already in Supabase: ${existingNames.size}`);

  // Collect all DB references
  const allRefs = [];

  // GalleryImage URLs
  const gal = await pg.query('SELECT id, "imageUrl" FROM "GalleryImage"');
  for (const r of gal.rows) {
    allRefs.push({ table: 'GalleryImage', id: r.id, col: 'imageUrl', url: r.imageUrl });
  }

  // Post featuredImageUrl
  const p = await pg.query('SELECT id, "featuredImageUrl" FROM "Post" WHERE "featuredImageUrl" IS NOT NULL');
  for (const r of p.rows) {
    allRefs.push({ table: 'Post', id: r.id, col: 'featuredImageUrl', url: r.featuredImageUrl });
  }

  // Announcement imageUrl
  const a = await pg.query('SELECT id, "imageUrl" FROM "Announcement" WHERE "imageUrl" IS NOT NULL');
  for (const r of a.rows) {
    allRefs.push({ table: 'Announcement', id: r.id, col: 'imageUrl', url: r.imageUrl });
  }

  // Post blocks (JSONB - extract all urls)
  const p2 = await pg.query('SELECT id, blocks FROM "Post"');
  const postBlocks = [];
  for (const r of p2.rows) {
    if (Array.isArray(r.blocks)) {
      for (let bi = 0; bi < r.blocks.length; bi++) {
        const b = r.blocks[bi];
        if (b.url && typeof b.url === 'string' && !b.url.startsWith('http') && !b.url.startsWith('youtube') && !b.url.startsWith('https://youtu')) {
          postBlocks.push({ id: r.id, blockIndex: bi, url: b.url });
        }
      }
    }
  }

  // Upload files and map old URL -> new URL
  const urlMap = new Map();
  let uploaded = 0, skipped = 0;

  for (const file of files) {
    const filePath = path.join(UPLOAD_DIR, file);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    if (existingNames.has(file)) {
      skipped++;
      // Get public URL
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(`public/${file}`);
      urlMap.set(`uploads/${file}`, pub.publicUrl);
      urlMap.set(`/uploads/${file}`, pub.publicUrl);
      continue;
    }

    const content = fs.readFileSync(filePath);
    const ext = path.extname(file).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4', '.pdf': 'application/pdf',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    const { error } = await supabase.storage.from(BUCKET).upload(`public/${file}`, content, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.error(`  FAILED: ${file} - ${error.message}`);
      continue;
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(`public/${file}`);
    urlMap.set(`uploads/${file}`, pub.publicUrl);
    urlMap.set(`/uploads/${file}`, pub.publicUrl);
    uploaded++;
    console.log(`  Uploaded: ${file} -> ${pub.publicUrl}`);
  }

  console.log(`\nUploaded: ${uploaded}, Skipped: ${skipped}`);

  // Update database URLs
  let updated = 0;
  for (const ref of allRefs) {
    const newUrl = urlMap.get(ref.url) || urlMap.get(ref.url.replace(/^\//, ''));
    if (newUrl && newUrl !== ref.url) {
      if (ref.table === 'Post') {
        // For Post, featuredImageUrl
        await pg.query(`UPDATE "Post" SET "featuredImageUrl" = $1 WHERE id = $2`, [newUrl, ref.id]);
        updated++;
      } else if (ref.table === 'GalleryImage') {
        await pg.query(`UPDATE "GalleryImage" SET "imageUrl" = $1 WHERE id = $2`, [newUrl, ref.id]);
        updated++;
      } else if (ref.table === 'Announcement') {
        await pg.query(`UPDATE "Announcement" SET "imageUrl" = $1 WHERE id = $2`, [newUrl, ref.id]);
        updated++;
      }
    }
  }

  // Update Post blocks JSONB
  for (const pb of postBlocks) {
    const newUrl = urlMap.get(pb.url) || urlMap.get(`/${pb.url}`);
    if (newUrl && newUrl !== pb.url) {
      await pg.query(
        `UPDATE "Post" SET blocks = jsonb_set(blocks, ARRAY[$1::text, 'url'], to_jsonb($2::text)) WHERE id = $3`,
        [pb.blockIndex.toString(), newUrl, pb.id]
      );
      updated++;
    }
  }

  console.log(`DB URLs updated: ${updated}`);
  await pg.end();
  console.log('Done!');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
