BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS payments_pending_order_uidx
  ON payments(order_id)
  WHERE status = 'pending';

COMMIT;
