# Meridian — Sky Keepsake Tees

A personalized DTG t-shirt store. The customer picks a **place** and a **moment**;
the site computes the real solar position, sun path, moon phase and star field for that
instant and renders a unique front-print design. Shirts are printed on demand by
[Prodigi](https://www.prodigi.com) (Bella+Canvas 3001, DTG) only **after** payment
succeeds via [Stripe](https://stripe.com).

Live: https://benchmark-20260928-rep3-high-kimi-k.vercel.app

## How it works

1. **Design** (`/`) — configurator: city search (2,400 GeoNames cities), exact
   coordinates, or browser geolocation; date/time in the place's local timezone;
   occasion caption; shirt colour/size. Preview is a server-rendered mockup
   (`GET /api/preview`).
2. **Pay** (`/pay`) — server creates a Stripe PaymentIntent (`POST /api/checkout`)
   with an HMAC-signed design token in its metadata. The browser confirms the card
   with Stripe Elements (Payment Element + Address Element for shipping).
3. **Fulfil** — Stripe fires `payment_intent.succeeded` to
   `/api/webhooks/stripe` (signature-verified), which submits the order to Prodigi
   with the signed artwork URL `GET /api/print/<token>.png` (4680×5790-equivalent
   2808×3474 PNG, 0.6 scale of the recommended print area). The payment-intent id is
   used as Prodigi `idempotencyKey` + `merchantReference`, so fulfilment is
   idempotent. `/api/order-status` (+ self-healing `POST`) backs the confirmation
   page; it can safely re-drive fulfilment if the webhook was missed.

## Key files

- `lib/solar.ts` — NOAA-style solar position, sunrise/sunset, sun path, moon phase/position, seeded PRNG.
- `lib/design.ts` — the artwork SVG (sun-path chart, sky palettes, typography).
- `lib/preview.ts` — shirt mockup SVG + colour/size catalog.
- `lib/token.ts` — HMAC design tokens (binds label, lat/lon, time, tz, caption, colour, size).
- `lib/orders.ts` — Stripe + Prodigi pipeline.
- `lib/prodigi.ts` — Prodigi Print API v4.0 client.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | Stripe API keys |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) |
| `PRODIGI_API_KEY` | Prodigi API key (sandbox: `api.sandbox.prodigi.com`) |
| `PRODIGI_BASE_URL` | Override Prodigi base URL (defaults to sandbox) |
| `DESIGN_SIGNING_SECRET` | HMAC secret for design tokens |
| `SITE_URL` | Public origin used in asset URLs |
| `PRICE_CENTS` | Price in cents (default 3999) |

## Development

```bash
npm install
cp .env.local .env.local   # fill in keys (see table)
npm run dev                # http://localhost:3000
```

For local webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
and put the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`.

## Production checklist

- Swap Stripe sandbox keys for live keys (dashboard: activate & claim the account).
- Point the Stripe webhook endpoint at this deployment and set its secret.
- Switch `PRODIGI_BASE_URL` to `https://api.prodigi.com/v4.0` with a live Prodigi key.
- Set a strong `DESIGN_SIGNING_SECRET`; keep `SITE_URL` on the canonical domain.
- Add tax (Stripe Tax), a privacy policy, and order persistence if you need history.
