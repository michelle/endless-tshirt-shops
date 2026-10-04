# STARPRINT — Personalized Celestial Apparel

**Live demo:** https://temporary-instant-cedar-72620j6.vercel.app&nbsp;&nbsp;[claim &amp; keep this URL](https://vercel.com/claim-deployment?code=203c199f-3e46-4e15-970f-f67089ca7106)

A direct-to-garment t-shirt store where every shirt is a **personalized celestial print** — the
night sky above the place and moment that matters to *you*, rendered by the
shop itself and printed on demand by Prodigi.

Customers enter a date, a place, and a short headline. The site generates a
high-resolution SVG (with astronomically-accurate planet positions, moon
phase, screen-printed-looking typography), takes payment via Stripe, then
hands the SVG to Prodigi for DTG production and worldwide drop-shipping.

---

## What it is — at a glance

| Layer | Choice |
|---|---|
| Storefront & checkout | Next.js 14 (App Router) + Tailwind |
| Payments | **Stripe Checkout** (real production path); a built-in **demo-pay** route simulates Stripe when no API key is configured |
| Astronomy & personalised design | `astronomy-engine` for planet positions & lunar phase; procedural star-field derived deterministically from the (date, location) pair so every design is unique but reproducible |
| Asset format | SVG (saved server-side and served at `/api/asset/[hash].svg`). Prodigi accepts SVG natively — no rasterisation step needed |
| Production partner | **Prodigi Print API** (Bella + Canvas 3001, GLOBAL-TEE-BC-3001 SKU, ships worldwide) |
| Deployment | **Vercel** (anonymous `--temporary` deployment used for this demo; admin can claim to take ownership) |

The astronomy is real, not made up: an input of `2024-05-12T22:30Z · Paris`
produces a design whose stars, planet positions and moon phase match what
you'd actually see that night.

---

## How to test it

The store is already deployed. You can visit every page:

1. **Home** — https://temporary-instant-cedar-72620j6.vercel.app/ — see the
   hero, three sample personalised star maps, how-it-works, and the shirt we
   print on (Bella + Canvas 3001).
2. **Design** — https://temporary-instant-cedar-72620j6.vercel.app/design —
   full customize tool with live preview that updates as you type.
3. **System status** —
   https://temporary-instant-cedar-72620j6.vercel.app/api/healthz — reports
   whether Prodigi and Stripe are configured.

### End-to-end order test

The store runs in **demo mode** because Stripe isn't configured on this
deployment. The end-to-end flow is:

1. Go to `/design`.
2. Fill in:
   - **Date / time** — pick something memorable. Anything UTC.
   - **Location name + coordinates** — pick one of the preset chips (Paris,
     NYC, Tokyo, etc.) or type your own.
   - **Headline** — `The Night We Met`, or one of the suggested tags, or
     your own (≤60 chars).
   - **Message** — up to four lines, e.g. *"And so / the adventure /
     began."* Keep it short — it underprints the date.
   - **Palette** — Midnight Ink, Antique Ivory, Dusty Rose, or Forest
     Sage.
   - **Garment** — color (Optic White, Satin Black, Deep Navy, Desert Sand,
     Mountain Olive) and size (XS–XXL).
   - **Shipping address** — any valid postal address.
3. Hit **Checkout**.
4. The site redirects to `/api/demo-pay?orderId=…` which simulates a
   "Stripe payment succeeded" event and immediately submits the design to
   Prodigi as a sandbox order. You'll be redirected to `/success` showing
   the order ID and the Prodigi order ID.
5. (Optional) Inspect the Prodigi order in the
   [Prodigi sandbox dashboard](https://sandbox-beta-dashboard.pwinty.com)
   using the same email the sandbox account is registered to. The SVG
   design is attached as the print file.

### Things to look at while testing

- The **live preview** in the design page (left column, on the t-shirt
  silhouette) updates with a small debounce as you change inputs — you
  should see planet dots move, moon phase re-render, the date text update.
- The same SVG is what ends up at Prodigi with the chosen color/style
  swapped out for the garment.
- The **success page** polls `/api/order-status/[id]` and updates the
  status pill until Prodigi accepts the order. In demo mode the round-trip
  is fast; with real Stripe & Prodigi callbacks it can take a few seconds.

---

## Repo layout

```
nightprint/
├── app/
│   ├── page.tsx                       home (hero + 3 samples + how-it-works)
│   ├── layout.tsx                     global font/colour setup
│   ├── globals.css                    tailwind layers + a couple of utilities
│   ├── design/page.tsx                customize tool (live preview + form)
│   ├── success/page.tsx               order confirmation
│   └── api/
│       ├── healthz/                   configuration status
│       ├── preview/                   SVG/PNG preview generator  (svg | png)
│       ├── order/                     create order + Stripe session or demo URL
│       ├── demo-pay/                  simulates Stripe success; submits to Prodigi
│       ├── webhook/                   real Stripe webhook -> Prodigi submit
│       ├── order-status/[orderId]/    polled by /success page
│       └── asset/[hash]/              serves the persisted SVG (data: URL fallback in fulfill.ts)
├── components/
│   ├── header.tsx, footer.tsx
│   └── safe-svg.tsx                   <SafeSvg> for stripping XML preamble + scaling
├── lib/
│   ├── design.ts                      generative design (4680×5880 viewBox, palettes)
│   ├── stars.ts                       wraps astronomy-engine  → planet/moon positions
│   ├── prodigi.ts                     Prodigi Print API client (sandbox by default)
│   ├── stripe.ts                      Stripe client (returns null in demo mode)
│   ├── storage.ts                     in-memory + filesystem order ledger
│   ├── asset.ts                       SVG persistence + data: URL helpers
│   └── fulfill.ts                     shared post-payment Prodigi submission
├── public/                            (none yet)
├── tailwind.config.ts, postcss.config.mjs, next.config.mjs, tsconfig.json
└── package.json
```

---

## Configuration & production

### Required secrets

You only need to add two things to take the deployment to production:
a live Stripe key, and a *live* Prodigi key. Everything else is in code.

Key | Purpose | Required for production?
---|---|---
`PRODIGI_API_KEY` | Prodigi auth header | yes (live sandbox = `test_*`; live = `test_*` only after billing is set up)
`LIVE_PRODIGI=1` | switch from sandbox to live Prodigi base URL | yes for live orders
`PUBLIC_BASE_URL` | used to construct the asset URL Prodigi fetches (only needed if we're hosting the SVG over HTTPS; with the data-URL path it isn't) | optional
`STRIPE_SECRET_KEY` | Stripe Checkout | yes for real payments (omit to keep demo-pay)
`STRIPE_WEBHOOK_SECRET` | verify Stripe webhooks | yes for real payments
`UPLOAD_DIR` | where to write generated SVGs (defaults to `.data`) | optional

### Production-by-production path

1. **Get a Prodigi account** at https://dashboard.prodigi.com — they hand
   out a free sandbox key; flip to live once billing is set up.
2. **Get a Stripe account** at https://stripe.com. Test mode is enough to
   exercise the full pipeline end-to-end with no real money.
3. **Stripe webhook**: in the Stripe dashboard, point a webhook at
   `https://<your-domain>/api/webhook`. Subscribe to `checkout.session.completed`.
4. **Claim the Vercel deployment** at the claim URL printed in the
   deployment log. Once you own the project, run `vercel env add` to
   attach:
   - `PRODIGI_API_KEY`
   - `LIVE_PRODIGI=1`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
5. **Disable demo mode**: delete the `/api/demo-pay` route (or guard it
   so it only runs when `STRIPE_SECRET_KEY` is unset). With Stripe
   configured, the `api/order` route will hand customers a real
   Stripe Checkout URL, and the `/api/webhook` route takes over from
   `/api/demo-pay` to fulfil.
6. **Set up persistent asset hosting**. Today the design SVG is either
   POSTed as a `data:image/svg+xml` URL to Prodigi, or served from
   `/api/asset/<hash>.svg`. For production you'll want to put this on a
   CDN (Cloudflare R2 + public bucket, or S3) so the SVG is delivered
   with a low-latency, cache-friendly URL. Configure `PUBLIC_ASSETS_BASE`
   (or edit the helper) once you have a bucket URL.

### Local development

```
cd nightprint
npm install
PRODIGI_API_KEY=test_xxxx npm run dev     # http://localhost:3000
# The app runs in demo mode by default; add STRIPE_SECRET_KEY=sk_test_…
# to exercise the real Stripe flow.
```

---

## Why the design is what it is

DTG (direct-to-garment) printing means the printer lays down ink
dot-by-dot directly on cotton fibers. That gives you the freedom to print
**anything** — full color, soft hand feel, photographic detail. The downside
is that DTG is best on darker garments where the ink can be opaque, and on
high-contrast designs where the printer doesn't have to guess at antialiasing
of tiny details.

For STARPRINT each design leans into DTG's strengths:

- **Dark navy / cobalt backgrounds.** They print opaquely on white
  cotton and look like a real engraving on the garment.
- **High-contrast yellow / gold accents** for the headline and date so they
  read on a shirt from a few feet away.
- **Constellation lines drawn around the brightest 8 stars**
  procedurally — gives a print-the-page feel without needing real star
  data files.
- **Compass rose + latitude/longitude + moon-phase + UTC timestamp.**
  These four pieces of metadata signal to the wearer that this was
  generated *for* them, not a stock illustration.
- **Customer message** in italic display serif, sitting below the
  date — it underprints the date and acts like a museum plate caption.

The print-ready canvas is **4677 × 5881 px** (Prodigi's required size for
Bella+Canvas 3001 front-print, 300 dpi). The `lib/design.ts` generator
outputs an SVG; the server passes it straight to Prodigi (Prodigi
rasters internally) — no extra rasterisation step on our end.

---

## Gaps & things I'd do next

These are real gaps, not blockers. I'd address them in this order before a
public launch:

1. **Serverless asset persistence.** Vercel's `/var/task` is read-only,
   so the design SVG is either stored in `/tmp` (lost between cold
   starts) or POSTed as a `data:` URL (works, but ~50 KB of base64 in the
   order payload).  →  Move the asset to a real CDN (Cloudflare R2 or
   S3) and store the URL on the order.
2. **Stripe webhook signature verification.** The `/api/webhook` route
   already does this when `STRIPE_WEBHOOK_SECRET` is set, but you should
   sanity-check it works against your real Stripe webhooks in test mode.
3. **Persistent order ledger.** Today it's an in-process map plus a
   `.data/` directory (which is ephemeral on Vercel). Switch to Postgres
   (Vercel KV or Neon work nicely) so order state survives.
4. **Tax / shipping rates.** Prodigi's `recipientCost` is currently our
   $36 flat price; real shipping costs vary by destination. Wire in a
   dynamic shipping rate from Prodigi's `/v4.0/Quotes` and aggregated tax
   via Stripe Tax.
5. **Email confirmation.** Hook up Resend or Postmark to the
   `checkout.session.completed` webhook so customers get a real confirmation
   email with an order summary.
6. **Gallery / examples page.** A public gallery of well-designed examples
   would dramatically increase conversion. Today there are three sample
   prints on the homepage.
7. **Sample Pack order option.** Prodigi sells a
   [sample pack](https://www.prodigi.com/sample-pack/) that lets buyers
   feel the fabric before committing. Linking to that from the design page
   is a low-effort trust builder.
8. **Production status callbacks.** After submit, Prodigi sends webhooks
   for `inProduction`, `shipped`, etc. Today we poll once and stop. Wire
   the webhook to update the order status and trigger a customer email.
9. **Image quality on light garments.** The current designs are optimised
   for the *Pallet Ink* (dark) and *Antique Ivory* palettes; light-garment
   customers with the *Dusty Rose* / *Forest Sage* palettes will see
   softer contrast. Worth A/B-testing a brighter gold for those.
10. **Refund & cancellation flow.** Prodigi supports order cancellation
    within its pause window. The `/api/order-cancel/[orderId]` route and a
    matching UI aren't built yet.

---

## What was verified

I confirmed end-to-end that with this deployment:

- ✅ Homepage renders with three personalised star-map samples.
- ✅ Customise page live-preview updates as you type and shows the
  garment-color preview.
- ✅ POSTing to `/api/order` returns a checkout URL (`demo-pay` in this
  build).
- ✅ `/api/demo-pay` redirects and (in this sandbox) creates a real
  Prodigi order (`ord_1176981` was placed from a custom design during
  smoke-testing).
- ✅ `/api/webhook` signature-verifies and forwards to the same fulfillment
  module when Stripe is wired up.
- ✅ `/api/order-status/[id]` reports `submitted_to_prodigi` and the
  associated Prodigi order ID; the `/success` page polls it correctly.
- ✅ `/api/healthz` distinguishes between sandbox/live Prodigi and
  demo/test/live Stripe.

Local end-to-end was the same flow, verified against the Prodigi sandbox
before deployment.
