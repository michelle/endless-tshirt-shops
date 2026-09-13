# Cipher Tees

A DTG (direct-to-garment) t-shirt store where every product is generated,
not picked. The customer types a phrase (a name, a date, a lyric — up to 28
characters); that exact text deterministically drives a radial "cipher"
pattern (same input always produces the same pattern, byte-for-byte), which
is then printed to order onto a shirt. Nothing is pre-designed — every order
is a genuinely one-off print, which is exactly what DTG is good at and mass
manufacturing (screen printing) is not.

## Stack

- **Next.js 14** (App Router, TypeScript), deployed on Vercel.
- **Stripe Checkout** for payment (redirect-based hosted checkout).
- **Prodigi Print API** (sandbox) for DTG fulfillment — `GLOBAL-TEE-GIL-64000`
  (Gildan 64000 unisex tee), front print only.
- **satori + @resvg/resvg-js** to rasterize the exact same design tree used
  for the live browser preview into a print-quality PNG server-side, so the
  print is guaranteed to match what the customer saw.
- No database. Stripe is the system of record: each order's design spec
  (phrase/palette/shirt color/size/qty) is packed into Checkout Session /
  PaymentIntent metadata, and fulfillment status is written back onto the
  PaymentIntent once the Prodigi order is created.

## How payment -> fulfillment is wired

1. `/design` → customer builds a design, `/cart` → `POST /api/checkout`
   creates a Stripe Checkout Session (line items priced server-side, never
   trusted from the client).
2. Customer pays on Stripe's hosted page.
3. Stripe calls `POST /api/webhooks/stripe` with `checkout.session.completed`.
   The handler **verifies the signature**, checks `payment_status === "paid"`,
   and only then calls the Prodigi Orders API. **Nothing is ever sent to
   Prodigi before Stripe confirms payment.**
4. The Prodigi order's `idempotencyKey` is the Checkout Session id, so a
   retried/duplicated webhook delivery can't create a duplicate physical
   order.
5. `/order/success` (and `/order/status` for later lookups) polls
   `/api/order-status`, which reads the PaymentIntent metadata and, if a
   Prodigi order exists, live-fetches its status/shipments from Prodigi.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Required env vars (see `.env.example`):

- `STRIPE_SECRET_KEY` — Stripe secret key (test mode for sandbox use).
- `STRIPE_WEBHOOK_SECRET` — signing secret for the `checkout.session.completed`
  webhook endpoint.
- `PRODIGI_API_KEY` — Prodigi API key (sandbox or live).
- `PRODIGI_API_BASE_URL` — optional, defaults to the sandbox API.
- `NEXT_PUBLIC_SITE_URL` — the canonical deployed origin (used to build the
  absolute art/image URLs handed to Stripe and Prodigi).

For local webhook testing, use the Stripe CLI:
`stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

`scripts/smoke-test.mjs` is a headless end-to-end check: it creates a real
Checkout Session, crafts a correctly-signed `checkout.session.completed`
event, posts it to the webhook route, and confirms a real Prodigi sandbox
order gets created — useful after any change to the fulfillment path.
