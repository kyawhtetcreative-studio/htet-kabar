# HTET KABAR Operations Runbook

This runbook documents safe deployment, database, backup, and recovery procedures for the existing HTET KABAR Render stack. It contains no credentials or customer/payment records.

## Existing Render stack (verified 2026-11-26)

- Web service: `htet-kabar`, Node runtime, Oregon, Free plan.
- Database: `htet_kabar_db`, PostgreSQL 18, Oregon, Free plan.
- The web service deploys from `main` and has automatic deploys enabled.
- The database is currently marked available, but its external IP allowlist is empty.
- The Free database is scheduled to expire on **2026-12-21**. Treat this as a hard migration/backup deadline.
- The existing service is public; the database should not be made publicly reachable.

The repository's root `render.yaml` describes a separate stack with different resource names in Singapore. **Do not apply that Blueprint to the existing Oregon resources** unless a second stack is intentionally being created and reviewed.

## Current deployment blocker (verified 2026-11-26)

The last successful Render deploy still points to an older commit than the current `main` branch. Attempts to deploy the newer `main` commit ended with a non-zero process exit. Application logs from 2026-11-25 report that database/admin secret configuration is missing and the running instance is in static-preview mode, with API data features unavailable.

The hardened backend in this PR requires:

- `DATABASE_URL`: the existing database's **Internal Database URL** for the Render web service.
- `JWT_SECRET`: a randomly generated secret of at least 32 characters.

Do not paste either value into GitHub, source files, screenshots, or chat. Add them only in the Render service's Environment page. Use Render's database connection reference/selector where available so the internal URL is not copied through an exposed channel.

The service also supports first-time admin seeding:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` (at least 12 characters)

These are only used to create an admin when that email does not already exist. The seed uses `ON CONFLICT DO NOTHING`; changing these environment variables does **not** reset an existing admin password. Do not run `npm run admin:reset` or change credentials without explicit approval.

Adding or changing environment variables can restart/redeploy the service. Because automatic deploys from `main` are enabled, do not merge this PR or save production environment changes until the owner has approved the production maintenance window and reviewed the values privately.

After the backend is deployed, configure the Render health-check path as `/api/health`. The endpoint performs `SELECT 1` and returns HTTP 503 when PostgreSQL is unavailable.

## Database access and allowlist

- Application-to-database traffic should use the Internal Database URL from the Render service in the same region.
- The database external IP allowlist is empty. The hosted Render MCP connection cannot reach it because its source IP is not currently allowlistable.
- Do **not** set the database allowlist to `0.0.0.0/0`.
- For a local Windows backup, use the External Database URL only in an untracked local `.env`, and allowlist only the computer's current public IPv4 address as a `/32` temporarily. Remove that temporary entry after the backup. Alternatively, run the Render MCP connection locally from an allowlisted machine.
- Never print connection URLs in terminal output or commit a real `.env`.

## Local validation

Use Node.js 20 (or a supported newer LTS) and run:

```powershell
npm ci
npm run check
npm test
```

The latest verified GitHub Actions run for PR #1 (run #83, 2026-11-25) completed `npm ci`, `npm run check`, and `npm test` successfully: **71 tests passed, 0 failed**. CI success does not prove that the deployed service can connect to the live database.

## Backup and recovery

The PR adds:

- `npm run db:backup`: creates a timestamped PostgreSQL custom-format archive and verifies it with `pg_restore --list`.
- `npm run db:restore`: guarded restore utility requiring `ALLOW_DATABASE_RESTORE=YES` and an exact target database-name confirmation.

Requirements and safeguards:

1. Install PostgreSQL 18 client tools (`pg_dump` and `pg_restore`) or a compatible newer version.
2. Set `DATABASE_URL` only in a local, untracked `.env`.
3. Run `npm run db:backup` and confirm the archive is non-empty and passes the archive-list check.
4. Move the backup to encrypted storage outside the repository and restrict access. Do not commit backups.
5. Rehearse restore only against a separate disposable test database. Never use the production database as a restore target during a rehearsal.
6. Record the backup timestamp, archive checksum, and restore-test result without recording credentials or customer data.

The current Free PostgreSQL plan does not provide a durable production backup/retention guarantee and expires on 2026-12-21. Upgrade or migrate to a suitable paid database and verify backup retention before storing live customer, order, payment, or receipt data. No live backup or restore rehearsal is claimed by this runbook.

## Payment and order safety

- Payment verification is manual. A transaction reference or uploaded receipt is evidence only; it must never auto-approve a payment.
- Admin approval is the only path that marks a payment as paid.
- Order transitions to approved/completed require the payment status to be paid.
- Use synthetic test records for end-to-end testing. Do not inspect or reuse real customer/payment records for tests.

## Release checklist

Before a production release:

- [ ] Owner approves the maintenance/release window.
- [ ] Existing Render service and database are confirmed; do not create a duplicate Blueprint stack.
- [ ] `DATABASE_URL` uses the Internal Database URL and `JWT_SECRET` is present and sufficiently random.
- [ ] Admin account seeding is understood; existing credentials are not overwritten.
- [ ] `npm run check` and `npm test` pass on the exact release commit.
- [ ] Database backup is created, stored securely, and its archive listing is verified.
- [ ] A restore rehearsal has succeeded on a separate test database.
- [ ] Render health check is set to `/api/health`.
- [ ] Admin login, dashboard, order submission, payment submission, and manual approval are tested with synthetic data.
- [ ] Security review and rollback plan are complete.
- [ ] Production deployment is explicitly approved.

## AI agent integration status

Gemini AI and n8n integration, agent permissions, tool execution, and the Admin AI Control Center are **planned, not implemented or verified** in this run. Implement them only after the backend/database and release foundations are stable. Require explicit admin approval for payments, refunds, credential changes, destructive database actions, and production deployments.
