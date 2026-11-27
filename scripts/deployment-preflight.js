'use strict';

require('dotenv').config();

const { inspectProductionEnvironment } = require('../lib/deployment-preflight');

const result = inspectProductionEnvironment(process.env);

if (result.warnings.length) {
  for (const warning of result.warnings) console.warn('WARNING: ' + warning);
}

if (!result.ok) {
  console.error('Production deployment preflight failed:');
  for (const error of result.errors) console.error('- ' + error);
  console.error('No environment values were printed. Set secrets only in your hosting provider or an untracked local .env file.');
  process.exitCode = 1;
} else {
  console.log('Production deployment preflight passed.');
  console.log('Required runtime configuration is present and structurally valid.');
  if (result.warnings.length) console.log('Review the warnings above before enabling customer/admin workflows.');
}
