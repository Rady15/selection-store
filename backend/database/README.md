# Selection Database Layer

The application database layer is isolated here so the API is no longer coupled to `src/` UI code.

- `store.ts` is the compatibility repository used by the existing feature-rich application.
- PostgreSQL is the production durable store when `DATABASE_URL` is configured.
- `schema.sql` adds the production database foundation, payment ledger, Stripe event idempotency, and audit log tables.
- `data-store.json` is retained only as a local/dev seed and must not be treated as a production database.

Production requires PostgreSQL. The API refuses to start in `NODE_ENV=production` when `DATABASE_URL` is missing.
