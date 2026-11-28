const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCookieHeader, checkOrigin } = require('../lib/request-security');

test('cookie parser handles whitespace, encoded values, and equals signs', () => {
  const cookies = parseCookieHeader(' hk_admin=abc%2Edef ; theme=dark ; token=part=two ');
  assert.equal(cookies.hk_admin, 'abc.def');
  assert.equal(cookies.theme, 'dark');
  assert.equal(cookies.token, 'part=two');
});

test('malformed percent-encoding is preserved without throwing', () => {
  const cookies = parseCookieHeader('hk_admin=%E0%A4%A; other=ok');
  assert.equal(cookies.hk_admin, '%E0%A4%A');
  assert.equal(cookies.other, 'ok');
});

test('cookie parser uses a null prototype and keeps the first duplicate', () => {
  const cookies = parseCookieHeader('__proto__=unsafe; hk_admin=first; hk_admin=second');
  assert.equal(Object.getPrototypeOf(cookies), null);
  assert.equal(cookies.__proto__, 'unsafe');
  assert.equal(cookies.hk_admin, 'first');
});

test('empty and non-string cookie headers return a safe empty object', () => {
  for (const header of [undefined, null, '', 123]) {
    const cookies = parseCookieHeader(header);
    assert.equal(Object.getPrototypeOf(cookies), null);
    assert.equal(Object.keys(cookies).length, 0);
  }
});

test('accepts a matching HTTPS origin', () => {
  assert.deepEqual(checkOrigin('https://example.com', 'example.com', 'https'), { ok: true });
  assert.deepEqual(checkOrigin('https://EXAMPLE.com/', 'example.com', 'https'), { ok: true });
});

test('accepts a matching HTTP origin for local development', () => {
  assert.deepEqual(checkOrigin('http://localhost:3000', 'localhost:3000', 'http'), { ok: true });
});

test('rejects mismatched host, protocol, or port', () => {
  assert.equal(checkOrigin('https://attacker.example', 'example.com', 'https').reason, 'mismatch');
  assert.equal(checkOrigin('http://example.com', 'example.com', 'https').reason, 'mismatch');
  assert.equal(checkOrigin('https://example.com:444', 'example.com', 'https').reason, 'mismatch');
});

test('rejects missing, malformed, and non-origin URL forms', () => {
  assert.equal(checkOrigin(undefined, 'example.com', 'https').reason, 'missing');
  for (const origin of ['not-a-url', 'ftp://example.com', 'https://user@example.com', 'https://example.com/path', 'https://example.com?x=1', 'https://example.com#frag']) {
    assert.equal(checkOrigin(origin, 'example.com', 'https').reason, 'invalid', origin);
  }
});

test('rejects invalid request host or protocol', () => {
  assert.equal(checkOrigin('https://example.com', '', 'https').reason, 'invalid');
  assert.equal(checkOrigin('https://example.com', 'example.com', 'tcp').reason, 'invalid');
});
