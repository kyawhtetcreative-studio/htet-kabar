# HTET KABAR

Burmese-language digital services catalog, customer order/payment submission, tracking, and admin management platform.

## Features
- Burmese customer-facing service and package catalog
- Customer order submission with server-side service/package/price validation
- Manual payment details and transaction reference submission (payments are not automatically verified)
- Order tracking using order code + phone number
- Admin authentication, service/package management, site settings, order review, and payment approve/reject
- PostgreSQL persistence, bcrypt password hashes, expiring HttpOnly admin cookies, login/order/payment rate limits, security headers, and same-origin checks on cookie-authenticated requests

## Local setup
1. Install Node.js 18+.
2. Copy `.env.example` to `.env` and set values locally.
3. Create a PostgreSQL database and set `DATABASE_URL`.
4. Generate a `JWT_SECRET` with at least 32 characters.
5. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` before first startup. Admin creation is seeded once; changing these environment variables later does not automatically change an existing admin password.
6. Run `npm ci`, then `npm start`.
7. Open `http://localhost:10000` (or the configured `PORT`). Admin control panel: `/admin`.

## Render deployment (Blueprint recommended)
- A root `render.yaml` now defines a Node web service and PostgreSQL database in Singapore, connected with Render's database reference.
- Build command: `npm ci`; start command: `npm start`; health check: `/api/health`.
- The Blueprint generates `JWT_SECRET` and prompts for `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Use a strong admin password with at least 12 characters. Never commit secrets.
- Automatic deploys are disabled in the Blueprint; deploy from the Render Dashboard after reviewing changes.
- To deploy: Render Dashboard → **New → Blueprint** → connect this repo and `main` → review the resources and environment values → **Deploy Blueprint**.
- This Blueprint uses Free plans for a demo/testing setup. Render Free Postgres expires after 30 days and has no backups; do not store production customer/order/payment data there. For production, select a paid database plan and set up/verify backups before launch.
- The Blueprint does not confirm that a service is already deployed or provide a live URL until the user deploys it.

Manual alternative:
- Create a Node Web Service (not a Static Site), build command `npm ci`, start command `npm start`, attach PostgreSQL, and set the same environment variables.
- Use HTTPS in production. Never commit secrets or put credentials in screenshots.

## Admin
- Admin URL: `/admin`
- Login uses email and password; password hashes are bcrypt.
- Admin endpoints require a valid HttpOnly cookie.
- Admin mutation and order/payment submission endpoints check same-origin requests.
- Customer tracking is rate-limited (20 attempts per IP per 15 minutes) and validates order code format before database lookup.
- Keep admin access private; logout when finished.

## API summary
- `GET /api/health`
- `GET /api/services`
- `POST /api/orders`
- `POST /api/orders/:code/payment`
- `GET /api/orders/:code?phone=...`
- `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me`
- Admin services: `GET/POST /api/admin/services`, `PUT/DELETE /api/admin/services/:id`
- Admin orders/payments/settings: `GET /api/admin/orders`, `GET /api/admin/payments`, `PATCH /api/admin/orders/:id/status`, `PATCH /api/admin/payments/:id/review`, `GET/PUT /api/admin/site-settings`

## Validation
- `npm run check` runs syntax checks for `server.js` and `public/app.js`.
- GitHub Actions runs `npm ci` and `npm run check` on pushes and pull requests to `main`. A full lockfile is checked in so CI and local installs can use reproducible dependency versions.
- Syntax checks are not a substitute for an end-to-end test against a configured PostgreSQL database and deployed service.

## Operations / backup
- Payment confirmation is manual: inspect the payment details in Admin and approve or reject; no automatic payment verification is claimed.
- Before database maintenance or risky changes, take a PostgreSQL backup using your provider's backup facility or `pg_dump`, and verify you can restore it.
- Deployment smoke test, live domain verification, database backup/restore rehearsal, and production security review are still pending.

## Supabase setup
1. In Supabase, open SQL Editor and run `database/migrations/001_admin_auth.sql`, then `database/migrations/002_payment_integrity.sql`. These migrations only create missing tables and indexes; they do not delete or truncate orders, payments, customers, or services. The payment migration prevents an order from having more than one pending payment record.
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
