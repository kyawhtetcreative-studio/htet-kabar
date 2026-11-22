'use strict';

function resolveTrustProxyHops(env = process.env) {
  const raw = env.TRUST_PROXY_HOPS;
  const defaultHops = env.NODE_ENV === 'production' ? 1 : 0;
  if (raw === undefined || raw.trim() === '') return defaultHops;

  const hops = Number(raw);
  if (!Number.isSafeInteger(hops) || hops < 0 || hops > 10) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 10');
  }
  return hops;
}

module.exports = { resolveTrustProxyHops };
