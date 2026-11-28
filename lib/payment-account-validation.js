'use strict';

const { PAYMENT_METHODS } = require('./payment-validation');

const MAX_DISPLAY_ORDER = 999;

function textField(value, max, label, required = true) {
  if (typeof value !== 'string') return { ok: false, error: `${label} သည် စာသားဖြစ်ရပါမည်။` };
  const normalized = value.trim();
  if (required && !normalized) return { ok: false, error: `${label} ဖြည့်ပါ။` };
  if (normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) return { ok: false, error: `${label} အချက်အလက် မမှန်ပါ။` };
  return { ok: true, value: normalized };
}

function validatePaymentAccountInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Payment account အချက်အလက် မမှန်ပါ။' };
  const method = typeof input.method === 'string' ? input.method.trim() : '';
  if (!PAYMENT_METHODS.includes(method)) return { ok: false, error: 'Payment Method ကို မှန်ကန်စွာ ရွေးချယ်ပါ။' };
  const accountName = textField(input.accountName, 120, 'အကောင့်အမည်');
  if (!accountName.ok) return accountName;
  const accountNumber = textField(input.accountNumber, 64, 'အကောင့်နံပါတ်');
  if (!accountNumber.ok || accountNumber.value.length < 3) return { ok: false, error: 'အကောင့်နံပါတ်ကို မှန်ကန်စွာ ဖြည့်ပါ။' };
  const instructions = input.instructions === undefined || input.instructions === null ? { ok: true, value: '' } : textField(input.instructions, 300, 'ညွှန်ကြားချက်', false);
  if (!instructions.ok) return instructions;
  if (input.active !== undefined && typeof input.active !== 'boolean') return { ok: false, error: 'Active အခြေအနေ မမှန်ပါ။' };
  let displayOrder = input.displayOrder === undefined ? 0 : input.displayOrder;
  if (typeof displayOrder === 'string' && /^\d{1,3}$/.test(displayOrder.trim())) displayOrder = Number(displayOrder.trim());
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > MAX_DISPLAY_ORDER) return { ok: false, error: 'ပြသမည့်အစီအစဉ်သည် ၀ မှ ၉၉၉ အတွင်း ဖြစ်ရပါမည်။' };
  return { ok: true, value: { method, accountName: accountName.value, accountNumber: accountNumber.value, instructions: instructions.value, active: input.active !== false, displayOrder } };
}

module.exports = { validatePaymentAccountInput, MAX_DISPLAY_ORDER };
