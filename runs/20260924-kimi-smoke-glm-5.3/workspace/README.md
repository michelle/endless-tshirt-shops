# Skyborn — one sky, one shirt

**Skyborn** is a DTG t-shirt store with one product: the *real* night sky above a
moment that matters — a birth, a wedding, a first date — rendered from real
celestial mechanics for the customer's exact date, time and place, and printed
exactly once, for one person.

Live deployment: `https://benchmark-20260924-kimi-smoke-glm-5.vercel.app`

## Why DTG is the point

Direct-to-garment printing has no screens, no setup, no minimums and no
inventory — so a print run of **one** costs the same as a run of a thousand.
Skyborn takes full advantage: every shirt is a unique, mathematically computed
chart (star positions, constellation lines, the Milky Way band, visible
planets and the exact moon phase and illumination), personalised with the
customer's own words. Nothing is pre-designed or stocked.

## Architecture

```
Next.js 14 (App Router) ── one codebase, two runtimes

src/lib/          shared, isomorphic — runs identically in browser & serverless
  astro.ts          sidereal time, equatorial→horizontal projection, planets,
                    moon phase; local civil time → UTC via Intl (full tz history)
  starmap.ts        spec → deterministic print-ready SVG (the "one source of truth")
  spec.ts          SkySpec: validation, compact codec (Stripe metadata / URLs),
                    FNV-1a order №
  products.ts       Gildan 64000 (Prodigi SKU GLOBAL-TEE-GIL-64000), colors,
                    sizes, prices ($42 / $48 incl. US shipping)
  data/             stars.json (HYG, mag≤5.0), constellations.json (d3-celestial),
                    cities.json (GeoNames) — see scripts/build-data.py

src/server/       serverless only
  render.ts         SVG → 300 DPI PNG via @resvg/resvg-wasm (no native deps),
                    bundled Cinzel + Cormorant Garamond (name tables normalised
                    by scripts/fix-fonts.py)
  signing.ts        HMAC-signed, stateless print URLs (no database needed)
  stripe.ts         Stripe SDK client
  prodigi.ts        Prodigi Print API v4 client (idempotent order creation)

src/app/
  page.tsx          storefront + live configurator (client preview = server
                    render, same function)
  success/page.tsx  payment + live fulfillment status (polls /api/order-status)
  api/checkout      POST → Stripe Checkout Session (price recomputed server-side;
                    spec travels in session metadata; product image = signed
                    live preview of the customer's own chart)
  api/print         GET  → 300 DPI PNG, HMAC-verified (Prodigi fetches this)
  api/stripe/webhook  signature-verified checkout.session.completed +
                    payment_status=paid → the ONLY path that sends an order to
                    Prodigi; idempotencyKey = Stripe session id, so webhook
                    retries can never double-print
  api/order-status   GET → Stripe payment state + live Prodigi stage
```

### The money path (strictly ordered)

1. Customer configures the sky → live SVG preview (deterministic).
2. `POST /api/checkout` validates the spec server-side, recomputes the price
   from the size, and creates a Stripe Checkout Session (US shipping address
   collection, free standard shipping).
3. Customer pays on Stripe's hosted page. Nothing has been sent to Prodigi.
4. `checkout.session.completed` + `payment_status === 'paid'` — verified by
   webhook signature — regenerates the print at 300 DPI from the spec in the
   session metadata, signs it into a URL, and creates the Prodigi order
   (Gildan 64000, DTG front print, `sizing: fitPrintArea`, transparent PNG).
   The idempotency key is the Stripe session id: retries are deduplicated by
   Prodigi (`AlreadyExists` returns the original order).
5. Success page polls payment + fulfillment status live.

No database is required: the design spec is ~200 bytes, travels in Stripe
metadata and in HMAC-signed URLs, and deterministically regenerates the exact
print file at any time in the future.

## Development

```sh
npm install
cp .env.example .env.local        # fill in Stripe, Prodigi, signing secret
npm run dev                       # http://localhost:3000

# render a sample chart to /tmp for visual QA
node scripts/render-sample.mjs "navy blue"
python3 scripts/qa-artwork.py /tmp/skyborn-qa/sample-navyblue.png
```

Fonts are Google Fonts static instances (SIL OFL) committed under
`src/lib/assets/fonts` (print renderer) and `public/fonts` (browser). The resvg
wasm binary is committed under `src/lib/assets/resvg.wasm`; `next.config.mjs`
traces both into the `/api/print` serverless function.

## Deployment (Vercel)

Env vars (Production): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`PRODIGI_API_KEY`, `PRODIGI_API_BASE_URL` (defaults to sandbox),
`SKYBORN_SIGNING_SECRET`, `NEXT_PUBLIC_SITE_URL`.

Stripe webhook endpoint: `<site>/api/stripe/webhook` listening to
`checkout.session.completed` and `checkout.session.expired`.

## Data & credits

- Stars: [HYG database](https://github.com/astronexus/HYG-Database) (Hipparcos-derived)
- Constellation lines: [d3-celestial](https://github.com/ofrohn/d3-celestial)
- Cities & timezones: [GeoNames](https://www.geonames.org/) cities15000
- Fonts: Cinzel, Cormorant Garamond (Google Fonts, SIL OFL)

## Known gaps before production

See the run report (`runs/<run-id>/final.md`) for the full list — the headline
items: US-only shipping with flat pricing, no tax collection, no content
moderation queue for custom text, no order database (Stripe + Prodigi are the
source of truth), no branded packing slips, and Prodigi sandbox is wired (flip
`PRODIGI_API_BASE_URL` + live key to go live).
