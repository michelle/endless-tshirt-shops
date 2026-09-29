# Nightshift

**The sky above the moment that mattered.**

A print-on-demand t-shirt store built for DTG (direct-to-garment): every shirt
is a one-of-one star map, computed for one customer's place and moment and
printed directly onto the garment. Nothing is stocked; nothing repeats.

Give it a place and a local wall-clock time — the night you met in Cape May,
the hour your daughter was born in Kyoto — and Nightshift computes the actual
sky at that instant: 2,189 catalogue stars sized by magnitude, 89 IAU
constellation figures, and the Moon with its real phase and position, all in
the customer's timezone (DST included, via the IANA zone rules in `Intl`).
The customer sees the exact file that will print: the live preview and the
3600 × 4800 px (12″ × 16″ at 300 DPI) print file are the same renderer at
different sizes.

- **Storefront** — static, dependency-free ES modules (`public/`): a designer
  with place search (Open-Meteo geocoding), three sky styles, four garment
  colors, XS–4XL, live pricing and preview.
- **API** — Vercel serverless functions (`api/`), zero runtime dependencies
  except the official `@vercel/blob` client: pricing/validation, print-file
  storage, Stripe Checkout creation, payment-verified fulfillment, and a
  Stripe webhook endpoint.
- **Payments** — Stripe Checkout. Prices are computed server-side from
  `api/_lib/config.js`; the client is never trusted.
- **Fulfillment** — Prodigi Print API v4 (`GLOBAL-TEE-BC-3001`, Bella +
  Canvas 3001, printed front, `fillPrintArea`). **Orders are sent to Prodigi
  only after Stripe reports the session `paid`.**
- **Print files** — rendered in the customer's browser, uploaded to this
  project's public Vercel Blob store, and re-verified (`head`) at checkout.

## The order pipeline

```
design → POST /api/print-upload  (PNG → Vercel Blob, public URL)
       → POST /api/checkout      (server-side pricing, Stripe Checkout
                                  Session; full order travels in metadata)
       → customer pays on Stripe
       → success page → GET /api/order-status?session_id=…
       → server re-fetches the session from Stripe
       → payment_status === 'paid'  ← the only gate to Prodigi
       → POST https://api.sandbox.prodigi.com/v4.0/orders
          (idempotency key = Stripe payment intent id)
       → PaymentIntent metadata records the Prodigi order id
```

The webhook endpoint (`POST /api/webhooks/stripe`, signature-verified)
triggers the same idempotent fulfillment, so a closed browser tab between
payment and redirect doesn't lose an order while a listener is running.

## Tests

```sh
npm test
```

16 tests. The astronomy is pinned to Paul Schlyter's published worked
example (1990 April 19, 00:00 UT), cross-checked against the Astronomical
Almanac in his tutorial: Sun RA/Dec, Moon RA/Dec/ecliptic position, GMST,
alt/az, projection geometry, DST transition handling, plus pricing,
validation, metadata round-trips, the webhook signature scheme, and the
Prodigi order body shape.

## Development

```sh
npm install
npm run build-data   # regenerate public/js/stars.js + constellations.js
```

Environment variables (set on the Vercel project, never committed):

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe API key (a Stripe sandbox restricted key in this deployment) |
| `PRODIGI_API_KEY` | Prodigi Print API key (`test_…` → sandbox base, else live) |
| `BLOB_READ_WRITE_TOKEN` | Issued by Vercel when the Blob store was connected |
| `STRIPE_WEBHOOK_SECRET` | Optional; set while running `stripe listen` |
| `PRODIGI_API_BASE` | Optional; overrides the API base URL |

## Deploying

```sh
vercel deploy --prod
```

## Known gaps (read before production)

1. **Webhooks while unattended** — no webhook endpoint is registered in the
   Stripe dashboard, so server-side fulfillment fires only from the success
   page (`/api/order-status`) or while `stripe listen` is forwarding. A
   customer who closes the tab exactly between payment and redirect would
   still be caught by the webhook once it is registered. Production: add the
   webhook endpoint in the Stripe dashboard and set its signing secret.
2. **Sandbox everything** — Stripe sandbox keys expire, and Prodigi sandbox
   orders never actually print or ship. Production: a real Stripe account and
   a live Prodigi key (the code switches to the live API automatically for
   non-`test_` keys).
3. **Print uploads are unauthenticated** — anyone can store a PNG in the
   blob store; orphaned uploads from abandoned carts are never cleaned up.
   Only URLs from this project's store are accepted at checkout, so they
   can't affect orders, but production wants rate limiting and a lifecycle
   rule for orphaned blobs.
4. **No persistence beyond Stripe/Prodigi** — order state deliberately lives
   in Stripe metadata and the Prodigi order system (the PaymentIntent records
   the Prodigi order id). There is no local order database, no email
   receipts from the store itself, and no admin surface.
5. **Single SKU, fixed print geometry** — one Bella + Canvas 3001 tee in
   four colors and eight sizes. Prodigi's DTG variants accept slightly
   different print-area aspect ratios (0.70–0.81); `fillPrintArea` crops only
   transparent margin because every mark sits inside the central disc.
6. **Refunds/cancellations** — not wired: a Stripe refund would not cancel
   the Prodigi order (Prodigi exposes a cancel action while the order is
   still `InProgress`).
7. **Tax and shipping realism** — flat shipping tiers, no tax computation;
   adaptive pricing and tax are off. Prodigi quote API integration would set
   shipping cost by destination.

## Credits

Star data: the HYG database v41 (astronexus, CC BY-SA 4.0). Constellation
figures: d3-celestial (Olaf Frohn, BSD-2-Clause). Lunar/planetary math after
Paul Schlyter's public tutorial. Fonts: Cormorant Garamond & Inter (Google
Fonts, OFL).
