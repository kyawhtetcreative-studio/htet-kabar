'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateServiceInput, normalizePrice, MAX_PACKAGES } = require('../lib/service-validation');

const validService = () => ({
  name: ' Graphic Design ',
  slug: 'graphic-design',
  icon: '✦',
  description: '  Design services  ',
  active: true,
  packages: [
    { name: ' Basic ', price: '25000', description: '  Starter  ' },
    { name: 'Premium', price: 100000, description: '' }
  ]
});

test('normalizes valid service and package fields without mutating input', () => {
  const input = validService();
  const result = validateServiceInput(input);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    name: 'Graphic Design', slug: 'graphic-design', icon: '✦', description: 'Design services', active: true,
    packages: [{ name: 'Basic', price: 25000, description: 'Starter' }, { name: 'Premium', price: 100000, description: '' }]
  });
  assert.equal(input.name, ' Graphic Design ');
});

test('defaults icon and active when omitted', () => {
  const result = validateServiceInput({ name: 'Test', slug: 'test', description: 'Test', packages: [{ name: 'A', price: 0 }] });
  assert.equal(result.ok, true);
  assert.equal(result.value.icon, '✦');
  assert.equal(result.value.active, true);
});

test('rejects non-object service payloads', () => {
  for (const input of [null, undefined, [], 'text']) assert.equal(validateServiceInput(input).ok, false);
});

test('rejects missing, non-string, and oversized service fields', () => {
  for (const input of [
    { ...validService(), name: '' },
    { ...validService(), name: 123 },
    { ...validService(), slug: 'UpperCase' },
    { ...validService(), slug: 'bad slug' },
    { ...validService(), slug: '-bad' },
    { ...validService(), description: 'x'.repeat(2001) }
  ]) assert.equal(validateServiceInput(input).ok, false);
});

test('rejects invalid icons and non-boolean active values', () => {
  assert.equal(validateServiceInput({ ...validService(), icon: 'x'.repeat(13) }).ok, false);
  assert.equal(validateServiceInput({ ...validService(), icon: '\u0000' }).ok, false);
  assert.equal(validateServiceInput({ ...validService(), active: 'false' }).ok, false);
});

test('rejects package count outside the supported range', () => {
  assert.equal(validateServiceInput({ ...validService(), packages: [] }).ok, false);
  assert.equal(validateServiceInput({ ...validService(), packages: Array(MAX_PACKAGES + 1).fill({ name: 'x', price: 1 }) }).ok, false);
});

test('rejects malformed package objects, missing names, and duplicate names', () => {
  assert.equal(validateServiceInput({ ...validService(), packages: [null] }).ok, false);
  assert.equal(validateServiceInput({ ...validService(), packages: [{ name: '', price: 1 }] }).ok, false);
  assert.equal(validateServiceInput({ ...validService(), packages: [{ name: 'A', price: 1 }, { name: ' a ', price: 2 }] }).ok, false);
});

test('validates package descriptions and rejects non-text descriptions', () => {
  assert.equal(validateServiceInput({ ...validService(), packages: [{ name: 'A', price: 1, description: 'x'.repeat(1001) }] }).ok, false);
  assert.equal(validateServiceInput({ ...validService(), packages: [{ name: 'A', price: 1, description: 3 }] }).ok, false);
});

test('accepts nonnegative prices with at most two decimal places', () => {
  for (const price of [0, 1, 0.01, '25000', '25000.50', 9999999999.99]) assert.notEqual(normalizePrice(price), null);
});

test('rejects negative, nonnumeric, over-precision, and over-limit prices', () => {
  for (const price of [-1, '-1', '', 'NaN', '1.001', 1.001, Infinity, '10000000000', 10000000000]) assert.equal(normalizePrice(price), null);
});
