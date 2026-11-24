'use strict';

require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const {
  parseDatabaseUrl,
  buildRestoreListArgs,
  buildRestoreArgs,
  runPostgresTool
} = require('../lib/postgres-cli');

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--help' || value === '-h') options.help = true;
    else if (value === '--file' && argv[index + 1]) options.file = argv[++index];
    else if (value === '--confirm-database' && argv[index + 1]) options.confirmDatabase = argv[++index];
    else throw new Error(`Unknown or incomplete argument: ${value}`);
  }
  if (!options.help && (!options.file || !options.confirmDatabase)) {
    throw new Error('Both --file and --confirm-database are required.');
  }
  return options;
}

function validateRestoreRequest(options, env, connection, backupFile) {
  if (env.ALLOW_DATABASE_RESTORE !== 'YES') {
    throw new Error('Restore is disabled. Set ALLOW_DATABASE_RESTORE=YES only for this deliberate restore operation.');
  }
  if (options.confirmDatabase !== connection.database) {
    throw new Error('Confirmation database name does not match DATABASE_URL; no restore was started.');
  }
  if (!fs.existsSync(backupFile) || !fs.statSync(backupFile).isFile() || fs.statSync(backupFile).size === 0) {
    throw new Error('Backup file does not exist or is empty.');
  }
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('Usage: ALLOW_DATABASE_RESTORE=YES npm run db:restore -- --file <backup.dump> --confirm-database <database-name>\nWARNING: Restoring drops existing objects in the target database before recreating them.');
    return;
  }

  const connection = parseDatabaseUrl(env.DATABASE_URL, env);
  const backupFile = path.resolve(options.file);
  validateRestoreRequest(options, env, connection, backupFile);

  await runPostgresTool('pg_restore', buildRestoreListArgs(backupFile), connection.env);
  console.error(`WARNING: Existing objects in database "${connection.database}" will be dropped and restored.`);
  await runPostgresTool('pg_restore', buildRestoreArgs(backupFile, connection.database), connection.env);
  console.log(`Database restore completed for target database: ${connection.database}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Database restore stopped: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, validateRestoreRequest, main };
