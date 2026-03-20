require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const tables = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  console.log('Tables:', tables.rows.map(r => r.tablename));
  
  // Try to find the projects table
  const projectTable = tables.rows.find(r => r.tablename.includes('project'));
  if (projectTable) {
    const r = await c.query(
      `SELECT id, status, "errorMessage", "createdAt" FROM "${projectTable.tablename}" ORDER BY "createdAt" DESC LIMIT 5`
    );
    console.log(JSON.stringify(r.rows, null, 2));
  }
  await c.end();
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
