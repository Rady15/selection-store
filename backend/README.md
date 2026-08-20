# Selection Backend

Production API, authentication, payment orchestration, shipping integration and persistence adapters.

## Security changes

- Signed JWT authentication with 12-hour expiry and issuer/audience checks.
- Server-side admin authorization for every `/api/admin/*` route.
- Password hashing with Node.js `scrypt`; legacy plaintext passwords are migrated after successful login.
- Customer responses never expose `password` or `password_hash`.
- Server-authoritative product pricing, variants, stock, coupons, loyalty, VAT, shipping and COD surcharge.
- Stripe amount/currency verification before an order is created.
- Sandbox payments are disabled in production unless explicitly enabled.
- Uploads are admin-only and restricted to safe image MIME types/extensions.
- Rate limiting on authentication, payments and tracking endpoints.
- Security headers, body-size limits and production environment validation.
- Public order tracking exposes status/tracking metadata only, never customer address or order contents.

## Production requirement

Set every variable in `.env.example`. Never commit `.env`, secrets, database credentials or payment keys.
