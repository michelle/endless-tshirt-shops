# datetime.store

A t-shirt printed with the exact millisecond you bought it. This is a
from-scratch, production-quality rebuild of the original [datetime.store](
https://github.com/michelle/datetime.store) (a 2020 Create React App + Express
demo). The joke is the same — `new Date().getTime()`, printed on a shirt —
but the stack, checkout, and fulfillment are new:

- **Next.js 16** (App Router, TypeScript, Tailwind CSS 4)
- **Stripe Checkout** (test mode) for payment
- **Prodigi Print API** (sandbox) for print-on-demand fulfillment, replacing
  the original's Scalable Press integration
- Deployed on **Vercel**

## How it works

1. `src/components/Store.tsx` renders a live, animated millisecond clock on a
   shirt mockup. The customer picks a style (Fitted / Unisex) and size.
2. Clicking **Buy now** freezes the clock at that instant and calls
   `POST /api/checkout`, which creates a Stripe Checkout Session for $22.50.
   The exact timestamp, style, and size travel along as session/PaymentIntent
   metadata.
3. `GET /api/artwork` renders the actual print artwork (via `next/og`) for a
   given timestamp — this is the same URL used for the Checkout line-item
   image *and* the file Prodigi prints, so what the customer saw is exactly
   what gets printed.
4. After payment, Stripe calls `POST /api/webhooks/stripe`
   (`checkout.session.completed`). The handler pulls the shipping address and
   metadata off the session and places an order with the Prodigi Print API
   sandbox, then stores the resulting Prodigi order ID back on the
   PaymentIntent's metadata.
5. `/success` polls `GET /api/order-status` until it can show the customer
   their Prodigi order ID.

Product catalog (`src/lib/products.ts`):

| Style  | Prodigi SKU          | Description                          |
| ------ | -------------------- | ------------------------------------- |
| Fitted | `GLOBAL-TEE-BC-6004`  | Bella + Canvas Women's Favourite tee   |
| Unisex | `GLOBAL-TEE-GIL-64000`| Gildan Softstyle unisex tee            |

Sizes S/M/L/XL, color black, $22.50 (struck through from $30, matching the
original).

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Required env vars (see `.env.example`):

- `STRIPE_SECRET_KEY` — a Stripe **test mode** secret key. Easiest path:
  `stripe login` then `stripe sandbox create` (or use an existing test key
  from the Dashboard).
- `STRIPE_WEBHOOK_SECRET` — for local dev, run
  `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and use the
  `whsec_...` it prints.
- `PRODIGI_API_KEY` — a Prodigi sandbox API key.
- `PRODIGI_API_BASE` — defaults to `https://api.sandbox.prodigi.com/v4.0`.

## Verifying the full purchase flow

With `npm run dev` and `stripe listen` both running:

1. Open the app, pick a style/size, click **Buy now**.
2. On the hosted Stripe Checkout page, pay with test card `4242 4242 4242
   4242`, any future expiry, any CVC, and a real-looking US address.
3. You'll land on `/success`. Within a few seconds it shows a Prodigi order
   ID — confirming Stripe → webhook → Prodigi all worked.
4. Check the Prodigi sandbox order: `GET
   https://api.sandbox.prodigi.com/v4.0/Orders/{id}` with header
   `X-API-Key: $PRODIGI_API_KEY`.

This exact flow (headless browser, real Stripe test-mode payment, real
webhook delivery, real Prodigi sandbox order) was used to verify the deployed
app before hand-off.

## Deploying

```bash
vercel link --yes -p <project-name>
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production   # see below
vercel env add PRODIGI_API_KEY production
vercel env add PRODIGI_API_BASE production
vercel --prod --yes
```

`STRIPE_WEBHOOK_SECRET` is tied to a specific webhook endpoint URL, so create
it *after* the first deploy, pointed at `https://<your-domain>/api/webhooks/stripe`,
then redeploy so the function picks up the secret:

```bash
stripe webhook_endpoints create \
  --url https://<your-domain>/api/webhooks/stripe \
  --enabled-events checkout.session.completed
```

## Going to production (real customers, real money)

1. Swap in live keys: a live Stripe secret key and `STRIPE_WEBHOOK_SECRET`
   from a live-mode webhook endpoint, plus a live Prodigi API key with
   `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`.
2. Complete Stripe's business/account verification (required before you can
   take live payments).
3. Fund/configure your Prodigi billing — sandbox orders are free and never
   ship; live orders are billed to your Prodigi account.
4. Add persistent storage (e.g. Postgres) keyed by Checkout Session ID before
   relying on this at scale — see **Known limitations** below.
5. Point a real domain at the Vercel project and update Stripe's webhook URL
   accordingly.

## Known limitations / assumptions

- **No database.** Order state lives entirely in Stripe (session + payment
  intent metadata) and Prodigi. This is fine for a demo/starting point but
  means there's no admin order list, and webhook retries rely on a metadata
  check (not a real idempotency ledger) to avoid double-submitting an order
  to Prodigi.
- **Shipping is a flat "Standard" method** to a fixed set of countries
  (`src/lib/products.ts`); no live shipping-rate calculation.
- **One color (black)** per style, matching the original's defaults.
- **No accounts/order history** for customers beyond the Stripe receipt
  email.
- Sandbox/test mode throughout: Stripe test-mode card payments are not real
  charges, and Prodigi sandbox orders are validated/priced but never
  produced or shipped.
