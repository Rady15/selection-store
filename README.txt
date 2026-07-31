============================================================
 FURSAN SPECIALTY COFFEE ROASTERS - PUBLISH / DEPLOY GUIDE
============================================================

This file explains how to publish the store online (Vercel)
and how to turn on real Stripe payments.

------------------------------------------------------------
1) QUICK START (local development)
------------------------------------------------------------
1. Copy .env.example to .env
     cp .env.example .env
2. Install dependencies
     npm install
3. Run the dev server (http://localhost:3000)
     npm run dev

No Stripe keys set? The store runs in SANDBOX mode:
  - Checkout shows a "إتمام الدفع (محاكاة)" (simulated pay) button
  - No real charge is made
  - Visa/Apple Pay work; Mada/Tabby/Tamara keep the old "paid" flow;
    COD stays "pending"

------------------------------------------------------------
2) ENABLE REAL STRIPE PAYMENTS
------------------------------------------------------------
Stripe supports Visa / Mastercard / Apple Pay in Saudi Arabia.
(Mada / Tabby / Tamara are NOT supported by Stripe in KSA.)

A) Get keys from https://dashboard.stripe.com/apikeys
   - STRIPE_SECRET_KEY        -> sk_test_... or sk_live_...
   - VITE_STRIPE_PUBLISHABLE_KEY -> pk_test_... or pk_live_...

B) Webhook secret (needed so paid orders update automatically):
   - Install Stripe CLI: https://stripe.com/docs/stripe-cli
   - Run locally:
        stripe listen --forward-to localhost:3000/api/payments/webhook
   - Copy the whsec_... value it prints into STRIPE_WEBHOOK_SECRET

C) Add all three to .env, then restart the server.

D) Test with card number 4242 4242 4242 4242, any future expiry,
   any CVC. The order page should flip to "paid" automatically
   after payment (it polls the server every 2.5s for ~15s).

E) Go live later by switching to sk_live_/pk_live_ keys. Vercel:
   set the same vars in Project Settings > Environment Variables.

------------------------------------------------------------
3) PUBLISH ON VERCEL (free tier)
------------------------------------------------------------
Prerequisites:
  - Git repo with the project committed
  - Vercel account (https://vercel.com/signup)

Option A - Vercel dashboard (easiest):
  1. Push the project to GitHub.
  2. https://vercel.com/new -> Import your repo.
  3. Vercel detects vercel.json automatically:
       - buildCommand:  npm run build:vercel   (frontend only)
       - outputDirectory: dist
       - api/index.ts becomes a serverless function handling
         /api/* and /uploads/*
  4. In Settings > Environment Variables add (same values as .env):
       STRIPE_SECRET_KEY
       VITE_STRIPE_PUBLISHABLE_KEY
       STRIPE_WEBHOOK_SECRET
       JWT_SECRET            (use a long random string)
       GOOGLE_CLIENT_ID
       VITE_GOOGLE_CLIENT_ID
       GEMINI_API_KEY
       ADMIN_EMAIL
       ADMIN_PASSWORD
  5. Click Deploy.

Option B - Vercel CLI:
  npm i -g vercel
  vercel
  (follow the prompts; answer "Existing Project" > No
   for framework -> it will use vercel.json)
  vercel --prod

The files that make Vercel work:
  - vercel.json     routing: /api/* + /uploads/* -> serverless,
                    everything else -> /index.html (SPA)
  - api/index.ts    exports the Express app as a serverless function
  - .vercelignore   keeps data-store.json, .env, logs out of the build

------------------------------------------------------------
4) IMPORTANT - DATA PERSISTENCE ON VERCEL
------------------------------------------------------------
Vercel's filesystem is EPHEMERAL. On Vercel the database
(data-store.json) is written to /tmp and RESETS on every cold start.
Orders placed right before a cold start may be lost.

If you need durable data (production), switch the data layer to a
real database (e.g. Vercel Postgres, Upstash, or MongoDB Atlas).
Local development keeps using ./data-store.json as usual.

------------------------------------------------------------
5) RECOMMENDED SETTINGS FOR PRODUCTION
------------------------------------------------------------
- Use a custom domain in Vercel (Settings > Domains).
- Add the domain to Google OAuth "Authorized JavaScript Origins".
- Set Stripe keys to LIVE, add the live webhook endpoint
  https://<your-domain>/api/payments/webhook in the Stripe dashboard.
- Change ADMIN_PASSWORD and JWT_SECRET.
- If a payment succeeds but the confirmation page never updates,
  check Stripe Dashboard > Developers > Webhooks for delivery logs.

------------------------------------------------------------
6) USEFUL COMMANDS
------------------------------------------------------------
  npm run dev         local dev server on :3000
  npm run build       full build (frontend + server bundle for Node)
  npm run build:vercel  frontend-only build (used by Vercel)
  npm run lint        TypeScript type-check
  npm start           run the built Node server (dist/server.cjs)
