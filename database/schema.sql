CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT '✦',
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  packages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  contact TEXT,
  service_id INTEGER REFERENCES services(id),
  service_name TEXT NOT NULL,
  package_name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  brief TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  reference TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid_date DATE,
  paid_time TIME,
  reference_last6 TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
,
  receipt_mime_type TEXT,
  receipt_data BYTEA,
  receipt_size INTEGER);

CREATE UNIQUE INDEX IF NOT EXISTS payments_pending_order_uidx
  ON payments(order_id)
  WHERE status = 'pending';
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL CONSTRAINT admin_audit_logs_action_check CHECK (action IN ('order.status_changed', 'payment.reviewed', 'service.created', 'service.updated', 'service.disabled', 'payment_account.created', 'payment_account.updated', 'payment_account.disabled')),
  entity_type TEXT NOT NULL CONSTRAINT admin_audit_logs_entity_type_check CHECK (entity_type IN ('order', 'payment', 'service', 'payment_account')),
  entity_id TEXT NOT NULL CHECK (char_length(entity_id) BETWEEN 1 AND 64),
  before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_audit_logs_entity_action_check CHECK ((action = 'order.status_changed' AND entity_type = 'order') OR (action = 'payment.reviewed' AND entity_type = 'payment') OR (action LIKE 'service.%' AND entity_type = 'service') OR (action LIKE 'payment_account.%' AND entity_type = 'payment_account'))
);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx ON admin_audit_logs(id DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_entity_idx ON admin_audit_logs(entity_type, entity_id, id DESC);

CREATE TABLE IF NOT EXISTS payment_accounts (
  id SERIAL PRIMARY KEY,
  method TEXT NOT NULL CHECK (method IN ('KBZPay', 'UAB Pay', 'AYA Bank')),
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order BETWEEN 0 AND 999),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (method, account_number)
);
CREATE INDEX IF NOT EXISTS payment_accounts_active_order_idx ON payment_accounts(active, display_order, id);
CREATE UNIQUE INDEX IF NOT EXISTS payment_accounts_one_active_method_uidx ON payment_accounts(method) WHERE active = TRUE;
