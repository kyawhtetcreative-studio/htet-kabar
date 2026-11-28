BEGIN;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('order.status_changed', 'payment.reviewed')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'payment')),
  entity_id TEXT NOT NULL CHECK (char_length(entity_id) BETWEEN 1 AND 64),
  before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((action = 'order.status_changed' AND entity_type = 'order') OR (action = 'payment.reviewed' AND entity_type = 'payment'))
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx ON admin_audit_logs (id DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_entity_idx ON admin_audit_logs (entity_type, entity_id, id DESC);

COMMIT;
