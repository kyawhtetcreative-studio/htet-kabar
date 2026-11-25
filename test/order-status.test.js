'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateOrderStatusTransition } = require('../lib/order-status');

test('allows the normal order review workflow', () => {
  assert.deepEqual(validateOrderStatusTransition('pending', 'reviewing', 'submitted'), {
    ok: true, unchanged: false, value: 'reviewing'
  });
  assert.equal(validateOrderStatusTransition('reviewing', 'approved', 'paid').ok, true);
  assert.equal(validateOrderStatusTransition('approved', 'completed', 'paid').ok, true);
});

test('requires manually approved payment before approving or completing an order', () => {
  for (const paymentStatus of ['unpaid', 'submitted', 'rejected']) {
    assert.equal(validateOrderStatusTransition('reviewing', 'approved', paymentStatus).code, 409);
    assert.equal(validateOrderStatusTransition('approved', 'completed', paymentStatus).code, 409);
  }
});

test('does not allow skipping the review stage', () => {
  assert.equal(validateOrderStatusTransition('pending', 'approved', 'paid').ok, false);
  assert.equal(validateOrderStatusTransition('pending', 'completed', 'paid').ok, false);
});

test('allows an admin to return an order for review or reopen a rejected order', () => {
  assert.equal(validateOrderStatusTransition('reviewing', 'pending', 'unpaid').ok, true);
  assert.equal(validateOrderStatusTransition('rejected', 'pending', 'rejected').ok, true);
});

test('makes completed orders terminal', () => {
  for (const nextStatus of ['pending', 'reviewing', 'approved', 'rejected']) {
    assert.equal(validateOrderStatusTransition('completed', nextStatus, 'paid').code, 409);
  }
});

test('allows idempotent status updates without changing state', () => {
  assert.deepEqual(validateOrderStatusTransition('reviewing', 'reviewing', 'submitted'), {
    ok: true, unchanged: true, value: 'reviewing'
  });
});

test('rejects unknown order and payment states', () => {
  assert.equal(validateOrderStatusTransition('unknown', 'reviewing', 'unpaid').code, 409);
  assert.equal(validateOrderStatusTransition('pending', 'unknown', 'unpaid').code, 400);
  assert.equal(validateOrderStatusTransition('pending', 'reviewing', 'unknown').code, 409);
});
