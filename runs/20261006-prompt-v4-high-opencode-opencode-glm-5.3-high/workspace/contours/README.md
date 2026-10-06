# Contours — custom topographic t-shirts

**Wear the shape of a place.** Every shirt is a minimalist contour map of anywhere on
Earth — the summit you summited, the valley you grew up in, the coastline you got
married on — drawn from real elevation data and direct-to-garment printed to order.
No two are ever the same, which is exactly what DTG printing is good at.

- **Product:** Bella + Canvas 3001 (unisex crew) via Prodigi, `GLOBAL-TEE-BC-3001`
- **Colours:** 9 curated (light shirts get charcoal ink, dark shirts get ivory ink), sizes XS–4XL
- **Price:** $39 (+$4 for 2XL+); shipping priced live from Prodigi quotes (cost × 1.3, rounded up, $5–$29)
- **Payments:** Stripe Checkout (hosted). Nothing is sent to Prodigi until Stripe reports
  `payment_status = paid` — verified server-side by re-fetching the session, never from the browser
- **Print file:** 4680 × 5790 transparent PNG (the SKU's front print area), artwork nested at a safe
  chest-print size (~11.7 × 14.5 in), one-ink line art — the same renderer that draws the on-screen
  preview produces the print file

## How it fits together

```
public/            storefront + customizer (vanilla JS modules, no build step)
  catalog.js       products, colours, sizes, prices, validation   ← shared browser + server
  design.js        design + terrain → SVG (preview == print file) ← shared browser + server
  shirt.js         flat tee mockup for the preview
  app.js           customizer: search → live preview → checkout
  order-success.html  live order status page (verifies + triggers fulfilment, idempotent)
  orders.html      demo order book (live from the store's records)
  fonts/           Cormorant Garamond + Jost (static TTFs, OFL) — same files print & display
  samples/         pre-rendered gallery designs
lib/
  terrarium.mjs    elevation tiles (AWS Open Data) → grid; disk-cached
  contours.mjs     marching squares → stitched → simplified (RDP) → smoothed (Chaikin)
  svgtopng.mjs     resvg-wasm rasteriser with the bundled fonts
  stripeapi.mjs    form-encoded Stripe REST + webhook signature verification (HMAC, timing-safe)
  prodigi.mjs      Prodigi v4 client (quotes + orders)
  fulfil.mjs       the only path to Prodigi: Stripe session (re-fetched, paid) → order
  orders.mjs       tiny JSON order book (status pages; not the source of truth)
  signedurl.mjs    self-contained HMAC-signed design URLs (design data rides inside the URL)
server.mjs         plain node:http — static + JSON API
scripts/
  host.sh          self-host: server (auto-restart) behind a Cloudflare quick tunnel;
                   re-points the Stripe webhook whenever the tunnel URL changes
  register-webhook.mjs  creates/updates the Stripe webhook endpoint for the current URL
  smoke.mjs        full end-to-end test, no browser: checkout → pay (hosted-page confirm API
                   with tok_visa + shipping) → fulfil → real Prodigi order + print-file check
  render-samples.mjs   regenerates public/samples
  qa-design.mjs / ascii-view.mjs   layout QA for the rendered artwork
data/              order book + tile cache (safe to delete)
bin/cloudflared    tunnel binary
```

No database: the design lives in the Checkout Session metadata, money state is Stripe's,
fulfilment is keyed by the Stripe session id (also the Prodigi `idempotencyKey`), and
print/preview URLs carry the whole design inside them, HMAC-signed — so a print link
regenerates the file even after a server restart or a new tunnel URL.

## Payment → fulfilment guarantee

Two independent triggers, both idempotent, both re-verify with Stripe:

1. **Webhook** `checkout.session.completed` / `async_payment_succeeded` → signature-verified
   (timing-safe HMAC) → session re-fetched from Stripe → `payment_status === 'paid'` → fulfil.
2. **Success page** `/order/success?session_id=…` (and its status polls) → same re-verification.

Fulfilment creates the Prodigi order with `idempotencyKey = session.id`, so retries can never
double-print. Unpaid or unparseable sessions never reach Prodigi.

## Run locally

```bash
npm install
npm run samples                       # render the gallery designs
STRIPE_SECRET_KEY=rk_test_… PRODIGI_API_KEY=… npm start
# → http://localhost:3457
npm run smoke http://localhost:3457   # end-to-end test (needs ~/.contour-secrets/{sk,pk}.txt)
```

Secrets resolution (`lib/config.mjs`): env vars first, then `~/.contour-secrets/`
(`sk.txt`, `pk.txt`, `webhook.secret`, `print-signing.secret` — generated on first boot).

## Current deployment

Self-hosted behind a Cloudflare quick tunnel (no account needed):

```bash
scripts/host.sh          # writes the public URL to .host/url.txt, logs to .host/
kill "$(cat .host/pid)"  # stop
```

The tunnel URL is public and works from anywhere, but it changes if the tunnel restarts
(host.sh re-points the Stripe webhook automatically). For production, deploy to any Node
host or serverless platform — `server.mjs` routes are plain `(req, res)` handlers; set
`PUBLIC_BASE_URL` to the canonical origin and `PORT` accordingly.

## Production checklist

- Stripe: switch to a real account's live keys, claim the test sandbox used during the build,
  add a webhook endpoint for the production domain (same two events), and add tax handling.
- Prodigi: switch `PRODIGI_ENV=live` with the live API key (sandbox keys differ from live keys).
- Set a long random `PRINT_SIGNING_SECRET` and keep it stable (Prodigi re-fetches assets by URL).
- Swap the JSON order book for a real database if you want order history/admin tooling at scale.
- Gate `/orders.html` behind auth, add rate limiting on `/api/geo` + `/api/contours`, and
  consider pre-generating tiles for popular regions.
