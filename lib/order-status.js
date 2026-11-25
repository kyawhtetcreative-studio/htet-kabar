'use strict';

const ORDER_STATUSES = Object.freeze(['pending', 'reviewing', 'approved', 'rejected', 'completed']);
const PAYMENT_STATUSES = Object.freeze(['unpaid', 'submitted', 'paid', 'rejected']);

const TRANSITIONS = Object.freeze({
  pending: Object.freeze(['reviewing', 'rejected']),
  reviewing: Object.freeze(['pending', 'approved', 'rejected']),
  approved: Object.freeze(['completed']),
  rejected: Object.freeze(['pending']),
  completed: Object.freeze([])
});

function validateOrderStatusTransition(currentStatus, nextStatus, paymentStatus) {
  if (!ORDER_STATUSES.includes(currentStatus)) {
    return { ok: false, code: 409, error: 'လက်ရှိ Order အခြေအနေကို ပြန်စစ်ပါ။' };
  }
  if (!ORDER_STATUSES.includes(nextStatus)) {
    return { ok: false, code: 400, error: 'Order Status မမှန်ပါ။' };
  }
  if (!PAYMENT_STATUSES.includes(paymentStatus)) {
    return { ok: false, code: 409, error: 'Payment အခြေအနေကို ပြန်စစ်ပါ။' };
  }
  if (currentStatus === nextStatus) {
    return { ok: true, unchanged: true, value: nextStatus };
  }
  if (!TRANSITIONS[currentStatus].includes(nextStatus)) {
    return { ok: false, code: 409, error: 'ဤ Order အခြေအနေမှ ရွေးချယ်ထားသော အခြေအနေသို့ ပြောင်းလဲခွင့်မရှိပါ။' };
  }
  if ((nextStatus === 'approved' || nextStatus === 'completed') && paymentStatus !== 'paid') {
    return { ok: false, code: 409, error: 'Payment ကို Admin မှ အတည်ပြုပြီးမှ Order ကို အတည်ပြု သို့မဟုတ် ပြီးစီးနိုင်ပါသည်။' };
  }
  return { ok: true, unchanged: false, value: nextStatus };
}

module.exports = { ORDER_STATUSES, PAYMENT_STATUSES, validateOrderStatusTransition };
