# HTET KABAR

Burmese-language digital services catalog, customer order/payment submission, tracking, and admin management platform.

## Features
- Burmese customer-facing service and package catalog
- Customer order submission with server-side service/package/price validation
- Manual payment details and transaction reference submission (payments are not automatically verified)
- Order tracking using order code + phone number
- Admin authentication, service/package and payment-account management, site settings, order review, and payment approve/reject
- PostgreSQL persistence, bcrypt password hashes, expiring HttpOnly admin cookies, login/order/payment rate limits, security headers, and same-origin checks on cookie-authenticated requests
- Local PostgreSQL custom-format backup and guarded restore utilities

## Local setup
1. Install Node.js 18+.
2. Copy `.env.example` to `.env` and set values locally.
3. Create a PostgreSQL database and set `DATABASE_URL`.
4. Generate a `JWT_SECRET` with at least 32 characters.
5. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` before first startup. Admin creation is seeded once; changing these environment variables later does not automatically change an existing admin password.
6. Run `npm ci`, then `npm start`.
7. Open `http://localhost:10000` (or the configured `PORT`). Admin control panel: `/admin`.

## Render deployment
- The root `render.yaml` defines a **new** Node web service (`htet-kabar-web`) and PostgreSQL database (`htet-kabar-db`) in Singapore, connected with Render's database reference. It is a template for a separate stack; it does not automatically reconfigure an existing manually-created service.
- **Existing-account warning (checked 2026-11-24):** the current Render account has a web service named `htet-kabar` and a PostgreSQL database named `htet_kabar_db` in Oregon. Those names/region do not match this Blueprint. Do not create this Blueprint unless you intentionally want a second stack; use the Manual alternative for the existing service or reconcile resource ownership/names first.
- Build command: `npm ci`; start command: `npm start`; health check: `/api/health`.
- The Blueprint generates `JWT_SECRET` and prompts for `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Use a strong admin password with at least 12 characters. Never commit secrets.
- Automatic deploys are disabled in the Blueprint; deploy from the Render Dashboard after reviewing changes.
- To create this separate stack: Render Dashboard → **New → Blueprint** → connect this repo and `main` → review the resources and environment values carefully → **Deploy Blueprint**.
- This Blueprint uses Free plans for a demo/testing setup. Render Free Postgres expires after 30 days and has no backups; do not store production customer/order/payment data there. For production, select a paid database plan and set up/verify backups before launch.
- The Blueprint does not confirm that a service is already deployed or provide a live URL until the user deploys it.

Manual alternative:
- For an existing service, configure its Node Web Service (not a Static Site), build command `npm ci`, start command `npm start`, health check `/api/health`, attach the intended PostgreSQL database, and set the same environment variables. Do not merge the backend PR until `DATABASE_URL` and `JWT_SECRET` are present; the current service auto-deploys from `main`.
- Use HTTPS in production. Never commit secrets or put credentials in screenshots.

## Admin
- Admin URL: `/admin`
- Login uses email and password; password hashes are bcrypt.
- Admin endpoints require a valid HttpOnly cookie.
- Cookie parsing safely handles malformed percent-encoding and special property names; duplicate cookie names keep the first value.
- Mutating requests require a matching HTTP(S) Origin host and protocol; malformed, missing, and cross-origin headers are rejected.
- Admin mutation and order/payment submission endpoints check same-origin requests.
- Customer tracking is rate-limited (20 attempts per IP per 15 minutes) and validates order code format before database lookup.
- Express trusts one reverse-proxy hop by default in production; set `TRUST_PROXY_HOPS` to a non-negative integer (0–10) only when the deployment topology requires a different value.
- Keep admin access private; logout when finished.

## API summary
- `GET /api/health`
- `GET /api/services`, `GET /api/payment-accounts`
- `POST /api/orders`
- `POST /api/orders/:code/payment`
- `GET /api/orders/:code?phone=...`
- `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me`
- Admin services: `GET/POST /api/admin/services`, `PUT/DELETE /api/admin/services/:id`
- Admin payment accounts: `GET/POST /api/admin/payment-accounts`, `PUT/DELETE /api/admin/payment-accounts/:id`
- Admin orders/payments: `GET /api/admin/orders`, `GET /api/admin/payments`, `GET /api/admin/payments/:id/receipt` (admin-only), `PATCH /api/admin/orders/:id/status`, `PATCH /api/admin/payments/:id/review`
- Admin settings: `GET/PUT /api/admin/site-settings`

## Payment account management
- Active payment accounts are loaded from PostgreSQL and displayed on the public website; account details are no longer embedded in the HTML or browser JavaScript.
- Admins can add, edit, enable, and disable KBZPay, UAB Pay, and AYA Bank accounts from the Admin Dashboard. Only one account per method can be active at a time.
- Public API responses include only active accounts and the fields needed for payment instructions. All account mutations require admin authentication and a same-origin request.
- The server accepts a payment submission only when an active account exists for the selected method. Payment verification remains manual.
- The application creates the `payment_accounts` table at startup if it does not exist. The equivalent idempotent SQL is available at `database/migrations/003_payment_accounts.sql`; run it after migrations 001 and 002 on manually-managed PostgreSQL/Supabase installations.
- After deployment, sign in at `/admin` and add/confirm the current receiving account details. Until at least one active account is configured, customers see a setup message and cannot submit payment details.

## Payment submission validation
- Customer payment submissions require a supported method (KBZPay, UAB Pay, or AYA Bank), a non-empty transaction reference, six numeric receipt digits, and a real calendar date / 24-hour time.
- The server normalizes submitted fields and rejects invalid values before database access. The browser also marks the transaction-reference field as required, but server validation is authoritative.
- Payment status is reviewed manually by an admin. A submitted reference is not proof of payment and is never auto-approved.
- Customers may optionally attach a PNG/JPEG/WebP payment receipt image (maximum 1MB) alongside the transaction reference. The server checks the declared type, canonical base64 encoding, size, and file signature before storing the binary in PostgreSQL.
- Receipt bytes are excluded from payment-list and payment-review JSON responses. Only authenticated admins can view a receipt through `GET /api/admin/payments/:id/receipt`; the route sends a private, non-cacheable image response with `nosniff`.
- PostgreSQL backups include receipt images because they are stored in the `payments` table. Keep backups encrypted and access-controlled; receipt storage increases database size.
- Payment verification remains manual. A receipt image or transaction reference is submitted evidence only and never triggers automatic approval.

## Validation
- `npm run check` runs syntax checks for the server, browser app, admin and database scripts, and all shared validation/security modules.
- Admin service/package create and update endpoints validate trimmed text fields, lowercase slug format, icon size, active flag type, 1–25 packages, duplicate package names, package descriptions, and nonnegative Kyat prices with at most two decimals within the PostgreSQL numeric range. Invalid input returns HTTP 400 before the database write.
- Payment input is validated server-side, including supported payment method, transaction reference, six receipt digits, and valid date/time.
- `npm test` covers database health behavior, proxy configuration, request-cookie parsing, same-origin validation, service/package input, payment input, payment-receipt image validation, and PostgreSQL backup/restore command safety.
- GitHub Actions runs `npm ci`, `npm run check`, and `npm test` on pushes and pull requests to `main`.
- `/api/health` executes `SELECT 1` and returns HTTP 503 with a generic database-unavailable response if the query fails; it does not disclose connection details.
- Unit tests and syntax checks are not a substitute for an end-to-end test against a configured PostgreSQL database and deployed service.

## Payment receipt storage
- Receipt images are optional and limited to 1MB in PNG, JPEG, or WebP format. Server-side validation checks canonical base64 and the matching file signature before writing the image to PostgreSQL `BYTEA` columns.
- The public payment form sends the receipt image with the transaction reference. The admin payment list exposes only a `has_receipt` flag; receipt bytes are available only from the authenticated admin receipt endpoint and are never included in list or review JSON.
- Receipt storage uses PostgreSQL space and is included in database backups. Keep backups encrypted/off-device and monitor database size. Receipt images are supporting evidence only; admins must verify payments manually.

## Operations / PostgreSQL backup and restore

### Requirements
- Install PostgreSQL client tools (`pg_dump` and `pg_restore`) on the computer that will run the backup. Use PostgreSQL 18 client tools for the current Render PostgreSQL 18 database, or a compatible newer client.
- Confirm both commands are on `PATH` with `pg_dump --version` and `pg_restore --version`.
- Set `DATABASE_URL` in the local, untracked `.env` file. For a computer outside Render, use the database's **External Database URL** from the Render database dashboard, not its internal-only URL. Do not paste the URL into chat, screenshots, or source control.
- The backup scripts read `.env` locally. They pass database credentials to PostgreSQL client tools through environment variables rather than command-line arguments and do not print the connection URL.

### Create a backup

```powershell
npm run db:backup
```

- Creates `backups/htet-kabar-<UTC timestamp>.dump` in PostgreSQL custom archive format.
- Refuses to overwrite an existing backup and creates the file with restrictive permissions where the operating system supports them.
- Runs `pg_restore --list` after `pg_dump` to verify the archive can be read. This is an archive-integrity check, not a full database restore rehearsal.
- `backups/` and `*.dump` are ignored by Git. Copy the verified dump to a separate encrypted/off-device location; a local-only copy is not sufficient protection.
- Backups are manual; no scheduled backup job is configured by this repository.

### Restore a backup (destructive)

Restore only to a separate test database first. The restore command drops existing objects in the selected target database before recreating them. It requires both a temporary environment gate and an exact database-name confirmation:

```powershell
$env:ALLOW_DATABASE_RESTORE = 'YES'
npm run db:restore -- --file "backups\htet-kabar-YYYYMMDDTHHMMSSZ.dump" --confirm-database "htet_kabar_db"
Remove-Item Env:ALLOW_DATABASE_RESTORE
```

- The `--confirm-database` value must exactly match the database name in `DATABASE_URL` (the current Render database name is `htet_kabar_db`; use the exact name shown in your own URL if it differs).
- The tool checks that the archive is readable before starting the restore and uses a single transaction with `--exit-on-error`.
- Never run this against the live customer database unless a restore is explicitly intended, a separate verified backup exists, and the target database name has been checked. Prefer rehearsing on a newly created empty test database.
- A successful archive listing does not prove that a restore will succeed; perform a real restore rehearsal against a separate test database before production launch.

### Production operations still required
- The current Render Free PostgreSQL plan is temporary, has no managed backups, and is scheduled to expire on **2026-12-21**. Upgrade to a suitable paid database plan before storing live customer/order/payment data, and confirm retention/backup settings in Render.
- Before database maintenance or risky changes, take a PostgreSQL backup and verify a restore to a separate test database.
- Deployment smoke test, live domain verification, backup/restore rehearsal, and production security review are still required.

## Supabase setup (optional alternative)
1. In Supabase, open SQL Editor and run `database/migrations/001_admin_auth.sql`, `database/migrations/002_payment_integrity.sql`, `database/migrations/003_payment_accounts.sql`, then `database/migrations/004_payment_receipts.sql`. These migrations add the admin, payment integrity, payment account, and optional receipt-storage structures without deleting or truncating existing orders, payments, customers, or services. The payment integrity migration prevents an order from having more than one pending payment record.
2. In the hosting provider, set `DATABASE_URL` to the Supabase PostgreSQL connection string. Supabase/direct or pooler URLs that use SSL are supported.
3. Set a random `JWT_SECRET` with at least 32 characters.
4. Set `NODE_ENV=production`.
5. Restart the Node service after the environment values are saved.

## Admin account setup/reset
The server does not contain a default password and never prints one.

- Initial setup: set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` locally or in the deployment shell, then run `npm run admin:setup`.
- Password reset: set `ADMIN_EMAIL` and the replacement `ADMIN_PASSWORD`, then run `npm run admin:reset`.
- `setup` creates the account only when it does not already exist. `reset` changes only that account's password hash.
- A password must contain at least 12 characters. Keep `ADMIN_PASSWORD` in environment/secrets, not in source files or SQL.
- Existing startup seeding creates an account only when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured; it does not reset an existing account.

## Customer Google OAuth Login
- Customer sign-in is implemented with Google OAuth authorization code flow; Google login remains disabled until the OAuth credentials are configured in Render.
- Create a Google OAuth client in Google Cloud Console. Authorized redirect URI must exactly match `GOOGLE_REDIRECT_URI` (for production, e.g. `https://YOUR_DOMAIN/auth/google/callback`).
- Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in Render Environment. Never commit these values.
- OAuth state is stored in a short-lived HttpOnly cookie and checked at callback. Email must be verified by Google. Customer sessions use HttpOnly, SameSite=Lax cookies, and Secure in production. Customer accounts are stored in PostgreSQL by provider ID.
- Customer endpoints: `GET /api/customer/me`, `POST /api/customer/logout`. Google login start: `/auth/google/start`.
- Facebook login is not included in this milestone; it requires a separate Meta app and OAuth setup.
