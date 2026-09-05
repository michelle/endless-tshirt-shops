# datetime.store

A whimsical rebuild of [datetime.store](https://github.com/michelle/datetime.store) — the
t-shirt store that sells exactly one design: the current datetime, printed the instant you
check out. This version adds four live-animated art themes, a real garment preview, and a
modern fulfillment stack (Stripe Checkout + Prodigi Print API) in place of the original
Scalable Press integration.

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind** — single Vercel project, no separate
  Express server (the original's `server/index.js` is fully replaced by Next route handlers).
- **Canvas** renders the live "frozen moment" artwork client-side, in four themes
  (Midnight Terminal, Cotton Candy Sky, Starfield, Extra Edition) — see `components/themes.ts`.
- **Vercel Blob** stores the final print-resolution artwork (uploaded directly from the
  browser via `@vercel/blob/client`, bypassing serverless request-body limits).
- **Stripe Checkout** (hosted, test mode) handles payment + shipping address collection.
- **Prodigi Print API** (sandbox) receives the order via a Stripe webhook and prints/ships a
  real Gildan 64000 / 64000L tee with the uploaded artwork as a full-bleed front print.

No database: order state lives in the Stripe Checkout Session (`metadata`) and the resulting
PaymentIntent (`metadata.prodigiOrderId` / `metadata.fulfillmentError`), which the success page
polls via `/api/order-status`.

## Flow

1. `/` — customer picks a theme/fit/color/size/timezone/clock format; a `<canvas>` ticks live.
2. Click **Freeze this moment & check out** →
   - one final frame is rendered at full Prodigi print resolution (4665×5844)
   - exported as JPEG and uploaded straight to Vercel Blob (public)
   - `POST /api/checkout` creates a Stripe Checkout Session (price, product image = artwork
     URL, metadata = fit/color/size/theme/artworkUrl)
   - browser redirects to Stripe
3. Stripe fires `checkout.session.completed` → `POST /api/webhooks/stripe`:
   - verifies the signature
   - maps fit/color/size → Prodigi SKU + attributes (`lib/catalog.ts`)
   - calls Prodigi `POST /v4.0/Orders` with the recipient address + artwork URL
   - stores the resulting `prodigiOrderId` (or error) on the PaymentIntent's metadata
4. `/success` polls `/api/order-status?session_id=…` until it sees a Prodigi order id or error.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in real values, see below
npm run dev
```

`vercel env pull .env.local` will also work since all secrets are already set on the linked
Vercel project (see below).

## What's already configured on Vercel

- Project: `$BENCHMARK_VERCEL_PROJECT`, linked via `vercel link`.
- A public Vercel Blob store, connected to the project (`BLOB_READ_WRITE_TOKEN` auto-injected).
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — a **claimable Stripe sandbox**
  created via `stripe sandbox create` (test mode only, no real card ever gets charged).
  **Claim it** (so it doesn't expire / becomes yours): see the claim URL in the final chat
  message. Until claimed it expires ~7 days after creation.
- `PRODIGI_API_KEY` / `PRODIGI_API_BASE` — the sandbox key provided for this task
  (`api.sandbox.prodigi.com`); Prodigi sandbox orders are simulated and never actually printed
  or charged.
- `STRIPE_WEBHOOK_SECRET` — a webhook endpoint was created via the Stripe API pointing at this
  deployment's `/api/webhooks/stripe`.

## Testing it yourself

1. Open the deployed URL, build a shirt, click **Freeze this moment & check out**.
2. On the Stripe test Checkout page, use card `4242 4242 4242 4242`, any future expiry, any
   CVC, any ZIP, and any shipping address.
3. You'll land on `/success`. Within a few seconds it should show `✅ Sent to print — order
   ord_…` — that means the webhook fired and Prodigi accepted the order in its sandbox.
4. To inspect what Prodigi received: `GET https://api.sandbox.prodigi.com/v4.0/Orders/<id>`
   with header `X-API-Key: $PRODIGI_API_KEY`.
5. To inspect the Stripe side: the Stripe sandbox dashboard (via the claim URL) →
   Payments / Webhooks / Logs, all in test mode.

## Known gaps / what to do next

- **Stripe sandbox is claimable, not permanent.** Claim it via the URL shared in chat, or swap
  in your own Stripe account's test keys (`vercel env add STRIPE_SECRET_KEY …` etc., then
  recreate the webhook endpoint pointing at your domain and update
  `STRIPE_WEBHOOK_SECRET`).
- **Country coverage is curated, not exhaustive.** `ALLOWED_COUNTRIES` in
  `app/api/checkout/route.ts` is a reasonable subset of where Prodigi can ship the chosen SKUs
  — it hasn't been cross-checked against every country in Prodigi's `shipsTo` list per
  color/size combination, so an edge-case address could still be rejected by Prodigi at
  fulfillment time (surfaced as `fulfillmentError` on `/success`, not currently emailed anywhere).
- **No retry/alerting on fulfillment failure.** If Prodigi rejects an order (bad address,
  SKU/color/size mismatch, etc.), the failure is recorded on the PaymentIntent metadata and
  logged, but nothing notifies a human — for a real store you'd want this in a queue with
  retries and an ops alert, not just a webhook best-effort call.
- **No order history / admin view.** There's intentionally no database; every "order lookup"
  goes through the Stripe API by session id. Fine for a demo, not a substitute for a real
  order management system at higher volume.
- **Prodigi shipping cost isn't itemized.** The flat $32 assumes shipping is baked in; real
  shipping cost varies by destination and Prodigi's `shippingMethod: "Standard"` is hardcoded.
- **No automated test suite.** Verified manually end-to-end (see below) rather than with CI.

## What was actually verified before hand-off

- Production deploy is live and publicly reachable (no Vercel deployment protection).
- Real browser run (Playwright): loads with zero console/page errors, canvas renders and
  animates, all four themes and fit/color/size controls work, clicking checkout uploads
  artwork to Blob and redirects to a real Stripe Checkout session.
- A hand-signed synthetic `checkout.session.completed` webhook event was sent to the deployed
  `/api/webhooks/stripe` and confirmed (via Prodigi's Orders API) that it created a real
  sandbox Prodigi order with the correct recipient, SKU, color/size attributes, and artwork URL.
- `/api/order-status` confirmed working against a live Stripe Checkout Session.

What was **not** run: an actual full manual click-through of Stripe's hosted card form (step
2 in "Testing it yourself" above) — do that once to see the real webhook fire end-to-end from
a genuine payment rather than the synthetic one used above.
