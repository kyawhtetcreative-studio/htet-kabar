'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { listMigrationFiles, unwrapTransaction, runMigrations } = require('../lib/migrations');

async function withDirectory(callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'htet-kabar-migrations-'));
  try { return await callback(directory); }
  finally { fs.rmSync(directory, { recursive: true, force: true }); }
}
function writeMigration(directory, filename, sql) {
  fs.writeFileSync(path.join(directory, filename), sql, 'utf8');
}
function createFakePool(options = {}) {
  const records = new Map();
  const calls = [];
  let locked = false, unlocked = false, released = false, rollbacks = 0;
  const client = {
    async query(statement, params = []) {
      const sql = String(statement).trim();
      calls.push(sql);
      if (sql.startsWith('SELECT pg_advisory_lock')) { locked = true; return { rows: [{}] }; }
      if (sql.startsWith('SELECT pg_advisory_unlock')) { unlocked = true; return { rows: [{}] }; }
      if (sql.startsWith('CREATE TABLE IF NOT EXISTS schema_migrations')) return { rows: [] };
      if (sql.startsWith('SELECT version, filename, checksum FROM schema_migrations')) return { rows: [...records.values()] };
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
      if (sql === 'ROLLBACK') { rollbacks += 1; return { rows: [] }; }
      if (options.failMarker && sql.includes(options.failMarker)) throw new Error('synthetic migration failure');
      if (sql.startsWith('INSERT INTO schema_migrations')) {
        const [version, filename, digest] = params;
        records.set(Number(version), { version: Number(version), filename, checksum: digest });
      }
      return { rows: [] };
    },
    release() { released = true; }
  };
  return {
    pool: { connect: async () => client }, records, calls,
    get locked() { return locked; }, get unlocked() { return unlocked; },
    get released() { return released; }, get rollbacks() { return rollbacks; }
  };
}

test('migration files are sorted by numeric version and non-SQL files are ignored', async () => {
  await withDirectory(directory => {
    writeMigration(directory, '002_second.sql', 'SELECT 2;');
    writeMigration(directory, '001_first.sql', 'SELECT 1;');
    fs.writeFileSync(path.join(directory, 'README.md'), 'notes', 'utf8');
    assert.deepEqual(listMigrationFiles(directory).map(item => item.filename), ['001_first.sql', '002_second.sql']);
  });
});
test('duplicate versions and malformed SQL filenames are rejected', async () => {
  await withDirectory(directory => {
    writeMigration(directory, '001_first.sql', 'SELECT 1;');
    writeMigration(directory, '001_duplicate.sql', 'SELECT 2;');
    assert.throws(() => listMigrationFiles(directory), /Duplicate migration version/);
  });
  await withDirectory(directory => {
    writeMigration(directory, 'first.sql', 'SELECT 1;');
    assert.throws(() => listMigrationFiles(directory), /Invalid migration filename/);
  });
});
test('outer transaction wrappers are removed without changing a PostgreSQL DO block', () => {
  const source = 'BEGIN;\nDO $$\nBEGIN\n  PERFORM 1;\nEND $$;\nCOMMIT;';
  assert.equal(unwrapTransaction(source), 'DO $$\nBEGIN\n  PERFORM 1;\nEND $$;');
  assert.equal(unwrapTransaction('SELECT 1;'), 'SELECT 1;');
  assert.throws(() => unwrapTransaction('BEGIN;\nSELECT 1;'), /both outer BEGIN and COMMIT/);
});
test('migrations apply in order and record SHA-256 checksums', async () => {
  await withDirectory(async directory => {
    writeMigration(directory, '002_second.sql', 'BEGIN;\nSELECT 2;\nCOMMIT;');
    writeMigration(directory, '001_first.sql', 'BEGIN;\nSELECT 1;\nCOMMIT;');
    const fake = createFakePool();
    const result = await runMigrations(fake.pool, { directory, lockId: 12345 });
    assert.deepEqual(result.applied, ['001_first.sql', '002_second.sql']);
    assert.deepEqual(result.skipped, []);
    assert.equal(fake.records.size, 2);
    assert.match(fake.records.get(1).checksum, /^[a-f0-9]{64}$/);
    assert.equal(fake.locked, true);
    assert.equal(fake.unlocked, true);
    assert.equal(fake.released, true);
  });
});
test('already-applied migrations are skipped on the next run', async () => {
  await withDirectory(async directory => {
    writeMigration(directory, '001_first.sql', 'SELECT 1;');
    const fake = createFakePool();
    await runMigrations(fake.pool, { directory, lockId: 12345 });
    const second = await runMigrations(fake.pool, { directory, lockId: 12345 });
    assert.deepEqual(second.applied, []);
    assert.deepEqual(second.skipped, ['001_first.sql']);
  });
});
test('editing an applied migration is rejected as checksum drift', async () => {
  await withDirectory(async directory => {
    const filename = '001_first.sql';
    writeMigration(directory, filename, 'SELECT 1;');
    const fake = createFakePool();
    await runMigrations(fake.pool, { directory, lockId: 12345 });
    writeMigration(directory, filename, 'SELECT 2;');
    await assert.rejects(runMigrations(fake.pool, { directory, lockId: 12345 }), /changed after it was applied/);
    assert.equal(fake.unlocked, true);
    assert.equal(fake.released, true);
  });
});
test('a failed migration rolls back and releases its advisory lock', async () => {
  await withDirectory(async directory => {
    writeMigration(directory, '001_failure.sql', "BEGIN;\nSELECT 'FAIL_MIGRATION';\nCOMMIT;");
    const fake = createFakePool({ failMarker: 'FAIL_MIGRATION' });
    await assert.rejects(runMigrations(fake.pool, { directory, lockId: 12345 }), /001_failure.sql failed: synthetic migration failure/);
    assert.equal(fake.rollbacks, 1);
    assert.equal(fake.records.size, 0);
    assert.equal(fake.unlocked, true);
    assert.equal(fake.released, true);
  });
});
test('an applied migration whose source file is missing stops startup', async () => {
  await withDirectory(async directory => {
    const fake = createFakePool();
    fake.records.set(1, { version: 1, filename: '001_removed.sql', checksum: 'a'.repeat(64) });
    await assert.rejects(runMigrations(fake.pool, { directory, lockId: 12345 }), /Applied migration file is missing/);
    assert.equal(fake.unlocked, true);
    assert.equal(fake.released, true);
  });
});
