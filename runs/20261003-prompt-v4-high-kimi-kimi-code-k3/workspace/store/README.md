# Under This Sky — custom star map t-shirts

A fully working print-on-demand t-shirt store. Every shirt is unique: the customer
picks a date, a time and a place, and we print the **real night sky** — 1,018
catalogued stars plus the true moon phase — exactly as it stood above that moment,
direct-to-garment on a Gildan 64000 tee.

## Architecture

```
Customer → public/index.html + app.js (customizer, live preview)
   │
   ├─ GET /api/preview       → SVG star-map → PNG preview on shirt color (resvg)
   ├─ GET /api/geocode       → OpenStreetMap Nominatim proxy (city search)
   ├─ POST /api/checkout     → Stripe Checkout Session (design params in metadata)
   │
Stripe webhook ─ POST /api/webhook (signature-verified)
   │   checkout.session.completed + payment_status == 'paid'
   └─→ Prodigi order (lib/prodigi.js) with asset URL:
       GET /api/design?...&sig=... → full-res 4665×5844 transparent print PNG
       (regenerated deterministically on demand; HMAC-signed params)
```

- `lib/astro.js` — sidereal time, RA/Dec → alt/az, moon position & phase
- `lib/design.js` — star-map SVG composer (print area layout)
- `lib/render.js` — resvg rasterizer (bundled PT Serif + Lato fonts)
- `data/stars.json` — bright-star catalog (mag ≤ 4.6, with B-V color index)
- `scripts/e2e.js` — full end-to-end test (Playwright: store → Stripe → webhook → Prodigi)

Shirts are sent to Prodigi **only** from the Stripe webhook after
`payment_status === 'paid'`. Webhook events are signature-verified
(`STRIPE_WEBHOOK_SECRET`); fulfillment is idempotent per Stripe event id and
Prodigi idempotency key (= Stripe session id).

## Run locally

```bash
npm install
cp .env.example .env   # fill in keys
node dev-server.js     # http://localhost:3000
```

## Deploy (Vercel)

```bash
vercel deploy --yes \
  -e STRIPE_SECRET_KEY=... -e STRIPE_WEBHOOK_SECRET=... \
  -e PRODIGI_API_KEY=... -e DESIGN_SECRET=... \
  -e PUBLIC_BASE_URL=https://<your-domain>
```

Then create the Stripe webhook endpoint pointed at `/api/webhook`
(event: `checkout.session.completed`) and redeploy with its signing secret.

Note: `@resvg/resvg-js-linux-arm64-gnu` is an *optional* dependency so macOS
builds don't fail, and `vercel.json` `includeFiles` bundles the linux-arm64
binary into the render functions.

## Current live deployment

- Store: https://temporary-quick-bassoon-oxdmekd.vercel.app
- E2E-tested end to end (`node scripts/e2e.js <url>`): real Stripe Checkout
  payment → signed webhook → Prodigi order created → print asset downloaded.

## Test card

Stripe test mode: `4242 4242 4242 4242`, any future expiry, any CVC/ZIP.

## Known gaps / before production

See the handoff notes in the final delivery message: order persistence is
in-memory, Stripe sandbox keys and the Vercel URL are time-limited, Prodigi is
in sandbox (nothing physically prints), and taxes/shipping fees are not modeled.
