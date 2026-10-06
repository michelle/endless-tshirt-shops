# Under Same Sky

Personalised star-map t-shirts. A customer picks a date, a time, a place, a
caption, two names, a shirt colour and a size; the app computes the real sky
over that place at that instant and renders a print-ready star map. Payment is
taken with Stripe Checkout; the order is submitted to Prodigi **only after**
Stripe confirms the payment succeeded.

## Stack

- Plain Node.js serverless functions on Vercel (`api/*.js`) + static frontend
  (`public/`) — no build step, no framework.
- `@resvg/resvg-wasm` renders the SVG star map to a PNG in-process (WASM, no
  native binaries).
- Stripe Checkout (hosted) for payment; a signed webhook plus a success-page
  poll both trigger fulfilment, idempotently.
- Prodigi Print API v4 for printing and shipping.

## Flow

1. `POST /api/checkout` validates the design, prices it, signs the design into
   an HMAC token, and creates a Stripe Checkout Session (shipping address
   collected by Stripe). Returns the hosted checkout URL.
2. The customer pays on Stripe.
3. Either `GET /api/order?session_id=…` (success page) or
   `POST /api/webhook` (Stripe event) retrieves the session from Stripe,
   verifies `payment_status === "paid"`, mode, currency and total, and then
   builds the Prodigi order.
4. `GET /api/design?t=<signed token>` renders the print-resolution PNG that
   Prodigi downloads. The token is signed so the URL can't be guessed or
   altered.
5. Prodigi order uses the Stripe session id as `idempotencyKey`, so retries and
   duplicate webhooks never print twice.

## Files

```
api/
  checkout.js        create the Stripe Checkout Session
  sandbox-order.js   1-click sandbox evaluation (Stripe PaymentIntent -> Prodigi)
  order.js           verify payment, then fulfil (success-page poll)
  track.js           live Prodigi order status tracker
  webhook.js         verify Stripe signature, then fulfil
  design.js          render preview (POST) / print asset (GET, signed)
  health.js          configuration status
  _lib/
    astro.js         sidereal time, alt/az projection, moon phase
    data.js          loads the bright-star + constellation-line catalogues
    design.js        builds the star-map SVG and rasterises it
    token.js         HMAC sign/verify of the design spec
    catalog.js       product SKU, colours, sizes, pricing
    spec.js          input validation + Prodigi order payload
    stripe.js        Stripe REST client
    prodigi.js       Prodigi REST client
    fulfill.js       shared "verify then print" logic
    http.js          helpers
  _assets/
    data/            stars.6.json, constellations.lines.json (d3-celestial)
    fonts/           Crimson Text + Lato (SIL OFL)
public/              storefront, success page, policies
scripts/dev-server.js  run the functions locally
```

## Environment

| Variable | Purpose |
| --- | --- |
| `PRODIGI_API_KEY` | Prodigi API key (sandbox by default) |
| `PRODIGI_API_BASE` | defaults to `https://api.sandbox.prodigi.com/v4.0` |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` or restricted) |
| `STRIPE_WEBHOOK_SECRET` | signing secret for `POST /api/webhook` |
| `ART_SIGNING_SECRET` | HMAC key for design URLs |

## Local development

```sh
npm install
PRODIGI_API_KEY=… STRIPE_SECRET_KEY=… ART_SIGNING_SECRET=dev node scripts/dev-server.js
# http://localhost:4311
```

## Deploy

```sh
vercel deploy -e PRODIGI_API_KEY=… -e STRIPE_SECRET_KEY=… \
  -e ART_SIGNING_SECRET=… -e STRIPE_WEBHOOK_SECRET=…
```

`vercel.json` includes the WASM binary and font/star assets in the `design`
function bundle.

## Credits

Star and constellation data: [d3-celestial](https://github.com/ofrohn/d3-celestial)
(HYG database, CC BY-SA). Fonts: Crimson Text and Lato (SIL Open Font License).
