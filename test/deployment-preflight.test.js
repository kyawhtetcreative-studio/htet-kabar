'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { inspectProductionEnvironment, isValidDatabaseUrl } = require('../lib/deployment-preflight');

function validEnvironment(overrides = {}) {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://app_user:private-password@db.example.test:5432/htet_kabar?sslmode=require',
    JWT_SECRET: 'a-private-random-secret-with-at-least-32-characters',
    PORT: '10000',
    TRUST_PROXY_HOPS: '1',
    ...overrides
  };
}

test('accepts a structurally valid production environment without printing secrets', () => {
  const result = inspectProductionEnvironment(validEnvironment());
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
  assert.equal(JSON.stringify(result).includes('private-password'), false);
  assert.equal(JSON.stringify(result).includes('random-secret'), false);
});

test('requires production mode, PostgreSQL URL, and a strong non-placeholder JWT secret', () => {
  const result = inspectProductionEnvironment(validEnvironment({
    NODE_ENV: 'development',
    DATABASE_URL: 'https://db.example.test',
    JWT_SECRET: 'replace-with-a-random-secret-at-least-32-characters'
  }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(message => message.startsWith('NODE_ENV')));
  assert.ok(result.errors.some(message => message.startsWith('DATABASE_URL')));
  assert.ok(result.errors.some(message => message.startsWith('JWT_SECRET')));
});

test('accepts PostgreSQL URL schemes and rejects incomplete or non-PostgreSQL URLs', () => {
  assert.equal(isValidDatabaseUrl('postgres://user:pass@localhost:5432/app'), true);
  assert.equal(isValidDatabaseUrl('postgresql://user:pass@localhost/app'), true);
  for (const value of ['', null, 'https://example.com', 'postgres://localhost/app', 'postgres://user:pass@localhost/']) {
    assert.equal(isValidDatabaseUrl(value), false);
  }
});

test('admin bootstrap credentials are optional together but validated when supplied', () => {
  const absent = inspectProductionEnvironment(validEnvironment());
  assert.equal(absent.ok, true);
  assert.match(absent.warnings[0], /confirm an admin already exists/);

  const partial = inspectProductionEnvironment(validEnvironment({ ADMIN_EMAIL: 'admin@example.com' }));
  assert.equal(partial.ok, false);
  assert.ok(partial.errors.some(message => message.startsWith('ADMIN_PASSWORD')));

  const invalid = inspectProductionEnvironment(validEnvironment({ ADMIN_EMAIL: 'not-an-email', ADMIN_PASSWORD: 'short' }));
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some(message => message.startsWith('ADMIN_EMAIL')));
  assert.ok(invalid.errors.some(message => message.startsWith('ADMIN_PASSWORD')));

  const valid = inspectProductionEnvironment(validEnvironment({ ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'long-enough-password' }));
  assert.equal(valid.ok, true);
});

test('Google OAuth settings must be complete and use an HTTPS redirect URI', () => {
  const partial = inspectProductionEnvironment(validEnvironment({ GOOGLE_CLIENT_ID: 'client-id' }));
  assert.equal(partial.ok, false);
  assert.ok(partial.errors.some(message => message.startsWith('Google OAuth')));

  const insecure = inspectProductionEnvironment(validEnvironment({
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    GOOGLE_REDIRECT_URI: 'http://example.com/auth/google/callback'
  }));
  assert.equal(insecure.ok, false);
  assert.ok(insecure.errors.some(message => message.startsWith('GOOGLE_REDIRECT_URI')));

  const secure = inspectProductionEnvironment(validEnvironment({
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    GOOGLE_REDIRECT_URI: 'https://example.com/auth/google/callback'
  }));
  assert.equal(secure.ok, true);
});

test('validates optional port and trusted proxy hop configuration', () => {
  for (const overrides of [{ PORT: '0' }, { PORT: '65536' }, { PORT: 'abc' }, { TRUST_PROXY_HOPS: '-1' }, { TRUST_PROXY_HOPS: '1.5' }, { TRUST_PROXY_HOPS: '11' }]) {
    assert.equal(inspectProductionEnvironment(validEnvironment(overrides)).ok, false);
  }
  assert.equal(inspectProductionEnvironment(validEnvironment({ PORT: '10000', TRUST_PROXY_HOPS: '0' })).ok, true);
});
