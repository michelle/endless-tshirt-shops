# Echoform

**Custom soundprint t-shirts — your words, rendered as sound you can wear.**

Echoform is a made-to-order store that turns a phrase into a one-of-one
"soundprint": a waveform composed deterministically from the words themselves.
Because it uses DTG (direct-to-garment) printing, every shirt is a single-unit,
full-colour, no-setup print — the format is a perfect fit for one-off
personalisation.

- **Concept:** type a phrase → it becomes a unique waveform → printed to order.
- **Personalisation:** message, optional dedication, ink theme, garment colour, size, and pattern variant.
- **Payments:** Stripe-hosted Checkout (cards, wallets, Link).
- **Fulfilment:** Prodigi Print API (Bella+Canvas 3001, `GLOBAL-TEE-BC-3001`), triggered **only after payment succeeds**.

---

## How it works

```
Browser (studio UI)
   │  POST /api/checkout {message, theme, garment, size, variant}
   ▼
Express server ── creates signed design token (HMAC) ──► Stripe Checkout Session
   │                                                        │
   │  customer pays on Stripe-hosted page                   │
   ▼                                                        ▼
/checkout/success?session_id=…  ◄──── redirect ─────  payment_status = paid
   │  verify with Stripe API
   ▼
fulfillFromSession()  ── idempotent by session id ──►  Prodigi POST /orders
   │                                                     (asset URL = /api/print.png?d=<token>)
   ▼
Prodigi downloads the 4680×5790 transparent PNG and prints it
```

Fulfilment is idempotent and happens in two independent ways, so it still works
if the customer closes the browser after paying:

1. the success redirect verifies the session with Stripe, then submits; and
2. a signed Stripe webhook (`checkout.session.completed`) does the same.

An in-process lock plus Prodigi idempotency keys make sure a shirt is only ever
printed once.

## Project layout

```
src/
  server.js    Express app: storefront, preview, checkout, success, webhook, admin
  brand.js     Palette, garments, sizes, copy
  render.js    Artwork engine (@napi-rs/canvas): soundprint + shirt mockup
  design.js    Signed design tokens + input normalisation
  stripe.js    Stripe Checkout + webhook verification
  prodigi.js   Prodigi order creation / lookup
  fulfill.js   Payment-gated, idempotent fulfilment
  orders.js    JSON order store
public/        Storefront (index.html, styles.css, app.js)
fonts/         Bundled web fonts for deterministic canvas rendering
scripts/       Dev/test helpers (render tests, headless checkout, deploy)
```

## Run locally

```bash
npm install
cp .env.example .env      # then fill in your keys
node src/server.js
# open http://localhost:8788
```

### Environment

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key (test mode is fine). |
| `PRODIGI_API_KEY` | Prodigi API key (sandbox by default). |
| `PRODIGI_BASE` | `https://api.sandbox.prodigi.com/v4.0` or `https://api.prodigi.com/v4.0`. |
| `PRODIGI_SKU` | Print product, default `GLOBAL-TEE-BC-3001`. |
| `PRODIGI_SHIPPING_METHOD` | `Budget`, `Standard`, or `Express`. |
| `PRICE_CENTS` | Retail price in cents (default `3400` = $34, shipping included). |
| `PUBLIC_URL` | Public base URL (set automatically by `scripts/deploy.sh`). |
| `ADMIN_KEY` | Key for `/admin` and `/api/admin/fulfill`. |

## Deploy

`scripts/deploy.sh` starts the app and exposes it through a Cloudflare quick
tunnel, writing the public URL to `runtime/public_url.txt`:

```bash
./scripts/deploy.sh
```

The server reads `PUBLIC_URL` (or `runtime/public_url.txt`) to build absolute
asset URLs and to register the Stripe webhook. For a permanent deployment,
run the same server on any Node host (Render, Railway, Fly.io, a VPS, or a
named Cloudflare tunnel) and set `PUBLIC_URL` to that host.

## Testing

```bash
# 1. Start the server + tunnel
./scripts/deploy.sh

# 2. Create a checkout session
curl -s -X POST "$PUBLIC_URL/api/checkout" -H 'content-type: application/json' \
  -d '{"message":"Always look up","theme":"signal","garment":"black","size":"m","variant":0}'

# 3. Open the returned url and pay with test card 4242 4242 4242 4242,
#    any future expiry, any CVC, any ZIP.

# 4. Inspect orders
open "$PUBLIC_URL/admin?key=$ADMIN_KEY"
```

`scripts/pay-checkout.mjs` performs steps 3–4 automatically with headless Chrome.

## Production checklist

- [ ] Claim the Stripe sandbox / create your own account and use live keys.
- [ ] Set `PRODIGI_API_KEY` to a live Prodigi key and `PRODIGI_BASE` to the live host.
- [ ] Host on a stable domain; set `PUBLIC_URL`; point the Stripe webhook at it.
- [ ] Move orders from `data/orders.json` to a real database.
- [ ] Add shipping-rate + tax calculation (currently a flat, shipping-inclusive price).
- [ ] Add customer email + Prodigi shipping notifications.
- [ ] Add a refunds/returns workflow and legal pages (privacy, terms, returns).
- [ ] Add rate limiting and a signed-URL TTL for the print endpoint.
