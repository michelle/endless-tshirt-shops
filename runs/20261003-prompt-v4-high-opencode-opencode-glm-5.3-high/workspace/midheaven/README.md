# Midheaven — Custom Night-Sky Tees

One sky, one shirt, one night. **Midheaven** sells t-shirts printed with the exact
night sky above a moment the customer chooses — every star, all 88 constellations,
the Moon with its true phase, and the naked-eye planets, computed for the precise
date, local time and coordinates. Because fulfilment is direct-to-garment (DTG),
every shirt is a completely different, single-copy print — the concept only works
with DTG, and the store leans into it.

- **Storefront**: Next.js (App Router). The customiser recomputes the real sky
  live in the browser with the same code that renders the print file.
- **Payments**: Stripe Checkout (test mode). Shirts are only ever sent to
  production **after** Stripe confirms payment.
- **Fulfilment**: Prodigi Print API (sandbox) — Bella+Canvas 3001 (`GLOBAL-TEE-BC-3001`),
  printed at the lab nearest the customer (US/UK/EU), white-label shipping.
- **Public URL**: served through a Cloudflare quick tunnel to the local
  production server (`next start`).

## Architecture

```
app/
  page.js                     — landing page (hero + live gallery + FAQ)
  create/page.js              — customiser (form + live preview + checkout)
  success/page.js              — verifies payment, fulfils, shows order state
  api/geocode/route.js         — offline geocoder (GeoNames cities5000, tz included)
  api/checkout/route.js        — creates Stripe Checkout Session (spec in metadata)
  api/stripe/webhook/route.js  — signature-verified; fulfils on checkout.session.completed
  api/print/[id]/file.png      — deterministic print file (4680×5790 @300dpi) from the
                                 design id alone; this is the URL Prodigi downloads
components/                    — SkyChart (isomorphic renderer), ShirtMockup,
                                PlaceSearch, Customizer
lib/
  sky/astro.js                 — local-time→UTC (IANA tz), sidereal time, alt/az
  sky/chart.js                 — star/constellation/moon/planet geometry (unit disc)
  sky/svg.js                    — the finished design as SVG (same output in browser
                                 and server; rasterised with @resvg/resvg-js + bundled TTFs)
  sky/stars.js, lines.js       — HYG-bright stars + constellation lines (d3-celestial data)
  spec.js                      — design spec (tiny, JSON) + base64url design id
  stripe.js, prodigi.js         — API clients
  fulfill.js                   — payment-gated, idempotent fulfilment orchestration
data/cities.tsv                — GeoNames cities5000 (offline geocoding)
```

### The design-spec pattern (why fulfilment is stateless)

Every shirt is fully defined by a tiny spec (title, date, time, place, coordinates,
timezone, dedication, colour, size, quantity). The spec round-trips through:

1. **Stripe Checkout metadata** — the source of truth after payment, and
2. **a base64url "design id"** — the spec itself, encoded. The print file URL is
   `/api/print/<designId>/file.png`, which deterministically regenerates the
   4680×5790 PNG from the id alone. No database: a paid session carries
   everything needed to print, forever.

### Idempotency (no shirt can be printed twice)

- Prodigi `idempotencyKey` and `merchantReference` are both the **Stripe session id**.
- Duplicate submission (webhook + success page, or Stripe retries) returns the
  existing order (`AlreadyExists`).
- A pre-check looks up existing Prodigi orders by merchant reference first.

### Payment gating

- Webhook: signature-verified (`STRIPE_WEBHOOK_SECRET`); only
  `checkout.session.completed` / `async_payment_succeeded` fulfil, and only after
  re-retrieving the session and checking `payment_status === 'paid'`.
- Success page: server-side retrieval + the same check (works even if the
  registered webhook points elsewhere).

## Run locally

```bash
npm install
cp .env.example .env    # or create .env from the keys below
npm run build && npm start -- -p 3000
```

`.env`:

```
STRIPE_SECRET_KEY=rkcs_test_...        # Stripe test-mode restricted key
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...       # for /api/stripe/webhook
PRODIGI_API_KEY=...                   # Prodigi sandbox key
# PRODIGI_BASE_URL=https://api.sandbox.prodigi.com/v4.0   (default; prod: https://api.prodigi.com/v4.0)
```

Public URL for local testing: `cloudflared tunnel --url http://localhost:3000`
(no account needed; URL changes on restart — use a named tunnel or a real host
for production).

## Test the full flow

1. Open `/create`, pick a moment + place (e.g. *Berlin, 1994-05-12 21:30*).
2. Checkout → Stripe test page → card `4242 4242 4242 4242`, any future expiry,
   any CVC, any name/email + shipping address.
3. Land on `/success` — order state from Prodigi (stage, print order id).
4. In the Stripe sandbox, check the checkout session and the Prodigi sandbox
   dashboard for the created order; the artwork URL is
   `/api/print/<designId>/file.png` (4680×5790 transparent PNG @300 dpi).

`node scripts/designid.mjs` prints design ids for the sample specs.

## Production notes

- Swap Stripe + Prodigi keys for live keys (`PRODIGI_BASE_URL` to `api.prodigi.com`).
- Deploy on any Node host (Vercel/Render/Fly): all fulfilment is stateless, so
  serverless works out of the box; `serverExternalPackages: ['@resvg/resvg-js']`
  is already set.
- Register the webhook endpoint in the Stripe dashboard (or keep relying on the
  success-page verification as a fallback — it's already idempotent).
- See gaps & next steps in the hand-over notes.
