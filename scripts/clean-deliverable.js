/**
 * Script untuk membuat deliverable bersih:
 * 1. Backup database (JSON + SQL)
 * 2. Download hanya file yang aktif dari Supabase
 * 3. Satukan dalam folder deliverable
 * 
 * Usage: node scripts/clean-deliverable.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const prisma = new PrismaClient();
const OUTPUT = path.join(__dirname, '..', 'deliverable');
const FILES_DIR = path.join(OUTPUT, 'files');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function downloadFile(url, dest) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || url.startsWith('uploads/') || url.startsWith('http://drive.google') || url.startsWith('https://drive.google')) {
      return resolve(null);
    }
    const client = url.startsWith('https') ? https : http;
    const dir = path.dirname(dest);
    ensureDir(dir);
    const file = fs.createWriteStream(dest);
    client.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) { file.close(); try { fs.unlinkSync(dest); } catch {} return resolve(null); }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    }).on('error', () => { file.close(); try { fs.unlinkSync(dest); } catch {} resolve(null); });
  });
}

function safeName(url) {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1].split('?')[0] || `file-${Date.now()}`;
}

async function main() {
  console.log('=== MEMBUAT DELIVERABLE BERSIH ===\n');
  ensureDir(OUTPUT);
  ensureDir(FILES_DIR);

  // 1. Backup database
  console.log('[1/4] Mengekspor database...');
  const tables = ['user', 'menuItem', 'subMenuItem', 'bimbingan', 'notification', 'post', 'banner', 'galleryImage', 'announcement', 'setting'];
  const data = {};
  for (const table of tables) {
    try { data[table] = await prisma[table].findMany(); } catch { data[table] = []; }
  }

  const repoItems = await prisma.repositoryItem.findMany({ include: { files: true } });
  data.repositoryItem = repoItems.map(r => { const { files, ...rest } = r; return rest; });
  data.fileItem = repoItems.flatMap(r => r.files);
  data._exportedAt = new Date().toISOString();
  data._version = '1.0';

  fs.writeFileSync(path.join(OUTPUT, 'database.json'), JSON.stringify(data, null, 2));
  console.log(`  -> ${Object.keys(data).length} tabel, ${Object.values(data).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), 0)} baris`);

  // 2. Generate SQL
  console.log('[2/4] Membuat SQL backup...');
  let sql = '-- STISIPSU Database Backup (CLEAN)\n\nBEGIN;\n\n';
  for (const [table, rows] of Object.entries(data)) {
    if (table.startsWith('_') || !Array.isArray(rows) || rows.length === 0) continue;
    const columns = Object.keys(rows[0]);
    const colList = columns.map(c => `"${c}"`).join(', ');
    for (const row of rows) {
      const vals = columns.map(col => {
        const v = row[col];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
        if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
        return v;
      });
      sql += `INSERT INTO "${table}" (${colList}) VALUES (${vals.join(', ')});\n`;
    }
    sql += '\n';
  }
  sql += 'COMMIT;\n';
  fs.writeFileSync(path.join(OUTPUT, 'database.sql'), sql);
  console.log('  -> Selesai');

  // 3. Download files
  console.log('[3/4] Mengunduh file dari Supabase...');
  const urls = [];

  // FileItem (repository PDFs)
  for (const f of data.fileItem) {
    if (f.fileUrl && f.fileUrl.startsWith('http') && !f.fileUrl.includes('drive.google')) {
      urls.push({ url: f.fileUrl, name: `repository/${safeName(f.fileUrl) || f.id}` });
    }
  }
  // Gallery
  for (const g of (data.galleryImage || [])) {
    if (g.imageUrl) urls.push({ url: g.imageUrl, name: `gallery/${safeName(g.imageUrl) || g.id}` });
  }
  // Banner
  for (const b of (data.banner || [])) {
    if (b.imageUrl) urls.push({ url: b.imageUrl, name: `banners/${safeName(b.imageUrl) || b.id}` });
  }
  // Post featured images
  for (const p of (data.post || [])) {
    if (p.featuredImageUrl) urls.push({ url: p.featuredImageUrl, name: `posts/${safeName(p.featuredImageUrl) || p.id}` });
  }
  // Announcement
  for (const a of (data.announcement || [])) {
    if (a.imageUrl) urls.push({ url: a.imageUrl, name: `announcements/${safeName(a.imageUrl) || a.id}` });
  }

  console.log(`  -> ${urls.length} file akan diunduh`);

  let ok = 0, fail = 0;
  for (let i = 0; i < urls.length; i++) {
    const f = urls[i];
    const dest = path.join(FILES_DIR, f.name);
    const result = await downloadFile(f.url, dest);
    if (result) ok++; else fail++;
    process.stdout.write(`\r  -> ${i + 1}/${urls.length} (${ok} OK, ${fail} gagal)`);
  }
  console.log('\n  -> Selesai');

  // 4. Copy source code (tanpa node_modules, .git, dll)
  console.log('[4/4] Menyalin source code...');
  const SRC = path.join(__dirname, '..');
  const DEST = path.join(OUTPUT, 'source');
  ensureDir(DEST);

  function copyRecursive(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const skipDirs = ['node_modules', '.git', '.next', 'deliverable', 'downloaded-files'];
      if (skipDirs.includes(entry.name) || entry.name.startsWith('.env')) continue;
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        ensureDir(destPath);
        copyRecursive(srcPath, destPath);
      } else if (entry.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyRecursive(SRC, DEST);
  console.log('  -> Selesai\n');

  // Ringkasan
  const totalSize = (await fs.promises.stat(OUTPUT).then(s => s.size)) / 1024 / 1024;
  console.log('=== DELIVERABLE SIAP ===');
  console.log(`  Lokasi: ${OUTPUT}`);
  console.log(`  Ukuran: ~${totalSize.toFixed(1)} MB`);
  console.log(`  File database: database.json + database.sql`);
  console.log(`  File upload: ${ok}/${urls.length} berhasil`);
  console.log(`  Source code: source/\n`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
