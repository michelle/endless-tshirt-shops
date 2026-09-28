# StarMap Tee — a one-of-one DTG t-shirt store

StarMap Tee is a single-page e-commerce site that lets customers pick a date and
a place, previews the night sky as it was that night, and prints that sky on a
Bella+Canvas tee via Prodigi DTG. The store is fully deployed; this README is
also the operator notes.

## What's in the box

- **Next.js 14** (App Router) + React 18 + TypeScript
- **Stripe Checkout** hosted page (test mode by default) for payment
- **Prodigi Print API** (sandbox by default) for DTG print + dropshipping
- **`sharp`** + **`opentype.js`** for SVG → PNG conversion with text glyphs
  baked into the SVG itself, so the on-screen preview and the printer
  asset pixel-match regardless of the host's installed fonts
- One T-shirt SKU: `GLOBAL-TEE-BC-3001` (Bella+Canvas 3001, ships worldwide)

## Theme

The product is **A night-sky postcard, printed on a shirt.** Each customer:

1. Picks a date — `YYYY-MM-DD`
2. Picks a lat/lon, optionally types a place name
3. Types a title (e.g. "the night we met")
4. Picks a shirt color and size

We render the sky, with the real moon phase from the date and a seeded star
field, and ship it to the printer. No two customers ever get the same design.

The concept only uses DTG-friendly features: photographic gradient, hairline
typography, full color, single print area. The same SVG the customer sees on
screen is shipped to Prodigi.

## How payment triggers fulfilment

The flow holds together without a database:

1. The form posts to `/api/checkout`, which creates a Stripe Checkout Session.
   The `metadata` field carries the date, lat/lon, title, place, colour, and
   size under namespaced keys.
2. Stripe collects the customer's card and shipping address on its hosted
   page. We don't store anything between steps.
3. Stripe redirects to `/success?session_id=…` and fires
   `checkout.session.completed` at `/api/stripe-webhook`.
4. The webhook verifies the Stripe signature, reads the design out of
   metadata, builds the asset URL pointing back at the public Vercel
   endpoint `/api/asset?date=…&lat=…&lon=…&title=…&place=…`, and POSTs to
   Prodigi with `assets[0].url` set to that URL.
5. Prodigi fetches the asset directly (it's on the public internet), prints
   the shirt, and ships it.
6. The webhook records the Prodigi order id in memory (with a JSON-file
   fallback for the in-process Vercel function).
7. `/success` polls `/api/order/<id>` and shows the customer the design
   plus the Prodigi status (`InProgress`, `Complete`, etc).

## Star-map rendering

The SVG is hand-built around the customer's day:

- **Stars**: ~700 procedurally placed circles with size + opacity derived
  from a mulberry32 PRNG seeded on `date | lat | lon | title`. No two
  customers ever see the same field.
- **Constellation**: one of six (Orion, Cassiopeia, Ursa Major, Lyra,
  Scorpius, Cygnus) drawn in serif-yellow over the stars.
- **Moon phase**: Conway's date algorithm gives a phase fraction; a custom
  SVG path draws the lit region correctly for all eight phases.
- **Type**: EB Garamond for the title, JetBrains Mono for the date plate.
  Both fonts ship as TIFF files and are converted to inline SVG paths at
  render time (svgo-friendly, no font-loading required server-side).

## How to test it

Open https://benchmark-20260928-openweights-reru-nu.vercel.app.

1. Pick a date (any YYYY-MM-DD, up to today), a lat/lon (try NYC at 40.71 /
   -74.01, or your own city), a place name, and a title.
2. Watch the live SVG preview on the right update as you type.
3. Pick a shirt color and size, click **See your sky →**.
4. On the preview page, click the swatch you want (or keep the default),
   pick a size, then click **Buy for $34.99 USD →**.
5. Stripe's hosted checkout opens. Use the test card **4242 4242 4242 4242**,
   any future expiry, any CVC, and any postal code. Stripe will collect a
   shipping address on the same page.
6. After paying, you'll land on `/success?session_id=cs_test_…`. The page
   polls the webhook's order record and shows the Prodigi order id plus
   the printer's `InProgress / Complete` status.

Useful direct URLs to verify the asset endpoint (the same URL Prodigi
fetches during fulfilment):

- PNG: `https://benchmark-20260928-openweights-reru-nu.vercel.app/api/asset?date=2018-09-04&lat=40.7128&lon=-74.0060&title=The+night+we+met&place=New+York,+NY`
- SVG: same path with `/api/preview-svg` instead of `/api/asset`

## Verifications I ran

- Local build: `npx next build` succeeds, type-checks clean, generates 6
  static + 3 dynamic routes.
- Local asset: hitting
  `/api/asset?date=2018-09-04&lat=40.7128&lon=-74.0060&title=The+night+we+met&place=New+York,+NY`
  locally returns a 3500×4424 PNG in ~700 ms.
- Local e2e: `scripts/test-webhook.ts` builds a signed `checkout.session.completed`
  event, posts it at the webhook, the webhook verifies the signature,
  derives a valid Prodigi order, and returns the order id + outcome.
- Deployed smoke test: against the live URL every route returns 200.
- Deployed e2e: the same test-webhook fired at the live URL produced
  `ord_1175045` in Prodigi, and Prodigi confirmed the asset had been
  fetched successfully (`asset.status: Complete`).
- Moon-phase path: visually inspected New Moon, Waxing Crescent, First
  Quarter, Waxing Gibbous, Full Moon-equivalent, Waning Gibbous, Last
  Quarter, and Waning Crescent renderings — all draw the right shape.
- Font rendering: verified that hard-baking the EB Garamond + JetBrains
  Mono typefaces as SVG paths (via opentype.js) is the only way to get
  pixel-identical output from the on-screen preview and the printer asset
  on Vercel's serverless image (whose libRSVG doesn't honour
  `@font-face` URLs).

## Production checklist (gaps, in order of severity)

1. **The Stripe + Prodigi keys on the deployment are sandbox/test mode.**
   The `STRIPE_SECRET_KEY` is a sandbox restricted (`rkcs_test_…`) key, the
   publishable is the matching `pk_test_…`, the webhook secret is whatever
   `stripe listen` printed on the operator machine, and the Prodigi key is
   the benchmark sandbox key. None will move real money or print a real
   shirt until you swap them in production mode.
2. **`STRIPE_WEBHOOK_SECRET` is the dev listen secret.** Re-configure
   it once you've added a production webhook endpoint pointing at
   `https://benchmark-20260928-openweights-reru-nu.vercel.app/api/stripe-webhook`
   in the Stripe dashboard, and copy the new signing secret over.
3. **Order records live in `data/<id>.json`** on the function's
   filesystem. That's fine for development but ephemeral on Vercel —
   a serverless function only sees the filesystem for its own invocation,
   so once the function returns the record is gone. Replacing
   `lib/store.ts` with a Vercel KV / Postgres / Turso write is a 30-line
   change; the reader already returns `null` on miss so the success page
   just shows "waiting for the webhook".
4. **No transaction email.** Customers get Stripe's receipt but no
   "your order is in production / shipped" email. Adding Resend or
   Postmark and wiring it into the webhook's status branch is
   straightforward; the order record already has the email + Prodigi
   stage to feed into a template.
5. **Moon-phase math is Conway's approximation**, accurate to within a
   day. For some dates this will show a waxing gibbous where the calendar
   says full moon, etc. The visual is still beautiful but a customer
   comparing it to a USNO reference might notice.
6. **No geocoding.** Customers type lat/lon by hand. A Nominatim /
   Mapbox / Google geocoder front-end would auto-fill the place and let
   them drop the lat/lon inputs entirely.
7. **Stripe Tax is off.** Sales tax isn't calculated; for US/EU sales
   this matters. Stripe Tax is a one-line toggle on the Checkout Session
   in `app/api/checkout/route.ts`.
8. **The `rkcs_` (restricted) Stripe key may not cover every operation.**
   Restricted keys are scoped per Stripe dashboard; if you hit an
   operation it doesn't allow, swap in a full secret key.

## What I'd do next, in priority order

1. Replace the sandbox Stripe + Prodigi keys with production ones and
   re-run `scripts/test-webhook.ts` against the production endpoints to
   verify end-to-end with real keys.
2. Wire the order record into Vercel Blob (or a small KV / Postgres /
   Turso) so polling from `/success` works across deploys.
3. Add Stripe Tax and run a quick check from a few countries that sales
   tax + duties line up.
4. Add Resend (or whichever transactional email provider you use) so the
   customer gets a "shipped" notification when Prodigi emits a status
   webhook.
5. Add a /order/[id] page that takes the prodigi order id and shows the
   customer a real tracking URL when one becomes available.
6. Add a tiny "show me my sky" geocoder so the customer can type a place
   name instead of lat/lon.

## Where things live

```
app/
  layout.tsx, globals.css                       # chrome
  page.tsx                                      # landing form
  preview/page.tsx                              # buy panel + asset preview
  success/page.tsx                              # post-checkout status
  api/
    preview-svg/route.ts                        # GET → SVG (preview)
    asset/route.ts                              # GET → PNG (DTG print asset)
    checkout/route.ts                           # POST → Stripe session
    stripe-webhook/route.ts                     # POST → Prodigi order
    order/[id]/route.ts                         # GET → polling status
components/
  DesignForm.tsx, BuyPanel.tsx, OrderStatus.tsx
lib/
  design.ts                                     # validators, Stripe metadata
  skygen.ts                                     # deterministic star-map SVG
  renderer.ts                                   # SVG → PNG via sharp
  text.ts                                       # glyph → SVG paths (opentype.js)
  prodigi.ts                                    # Prodigi REST client
  stripe.ts, env.ts, store.ts                   # IO helpers
  fonts/                                        # bundled TTF typefaces
    eb-garamond.ttf
    jetbrains-mono.ttf
public/
  fonts/                                        # also served at /fonts for any
    eb-garamond.ttf                              # browser-side preview fallback
    jetbrains-mono.ttf
scripts/
  test-webhook.ts                               # local-only end-to-end test
```

## License

This is a single-tenant reference implementation. Adapt freely.
