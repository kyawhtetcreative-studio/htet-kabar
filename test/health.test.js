const test = require('node:test');
const assert = require('node:assert/strict');
const { checkDatabase } = require('../lib/health');

test('health check reports connected only after a successful database query', async () => {
  const health = await checkDatabase({ query: async (sql) => {
    assert.equal(sql, 'SELECT 1');
    return { rows: [{ '?column?': 1 }] };
  }});
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.database, 'connected');
});

test('health check reports database unavailable without leaking errors', async () => {
  const health = await checkDatabase({ query: async () => {
    throw new Error('sensitive connection details');
  }});
  assert.equal(health.status, 503);
  assert.equal(health.body.ok, false);
  assert.equal(health.body.database, 'unavailable');
  assert.equal(JSON.stringify(health.body).includes('sensitive'), false);
});
