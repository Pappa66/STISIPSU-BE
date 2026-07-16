const { PrismaClient } = require('@prisma/client');
const archiver = require('archiver');
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

const exportDatabase = async (req, res, next) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : null;
    const format = req.query.format || 'json';

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
      try {
        data[table.name] = await prisma[table.prisma].findMany();
      } catch {
        data[table.name] = [];
      }
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
      const json = JSON.stringify(data, null, 2);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=stisipsu-backup-${suffix}.json`);
      return res.status(200).send(json);
    }

    if (format === 'sql') {
      let sql = `-- STISIPSU Database Backup\n-- Generated: ${data._exportedAt}\n-- Year: ${data._year}\n\n`;
      sql += `BEGIN;\n\n`;
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

      archive.append(JSON.stringify(data, null, 2), { name: `backup-${suffix}.json` });

      let sql = `-- STISIPSU Database Backup\n-- Generated: ${data._exportedAt}\n-- Year: ${data._year}\n\nBEGIN;\n\n`;
      for (const [table, rows] of Object.entries(data)) {
        if (table.startsWith('_')) continue;
        sql += generateSQLInsert(table, rows);
      }
      sql += `COMMIT;\n`;
      archive.append(sql, { name: `backup-${suffix}.sql` });

      await archive.finalize();
      return;
    }

    res.status(400).json({ message: 'Format tidak didukung. Gunakan json, sql, atau zip.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { exportDatabase };
