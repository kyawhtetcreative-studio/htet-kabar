BEGIN;

-- Extend the existing append-only admin audit vocabulary without deleting history.
-- The DO block safely replaces the original PostgreSQL-generated CHECK constraints
-- and is idempotent for both fresh and previously initialized databases.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='admin_audit_logs'::regclass
      AND conname='admin_audit_logs_action_check'
      AND position('service.created' in pg_get_constraintdef(oid))=0
  ) THEN
    ALTER TABLE admin_audit_logs DROP CONSTRAINT admin_audit_logs_action_check;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='admin_audit_logs'::regclass AND conname='admin_audit_logs_action_check'
  ) THEN
    ALTER TABLE admin_audit_logs ADD CONSTRAINT admin_audit_logs_action_check
      CHECK(action IN ('order.status_changed','payment.reviewed','service.created','service.updated','service.disabled','payment_account.created','payment_account.updated','payment_account.disabled'));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='admin_audit_logs'::regclass
      AND conname='admin_audit_logs_entity_type_check'
      AND position('payment_account' in pg_get_constraintdef(oid))=0
  ) THEN
    ALTER TABLE admin_audit_logs DROP CONSTRAINT admin_audit_logs_entity_type_check;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='admin_audit_logs'::regclass AND conname='admin_audit_logs_entity_type_check'
  ) THEN
    ALTER TABLE admin_audit_logs ADD CONSTRAINT admin_audit_logs_entity_type_check
      CHECK(entity_type IN ('order','payment','service','payment_account'));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='admin_audit_logs'::regclass
      AND conname='admin_audit_logs_check'
      AND position('service.%' in pg_get_constraintdef(oid))=0
  ) THEN
    ALTER TABLE admin_audit_logs DROP CONSTRAINT admin_audit_logs_check;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='admin_audit_logs'::regclass AND conname='admin_audit_logs_entity_action_check'
  ) THEN
    ALTER TABLE admin_audit_logs ADD CONSTRAINT admin_audit_logs_entity_action_check
      CHECK(
        (action='order.status_changed' AND entity_type='order')
        OR (action='payment.reviewed' AND entity_type='payment')
        OR (action LIKE 'service.%' AND entity_type='service')
        OR (action LIKE 'payment_account.%' AND entity_type='payment_account')
      );
  END IF;
END $$;

COMMIT;
