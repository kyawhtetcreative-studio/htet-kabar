'use strict';

require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const {
  parseDatabaseUrl,
  buildBackupArgs,
  buildRestoreListArgs,
  runPostgresTool
} = require('../lib/postgres-cli');

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--help' || value === '-h') options.help = true;
    else if (value === '--output' && argv[index + 1]) options.output = argv[++index];
    else throw new Error(`Unknown or incomplete argument: ${value}`);
  }
  return options;
}

function defaultBackupPath(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return path.resolve(process.cwd(), 'backups', `htet-kabar-${stamp}.dump`);
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('Usage: npm run db:backup -- [--output <file>]\nCreates a custom-format PostgreSQL backup and verifies its archive directory.');
    return;
  }

  const connection = parseDatabaseUrl(env.DATABASE_URL, env);
  const outputFile = path.resolve(options.output || defaultBackupPath());
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  let reservedFile;
  try {
    reservedFile = fs.openSync(outputFile, 'wx', 0o600);
    fs.closeSync(reservedFile);
    reservedFile = undefined;
  } catch (error) {
    if (error && error.code === 'EEXIST') throw new Error('Backup output already exists; choose a new path to avoid overwriting it.');
    throw new Error('Backup output file could not be created. Check the destination folder permissions.');
  }

  try {
    await runPostgresTool('pg_dump', buildBackupArgs(outputFile, connection.database), connection.env);
    const stat = fs.statSync(outputFile);
    if (!stat.isFile() || stat.size === 0) throw new Error('pg_dump completed without producing a non-empty backup file.');
    await runPostgresTool('pg_restore', buildRestoreListArgs(outputFile), connection.env);
  } catch (error) {
    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    throw error;
  }

  console.log(`Backup created and archive listing verified: ${outputFile}`);
  console.log('Keep this file outside the repository and in a separate secure location.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Database backup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, defaultBackupPath, main };
