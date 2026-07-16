const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const r = await client.query(`SELECT title, blocks FROM "Post" WHERE id = 'cmdpqcgx40004jsxz2jxwnx0i'`);
  const post = r.rows[0];
  console.log('Title:', post.title);
  console.log('Blocks:', JSON.stringify(post.blocks, null, 2).substring(0, 3000));
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
