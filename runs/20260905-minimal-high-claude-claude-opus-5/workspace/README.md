# datetime.store

A rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store):
we sell a t-shirt with the current datetime. You pick a cut and a size, press
Buy, and the exact millisecond you pressed it is printed on the chest.

The original was Create React App + Express, charging through Stripe's legacy
token API and fulfilling through Scalable Press. This one is Next.js on Vercel,
paying through Stripe PaymentIntents + Elements, and printing through the
**Prodigi Print API v4**.

## How it works

```
browser                     this app                         Stripe        Prodigi
   │ POST /api/checkout ──────▶ create PaymentIntent ──────────▶
   │◀── clientSecret
   │ (pick cut + size, fill address + card)
   │ press Buy → freeze Date.now()
   │ POST /api/checkout/prepare ▶ quote the print job ─────────────────────▶
   │                             stash order on the PI ───────▶
   │ stripe.confirmPayment ─────────────────────────────────────▶
   │ POST /api/orders/confirm ──▶ fulfil ──────────────────────────────────▶ order
   │ GET  /api/orders/status  ──▶ (read-only poll)
                                 ◀── payment_intent.succeeded ── webhook ──▶ fulfil
```

### Three ideas hold this up

**The artwork is a pure function of the timestamp.** `/api/artwork?ts=…&w=…&sig=…`
renders a transparent 3600×4800 PNG (12×16 in at 300 DPI) with the timestamp set
8 inches wide, 3 inches down, horizontally centred — the same geometry the
original sent to Scalable Press. Because the render is deterministic, there is
nothing to upload and nothing to store: Prodigi fetches that URL directly at
print time, and the browser preview draws the identical layout from the same
spec in `lib/artwork.ts`. URLs are HMAC-signed so the endpoint is not an open
render farm.

**An order is a PaymentIntent.** No database. The frozen timestamp, cut, size and
shipping address live in the PaymentIntent's metadata; the Prodigi order id is
written back to the same place. One durable, auditable record, no extra
infrastructure and nothing to keep in sync.

**Fulfilment is guarded twice.** The webhook and the buyer's own confirmation can
arrive at the same instant, and printing two shirts for one payment is the worst
bug this app could have. So `lib/fulfillment.ts` takes a claim lease in the
PaymentIntent's metadata (write a token, let concurrent writes settle, re-read —
exactly one token survives), *and* asks Prodigi whether an order already exists
for this PaymentIntent before creating one. Polling is done against a
read-only endpoint so the buyer's browser is never a repeat racer.

## Catalogue

| Cut | Prodigi SKU | Blank |
| --- | --- | --- |
| `fitted` | `GLOBAL-TEE-BC-6004` | Bella + Canvas 6004 Women's Favourite, black |
| `unisex` | `GLOBAL-TEE-BC-3001` | Bella + Canvas 3001 Unisex Classic, black |

$22.50 (from $30.00), free shipping, sizes S–XL — the original's pricing.

## Running it

```bash
npm install
cp .env.example .env.local     # fill in your keys
npm run dev
```

For webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

`GET /api/health` reports which pieces of configuration are present.

## Environment

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server-side Stripe calls |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Elements in the browser |
| `STRIPE_WEBHOOK_SECRET` | Verifies `/api/webhooks/stripe` |
| `PRODIGI_API_KEY` | Prodigi Print API |
| `PRODIGI_API_URL` | `https://api.sandbox.prodigi.com/v4.0` or the live equivalent |
| `ARTWORK_SIGNING_SECRET` | Signs print-asset URLs |
| `NEXT_PUBLIC_SITE_URL` | Public origin Prodigi fetches assets from |

## Layout

```
app/
  page.tsx                     the store
  api/artwork/                 deterministic print PNG
  api/checkout/                open a PaymentIntent
  api/checkout/prepare/        validate + quote + attach the order
  api/orders/confirm/          fulfil once (fast path)
  api/orders/status/           read-only order state (polled)
  api/webhooks/stripe/         fulfil durably
components/                    Shirt, Checkout, option pickers
lib/
  artwork.ts                   print geometry, shared browser + server
  products.ts                  catalogue, pricing, SKU mapping
  prodigi.ts                   Prodigi Print API v4 client
  fulfillment.ts               the idempotency guard
  order.ts                     validation + PaymentIntent metadata mapping
```
