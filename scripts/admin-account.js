require('dotenv').config();

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const mode = process.argv[2];
if (!['setup', 'reset'].includes(mode)) {
  console.error('Usage: node scripts/admin-account.js <setup|reset>');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');

if (!databaseUrl) throw new Error('DATABASE_URL environment variable is required');
if (!email || !email.includes('@')) throw new Error('A valid ADMIN_EMAIL environment variable is required');
if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');

const url = databaseUrl.toLowerCase();
const ssl = url.includes('sslmode=require') || url.includes('sslmode=no-verify') || url.includes('supabase.co') || url.includes('neon.tech') || url.includes('render.com')
  ? { rejectUnauthorized: false }
  : undefined;

async function main() {
  const pool = new Pool({ connectionString: databaseUrl, ssl });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    const existing = await client.query(
      'SELECT id FROM admins WHERE lower(btrim(email))=$1',
      [email]
    );
    const hash = await bcrypt.hash(password, 12);

    if (existing.rows.length) {
      if (mode === 'reset') {
        await client.query('UPDATE admins SET email=$1,password_hash=$2 WHERE id=$3', [email, hash, existing.rows[0].id]);
      }
    } else {
      await client.query('INSERT INTO admins(email,password_hash) VALUES($1,$2)', [email, hash]);
    }

    await client.query('COMMIT');
    console.log(mode === 'reset' ? 'Admin password reset successfully.' : 'Admin account setup completed.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Admin account operation failed:', error.message);
  process.exit(1);
});
