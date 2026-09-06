# datetime.store

we sell a t-shirt with the current datetime. ⏱

A production rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store):
one black tee, printed with the Unix timestamp (in milliseconds) of the exact moment you click
**Buy**. Every shirt is a limited edition of one.

## How it works

1. The shirt on the home page ticks with `Date.now()` every animation frame.
2. Clicking **Buy** freezes that number. The browser posts it, with the style, size,
   email and shipping address, to `POST /api/checkout`, which creates a Stripe
   PaymentIntent for $22.50 (amount computed server-side) with the shirt details in metadata.
3. The Payment Element confirms the payment in-page (cards, Link, wallets via the
   Express Checkout Element).
4. Fulfillment is idempotent and runs from two places: the `payment_intent.succeeded`
   webhook and the order page. `lib/fulfill.ts` creates a Prodigi order with
   `idempotencyKey = payment intent id`, so racing calls can never print two shirts. The
   Prodigi order id is written back onto the PaymentIntent's metadata, which is the only
   order "database".
5. The artwork is rendered on demand by `GET /api/artwork/<timestamp>.png` (Next.js
   `ImageResponse`, Chivo Medium, transparent PNG at Prodigi's full front print area,
   4677x5881 px, number ~8in wide and ~3in below the collar, like the original). Prodigi
   fetches it by URL. It's deterministic, so it's cached forever.
6. `/order/<pi_id>?payment_intent_client_secret=…` shows the number, the payment and
   printer status, and polls `/api/order/<id>` until the shirt ships. The client secret is
   the access token; without it the page 404s.

Prodigi products: `GLOBAL-TEE-BC-6004` (fitted, Bella + Canvas 6004) and
`GLOBAL-TEE-GIL-64000` (unisex, Gildan 64000), black, sizes S–2XL. Shipping is Prodigi
"Standard" and free to the countries in `lib/config.ts`.

## Environment

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret (or restricted) key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `/api/stripe/webhook` |
| `PRODIGI_API_KEY` | Prodigi Print API key |
| `PRODIGI_API_BASE` | `https://api.sandbox.prodigi.com` or `https://api.prodigi.com` |
| `SITE_URL` | Public origin (optional on Vercel; inferred from the production URL) |
| `SUPPORT_EMAIL` | Optional; shown in the FAQ |

## Develop

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

Local webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and put the
printed `whsec_…` in `STRIPE_WEBHOOK_SECRET`. Without a webhook the order page still
fulfills the order when it loads.

Check the artwork placement: `node scripts/measure-artwork.mjs http://localhost:3000/api/artwork/1757100000000.png`.

## Test a purchase without a browser

```bash
# 1. create the intent
curl -s -X POST $SITE/api/checkout -H 'content-type: application/json' -d '{
  "style":"unisex","size":"L","timestamp":'"$(date +%s000)"',"email":"you@example.com",
  "shipping":{"name":"Jenny Rosen","address":{"line1":"185 Berry St","city":"San Francisco",
  "state":"CA","postal_code":"94107","country":"US"}}}'
# 2. pay it with a test card
stripe payment_intents confirm pi_… --payment-method pm_card_visa --return-url $SITE/order/pi_…
# 3. watch it get fulfilled
open "$SITE/order/pi_…?payment_intent_client_secret=pi_…_secret_…"
```

## Deploy

```bash
vercel link && vercel env add … && vercel deploy --prod
stripe webhook_endpoints create --url https://<domain>/api/stripe/webhook --enabled-events payment_intent.succeeded
```
