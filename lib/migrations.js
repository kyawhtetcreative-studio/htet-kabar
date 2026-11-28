'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const DEFAULT_MIGRATIONS_DIRECTORY = path.join(__dirname, '..', 'database', 'migrations');
const DEFAULT_LOCK_ID = 741852963;

function listMigrationFiles(directory = DEFAULT_MIGRATIONS_DIRECTORY) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const sqlEntries = entries.filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.sql'));
  const migrations = sqlEntries.map(entry => {
    const match = entry.name.match(/^(\d{3})_([a-z0-9][a-z0-9_-]*)\.sql$/i);
    if (!match) throw new Error('Invalid migration filename: ' + entry.name);
    return { version: Number(match[1]), filename: entry.name, path: path.join(directory, entry.name) };
  }).sort((left, right) => left.version - right.version || left.filename.localeCompare(right.filename));
  const seen = new Set();
  for (const migration of migrations) {
    if (seen.has(migration.version)) throw new Error('Duplicate migration version: ' + String(migration.version).padStart(3, '0'));
    seen.add(migration.version);
  }
  if (!migrations.length) throw new Error('No SQL migration files were found.');
  return migrations;
}

function unwrapTransaction(source) {
  const sql = String(source).replace(/^\uFEFF/, '').trim();
  const hasBegin = /^BEGIN\s*;/i.test(sql);
  const hasCommit = /COMMIT\s*;$/i.test(sql);
  if (hasBegin !== hasCommit) throw new Error('Migration SQL must have both outer BEGIN and COMMIT statements, or neither.');
  const body = hasBegin ? sql.replace(/^BEGIN\s*;/i, '').replace(/COMMIT\s*;$/i, '').trim() : sql;
  if (!body) throw new Error('Migration SQL is empty.');
  return body;
}

function checksum(source) {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

async function runMigrations(pool, options = {}) {
  if (!pool || typeof pool.connect !== 'function') throw new TypeError('A PostgreSQL pool with connect() is required.');
  const directory = options.directory || DEFAULT_MIGRATIONS_DIRECTORY;
  const lockId = options.lockId === undefined ? DEFAULT_LOCK_ID : options.lockId;
  if (!Number.isSafeInteger(lockId)) throw new TypeError('Migration advisory lock ID must be a safe integer.');
  const migrations = listMigrationFiles(directory);
  const client = await pool.connect();
  let lockAcquired = false;
  try {
    await client.query('SELECT pg_advisory_lock($1::bigint)', [lockId]);
    lockAcquired = true;
    const createLedgerSql = [
      'CREATE TABLE IF NOT EXISTS schema_migrations (',
      '  version INTEGER PRIMARY KEY CHECK (version > 0),',
      '  filename TEXT NOT NULL UNIQUE,',
      "  checksum TEXT NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),",
      '  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()',
      ')'
    ].join('\n');
    await client.query(createLedgerSql);
    const appliedRows = (await client.query('SELECT version, filename, checksum FROM schema_migrations ORDER BY version')).rows;
    const appliedByVersion = new Map();
    for (const row of appliedRows) {
      const version = Number(row.version);
      if (!Number.isSafeInteger(version) || version < 1 || appliedByVersion.has(version)) throw new Error('The schema_migrations ledger contains an invalid or duplicate version.');
      const currentFile = migrations.find(item => item.version === version);
      if (!currentFile) throw new Error('Applied migration file is missing: ' + String(row.filename));
      if (currentFile.filename !== row.filename) throw new Error('Migration ' + String(version).padStart(3, '0') + ' was renamed after being applied. Restore its original filename.');
      appliedByVersion.set(version, row);
    }
    const maxAppliedVersion = appliedByVersion.size ? Math.max(...appliedByVersion.keys()) : 0;
    for (let version = 1; version <= maxAppliedVersion; version += 1) {
      if (!appliedByVersion.has(version)) {
        throw new Error('The schema_migrations ledger is missing version ' + String(version).padStart(3, '0') + '.');
      }
    }
    const pendingMigrations = migrations.filter(item => !appliedByVersion.has(item.version));
    for (let index = 0; index < pendingMigrations.length; index += 1) {
      const expectedVersion = maxAppliedVersion + index + 1;
      if (pendingMigrations[index].version !== expectedVersion) {
        throw new Error('Pending migration sequence gap: expected version ' + String(expectedVersion).padStart(3, '0') + ', found ' + String(pendingMigrations[index].version).padStart(3, '0') + '.');
      }
    }
    const applied = [];
    const skipped = [];
    for (const migration of migrations) {
      const source = fs.readFileSync(migration.path, 'utf8');
      const digest = checksum(source);
      const prior = appliedByVersion.get(migration.version);
      if (prior) {
        if (String(prior.checksum).trim() !== digest) throw new Error('Migration ' + migration.filename + ' changed after it was applied. Add a new migration instead of editing an applied file.');
        skipped.push(migration.filename);
        continue;
      }
      const sql = unwrapTransaction(source);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(version, filename, checksum) VALUES($1, $2, $3)', [migration.version, migration.filename, digest]);
        await client.query('COMMIT');
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch {}
        throw new Error('Database migration ' + migration.filename + ' failed: ' + error.message, { cause: error });
      }
      applied.push(migration.filename);
    }
    return { applied, skipped };
  } finally {
    if (lockAcquired) {
      try { await client.query('SELECT pg_advisory_unlock($1::bigint)', [lockId]); } catch {}
    }
    client.release();
  }
}

module.exports = { DEFAULT_MIGRATIONS_DIRECTORY, listMigrationFiles, unwrapTransaction, runMigrations };
