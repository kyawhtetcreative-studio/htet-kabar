'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePaymentReceipt, MAX_PAYMENT_RECEIPT_BYTES } = require('../lib/payment-receipt');

function dataUrl(mimeType, bytes) {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`;
}
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('test-image')]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const webp = Buffer.from('RIFFxxxxWEBP');

test('receipt is optional and empty values normalize to null', () => {
  assert.deepEqual(validatePaymentReceipt(undefined), { ok: true, value: null });
  assert.deepEqual(validatePaymentReceipt(''), { ok: true, value: null });
});
test('accepts PNG receipt and returns verified binary metadata', () => {
  const result = validatePaymentReceipt(dataUrl('image/png', png));
  assert.equal(result.ok, true);
  assert.equal(result.value.mimeType, 'image/png');
  assert.equal(result.value.size, png.length);
  assert.deepEqual(result.value.data, png);
});
test('accepts JPEG and WebP receipts', () => {
  assert.equal(validatePaymentReceipt(dataUrl('image/jpeg', jpeg)).ok, true);
  assert.equal(validatePaymentReceipt(dataUrl('image/webp', webp)).ok, true);
});
test('rejects unsupported MIME types and malformed data URLs', () => {
  for (const value of ['data:image/svg+xml;base64,PHN2Zz4=', 'data:image/gif;base64,R0lGODlh', 'https://example.com/receipt.png', 'data:image/png;base64,not-base64!']) {
    assert.equal(validatePaymentReceipt(value).ok, false);
  }
});
test('rejects MIME and file-signature mismatches', () => {
  assert.equal(validatePaymentReceipt(dataUrl('image/png', jpeg)).ok, false);
  assert.equal(validatePaymentReceipt(dataUrl('image/jpeg', png)).ok, false);
  assert.equal(validatePaymentReceipt(dataUrl('image/webp', png)).ok, false);
});
test('rejects non-string payloads', () => {
  for (const value of [42, {}, [], Buffer.from('image')]) assert.equal(validatePaymentReceipt(value).ok, false);
});
test('rejects non-canonical base64 and invalid padding', () => {
  assert.equal(validatePaymentReceipt('data:image/png;base64,@@@@').ok, false);
  assert.equal(validatePaymentReceipt('data:image/png;base64,AA=A').ok, false);
  assert.equal(validatePaymentReceipt('data:image/png;base64,AAA').ok, false);
});
test('rejects receipt images larger than one megabyte', () => {
  const oversized = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(MAX_PAYMENT_RECEIPT_BYTES)]);
  assert.equal(validatePaymentReceipt(dataUrl('image/png', oversized)).ok, false);
});
