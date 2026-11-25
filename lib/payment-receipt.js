'use strict';

const MAX_PAYMENT_RECEIPT_BYTES = 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_PAYMENT_RECEIPT_BYTES / 3) * 4;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function hasValidImageSignature(mimeType, data) {
  if (mimeType === 'image/png') return data.length >= PNG_SIGNATURE.length && data.subarray(0, 8).equals(PNG_SIGNATURE);
  if (mimeType === 'image/jpeg') return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mimeType === 'image/webp') return data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

function validatePaymentReceipt(dataUrl) {
  if (dataUrl === undefined || dataUrl === null || dataUrl === '') return { ok: true, value: null };
  if (typeof dataUrl !== 'string' || dataUrl.length > MAX_BASE64_LENGTH + 32) {
    return { ok: false, error: 'ငွေလွှဲပြေစာပုံသည် 1MB ထက် မကျော်ရပါ။' };
  }
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) return { ok: false, error: 'PNG, JPG သို့မဟုတ် WebP ပြေစာပုံသာ တင်နိုင်ပါသည်။' };
  const [, mimeType, encoded] = match;
  if (encoded.length % 4 !== 0) return { ok: false, error: 'ပြေစာပုံ Base64 အချက်အလက် မမှန်ပါ။' };
  const data = Buffer.from(encoded, 'base64');
  if (!data.length || data.length > MAX_PAYMENT_RECEIPT_BYTES || data.toString('base64') !== encoded) {
    return { ok: false, error: 'ပြေစာပုံအရွယ်အစား သို့မဟုတ် အချက်အလက် မမှန်ပါ။' };
  }
  if (!hasValidImageSignature(mimeType, data)) {
    return { ok: false, error: 'ပြေစာပုံအမျိုးအစားနှင့် ဖိုင်အချက်အလက် မကိုက်ညီပါ။' };
  }
  return { ok: true, value: { mimeType, data, size: data.length } };
}

module.exports = { validatePaymentReceipt, MAX_PAYMENT_RECEIPT_BYTES, hasValidImageSignature };
