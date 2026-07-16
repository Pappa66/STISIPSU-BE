const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = '/tmp/opencode/backup_uploads/public/uploads';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const fnames = [
    '1770544266533-01_struktur_organisasi_STISIP_SU.jpg',
    '1770437497295-Selamat_datang_di_STISIP_Sukabumi_11zon.jpg',
    '1771040777400-2._FAJAR.jpeg',
    '1770423927078-1.jpeg',
  ];

  for (const fname of fnames) {
    const filePath = path.join(BACKUP_DIR, fname);
    const fileBuf = fs.readFileSync(filePath);
    const contentType = fname.endsWith('.jpeg') || fname.endsWith('.jpg') ? 'image/jpeg' : 'image/png';

    const { error } = await supabase.storage.from('uploads').upload(`public/${fname}`, fileBuf, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.error(`Upload ${fname}:`, error.message);
      continue;
    }

    const { data: pub } = supabase.storage.from('uploads').getPublicUrl(`public/${fname}`);
    console.log(`Uploaded: ${pub.publicUrl}`);

    // Update featuredImageUrl
    await pg.query(`UPDATE "Post" SET "featuredImageUrl" = $1 WHERE "featuredImageUrl" LIKE $2`, [pub.publicUrl, `%${fname}%`]);
    console.log(`  Updated DB`);
  }

  // Also check blocks for these files
  for (const fname of fnames) {
    const { data: pub } = supabase.storage.from('uploads').getPublicUrl(`public/${fname}`);
    const allPosts = await pg.query(`SELECT id, blocks FROM "Post" WHERE blocks::text LIKE $1`, [`%${fname}%`]);
    for (const r of allPosts.rows) {
      if (!Array.isArray(r.blocks)) continue;
      for (let bi = 0; bi < r.blocks.length; bi++) {
        const b = r.blocks[bi];
        if ((b.type === 'image' || b.type === 'video') && b.url && b.url.includes(fname)) {
          await pg.query(
            `UPDATE "Post" SET blocks = jsonb_set(blocks, ARRAY[$1::text, 'url'], to_jsonb($2::text)) WHERE id = $3`,
            [bi.toString(), pub.publicUrl, r.id]
          );
          console.log(`  Updated block in post ${r.id}`);
        }
      }
    }
  }

  // Final verification
  const rem = await pg.query(`SELECT COUNT(*)::int as cnt FROM "Post" WHERE "featuredImageUrl" LIKE 'uploads/%'`);
  console.log(`\nRemaining local paths: ${rem.rows[0].cnt}`);

  await pg.end();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
