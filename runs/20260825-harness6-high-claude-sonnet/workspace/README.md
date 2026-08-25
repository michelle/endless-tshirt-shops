# datetime.store

We sell a t-shirt with the current datetime. The exact date, time, and
millisecond you check out becomes the print — frozen forever, never repeated.

A rebuild of the original [datetime.store](https://github.com/michelle/datetime.store)
(Create React App + Scalable Press) on Next.js, with **Stripe Checkout** for
payment and **Prodigi** for print-on-demand fulfillment in place of the
original Scalable Press integration.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS 4**
- **Stripe Checkout Sessions** — hosted, PCI-compliant payment, free
  worldwide shipping, address collection, Apple/Google Pay out of the box
- **Stripe webhooks** (`checkout.session.completed`) trigger fulfillment
- **Prodigi Print API** (sandbox) — creates the real print/ship order
- **`next/og`** — generates the print-ready artwork PNG on the fly from the
  frozen timestamp, so no database is needed to reproduce it later

## How an order flows

1. The storefront (`components/Storefront.tsx`) shows a live-ticking t-shirt
   mockup (`components/ShirtPreview.tsx`) with the style/size picker.
2. "Buy now" freezes the current timestamp client-side and POSTs it to
   `/api/checkout`, which creates a Stripe Checkout Session with that
   timestamp in `metadata` and redirects to Stripe's hosted page.
3. On successful payment, Stripe calls `/api/webhooks/stripe`. It verifies
   the signature, then builds a print artwork URL
   (`/api/artwork?date=...&time=...&tz=...`) encoding the frozen timestamp,
   and creates a Prodigi order (`lib/prodigi.ts`) shipping to the address
   Stripe collected. The Stripe session id is used as both
   `merchantReference` and `idempotencyKey`, so retried webhook deliveries
   never create duplicate print orders.
4. `/success` reads the Checkout Session directly (no DB) and shows the
   order summary immediately, without waiting on the webhook.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Required env vars (see `.env.example`):

| Var | Where to get it |
| --- | --- |
| `STRIPE_SECRET_KEY` | `stripe sandbox create` (or your Stripe test key) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | same sandbox/account |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` while developing, or `stripe webhook_endpoints create` for a deployed URL |
| `PRODIGI_API_KEY` | your Prodigi sandbox/live API key |
| `PRODIGI_ENVIRONMENT` | `sandbox` (default) or `live` |

To forward Stripe webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# paste the whsec_... it prints into STRIPE_WEBHOOK_SECRET, restart `npm run dev`
```

### End-to-end smoke test

`scripts/e2e.mjs` drives a real Stripe test-card purchase through the actual
UI with Playwright, from the storefront through Stripe Checkout to the
success page:

```bash
npm i -D playwright && npx playwright install chromium
BASE_URL=http://localhost:3000 node scripts/e2e.mjs   # or your deployed URL
```

## Deploying

```bash
vercel --yes --name your-project-name
vercel env add STRIPE_SECRET_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add PRODIGI_API_KEY production
vercel env add PRODIGI_ENVIRONMENT production
vercel --prod --yes --name your-project-name   # redeploy with the env vars applied
```

Then point a Stripe webhook at `https://<your-domain>/api/webhooks/stripe`
for the `checkout.session.completed` event and use its signing secret for
`STRIPE_WEBHOOK_SECRET`.

## Product catalog (`lib/products.ts`)

| Style | Prodigi SKU | Garment |
| --- | --- | --- |
| Fitted | `GLOBAL-TEE-BC-6004` | Women's Favourite T-shirt, Bella + Canvas 6004 |
| Unisex | `GLOBAL-TEE-GIL-64000` | Unisex Softstyle T-shirt, Gildan 64000 |

Both print black, sizes S–XL, $22.50 (was $30.00), free worldwide shipping.
