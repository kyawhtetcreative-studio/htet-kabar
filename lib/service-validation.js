'use strict';

const MAX_PRICE = 9999999999.99;
const MAX_PACKAGES = 25;

function normalizedText(value, max, label, required = true) {
  if (typeof value !== 'string') return { ok: false, error: `${label} သည် စာသားဖြစ်ရပါမည်။` };
  const text = value.trim();
  if (required && !text) return { ok: false, error: `${label} ဖြည့်ပါ။` };
  if (text.length > max) return { ok: false, error: `${label} အရှည်ကန့်သတ်ချက် ကျော်နေပါသည်။` };
  return { ok: true, value: text };
}

function normalizePrice(value) {
  if (typeof value === 'string') {
    const text = value.trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
    value = Number(text);
  } else if (typeof value !== 'number') {
    return null;
  }
  if (!Number.isFinite(value) || value < 0 || value > MAX_PRICE) return null;
  if (Math.round(value * 100) / 100 !== value) return null;
  return value;
}

function validateServiceInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Service အချက်အလက် မမှန်ပါ။' };
  }

  const name = normalizedText(input.name, 120, 'Service အမည်');
  if (!name.ok) return name;
  const slug = normalizedText(input.slug, 120, 'Slug');
  if (!slug.ok) return slug;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.value)) {
    return { ok: false, error: 'Slug ကို အင်္ဂလိပ်စာလုံးအသေး၊ နံပါတ်နှင့် hyphen ဖြင့်သာ ရေးပါ။' };
  }
  const description = normalizedText(input.description, 2000, 'ဖော်ပြချက်');
  if (!description.ok) return description;

  const iconValue = input.icon === undefined || input.icon === null || input.icon === '' ? '✦' : input.icon;
  if (typeof iconValue !== 'string' || Array.from(iconValue).length > 12 || /[\u0000-\u001f\u007f]/.test(iconValue)) {
    return { ok: false, error: 'Icon အချက်အလက် မမှန်ပါ။' };
  }
  if (input.active !== undefined && typeof input.active !== 'boolean') {
    return { ok: false, error: 'Active အခြေအနေ မမှန်ပါ။' };
  }
  if (!Array.isArray(input.packages) || input.packages.length < 1 || input.packages.length > MAX_PACKAGES) {
    return { ok: false, error: `Package အရေအတွက်ကို ၁ မှ ${MAX_PACKAGES} ခုအတွင်း ထည့်ပါ။` };
  }

  const packages = [];
  const packageNames = new Set();
  for (const item of input.packages) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, error: 'Package အချက်အလက် မမှန်ပါ။' };
    }
    const packageName = normalizedText(item.name, 100, 'Package အမည်');
    if (!packageName.ok) return packageName;
    const key = packageName.value.toLowerCase();
    if (packageNames.has(key)) return { ok: false, error: 'Package အမည် ထပ်နေပါသည်။' };
    packageNames.add(key);

    const price = normalizePrice(item.price);
    if (price === null) return { ok: false, error: 'Package ဈေးနှုန်းသည် ၀ နှင့် အများဆုံး ၉,၉၉၉,၉၉၉,၉၉၉.၉၉ ကျပ်အကြား ဖြစ်ရပါမည်။' };
    const packageDescription = item.description === undefined || item.description === null
      ? { ok: true, value: '' }
      : normalizedText(item.description, 1000, 'Package ဖော်ပြချက်', false);
    if (!packageDescription.ok) return packageDescription;

    packages.push({ name: packageName.value, price, description: packageDescription.value });
  }

  return {
    ok: true,
    value: {
      name: name.value,
      slug: slug.value,
      icon: iconValue,
      description: description.value,
      active: input.active !== false,
      packages
    }
  };
}

module.exports = { validateServiceInput, normalizePrice, MAX_PRICE, MAX_PACKAGES };
