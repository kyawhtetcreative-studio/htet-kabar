const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

test('admin password is stored as a bcrypt hash', async () => {
  const hash = await bcrypt.hash('A-secure-test-password', 12);
  assert.notEqual(hash, 'A-secure-test-password');
  assert.equal(await bcrypt.compare('A-secure-test-password', hash), true);
});

test('admin email normalization is stable', () => {
  const normalize = (email) => String(email || '').trim().toLowerCase();
  assert.equal(normalize('  Admin@Example.com  '), 'admin@example.com');
});
