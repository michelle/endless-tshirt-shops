# datetime.store

> we sell a t-shirt with the current datetime. ⏱

A production-quality rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store).
Every shirt is one of a kind: the exact Unix time (in milliseconds) at the moment
you click **Buy** is frozen and printed in white ink on a black tee.

## How it works

1. The landing page shows a live, requestAnimationFrame-driven epoch-ms ticker on
   a t-shirt (fitted or unisex, S–XL, $22.50 with free shipping).
2. Clicking **Buy now** freezes the timestamp — that value *is* the product — and
   opens Stripe **embedded Checkout** in-page (`ui_mode: embedded_page`), which
   collects email, shipping address, and card details.
3. `POST /api/checkout` creates the Checkout Session with
   `{timestamp, style, size, origin}` in metadata.
4. On `checkout.session.completed`, `POST /api/stripe-webhook` verifies the
   signature and calls `ensureFulfilled()`, which places a **Prodigi** order
   (Bella + Canvas 6004 fitted / 3001 unisex, black, DTG front print) and writes
   the Prodigi order id back to the PaymentIntent metadata (idempotency record —
   no database needed).
5. The print file is generated deterministically by `GET /api/artwork?ts=...`
   (edge route, satori/`next/og`, Chivo Bold, 2000×460 white-on-transparent PNG
   ≈ 250 DPI at an 8" print width). Prodigi fetches it by URL; `&preview=1`
   renders a black background for the Stripe product thumbnail.
6. The success page polls `GET /api/order-status`, which also acts as a
   fulfillment fallback: if a paid session is still unfulfilled 45 s after
   creation (webhook outage), it places the Prodigi order itself.

## Environment variables

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret (test/sandbox or live) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the `checkout.session.completed` webhook |
| `PRODIGI_API_KEY` | Prodigi API key |
| `PRODIGI_API_URL` | `https://api.sandbox.prodigi.com/v4.0` (sandbox) or `https://api.prodigi.com/v4.0` (live) |
| `NEXT_PUBLIC_BASE_URL` | Optional; overrides the request-derived public origin used for artwork URLs |

## Run locally

```bash
npm install
STRIPE_SECRET_KEY=sk_test_... \
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... \
PRODIGI_API_KEY=... \
npm run dev
# webhooks locally:
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

## Deploy

```bash
vercel link --project <name>
vercel env add STRIPE_SECRET_KEY production   # ...and the rest
vercel deploy --prod
# then register the webhook against the deployed URL:
stripe webhook_endpoints create \
  -d "url=https://<domain>/api/stripe-webhook" \
  -d "enabled_events[0]=checkout.session.completed"
# put the returned whsec_... into STRIPE_WEBHOOK_SECRET and redeploy.
```

## Verify a purchase (test mode)

Buy a shirt with card `4242 4242 4242 4242`, any future expiry, any CVC, a US
address. The success page shows the frozen timestamp and the Prodigi order id
(`ord_...`). Check the order:

```bash
curl -H "X-API-Key: $PRODIGI_API_KEY" https://api.sandbox.prodigi.com/v4.0/Orders/<ord_id>
```

`status.details.downloadAssets: Complete` confirms Prodigi fetched the artwork.
