'use strict';

const { spawn } = require('node:child_process');

const VALID_SSL_MODES = new Set(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']);

function parseDatabaseUrl(databaseUrl, baseEnv = process.env) {
  if (typeof databaseUrl !== 'string' || !databaseUrl.trim()) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use postgres:// or postgresql://');
  }
  if (!url.hostname || !url.pathname || url.pathname === '/') {
    throw new Error('DATABASE_URL must include a database host and name');
  }

  let username;
  let password;
  let database;
  try {
    username = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  } catch {
    throw new Error('DATABASE_URL contains invalid URL encoding');
  }
  if (!username || !database) {
    throw new Error('DATABASE_URL must include a database username and name');
  }

  const port = url.port ? Number(url.port) : 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DATABASE_URL contains an invalid port');
  }

  const host = url.hostname.startsWith('[') && url.hostname.endsWith(']')
    ? url.hostname.slice(1, -1)
    : url.hostname;

  const configuredSslMode = url.searchParams.get('sslmode');
  let sslMode = configuredSslMode ? configuredSslMode.toLowerCase() : null;
  if (sslMode === 'no-verify') sslMode = 'require';
  if (sslMode && !VALID_SSL_MODES.has(sslMode)) {
    throw new Error('DATABASE_URL contains an unsupported sslmode');
  }
  if (!sslMode && /(?:^|\.)(?:render\.com|supabase\.co|neon\.tech)$/i.test(host)) {
    sslMode = 'require';
  }

  const env = { ...baseEnv };
  for (const key of [
    'DATABASE_URL', 'PGHOST', 'PGPORT', 'PGUSER', 'PGDATABASE', 'PGPASSWORD',
    'PGSSLMODE', 'PGSERVICE', 'PGSERVICEFILE', 'PGHOSTADDR', 'PGOPTIONS'
  ]) {
    delete env[key];
  }
  env.PGHOST = host;
  env.PGPORT = String(port);
  env.PGUSER = username;
  env.PGDATABASE = database;
  env.PGCONNECT_TIMEOUT = '15';
  if (password) env.PGPASSWORD = password;
  if (sslMode) env.PGSSLMODE = sslMode;

  return { host, port, username, database, sslMode: sslMode || null, env };
}

function buildBackupArgs(outputFile, databaseName) {
  if (typeof outputFile !== 'string' || !outputFile.trim()) throw new Error('Backup output path is required');
  if (typeof databaseName !== 'string' || !databaseName.trim()) throw new Error('Database name is required');
  return [
    '--format=custom',
    '--no-owner',
    '--no-acl',
    '--no-password',
    '--file', outputFile,
    '--dbname', databaseName
  ];
}

function buildRestoreListArgs(backupFile) {
  if (typeof backupFile !== 'string' || !backupFile.trim()) throw new Error('Backup file path is required');
  return ['--list', backupFile];
}

function buildRestoreArgs(backupFile, databaseName) {
  if (typeof backupFile !== 'string' || !backupFile.trim()) throw new Error('Backup file path is required');
  if (typeof databaseName !== 'string' || !databaseName.trim()) throw new Error('Database name is required');
  return [
    '--no-owner',
    '--no-acl',
    '--exit-on-error',
    '--single-transaction',
    '--clean',
    '--if-exists',
    '--no-password',
    '--dbname', databaseName,
    backupFile
  ];
}

function runPostgresTool(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let child;
    try {
      child = spawn(command, args, { env, stdio: 'inherit', windowsHide: true, shell: false });
    } catch {
      reject(new Error(`${command} could not be started. Install PostgreSQL client tools and ensure they are on PATH.`));
      return;
    }

    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      if (error && error.code === 'ENOENT') {
        reject(new Error(`${command} was not found. Install PostgreSQL client tools and ensure they are on PATH.`));
      } else {
        reject(new Error(`${command} could not be started.`));
      }
    });
    child.once('close', (code) => {
      if (settled) return;
      settled = true;
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code === null ? 'unknown' : code}`));
    });
  });
}

module.exports = {
  parseDatabaseUrl,
  buildBackupArgs,
  buildRestoreListArgs,
  buildRestoreArgs,
  runPostgresTool
};
