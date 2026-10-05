# Aster — custom night sky t-shirts

A made-to-order storefront that turns a date, a time and a place into the exact
night sky above it, prints that chart on a cotton tee with direct-to-garment
printing, and ships it. Every order is a one-off.

## What it does

- **Fully personalised:** the customer chooses a title, an optional subtitle, a
  date, a local time and a place (geocoded to coordinates and a time zone). We
  project a catalogue of ~2,900 naked-eye stars, the classical constellation
  lines and the moon phase for that exact instant using local sidereal time.
- **Print-ready output:** the same SVG that powers the live preview is
  rasterised to a 4000×4000 transparent PNG (no native modules — the rasteriser
  is WebAssembly) and handed to Prodigi with `fitPrintArea` on the front of a
  Gildan Softstyle 64000.
- **Payment first, then print:** Stripe Checkout collects payment and the
  shipping address. Prodigi is only called from the Stripe webhook (or the
  paid success page) after `payment_status === "paid"`, and every order is
  idempotent on the Checkout Session id.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) on Vercel |
| Payments | Stripe Checkout (hosted, card) |
| Fulfilment | Prodigi Print API v4 (sandbox by default) |
| Raster | `@resvg/resvg-wasm` + bundled Instrument Serif |
| Star data | HYG catalogue subset (mag ≤ 5.5) + d3-celestial constellation lines |

No database. Fulfilment state lives on the Stripe Checkout Session and its
PaymentIntent metadata.

## Run locally

```sh
npm install
cp .env.example .env.local     # fill in the three secrets
npm run dev                    # http://localhost:3000
```

For webhooks locally, forward them with the Stripe CLI:

```sh
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | yes | Test or live secret key |
| `STRIPE_WEBHOOK_SECRET` | yes | Signing secret for `/api/stripe/webhook` |
| `PRODIGI_API_KEY` | yes | Prodigi sandbox or live key |
| `PRODIGI_API_URL` | no | Defaults to the sandbox base URL |
| `SITE_URL` | no | Public origin; otherwise derived from Vercel |

## Deploy

```sh
vercel deploy --prod \
  -e STRIPE_SECRET_KEY=... \
  -e STRIPE_WEBHOOK_SECRET=... \
  -e PRODIGI_API_KEY=...
```

Then point a Stripe webhook endpoint at
`https://<your-domain>/api/stripe/webhook`, subscribed to
`checkout.session.completed` and `checkout.session.async_payment_succeeded`.

## Test the flow

1. Open the store and adjust the chart; the preview updates live.
2. Choose a garment and click **Buy this shirt**.
3. Pay with the Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.
4. The confirmation page shows the paid status and the Prodigi order id; the
   Prodigi sandbox order should move to `InProgress` and download the artwork.

## Known gaps

- The demo deployment is a Vercel **anonymous** deployment, which expires after
  60 minutes unless claimed. Claim it at the URL the CLI prints, or deploy to
  your own Vercel account for a permanent URL.
- No database, so order history is only as durable as Stripe's records.
- No taxes/returns automation; shipping is a single flat rate.
- Geocoding uses the free Open-Meteo endpoint (no key, fair-use).
