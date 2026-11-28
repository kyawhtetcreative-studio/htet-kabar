'use strict';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidDatabaseUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) return false;
    if (!url.hostname || !url.username || !url.password) return false;
    if (!url.pathname || url.pathname === '/') return false;
    return true;
  } catch {
    return false;
  }
}

function inspectProductionEnvironment(env = process.env) {
  const errors = [];
  const warnings = [];

  if (env.NODE_ENV !== 'production') {
    errors.push('NODE_ENV must be set to production.');
  }

  if (!isValidDatabaseUrl(env.DATABASE_URL)) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection URL with a host, username, password, and database name.');
  }

  const jwtSecret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET : '';
  if (jwtSecret.trim().length < 32 || /replace-with|change-me|example/i.test(jwtSecret)) {
    errors.push('JWT_SECRET must be a private, non-placeholder secret of at least 32 characters.');
  }

  const adminEmail = typeof env.ADMIN_EMAIL === 'string' ? env.ADMIN_EMAIL.trim() : '';
  const adminPassword = typeof env.ADMIN_PASSWORD === 'string' ? env.ADMIN_PASSWORD : '';
  if (!adminEmail && !adminPassword) {
    warnings.push('No admin bootstrap credentials supplied; confirm an admin already exists or run npm run admin:setup once with secure environment values.');
  } else {
    if (!EMAIL_PATTERN.test(adminEmail)) errors.push('ADMIN_EMAIL must be a valid email when admin bootstrap credentials are supplied.');
    if (adminPassword.length < 12) errors.push('ADMIN_PASSWORD must be at least 12 characters when admin bootstrap credentials are supplied.');
  }

  const googleKeys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];
  const configuredGoogleKeys = googleKeys.filter(key => typeof env[key] === 'string' && env[key].trim());
  if (configuredGoogleKeys.length > 0 && configuredGoogleKeys.length !== googleKeys.length) {
    errors.push('Google OAuth must configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI together, or leave all three unset.');
  } else if (configuredGoogleKeys.length === googleKeys.length) {
    try {
      const redirect = new URL(env.GOOGLE_REDIRECT_URI);
      if (redirect.protocol !== 'https:' || !redirect.hostname || redirect.username || redirect.password) {
        errors.push('GOOGLE_REDIRECT_URI must be an HTTPS URL without embedded credentials in production.');
      }
    } catch {
      errors.push('GOOGLE_REDIRECT_URI must be a valid HTTPS URL in production.');
    }
  }

  if (env.PORT !== undefined && env.PORT !== '') {
    const port = Number(env.PORT);
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
      errors.push('PORT must be an integer between 1 and 65535 when supplied.');
    }
  }

  if (env.TRUST_PROXY_HOPS !== undefined && String(env.TRUST_PROXY_HOPS).trim() !== '') {
    const hops = Number(env.TRUST_PROXY_HOPS);
    if (!Number.isSafeInteger(hops) || hops < 0 || hops > 10) {
      errors.push('TRUST_PROXY_HOPS must be an integer between 0 and 10 when supplied.');
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

module.exports = { inspectProductionEnvironment, isValidDatabaseUrl };
