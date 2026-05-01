/**
 * one-off script: promote a user to admin
 *
 * Usage (from workspace root):
 *   DATABASE_URL=postgres://... node apps/api/make-admin.js <email>
 */
const { Client } = require('pg');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node apps/api/make-admin.js <email>');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Set DATABASE_URL environment variable');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(
    'UPDATE users SET "isAdmin" = true WHERE email = $1 RETURNING id, email, "isAdmin"',
    [email],
  );

  if (res.rowCount === 0) {
    console.error(`No user found with email: ${email}`);
  } else {
    console.log('User promoted to admin:', res.rows[0]);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
