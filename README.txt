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
  - Visa/Apple Pay work through Stripe; COD stays "pending"

------------------------------------------------------------
2) ENABLE REAL STRIPE PAYMENTS
------------------------------------------------------------
Stripe supports Visa / Mastercard / Apple Pay in Saudi Arabia.
(Mada / COD are handled outside Stripe: Mada keeps the "paid" flow;
COD keeps the "pending" flow.)

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
4) REQUIRED - DURABLE DATABASE ON VERCEL (Vercel KV)
------------------------------------------------------------
Vercel's filesystem (/tmp) is per-instance and RESETS on cold starts.
Without a real database, checkout breaks: the order is written to one
instance, then the PaymentIntent request lands on another instance and
returns "Order not found" (404).

The app supports Vercel KV (Upstash Redis) out of the box — the whole
store lives under a single key, and every API request re-syncs from it.

Setup:
  1. Vercel Dashboard > Storage > Create > KV -> create a store
     (Hobby/Pro plans include free KV).
  2. Connect it to the project; Vercel automatically injects these vars:
       KV_REST_API_URL
       KV_REST_API_TOKEN
  3. Redeploy. The first request seeds the store, then it stays durable.

(Plain Upstash Redis also works: use UPSTASH_REDIS_REST_URL and
 UPSTASH_REDIS_REST_TOKEN instead.)

Without KV configured, the app falls back to /tmp/data-store.json —
fine for local dev, but live orders may be lost on Vercel. A real
relational DB (Vercel Postgres, Neon, MongoDB Atlas) also works if you
prefer to migrate the data layer instead.

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

------------------------------------------------------------
7) TROUBLESHOOTING CONSOLE WARNINGS
------------------------------------------------------------
- The app sets NO Content-Security-Policy header. If Chrome logs
  "Refused to load ... because it violates ... font-src 'none'" /
  "style-src 'self'" (Stripe's Mulish fonts), that policy is injected
  by a BROWSER EXTENSION (e.g. an extension whose background script is
  named injectScriptAdjust.js), not by this site. Try an incognito
  window with extensions disabled to confirm.
- "Each child in a list should have a unique key" — already resolved
  in source; clear cache / hard-reload after deploying.
- The Vite "WebSocket failed" errors only appear when running the
  dev server; they never appear on the Vercel production build.

