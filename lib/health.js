'use strict';

async function checkDatabase(pool) {
  try {
    await pool.query('SELECT 1');
    return {
      status: 200,
      body: { ok: true, app: 'HTET KABAR', stage: 'backend-foundation', database: 'connected' }
    };
  } catch {
    return {
      status: 503,
      body: { ok: false, app: 'HTET KABAR', stage: 'backend-foundation', database: 'unavailable' }
    };
  }
}

module.exports = { checkDatabase };
