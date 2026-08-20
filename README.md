# Selection Specialty Coffee Roasters — Production Edition

This edition contains the storefront, admin dashboard and a hardened Node/Express backend.

## Structure

- `src/` — React storefront/admin UI
- `backend/` — production API
- `backend/database/` — persistence adapter and database foundation
- `backend/auth/` — password hashing
- `backend/middleware/` — authentication, authorization, rate limiting and audit
- `backend/commerce/` — server-authoritative checkout calculations
- `backend/integrations/` — payment/shipping adapters
- `public/` — brand assets and uploads mount
- `Dockerfile` — production image
- `docker-compose.production.yml` — app + PostgreSQL

## Local

```bash
cp .env.example .env
npm ci
npm run dev
```

## Production

```bash
cp .env.example .env
# Fill every required secret.
docker compose -f docker-compose.production.yml up -d --build
```

The API exposes `/api/health` for liveness and `/api/ready` for readiness.

Read `PRODUCTION_READY.md` before deploying.
