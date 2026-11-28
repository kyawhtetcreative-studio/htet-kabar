'use strict';

function parseCookieHeader(header) {
  const cookies = Object.create(null);
  if (typeof header !== 'string') return cookies;

  for (const segment of header.split(';')) {
    const separator = segment.indexOf('=');
    if (separator <= 0) continue;

    const name = segment.slice(0, separator).trim();
    if (!name || Object.prototype.hasOwnProperty.call(cookies, name)) continue;

    const rawValue = segment.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      // A malformed cookie must not crash request handling or prevent other cookies from parsing.
      cookies[name] = rawValue;
    }
  }
  return cookies;
}

function checkOrigin(originHeader, hostHeader, requestProtocol) {
  if (typeof originHeader !== 'string' || !originHeader.trim()) {
    return { ok: false, reason: 'missing' };
  }
  if (typeof hostHeader !== 'string' || !hostHeader.trim() ||
      typeof requestProtocol !== 'string' || !requestProtocol.trim()) {
    return { ok: false, reason: 'invalid' };
  }

  let origin;
  try {
    origin = new URL(originHeader.trim());
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password ||
      origin.pathname !== '/' || origin.search || origin.hash) {
    return { ok: false, reason: 'invalid' };
  }

  const protocol = requestProtocol.toLowerCase().replace(/:$/, '');
  if (!['http', 'https'].includes(protocol)) return { ok: false, reason: 'invalid' };

  if (origin.protocol !== `${protocol}:` || origin.host.toLowerCase() !== hostHeader.trim().toLowerCase()) {
    return { ok: false, reason: 'mismatch' };
  }
  return { ok: true };
}

module.exports = { parseCookieHeader, checkOrigin };
