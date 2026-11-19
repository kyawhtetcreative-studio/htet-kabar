# HTET KABAR

Burmese-language digital services website and management platform.

## Run locally
1. Install Node.js 18 or later.
2. Copy `.env.example` to `.env` and fill in database credentials and secrets.
3. Create a PostgreSQL database and set `DATABASE_URL`.
4. Generate a random `JWT_SECRET` of at least 32 characters.
5. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before first startup (admin account is seeded once).
6. Run `npm install`, then `npm start`.

## Render deployment
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NODE_ENV=production` in Render Environment settings.
- Attach a PostgreSQL database. Do not use temporary filesystem storage for customer/payment records.
- Keep secret values out of GitHub and screenshots.

## Backend milestone
- PostgreSQL-backed service catalog
- Seeded Burmese service categories/packages
- Admin login API with bcrypt password hashes and signed expiring JWT cookie
- Admin service create/update/deactivate endpoints
- Login rate limit and security headers
- Origin check on cookie-authenticated admin mutations

API endpoints currently available:
- `GET /api/health`
- `GET /api/services`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`
- `GET /api/admin/services`
- `POST /api/admin/services`
- `PUT /api/admin/services/:id`
- `DELETE /api/admin/services/:id`

## Not yet complete
Customer order/payment submission and tracking, payment verification, full admin UI, user accounts, file upload, notifications, backups, and deployment smoke testing remain to be implemented. Payment is manual verification only; no automatic payment claims.
