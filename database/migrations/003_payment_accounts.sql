BEGIN;

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

COMMIT;
