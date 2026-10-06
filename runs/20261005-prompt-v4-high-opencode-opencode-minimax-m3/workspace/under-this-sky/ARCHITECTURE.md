# Architecture

A short tour of how *Under This Sky* works, end to end.

```
                          ┌──────────────┐
   customer on the        │  Next.js     │
   customise page ───────▶│  app         │ ────▶ Stripe Checkout (or demo-pay)
                          │  /api/checkout│ ────▶ writes order + asset (PNG or SVG)
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

| Path           | What it does                                                |
|----------------|-------------------------------------------------------------|
| `/`            | Home — hero, three sample star maps, how-it-works, garment  |
| `/design`      | Customise tool with live preview (350 ms debounced fetch)   |
| `/success`     | Polls `/api/order-status/[id]` every 1.5 s, shows production stage |

## API routes

| Path                            | Method(s)        | Purpose                                          |
|---------------------------------|------------------|--------------------------------------------------|
| `/api/healthz`                  | GET              | Reports Prodigi + Stripe + payment-mode + storage|
| `/api/preview`                  | GET              | Generates an SVG (or PNG) preview for the page   |
| `/api/checkout`                 | POST             | Persist design → asset → create Stripe Checkout  |
| `/api/webhook`                  | POST             | Stripe webhook → mark paid → fulfill             |
| `/api/demo-pay/[id]`            | GET, POST        | No-Stripe fallback (HTML form + simulate paid)   |
| `/api/asset/[hash]`             | GET              | Serves the print-quality asset (PNG|SVG)         |
| `/api/order-status/[id]`        | GET              | Polled by `/success`                             |
| `/api/prodigi-callback`         | POST             | Optional Prodigi status-change callback          |

## The design system

`lib/astronomy.ts` wraps `astronomy-engine` to derive, for any (date+lat+lng), the
right ascension + declination of the sun, moon, and the five classical naked-eye
planets; the moon's phase (and a friendly name); and the local sidereal time.
Coordinates are deliberately rendered (not interpolated from a star catalogue) so
each shirt shows the *real* celestial sky your customer's moment had.

`lib/sky-model.ts` builds a procedural star field on a sphere. Stars are sampled
deterministically from `(date+lat+lng+headline+palette)` via a Mulberry32 PRNG
seeded by FNV-1a — identical inputs always produce exactly the same stars, but
two different moments never will. We never claim a specific constellation name;
the design shows the *impression* of the sky, not a Hubble-quality plate.

`lib/design.ts` composes the SVG at 4665×5844 px (Prodigi's Gildan 64000 print
spec). Top to bottom:

1. **Headline** — large italic Cormorant, 320 px
2. **Subtitle** — small uppercase, 120 px, gold
3. **Sky disc** — radial gradient with a procedural star field, dashed gold
   constellation lines, sun + moon + 5 planet glyphs with per-glyph labels
4. **Date strip** — uppercase tracked date with UTC offset
5. **Place** — city + country, large tracked uppercase
6. **Coordinates + moon-phase** — small caption with lat/lng + phase name
7. **Personal message** — up to 2 lines of italic text
8. **Footer** — `UNDER · THIS · SKY` + DTG serial number

Four palettes: `ink` (royal-blue/gold on dark), `ivory` (warm cream on light),
`rose` (dusty pink on cream), `sage` (forest green on cream).

Garment shirt colour is independent of the *artwork* palette — the design's text
embedded in the SVG (the panel) does not change, but customers see the
fabric they're ordering in the picker.

## The order pipeline

When a customer submits the design:

1. `/api/checkout` validates the payload (`zod`).
2. It generates the print-size SVG via `lib/astronomy` → `lib/design`.
3. It tries to rasterise to a 3000 px PNG via `@resvg/resvg-js`. If the package's
   native binary is unavailable (e.g. serverless ARM64 without the optional
   `@resvg/resvg-js-linux-arm64-gnu` install), it falls back to writing the SVG
   directly — Prodigi also accepts SVG and rasterises it.
4. It writes the asset to `data/assets/<hash>.{png|svg}` and a canonical
   `/api/asset/<hash>` URL is recorded on the order.
5. It creates a Stripe Checkout session (or, in demo mode, returns a
   `/api/demo-pay/<orderId>` URL that simulates payment synchronously).
6. After payment, either:
   - The Stripe webhook at `/api/webhook` (signed with `STRIPE_WEBHOOK_SECRET`),
   - OR the `?paid=1` POST of `/api/demo-pay/<orderId>`,
   fires `lib/fulfill.ts` which posts the order to Prodigi.

## Persistent storage on Vercel

The current implementation reads/writes JSON files to a local `data/` dir.
This works fine on a single Lambda instance (and in local dev), but the
ephemeral nature of Vercel function `/tmp` means each cold start loses
prior state. Production deployments should switch to a real database
(Vercel KV, Postgres on Neon, or Supabase) and an object store for assets
(Vercel Blob, S3, R2).

## Why one design function, not composable chunks

The design is a single `lib/design.renderDesign(input, snapshot)` call. We
deliberately don't break it into React-style composables — every component
is computed once and the only outputs are bytes and a hash. That keeps the
preview, the persisted asset, and the Prodigi upload identical to the last
pixel.
