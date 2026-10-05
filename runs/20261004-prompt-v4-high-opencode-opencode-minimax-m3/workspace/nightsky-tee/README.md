# NightSky Tee

A personalised t-shirt store where every shirt is unique to the moment and
place you specify. We render the actual night sky — from your location at
your date — into a DTG (direct-to-garment) print and ship it via Prodigi.

This repo contains a working end-to-end implementation: storefront, live
astronomy-based preview renderer, Stripe Checkout, and Prodigi Print API
fulfilment, all running on Node.js + Express.

## What the product is

> Pick any place, any night — a birthday, an anniversary, the night you
> said yes — and we'll print the actual stars exactly the way they
> appeared.

So the "theme" is **personalised astronomy**. Each shirt is unique;
the design changes by date and location. DTG (vs. screen print) was
deliberately chosen because it handles full-colour, photo-quality
imagery on cotton — perfect for rich star maps with subtle gradients.

## Stack

| Layer            | Tech                                         |
| ---------------- | -------------------------------------------- |
| Storefront       | Single-page vanilla HTML/CSS/JS              |
| Server           | Node.js + Express                            |
| Star catalogue   | Yale Bright Star Catalog (curated 80+ stars) |
| Astronomy math   | Meeus formulas — JD, GMST, alt/az           |
| Image rendering  | Custom SVG → `resvg-js` → PNG (4680×5790)    |
| Payments         | Stripe Checkout (hosted page)                |
| Prints + ship    | Prodigi Print API (Bella+Canvas 3001 tee)    |
| Deployment       | Cloudflare quick-tunnel (no account needed)  |

## Local dev

```bash
# 1. install
npm install

# 2. configure env (already contains sandbox keys from this build)
cp .env.example .env   # then fill in your keys

# 3. run
node server.js
# → listening on http://localhost:8787
```

For public deployment, run `./start.sh` — it spins up a Cloudflare
quick-tunnel and sets `PUBLIC_URL` for you. Re-prints the URL on each
run.

## Project layout

```
.
├── server.js                # Express app (routes, Stripe, Prodigi)
├── start.sh                 # cloudflared tunnel + node orchestrator
├── package.json
├── .env                     # secrets (Stripe, Prodigi, URLs)
├── lib/
│   ├── astro.js             # star catalog + astronomy math
│   ├── starmap.js           # SVG → star-map renderer
│   ├── prodigi.js           # Prodigi Print API client
│   ├── storage.js           # in-memory order store
│   └── dotenv.js            # tiny .env loader (zero-dependency)
└── public/
    ├── index.html           # storefront + customizer form
    ├── styles.css
    ├── app.js               # live preview + checkout flow
    ├── favicon.svg
    └── samples/             # pre-rendered shirt mockups for the gallery
```

## Configuration

| Variable               | Where it's used                          |
| ---------------------- | ---------------------------------------- |
| `STRIPE_SECRET_KEY`    | server.js (Stripe SDK)                   |
| `STRIPE_WEBHOOK_SECRET`| server.js (signature verification)        |
| `PRODIGI_API_KEY`      | lib/prodigi.js (`X-API-Key` header)      |
| `PUBLIC_URL`           | Stripe `success_url`/`cancel_url` + Prodigi asset URL |
| `PORT`                 | Express listen port (default 8787)       |
| `NODE_ENV`             | "production" hides preview URLs from `/api/order/:id` |

## End-to-end flow

1. Customer opens `/` → live preview re-renders via `POST /api/preview`.
   Server builds an SVG star map using published astronomy formulas and
   rasterises to a 4680x5790 PNG.
2. Customer clicks **Buy**. Browser `POST`s to `/api/checkout`; server
   creates a Stripe Checkout Session and returns its hosted URL.
3. Browser navigates to that Stripe URL, pays, returns.
4. Stripe redirects to `/success?order=…&session_id=…` on our side.
5. The server marks the order paid and submits the design to Prodigi
   (`POST /v4.0/Orders` on `api.sandbox.prodigi.com`).
6. Order is in the in-memory store with status `submitted` + Prodigi ID.

For async payment methods (SEPA, ACH) the same Prodigi submission is
also fired by the Stripe webhook when `checkout.session.completed`
arrives. Both pathways are idempotent (keyed by `merchantReference`).

## Tested card numbers for Stripe

These are Stripe's standard test cards; use them in the Checkout page:

| Number              | Description              |
| ------------------- | ------------------------ |
| 4242 4242 4242 4242 | Succeeds                 |
| 4000 0000 0000 9995 | Declined (insufficient)  |
| 5555 5555 5555 4444 | Mastercard — succeeds    |

Any future expiry, any 3-digit CVC, any postal code.

## Assumptions / known gaps for production

* Star catalog is hand-curated 80+ stars — fine for a t-shirt, not for astronomy research.
* Cities are a built-in list of ~50, not a full geocoder. Add Mapbox/Google for production.
* In-memory order store; swap for Postgres before processing real volume.
* Stripe sandbox key is used here; production needs a real `sk_live_…` secret key + dashboard-configured webhook.
* "Submit on success page" + "submit on webhook" with idempotency — both pathways are wired so the demo works without a configured webhook endpoint.
* Pricing is hard-coded ($44.99). The Stripe line items include shipping per region.

## Why this is DTG-friendly

DTG dispenses water-based inks straight into cotton fibres (vs. screen
print's plastic-on-top). So:

* Vibrant colors on dark shirts ✓ (we use black/navy/charcoal)
* Gradient skies + soft glow halos render cleanly ✓
* Soft hand-feel, no peeling ✓
* Single-unit orders are economical ✓ (Prodigi's whole model)

The 4680×5790 print area Prodigi specifies for the BC-3001 happens to
be the same aspect ratio the renderer targets, so there's no
unnecessary cropping.
