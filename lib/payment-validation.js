'use strict';

const PAYMENT_METHODS = Object.freeze(['KBZPay', 'UAB Pay', 'AYA Bank']);

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validatePaymentInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Payment အချက်အလက် မမှန်ပါ။' };
  }

  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const method = typeof input.method === 'string' ? input.method.trim() : '';
  const reference = typeof input.reference === 'string' ? input.reference.trim() : '';
  const referenceLast6 = typeof input.referenceLast6 === 'string' ? input.referenceLast6.trim() : '';
  const paidDate = input.paidDate;
  const paidTime = input.paidTime;

  if (!phone || phone.length > 40) return { ok: false, error: 'ဖုန်းနံပါတ် မမှန်ပါ။' };
  if (!PAYMENT_METHODS.includes(method)) return { ok: false, error: 'Payment Method ကို မှန်ကန်စွာ ရွေးချယ်ပါ။' };
  if (reference.length < 3 || reference.length > 160 || /[\u0000-\u001f\u007f]/.test(reference)) {
    return { ok: false, error: 'Transaction Reference ကို ဖြည့်ပါ။' };
  }
  if (!/^\d{6}$/.test(referenceLast6)) return { ok: false, error: 'ငွေလွှဲပြေစာ နောက်ဆုံး ၆ လုံးကို ဖြည့်ပါ။' };
  if (!isValidDate(paidDate)) return { ok: false, error: 'ငွေလွှဲသည့် ရက်စွဲ မမှန်ပါ။' };
  if (!isValidTime(paidTime)) return { ok: false, error: 'ငွေလွှဲသည့် အချိန် မမှန်ပါ။' };

  return { ok: true, value: { phone, method, reference, referenceLast6, paidDate, paidTime } };
}

module.exports = { validatePaymentInput, isValidDate, isValidTime, PAYMENT_METHODS };
