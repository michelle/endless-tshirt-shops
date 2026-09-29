# CELESTEE ✦ — wear the sky from your moment

A fully-working custom t-shirt store. Customers pick a **date, time and place**,
and we chart the **exact night sky** overhead — 1,289 catalogued stars, all 88
constellations, and the moon's true phase — render it as an original artwork with
their dedication, take payment, and print it on a Bella + Canvas 3001 via
direct-to-garment on-demand fulfilment. Every shirt is one of one.

## Architecture

Next.js 14 (App Router), no database — the artwork is a pure function of the
design parameters, so statelessness works end to end:

```
app/
  page.jsx            landing (live-rendered samples of famous nights)
  create/page.jsx     customizer: dedication, city search (10k-city gazetteer),
                      date/time, color, size — live canvas preview on a tee mockup
  checkout/page.jsx   address + summary, hands off to Stripe Checkout
  order/page.jsx      confirmation + live fulfilment status
  api/
    artwork           GET  -> 300 DPI PNG of the design (the Prodigi print asset)
    checkout          POST -> creates the Stripe Checkout Session
    stripe/webhook    POST -> checkout.session.completed -> fulfil (verified signature)
    order/status      GET  -> verifies payment with Stripe; fulfils idempotently
    prodigi/callback  POST -> Prodigi status callbacks (acknowledged/logged)
lib/
  sky.js              positional astronomy: sidereal time, alt/az, azimuthal
                      projection, moon phase. Shared verbatim by browser + server.
  render.js           the artwork: one Canvas2D routine used for the web preview
                      AND the print file (@napi-rs/canvas server-side)
  stripe.js           minimal Stripe REST client + webhook HMAC verification
  prodigi.js          Prodigi Print API v4 client (sandbox)
  fulfill.js          paid session -> Prodigi order (idempotencyKey = session id)
data/                 stars.json (Yale BSC subset via d3-celestial), constellations.json
public/cities.json    GeoNames cities15000 subset (name, country, lat/lng, IANA tz)
public/fonts/         Cormorant Garamond (OFL) used by both renderers
```

### Money flow (payment-gated fulfilment)

1. `/create` computes the design parameters; the instant (`t`, epoch ms) is derived
   in the browser from the local wall time + the city's IANA timezone, so the
   server needs no timezone database.
2. `/checkout` posts design + shipping address to `/api/checkout`, which creates a
   Stripe Checkout Session (design + address in metadata) and redirects to Stripe.
3. **Only after payment succeeds** the shirt goes to Prodigi — via two independent,
   both-idempotent paths:
   - the **Stripe webhook** (`checkout.session.completed`, signature-verified), and
   - the **success redirect**: `/order` polls `/api/order/status`, which re-fetches
     the session from Stripe, requires `payment_status === 'paid'`, then fulfils.
   Prodigi dedupes on `idempotencyKey = <stripe session id>` (`AlreadyExists`),
   so double-fulfilment is impossible.
4. Prodigi downloads the print file from `/api/artwork?…` (deterministic render,
   `cache-control: immutable`) and prints the shirt.

## Running locally

```sh
npm install
cp .env.example .env.local   # fill in Stripe + Prodigi keys
npm run dev                  # http://localhost:3000
npm run build && npm start   # production mode
```

## Environment variables

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret (test sandbox key in this deployment) |
| `STRIPE_WEBHOOK_SECRET` | signing secret of the registered webhook endpoint |
| `PRODIGI_API_KEY` | Prodigi **sandbox** API key |
| `PRODIGI_API_BASE` | `https://api.sandbox.prodigi.com` (default) — switch to `https://api.prodigi.com` for live |

## Data credits

- Star positions & magnitudes: Yale Bright Star Catalogue subset, via
  [d3-celestial](https://github.com/ofrohn/d3-celestial) (BSD).
- Constellation figures: d3-celestial (IAU constellations).
- Cities: [GeoNames](https://www.geonames.org/) `cities15000` (CC-BY).
- Type: [Cormorant Garamond](https://github.com/CatharsisFonts/Cormorant) (OFL).
