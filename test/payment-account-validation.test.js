'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePaymentAccountInput, MAX_DISPLAY_ORDER } = require('../lib/payment-account-validation');

const validAccount = () => ({ method: ' KBZPay ', accountName: ' U Hlaing ', accountNumber: ' 09 123 456 789 ', instructions: ' Transfer using the order code ', active: true, displayOrder: '12' });

test('normalizes a valid payment account without mutating the input', () => {
  const input = validAccount(); const result = validatePaymentAccountInput(input);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { method: 'KBZPay', accountName: 'U Hlaing', accountNumber: '09 123 456 789', instructions: 'Transfer using the order code', active: true, displayOrder: 12 });
  assert.equal(input.accountName, ' U Hlaing ');
});

test('rejects non-object payment account payloads', () => { for (const input of [null, undefined, [], 'account']) assert.equal(validatePaymentAccountInput(input).ok, false); });

test('accepts only supported payment methods', () => {
  for (const method of ['KBZPay', 'UAB Pay', 'AYA Bank']) assert.equal(validatePaymentAccountInput({ ...validAccount(), method }).ok, true);
  for (const method of ['', 'Unknown', 'KBZ Pay', null]) assert.equal(validatePaymentAccountInput({ ...validAccount(), method }).ok, false);
});

test('requires bounded account name and account number strings', () => {
  for (const accountName of ['', 123, 'x'.repeat(121)]) assert.equal(validatePaymentAccountInput({ ...validAccount(), accountName }).ok, false);
  for (const accountNumber of ['', 'ab', 123, 'x'.repeat(65)]) assert.equal(validatePaymentAccountInput({ ...validAccount(), accountNumber }).ok, false);
});

test('rejects control characters in account fields and instructions', () => {
  for (const field of ['accountName', 'accountNumber', 'instructions']) assert.equal(validatePaymentAccountInput({ ...validAccount(), [field]: 'safe\nunsafe' }).ok, false);
});

test('allows optional instructions and defaults active and display order', () => {
  const result = validatePaymentAccountInput({ method: 'AYA Bank', accountName: 'Kyaw Htet', accountNumber: '40000001' });
  assert.equal(result.ok, true); assert.equal(result.value.instructions, ''); assert.equal(result.value.active, true); assert.equal(result.value.displayOrder, 0);
});

test('rejects invalid active flags and display order values', () => {
  assert.equal(validatePaymentAccountInput({ ...validAccount(), active: 'false' }).ok, false);
  for (const displayOrder of [-1, 1.5, '1.5', 'abc', MAX_DISPLAY_ORDER + 1, '1000']) assert.equal(validatePaymentAccountInput({ ...validAccount(), displayOrder }).ok, false);
});

test('accepts the highest supported display order', () => { assert.equal(validatePaymentAccountInput({ ...validAccount(), displayOrder: MAX_DISPLAY_ORDER }).ok, true); });
