const { Client } = require('pg');
const fs = require('fs');

const BACKUP_PATH = '/tmp/opencode/backend_full/db_backup.sql';

function unescapeCopy(val) {
  if (val === '\\N' || val == null) return null;
  let r = '';
  for (let i = 0; i < val.length; i++) {
    if (val[i] === '\\') {
      const n = val[++i];
      if (n === '\\') r += '\\';
      else if (n === 'n') r += '\n';
      else if (n === 't') r += '\t';
      else if (n === 'r') r += '\r';
      else if (n === 'N') { r = null; break; }
      else r += n;
    } else {
      r += val[i];
    }
  }
  return r;
}

async function main() {
  const content = fs.readFileSync(BACKUP_PATH, 'utf8');
  const lines = content.split('\n');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected');

  // Parse COPY tables
  const tables = {};
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^COPY public\.(?:"?(\w+)"?)\s+\(([^)]+)\)\s+FROM stdin;$/);
    if (m) {
      const t = m[1];
      if (t === '_prisma_migrations') { i++; continue; }
      const rawCols = m[2].split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1'));
      const rows = [];
      i++;
      while (i < lines.length && lines[i] !== '\\.') {
        if (lines[i].trim()) rows.push(lines[i]);
        i++;
      }
      tables[t] = { cols: rawCols, lines: rows };
    }
    i++;
  }
  console.log(`Found ${Object.keys(tables).length} tables`);

  const order = ['User', 'Post', 'MenuItem', 'SubMenuItem', 'GalleryImage', 'Announcement', 'Bimbingan', 'Setting', 'RepositoryItem', 'FileItem'];

  // TRUNCATE all tables first
  for (const t of order) {
    if (!tables[t]) continue;
    await client.query(`TRUNCATE "${t}" CASCADE`);
    console.log(`Truncated: ${t}`);
  }

  // Restore
  let total = 0;
  let erreur = 0;

  for (const t of order) {
    if (!tables[t]) continue;
    const data = tables[t];
    const cols = data.cols.map(c => `"${c}"`).join(', ');
    const placeholders = data.cols.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO "${t}" (${cols}) VALUES (${placeholders})`;

    for (const line of data.lines) {
      const rawVals = line.split('\t');
      const values = data.cols.map((_, j) => unescapeCopy(rawVals[j]));

      try {
        await client.query(sql, values);
        total++;
      } catch (e) {
        if (erreur < 5) console.log(`  ${t} ${rawVals[0] || ''}: ${e.message.substring(0, 70)}`);
        erreur++;
      }
    }
  }

  console.log(`Restored: ${total}, Errors: ${erreur}`);
  await client.end();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
