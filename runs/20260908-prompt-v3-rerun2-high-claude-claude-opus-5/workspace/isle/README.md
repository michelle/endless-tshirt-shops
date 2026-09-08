# The Isle of You

A single-product store that sells one shirt: an antique sea chart of the customer,
engraved from six answers and printed direct-to-garment.

Six questions become six named places on an island that has never existed before
and will not be drawn again: `THE ISLE OF <name>`, `Port <hometown>`,
`Mount <what you chase>`, `<where you feel safe> Bay`, `The <where your hours go>
Wilds`, and `HERE BE <what you avoid>` beside a sea serpent. Coastline, relief,
forests, soundings, plate number and coordinates are all derived deterministically
from the same answers, so the chart is genuinely one-of-one — which is the thing
DTG can do that screen printing cannot.

## How it fits together

| Piece | File | Note |
| --- | --- | --- |
| The engraver | `src/lib/chart.ts` | Pure TS, no DOM/Node. Same code draws the live browser preview and the print file. |
| Rasteriser | `src/lib/render.ts` | resvg-wasm → transparent PNG, 3120×3860 (200 dpi over a 15.6″ print area). |
| Print file endpoint | `src/app/api/art/route.ts` | Public (Prodigi fetches it) but only renders HMAC-signed payloads. |
| Checkout | `src/app/api/checkout/route.ts` | Stripe Checkout session; the whole design rides in session metadata. |
| Fulfilment | `src/lib/fulfil.ts` | Paid session → Prodigi order. Idempotent. |
| Webhook | `src/app/api/stripe/webhook/route.ts` | `checkout.session.completed`. The only trigger for printing. |
| Order status | `src/app/api/order/route.ts` | Live Prodigi stage + tracking; also a fulfilment safety net. |

**There is no database.** The design is six short strings, so it travels in the
Stripe Checkout session's metadata and the shipping address comes from Stripe.
The Prodigi order id is written back onto the PaymentIntent's metadata, which is
what the order page reads. This keeps the whole thing stateless — and means
Stripe is the system of record, which is where you would want it anyway.

**Nothing prints before payment.** `fulfilSession()` returns early unless
`payment_status === 'paid'`.

**Double-printing** is guarded three ways, because Prodigi supplies no
idempotency of its own — it accepts an `Idempotency-Key` header and an
`?merchantReference=` filter and honours neither (verified against the sandbox,
two identical POSTs produced two orders):

1. The PaymentIntent records the Prodigi order id; fulfilment returns early if set.
2. `createOrder()` scans Prodigi's 50 most recent orders for one already carrying
   this Stripe session id as its `merchantReference`.
3. The order page will not fulfil a session younger than 90 seconds, so it cannot
   race the webhook — it only self-heals a webhook that never arrived.

See "Known gaps" for the residual case this does not cover.

## Environment

```
STRIPE_SECRET_KEY        # test or live secret key
STRIPE_WEBHOOK_SECRET    # whsec_... for the deployed webhook endpoint
PRODIGI_API_KEY
PRODIGI_BASE_URL         # https://api.sandbox.prodigi.com/v4.0 (or /v4.0 on api.prodigi.com)
ART_SIGNING_SECRET       # random 32 bytes; signs print-file URLs
SITE_URL                 # stable public origin, used in the URLs handed to Prodigi
```

## Local development

```bash
npm install
npm run dev                       # http://localhost:3210
stripe listen --forward-to localhost:3210/api/stripe/webhook
```

`scripts/preview.mjs` renders sample charts straight to `out/*.png` without the
app, which is the fastest way to iterate on the engraving.

## Known gaps

- **No orders table.** Two *simultaneous* fulfilment attempts (e.g. Stripe
  delivering the same event twice at once) could both scan Prodigi, both find
  nothing, and both create an order. The real fix is an `orders` table with a
  unique constraint on the Stripe session id, claimed in a transaction before
  the Prodigi call. The 50-order scan window is also finite: at high volume an
  older duplicate could fall outside it.
- **The engraving font is Latin-only.** IM Fell has no CJK, Cyrillic, Greek or
  Arabic glyphs. Input containing them is rejected at the designer and again in
  `/api/checkout`. Supporting those scripts means bundling a second face and
  choosing per-run — worth doing before marketing outside Latin-script markets.
- **No tax collection.** Stripe Tax is not enabled, but Prodigi charges VAT on
  EU/UK fulfilment (about $3–5 a shirt). Margins absorb it today; registration
  and Stripe Tax are required before selling into those markets at volume.
- **Express shipping is priced thin.** $14 charged against a fulfilment cost of
  $22–45 depending on destination. Never loss-making, but express to Japan nets
  about $17 against $32 for standard. Either raise the rate or restrict express
  to nearby destinations.
- **No transactional email of our own.** Customers get Stripe's receipt and the
  order page; there is no "your shirt shipped" mail. Prodigi can POST status
  callbacks — wiring those to an email provider is the next step.
- **No admin view.** Order lookup is by Stripe session id only. Refunds and
  cancellations are done in the Stripe and Prodigi dashboards, and a refund does
  not currently cancel the Prodigi order.
- **Preview is an approximation.** The mockup composites the chart onto a flat
  garment silhouette with a blend mode. Real DTG on dark cotton uses a white
  underbase and prints bolder than the preview suggests. Ordering physical
  samples before launch is essential.
