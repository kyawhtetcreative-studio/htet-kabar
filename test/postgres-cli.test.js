'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseDatabaseUrl,
  buildBackupArgs,
  buildRestoreListArgs,
  buildRestoreArgs
} = require('../lib/postgres-cli');
const { parseArgs: parseBackupArgs, defaultBackupPath } = require('../scripts/db-backup');
const { parseArgs: parseRestoreArgs, validateRestoreRequest } = require('../scripts/db-restore');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const databaseUrl = 'postgresql://backup_user:p%40ss%3Aword@db.example.test:5433/htet_kabar?sslmode=require';

test('parses a PostgreSQL URL into libpq environment without retaining the URL', () => {
  const parsed = parseDatabaseUrl(databaseUrl, { PATH: '/usr/bin', DATABASE_URL: databaseUrl, PGPASSWORD: 'stale' });
  assert.equal(parsed.host, 'db.example.test');
  assert.equal(parsed.port, 5433);
  assert.equal(parsed.username, 'backup_user');
  assert.equal(parsed.database, 'htet_kabar');
  assert.equal(parsed.sslMode, 'require');
  assert.equal(parsed.env.PGPASSWORD, 'p@ss:word');
  assert.equal(parsed.env.PGSSLMODE, 'require');
  assert.equal(parsed.env.DATABASE_URL, undefined);
  assert.equal(parsed.env.PGSERVICE, undefined);
  assert.equal(parsed.env.PGPASSWORD.includes('stale'), false);
});

test('defaults PostgreSQL port and enables TLS for managed database hosts', () => {
  const parsed = parseDatabaseUrl('postgres://user:pass@db.render.com/example', {});
  assert.equal(parsed.port, 5432);
  assert.equal(parsed.env.PGSSLMODE, 'require');
});

test('normalizes SSL mode casing before passing it to libpq', () => {
  const parsed = parseDatabaseUrl('postgres://user:pass@db.example.test/example?sslmode=REQUIRE', {});
  assert.equal(parsed.env.PGSSLMODE, 'require');
});

test('normalizes IPv6 host syntax for libpq', () => {
  const parsed = parseDatabaseUrl('postgres://user:pass@[::1]:5432/htet_kabar', {});
  assert.equal(parsed.host, '::1');
  assert.equal(parsed.env.PGHOST, '::1');
});

test('maps no-verify to libpq require mode and permits encoded database names', () => {
  const parsed = parseDatabaseUrl('postgres://user:p%40ss@localhost/my%20db?sslmode=no-verify', {});
  assert.equal(parsed.database, 'my db');
  assert.equal(parsed.env.PGPASSWORD, 'p@ss');
  assert.equal(parsed.env.PGSSLMODE, 'require');
});

test('rejects missing, malformed, unsupported, or incomplete database URLs', () => {
  for (const value of [undefined, '', 'not a URL', 'https://example.com/db', 'postgres://host/', 'postgres://:pass@host/db', 'postgres://user@host/db?sslmode=invalid', 'postgres://user:pass@host:99999/db']) {
    assert.throws(() => parseDatabaseUrl(value, {}), /DATABASE_URL/);
  }
});

test('backup arguments use a custom archive and never include credentials', () => {
  const args = buildBackupArgs('backups/site.dump', 'htet_kabar');
  assert.deepEqual(args, ['--format=custom', '--no-owner', '--no-acl', '--no-password', '--file', 'backups/site.dump', '--dbname', 'htet_kabar']);
  assert.equal(args.some((arg) => arg.includes('p@ss')), false);
});

test('restore archive inspection and restore arguments are explicit', () => {
  assert.deepEqual(buildRestoreListArgs('site.dump'), ['--list', 'site.dump']);
  const args = buildRestoreArgs('site.dump', 'htet_kabar');
  for (const flag of ['--exit-on-error', '--single-transaction', '--clean', '--if-exists', '--no-password']) {
    assert.ok(args.includes(flag), `${flag} should be present`);
  }
  assert.equal(args.at(-1), 'site.dump');
  assert.equal(args.includes('htet_kabar'), true);
});

test('backup CLI accepts only an optional output path', () => {
  assert.deepEqual(parseBackupArgs(['--output', 'C:\\backup\\site.dump']), { output: 'C:\\backup\\site.dump' });
  assert.deepEqual(parseBackupArgs(['--help']), { help: true });
  assert.throws(() => parseBackupArgs(['--output']), /Unknown or incomplete/);
  assert.throws(() => parseBackupArgs(['--force']), /Unknown or incomplete/);
});

test('restore CLI requires explicit file and database confirmation options', () => {
  assert.deepEqual(parseRestoreArgs(['--file', 'site.dump', '--confirm-database', 'htet_kabar']), {
    file: 'site.dump', confirmDatabase: 'htet_kabar'
  });
  assert.throws(() => parseRestoreArgs(['--file', 'site.dump']), /Both --file and --confirm-database are required/);
  assert.deepEqual(parseRestoreArgs(['--help']), { help: true });
});

test('restore requires an explicit destructive-operation gate and exact database name', () => {
  const options = { file: 'site.dump', confirmDatabase: 'htet_kabar' };
  const connection = { database: 'htet_kabar' };
  assert.throws(() => validateRestoreRequest(options, {}, connection, 'unused'), /Restore is disabled/);
  assert.throws(() => validateRestoreRequest({ ...options, confirmDatabase: 'other_db' }, { ALLOW_DATABASE_RESTORE: 'YES' }, connection, 'unused'), /does not match/);
  assert.throws(() => validateRestoreRequest(options, { ALLOW_DATABASE_RESTORE: 'YES' }, connection, 'missing.dump'), /does not exist or is empty/);

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'htet-kabar-restore-test-'));
  const backupFile = path.join(directory, 'valid.dump');
  fs.writeFileSync(backupFile, 'archive');
  try {
    assert.doesNotThrow(() => validateRestoreRequest(options, { ALLOW_DATABASE_RESTORE: 'YES' }, connection, backupFile));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('default backup path is timestamped and stays under backups directory', () => {
  const file = defaultBackupPath(new Date('2026-11-24T04:00:00.000Z'));
  assert.match(file, /backups[\\/]htet-kabar-20261124T040000Z\.dump$/);
});
