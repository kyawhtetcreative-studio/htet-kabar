# HTET KABAR MVP — Phase 1 UI Starter

A lightweight, dependency-free runnable preview of the HTET KABAR digital service platform.

## Requirements
- Node.js 18+

## Run
```bash
npm start
```
Open http://localhost:3000

Health endpoint: http://localhost:3000/api/health

## Included in this first runnable phase
- Responsive customer landing page
- 8-service catalog from the project guideline
- Customer/Admin preview switch
- Admin catalog preview
- Node static server + health check

## Not connected yet
- Authentication / authorization
- Database and persistence
- Real order submission
- Payment integration and confirmation
- Admin CRUD and role permissions
- Notifications, messaging, queues, location features

## Planned production architecture
Next.js/React/TypeScript/Tailwind + NestJS REST API + PostgreSQL/Prisma + Redis + Docker, with staged migrations and backups before any production changes.
