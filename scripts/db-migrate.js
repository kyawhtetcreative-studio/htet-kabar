'use strict';
require('dotenv').config();
const { Pool } = require('pg');
const { runMigrations } = require('../lib/migrations');
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required to run database migrations.');
  process.exitCode = 1;
} else {
  const normalizedUrl = databaseUrl.toLowerCase();
  const ssl = normalizedUrl.includes('sslmode=require')
    || normalizedUrl.includes('sslmode=no-verify')
    || normalizedUrl.includes('supabase.co')
    || normalizedUrl.includes('neon.tech')
    || normalizedUrl.includes('render.com')
    ? { rejectUnauthorized: false }
    : undefined;
  const pool = new Pool({ connectionString: databaseUrl, ssl });
  runMigrations(pool)
    .then(result => {
      console.log('Database migrations complete: ' + result.applied.length + ' applied, ' + result.skipped.length + ' already applied.');
      if (result.applied.length) console.log('Applied: ' + result.applied.join(', '));
    })
    .catch(error => {
      console.error('Database migration failed:', error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
