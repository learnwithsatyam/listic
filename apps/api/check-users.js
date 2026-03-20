const { Client } = require('pg');
const c = new Client(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_0U9NWCnihjDu@ep-calm-bread-a16xkieo-pooler.ap-southeast-1.aws.neon.tech/listic?sslmode=require&channel_binding=require');
c.connect()
  .then(() => c.query('SELECT id, email, "creditsRemaining" FROM users'))
  .then(r => { console.table(r.rows); return c.end(); })
  .catch(e => { console.error(e.message); c.end(); });
