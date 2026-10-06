# Under This Sky — personalized celestial apparel

> **Live demo:** https://temporary-snappy-acacia-szy92me.vercel.app
> [Claim and keep this URL](https://vercel.com/claim-deployment?code=975f7645-9811-4a11-8bf4-d034396d817b)

A direct-to-garment (DTG) t-shirt store where every shirt is a **personalized celestial print** —
the night sky above the date and place that matters to *you*, computed in-store by the site,
paid for via Stripe, and fulfilled by Prodigi as a one-of-one print shipped worldwide.

## Why this concept is perfect for DTG

DTG loves designs that would be impossible (or prohibitively expensive) to mass-produce:

- **Every shirt is unique.** Two customers never see the exact same sky because the date+time
  +lat+lng input is unique to their moment — the planets, moon phase, sun position and
  procedural star field all derive from those four numbers.
- **Full colour.** Astronomy is the easiest place to use a dark shirt as a "canvas" — the
  DTG printer lays down white ink on satin-black garments, gold ink for accents, and the
  result looks great on a real shirt.
- **High-margin keepsake.** Each shirt is charged $32 — Prodigi base cost is in the
  $7-12 range for a Gildan 64000, leaving healthy margin.

## Stack

| Layer           | Choice                                                |
|-----------------|-------------------------------------------------------|
| Storefront      | Next.js 14 (App Router) + Tailwind + custom serif hero |
| Astronomy math  | `astronomy-engine` (Don Cross' high-precision lib)     |
| Per-order raster| `@resvg/resvg-js` (with SVG fallback if binary missing)|
| Payments        | **Stripe Checkout** (test mode), with a built-in `demo-pay` route as a no-Stripe fallback |
| Fulfillment     | **Prodigi Print API** (sandbox or live) — Gildan 64000 |
| Deployment      | Vercel (anonymous `--temporary` release for this demo) |

Flow:

```
  customer enters
    date+time+place → design SVG → /api/checkout → Stripe Checkout (or demo-pay)
                                                                │
                                                                ▼
                                                       Stripe `checkout.session.completed`
                                                                │
                                                                ▼
                                              /api/webhook → /lib/fulfill → Prodigi
                                                                ▼
                                                          print + ship
```

## How to test it (live demo)

The store is already deployed to **https://temporary-snappy-acacia-szy92me.vercel.app**.

1. Open <https://temporary-snappy-acacia-szy92me.vercel.app/>
2. Click **Design your shirt →**.
3. Pick a preset moment from the chips, or type your own date / time / coordinates /
   place name.
4. Type a headline (e.g. "The Night We Met") and choose a palette + shirt color.
5. Fill in a shipping name + address — anything valid will do.
6. Hit **Checkout →**. You'll be redirected to a real Stripe Checkout page (test mode).
   Use Stripe's test card `4242 4242 4242 4242`, any future date, any CVC, any postcode.
7. After paying, you land on `/success`. The page polls `/api/order-status/<id>`
   and shows your **Prodigi order id** when production starts.

### Test via the demo-pay path (no Stripe / no browser)

If you can't complete a real Stripe checkout, you can simulate one with curl:

```
URL=https://temporary-snappy-acacia-szy92me.vercel.app

# 1) Create a design
RES=$(curl -sS -X POST $URL/api/checkout -H 'Content-Type: application/json' -d '{
  "design":{
    "dateIso":"2019-06-14T23:30:00Z","lat":38.7223,"lng":-9.1393,
    "placeName":"Lisbon, Portugal","headline":"The Night We Met",
    "subtitle":"Elena & Marco","message":["And so the adventure began."],
    "palette":"ink","garmentColor":"black","garmentSize":"m","quantity":1
  },
  "recipient":{"name":"Demo Customer","email":"d@e.com","line1":"100 Test St",
               "city":"Lisbon","postal":"1000","country":"PT"}
}')
ORDER=$(echo "$RES" | python3 -c "import json,sys;print(json.load(sys.stdin)['orderId'])")

# 2) Trigger payment + Prodigi submission (instead of Stripe)
curl -X POST "$URL/api/demo-pay/$ORDER?paid=1"

# 3) Read status
curl $URL/api/order-status/$ORDER
```

The response will include `prodigiOrderId`. You can inspect it in the
[Prodigi sandbox dashboard](https://sandbox-beta-dashboard.pwinty.com).

### Healthz

`/api/healthz` reports the current configuration (Prodigi key, Stripe key, payment
mode, storage paths). Useful for debugging environment variables.

## Repo layout

```
app/
  layout.tsx                root layout
  page.tsx                  landing page (hero + samples + how-it-works + product details)
  design/page.tsx           customizer — live preview polls /api/preview as you type
  success/page.tsx          poll /api/order-status/[id], show production progress
  globals.css               tailwind + a couple of utilities
  api/
    healthz/route.ts        config status
    preview/route.ts        render design (svg | png) for the live preview
    checkout/route.ts       persist design → write asset → create Stripe Checkout
    webhook/route.ts        Stripe `checkout.session.completed` → fulfill + acknowledge
    demo-pay/[id]/route.ts  no-Stripe fallback (HTML form that POSTs back to fulfill)
    asset/[hash]/route.ts   serve the print asset (PNG or SVG) to Prodigi + browser
    order-status/[id]/route.ts  polled by /success
    prodigi-callback/route.ts   optional Prodigi status-change callback receiver
lib/
  astronomy.ts              RA/Dec + sidereal time + moon phase from astronomy-engine
  sky-model.ts              procedural star field + deterministic PRNG
  design.ts                 compose full 4665×5844 SVG (print spec for Gildan 64000)
  render.ts                 SVG → PNG (lazy-loaded, with graceful fallback)
  payment.ts                single façade: real Stripe or demo emulator
  prodigi.ts                thin Prodigi Print API client
  storage.ts                JSON-file persistence (orders + assets) + asset URL helpers
  services.ts               per-request singletons; reads env
  fulfill.ts                the one chokepoint that posts a paid order to Prodigi
  validate.ts               zod schemas for the design + recipient payloads
scripts/
  smoke-test.ts             generate a design + raster + sanity-check Prodigi auth
  full-test.ts              full local pipeline (creates Prodigi order end-to-end)
```
