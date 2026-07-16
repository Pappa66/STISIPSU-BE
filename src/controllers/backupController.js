const { PrismaClient } = require('@prisma/client');
const archiver = require('archiver');
const https = require('https');
const http = require('http');
const prisma = new PrismaClient();

function generateSQLInsert(table, rows) {
  if (!rows || rows.length === 0) return `-- ${table}: no data\n\n`;
  const columns = Object.keys(rows[0]);
  const colList = columns.map(c => `"${c}"`).join(', ');
  const lines = rows.map(row => {
    const vals = columns.map(col => {
      const v = row[col];
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
      if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
      return v;
    });
    return `INSERT INTO "${table}" (${colList}) VALUES (${vals.join(', ')});`;
  });
  return `-- ${table}: ${rows.length} rows\n\n${lines.join('\n')}\n\n`;
}

function fetchFile(url) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') return resolve(null);
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', () => resolve(null));
  });
}

function extractUrls(data) {
  const urls = [];
  // FileItems
  if (data.fileItem) data.fileItem.forEach(f => { if (f.fileUrl) urls.push({ url: f.fileUrl, name: `files/repository/${f.id}_${f.fileName || 'file'}` }); });
  // Gallery
  if (data.galleryImage) data.galleryImage.forEach(g => { if (g.imageUrl) urls.push({ url: g.imageUrl, name: `files/gallery/${g.id}_${g.imageUrl.split('/').pop()}` }); });
  // Banner
  if (data.banner) data.banner.forEach(b => { if (b.imageUrl) urls.push({ url: b.imageUrl, name: `files/banners/${b.id}_${b.imageUrl.split('/').pop()}` }); });
  // Post featured images
  if (data.post) data.post.forEach(p => { if (p.featuredImageUrl) urls.push({ url: p.featuredImageUrl, name: `files/posts/${p.id}_${p.featuredImageUrl.split('/').pop()}` }); });
  // Announcement images
  if (data.announcement) data.announcement.forEach(a => { if (a.imageUrl) urls.push({ url: a.imageUrl, name: `files/announcements/${a.id}_${a.imageUrl.split('/').pop()}` }); });
  return urls;
}

const exportDatabase = async (req, res, next) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : null;
    const format = req.query.format || 'json';
    const includeFiles = req.query.files === 'true';

    const yearFilter = year ? { year } : {};

    const staticTables = [
      { name: 'user', prisma: 'user' },
      { name: 'menuItem', prisma: 'menuItem' },
      { name: 'subMenuItem', prisma: 'subMenuItem' },
      { name: 'bimbingan', prisma: 'bimbingan' },
      { name: 'notification', prisma: 'notification' },
      { name: 'post', prisma: 'post' },
      { name: 'banner', prisma: 'banner' },
      { name: 'galleryImage', prisma: 'galleryImage' },
      { name: 'announcement', prisma: 'announcement' },
      { name: 'setting', prisma: 'setting' },
    ];

    const data = {};

    for (const table of staticTables) {
      try { data[table.name] = await prisma[table.prisma].findMany(); }
      catch { data[table.name] = []; }
    }

    const repoItems = await prisma.repositoryItem.findMany({
      where: yearFilter,
      include: { files: true },
    });
    data.repositoryItem = repoItems.map(r => { const { files, ...rest } = r; return rest; });
    data.fileItem = repoItems.flatMap(r => r.files);

    data._exportedAt = new Date().toISOString();
    data._version = '1.0';
    data._year = year || 'all';

    const suffix = year ? `tahun-${year}` : new Date().toISOString().split('T')[0];

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=stisipsu-backup-${suffix}.json`);
      return res.status(200).json(data);
    }

    if (format === 'sql') {
      let sql = `-- STISIPSU Database Backup\n-- Generated: ${data._exportedAt}\n-- Year: ${data._year}\n\nBEGIN;\n\n`;
      for (const [table, rows] of Object.entries(data)) {
        if (table.startsWith('_')) continue;
        sql += generateSQLInsert(table, rows);
      }
      sql += `COMMIT;\n`;
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename=stisipsu-backup-${suffix}.sql`);
      return res.status(200).send(sql);
    }

    if (format === 'zip') {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=stisipsu-backup-${suffix}.zip`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      // Data JSON
      archive.append(JSON.stringify(data, null, 2), { name: `backup-${suffix}.json` });

      // Data SQL
      let sql = `-- STISIPSU Database Backup\n-- Generated: ${data._exportedAt}\n-- Year: ${data._year}\n\nBEGIN;\n\n`;
      for (const [table, rows] of Object.entries(data)) {
        if (table.startsWith('_')) continue;
        sql += generateSQLInsert(table, rows);
      }
      sql += `COMMIT;\n`;
      archive.append(sql, { name: `backup-${suffix}.sql` });

      // Files from Supabase (optional)
      if (includeFiles) {
        const fileUrls = extractUrls(data);
        const manifest = [];
        let downloaded = 0;
        for (const f of fileUrls) {
          const buf = await fetchFile(f.url);
          if (buf) {
            archive.append(buf, { name: f.name });
            manifest.push({ url: f.url, path: f.name, size: buf.length });
            downloaded++;
          } else {
            manifest.push({ url: f.url, path: f.name, error: 'Gagal diunduh' });
          }
        }
        archive.append(JSON.stringify({ total: fileUrls.length, downloaded, files: manifest }, null, 2), { name: `file_manifest.json` });
      }

      await archive.finalize();
      return;
    }

    res.status(400).json({ message: 'Format tidak didukung. Gunakan json, sql, atau zip.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { exportDatabase };
