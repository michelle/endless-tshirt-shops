# datetime.store

> we sell a t-shirt with the current datetime. ⏱

A production rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store): a single-page shop that sells one black tee printed with the Unix time in milliseconds at the exact instant you press **Buy**. Payments by Stripe, printing and shipping by [Prodigi](https://www.prodigi.com/print-api/) (replacing the original Scalable Press integration).

## How it works

1. The shirt preview ticks live (canvas, Chivo, `Date.now()`), like the original.
2. Pressing **Buy** (wallet button or card form) *freezes* the timestamp. That number is the design.
3. `POST /api/checkout` validates the cut/size/timestamp/shipping and creates a Stripe **PaymentIntent** whose metadata holds everything needed to print and ship. The PaymentIntent is the order record; there is no database.
4. The browser confirms the payment with Stripe Elements (Express Checkout Element for Apple Pay / Google Pay / Link, Payment Element + Address Element for the manual path).
5. On `payment_intent.succeeded` the **webhook** (`/api/stripe/webhook`) places a Prodigi order. The browser also polls `GET /api/order`, which fulfils the order itself if the webhook has not landed yet. Both paths are idempotent: the Prodigi `idempotencyKey` is the PaymentIntent id, and the resulting Prodigi order id is written back to the PaymentIntent metadata (`prodigi_order_id`).
6. Prodigi downloads the print file from `GET /api/artwork/<timestamp>.png`, a deterministic, immutable, transparent 2490x3510 PNG rendered on demand with `next/og`, sized to the tees' US front print area (8 inch wide number, 3 inches from the top, as in the original).

### Catalog

| Cut    | Prodigi SKU          | Garment                                  |
| ------ | -------------------- | ---------------------------------------- |
| Fitted | `GLOBAL-TEE-BC-6004` | Bella + Canvas 6004 women's favourite tee |
| Unisex | `GLOBAL-TEE-BC-3001` | Bella + Canvas 3001 unisex classic tee   |

Sizes S/M/L/XL, black only, $22.50 with free shipping, US only (the price includes shipping, Prodigi standard US shipping is about $6). See `src/lib/products.ts`.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev                   # http://localhost:3000
npm test                      # unit tests (node:test via tsx)
npm run typecheck
```

Environment variables are documented in `.env.example`. `PUBLIC_BASE_URL` must be a URL Prodigi can reach; on Vercel it defaults to the production URL.

To exercise the webhook locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook   # copy the whsec_ into .env.local
```

## Testing a purchase

Use Stripe test cards (`4242 4242 4242 4242`, any future expiry, any CVC, any US ZIP). With the Prodigi **sandbox** key, orders are created but never printed or charged. Check the resulting Prodigi order id on the success screen, in the PaymentIntent metadata in the Stripe dashboard, or via `GET https://api.sandbox.prodigi.com/v4.0/orders/<id>`.

## Operations notes

- Every paid order has `prodigi_order_id` on its PaymentIntent. If fulfilment failed, `fulfillment_error` is set instead and the webhook returns 500 so Stripe retries; re-delivering the event from the Stripe dashboard (or the customer reloading the success page) retries fulfilment safely.
- Going live: swap `PRODIGI_API_URL` to `https://api.prodigi.com/v4.0` with a live Prodigi key, use live Stripe keys, register the domain for Apple Pay in the Stripe dashboard, and point a live-mode webhook (`payment_intent.succeeded`) at `/api/stripe/webhook`.

## Browser end-to-end test

`e2e/buy.mjs` drives a real Chromium through the card checkout with `4242 4242 4242 4242` and prints the resulting Prodigi order id:

```bash
npm i -D playwright && npx playwright install chromium
node e2e/buy.mjs https://<deployment>.vercel.app /tmp/shots
```
