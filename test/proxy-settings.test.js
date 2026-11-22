const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveTrustProxyHops } = require('../lib/proxy-settings');

test('trust proxy defaults to disabled in development', () => {
  assert.equal(resolveTrustProxyHops({ NODE_ENV: 'development' }), 0);
});

test('trust proxy defaults to one hop in production', () => {
  assert.equal(resolveTrustProxyHops({ NODE_ENV: 'production' }), 1);
});

test('trust proxy can be explicitly configured', () => {
  assert.equal(resolveTrustProxyHops({ NODE_ENV: 'production', TRUST_PROXY_HOPS: '0' }), 0);
  assert.equal(resolveTrustProxyHops({ NODE_ENV: 'production', TRUST_PROXY_HOPS: '2' }), 2);
});

test('invalid trust proxy values are rejected', () => {
  for (const value of ['-1', '1.5', 'eleven', '11']) {
    assert.throws(
      () => resolveTrustProxyHops({ NODE_ENV: 'production', TRUST_PROXY_HOPS: value }),
      /TRUST_PROXY_HOPS/
    );
  }
});
