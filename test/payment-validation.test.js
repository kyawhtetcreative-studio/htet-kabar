'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePaymentInput, isValidDate, isValidTime } = require('../lib/payment-validation');

const validPayment = () => ({
  phone: ' 09 123456789 ',
  method: ' KBZPay ',
  reference: ' TXN-2026-ABC123 ',
  referenceLast6: '123456',
  paidDate: '2026-11-23',
  paidTime: '13:05'
});

test('normalizes valid payment input without mutating the original', () => {
  const input = validPayment();
  const result = validatePaymentInput(input);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    phone: '09 123456789',
    method: 'KBZPay',
    reference: 'TXN-2026-ABC123',
    referenceLast6: '123456',
    paidDate: '2026-11-23',
    paidTime: '13:05'
  });
  assert.equal(input.phone, ' 09 123456789 ');
});

test('rejects non-object payloads', () => {
  for (const input of [null, undefined, [], 'payment']) assert.equal(validatePaymentInput(input).ok, false);
});

test('rejects empty or oversized phone numbers', () => {
  for (const phone of ['', ' '.repeat(5), 'x'.repeat(41), null]) {
    assert.equal(validatePaymentInput({ ...validPayment(), phone }).ok, false);
  }
});

test('accepts only configured payment methods', () => {
  for (const method of ['KBZPay', 'UAB Pay', 'AYA Bank']) {
    assert.equal(validatePaymentInput({ ...validPayment(), method }).ok, true);
  }
  for (const method of ['Unknown', 'KBZ Pay', '', null]) {
    assert.equal(validatePaymentInput({ ...validPayment(), method }).ok, false);
  }
});

test('requires a bounded printable transaction reference', () => {
  for (const reference of ['', '  ', 'ab', 'x'.repeat(161), 'abc\\u0000def']) {
    assert.equal(validatePaymentInput({ ...validPayment(), reference }).ok, false);
  }
});

test('requires exactly six numeric receipt digits', () => {
  for (const referenceLast6 of ['', '12345', '1234567', '12ab56', '１２３４５６']) {
    assert.equal(validatePaymentInput({ ...validPayment(), referenceLast6 }).ok, false);
  }
});

test('validates calendar dates, including leap years', () => {
  assert.equal(isValidDate('2024-02-29'), true);
  assert.equal(isValidDate('2025-02-29'), false);
  assert.equal(isValidDate('2026-11-31'), false);
  assert.equal(isValidDate('2026-13-01'), false);
  assert.equal(isValidDate('26-11-23'), false);
  assert.equal(isValidDate(null), false);
});

test('validates 24-hour time', () => {
  for (const time of ['00:00', '09:05', '23:59']) assert.equal(isValidTime(time), true);
  for (const time of ['24:00', '12:60', '9:05', '12:5', 'noon']) assert.equal(isValidTime(time), false);
});

test('rejects invalid date and time fields in a payment', () => {
  assert.equal(validatePaymentInput({ ...validPayment(), paidDate: '2026-02-30' }).ok, false);
  assert.equal(validatePaymentInput({ ...validPayment(), paidTime: '25:00' }).ok, false);
});
