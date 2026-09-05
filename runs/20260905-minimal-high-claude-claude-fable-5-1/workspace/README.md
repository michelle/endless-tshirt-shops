# datetime.store

> we sell a t-shirt with the current datetime.

A rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store): a single-page shop selling one
black tee printed with the Unix time in milliseconds at the exact moment you press **Buy now**.
Payments are handled by Stripe; printing and shipping by the Prodigi Print API (replacing the original
Scalable Press integration).

## How it works

1. The shirt on the page ticks with `Date.now()` (via `requestAnimationFrame`).
2. Pressing **Buy now** (or confirming with Apple Pay / Google Pay / Link) freezes the clock. That
   timestamp is sent to `POST /api/checkout`, which creates a Stripe PaymentIntent with the shipping
   address and the shirt details in `metadata`. The PaymentIntent is the system of record (no database).
3. The browser confirms the payment with Stripe Elements.
4. Fulfilment (`lib/fulfillment.ts`) creates a Prodigi order with the PaymentIntent id as the
   idempotency key. It runs from two places, both idempotent:
   - `POST /api/orders/finalize` called by the browser immediately after payment, so the customer sees
     their Prodigi order id;
   - `POST /api/webhooks/stripe` on `payment_intent.succeeded`, which covers closed tabs and
     redirect-based payment methods.
   The Prodigi order id is written back to the PaymentIntent metadata.
5. Prodigi downloads the artwork from `GET /api/artwork/<timestamp>.png`: a transparent PNG the exact
   aspect ratio of the tee's print area (15.6 × 19.3 in) with the timestamp in white Chivo, 8 in wide
   and 3 in from the top, matching the original store's print spec. Output is deterministic per
   timestamp, so preview, receipt and print all agree.
6. `/order?payment_intent=pi_…` shows payment + print status (stage, tracking) for any order.

## Products (Prodigi sandbox catalogue)

| Style  | Prodigi SKU          | Garment                                   |
| ------ | -------------------- | ----------------------------------------- |
| Fitted | `GLOBAL-TEE-BC-6004` | Bella + Canvas 6004 women's favourite tee |
| Unisex | `GLOBAL-TEE-BC-3001` | Bella + Canvas 3001 unisex classic tee    |

Colour black, sizes S–XL, US$22.50 with free standard shipping, US addresses only (see
`lib/products.ts`). Prodigi's sandbox quote for a black 3001 to the US was about US$17 all-in.

## Running locally

```sh
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

Environment variables:

| Variable                             | Purpose                                                          |
| ------------------------------------ | ---------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                  | Stripe secret (test) key                                         |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key                                           |
| `STRIPE_WEBHOOK_SECRET`              | Signing secret for `/api/webhooks/stripe`                        |
| `PRODIGI_API_KEY`                    | Prodigi API key                                                  |
| `PRODIGI_API_BASE`                   | `https://api.sandbox.prodigi.com/v4.0` or `https://api.prodigi.com/v4.0` |
| `SITE_URL`                           | Optional public origin for artwork URLs (defaults to the Vercel production URL) |

To receive webhooks locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

```sh
npm test         # unit tests for validation / product mapping
npm run typecheck
npm run build
```

## Testing a purchase

Use Stripe test cards, e.g. `4242 4242 4242 4242`, any future expiry, any CVC, any US ZIP.
Prodigi sandbox orders are accepted and progress through statuses but are never printed or charged.

## Going live

- Swap `PRODIGI_API_BASE` to `https://api.prodigi.com/v4.0` and use a live Prodigi key.
- Use live Stripe keys and create a live webhook endpoint (same URL).
- Register the domain for Apple Pay in the Stripe dashboard so the express button appears.
- Set `SITE_URL` to the custom domain so artwork URLs stay stable.
