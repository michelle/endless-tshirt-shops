# Architecture

A short tour of how STARPRINT works, end to end.

```
                          ┌──────────────┐
   customer on the        │  Next.js     │
   customise page ───────▶│  app         │ ────▶ Stripe (or demo-pay)
                          │  /api/order  │ ────▶ writes order + asset SVG
                          └──────┬───────┘
                                 │
                                 ▼
                          ┌──────────────┐         ┌──────────────┐
                          │ /api/webhook │ ───────▶│ Prodigi      │
                          │ or           │         │ Print API    │
                          │ /api/        │         │ (sandbox)    │
                          │ demo-pay     │         └──────┬───────┘
                          └──────────────┘                │
                                                          ▼
                                                  fulfilment
                                                  (printing + shipping)
```

## Pages

| Path | What it does |
|---|---|
| `/` | Home: hero, three sample personalised star-maps, how-it-works, the chosen shirt (Bella + Canvas 3001), gift note. |
| `/design` | Customise tool with live preview (300 ms debounced SVG regeneration). Form fields: date + time, location (with sample chips), headline + suggested tags, up to 4-line personal message, palette picker, garment color picker, size, quantity, shipping address. |
| `/success?id=…` | Order confirmation page that polls `/api/order-status/[orderId]` every 1.5 s and renders the production-status pill, a keepsake SVG, and the progress checklist. |

## API routes

| Path | Method | Purpose |
|---|---|---|
| `/api/healthz` | GET | Reports Prodigi and Stripe configuration state — useful while debugging env vars. |
| `/api/preview` | GET, POST | Generates an SVG (or PNG) from a `DesignInput`. Used by `/design` live preview. |
| `/api/order` | POST | Persists design → renders print-quality SVG → uploads (or keeps a hosted URL) → creates Stripe Checkout session (or queue for demo-pay). Returns `{ orderId, checkoutUrl }`. |
| `/api/webhook` | POST | Stripe webhook receiver; on `checkout.session.completed` it forwards the order to `/lib/fulfill.ts`. |
| `/api/demo-pay` | GET, POST | Simulates a successful Stripe call. `/api/order` redirects here when `STRIPE_SECRET_KEY` is missing. Immediately submits the order to Prodigi. |
| `/api/order-status/[id]` | GET | Returns the current status of an order. Polled by `/success`. |
| `/api/asset/[hash]` | GET | Serves the persisted print SVG (or cached PNG) by hash, for Prodigi to fetch. |

## The design system

`lib/stars.ts`
: Wraps `astronomy-engine` (Don Cross' high-precision library). For any
(date, lat, lng) returns the geographic position of sun, moon and the five
visible planets, plus moon phase. We deliberately don't include the
thousands of stars from HYG databases — the design wants the sky *impression*
of a moment, not a perfect Hubble plate.

`lib/design.ts`
: Generates the SVG. ViewBox is `4677×5881` to match Prodigi's required
print area for Bella + Canvas 3001. The composition is, top to bottom:

    - night sky disc (radial gradient, planet/moon dots positioned via real
      astronomy, 280 procedural stars, 8 brightest stars linked with dashed
      constellation lines, a 4-point "compass rose" under the disc)
    - italic headline (Cormorant Garamond, gold)
    - three-line uppercase date (Cormorant Garamond, with year·month·day + UTC)
    - location name (uppercase tracking, JetBrains Mono)
    - small lat/lng + ISO date + moon phase annotations along a horizontal row
    - up to 4-line personal message (italic Cormorant)
    - footer with star count, "STARPRINT" mark, DTG timestamp

  Four palettes: `ink` (royal-blue/gold), `ivory` (warm cream/dark ink),
  `rose` (dusty pink/ruby), `sage` (forest green/cream).

## The order pipeline

When a customer submits the form:

1. `/api/order` validates the input and emits the print-size SVG
   (`web/auth/design.ts → generateSvg`).
2. It computes a `designHash` (SHA-256 prefix of the SVG) so identical
   designs re-use the same URL/asset.
3. It serialises the order (`sp_xxxxxxxx`) and stores it on disk.
4. It tries to write the SVG to one of: `process.env.UPLOAD_DIR`,
   `<cwd>/.data`, `/tmp/starprint-data`. (Vercel's `/var/task` is
   read-only in production, hence the multi-directory fallback.)
5. It either:
   - creates a Stripe Checkout session and returns its URL
     (production path), **or**
   - returns a redirect to `/api/demo-pay` (which simulates Stripe success
     and immediately calls Prodigi).
6. The customer pays (or "pays" via demo).
7. Stripe webhook handler (or demo-pay) marks the order `paid`, then
   `lib/fulfill.ts` calls `placeProdigiOrder`. The asset URL sent to Prodigi
   is one of:
   - `https://<site>/api/asset/<hash>.svg` — when the running site can host
     the SVG.
   - `data:image/svg+xml;base64,…` — used when persistence is impossible
     (e.g. read-only serverless FS).
8. Prodigi returns the order ID. We use that as the merchant reference so
   we can correlate orders in their dashboard.

## Why DTG is the right call here

DTG printers lay down ink dot-by-dot directly on cotton fibres. They print:

- **photographic detail** (no plates, no screens);
- **single shirt or batch** with the same unit cost (no setup); and
- **on-demand**, so designs can be unique per order.

That's the *reason* this concept works: without DTG you couldn't make a
personalised star map for $36 plus shipping and still turn a margin.

Two design choices follow from this:

- **High-contrast** colours so the printer doesn't have to anti-alias tiny
  details on cotton. That means dark navy/gold over a light garment, with
  thick fonts.
- **No tiny anti-aliased type** in the print layer. 300 dpi is sufficient
  for our 4–6 pt annotation set; we drop font sizes below 14 px in the
  print rendering to keep things readable.

## Where I'd go next

See README.md "Gaps & things I'd do next" for a more complete list.
