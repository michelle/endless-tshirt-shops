# SKYWRITER — wear the night your sky changed

A fully customized direct-to-garment (DTG) t-shirt store. Every order is
individually computed: the customer enters a date, time and place, the app
calculates the actual night sky (1,716 stars from the Yale Bright Star
Catalogue, constellation figures, and the moon's phase) over that spot at that
moment, renders a 300-DPI print file, and sends it to Prodigi's global DTG
print network — but **only after the customer's payment has succeeded**.

## Stack

- **Next.js 14** (App Router) on Vercel — no database: Stripe Checkout
  sessions and Prodigi's order API are the stores of record.
- **Prodigi Print API v4** — Bella+Canvas 3001 (`GLOBAL-TEE-BC-3001`),
  print area `front` (15.6" × 19.3" @300 DPI → 4680 × 5790 px PNG).
- **Stripe** — payments via hosted Checkout; the webhook is the only path
  that turns a paid order into a Prodigi order.
- **@napi-rs/canvas (Skia)** — server-side print rendering (full-res PNG in
  <1 s). The browser preview shares the same drawing code.
- Star/constellation data: d3-celestial (BSD-3) → `data/`. Fonts: EB Garamond
  (OFL 1.1), embedded in `lib/fonts.js`.

## How an order flows

1. Customer designs a shirt → cart (localStorage) → checkout.
2a. **Stripe configured:** `POST /api/checkout` creates a Checkout Session
    (one line item per design, design JSON in line-item metadata). Stripe
    collects card + shipping address. On `checkout.session.completed` the
    signature-verified webhook (`/api/webhooks/stripe`) reads the line items,
    renders the artwork URL, and creates the Prodigi order
    (`idempotencyKey = orderRef` — replays are deduplicated).
2b. **No Stripe keys:** with `ENABLE_SANDBOX_CHECKOUT=true` the checkout page
    shows a clearly-labeled sandbox pay button; `POST /api/pay/sandbox`
    simulates the payment-success event and fulfills in the same request.
    Nothing is charged; Prodigi stays in sandbox.
3. Confirmation page (`/success?ref=…`) polls `/api/order-status?ref=…`,
   which queries Prodigi live — print stage and tracking numbers appear as
   they happen. Prodigi callbacks land at `/api/prodigi-callback/<secret>`.

### Artwork without storage

The print PNG is regenerated on demand by `GET /api/artwork/<signed>.png`
(HMAC-signed design params in the URL), so Prodigi can fetch full-resolution
artwork straight from the app — no S3/Blob needed. Responses are immutable and
CDN-cached.

## Environment variables

See `.env.example`. Production-critical ones:

| Variable | Notes |
| --- | --- |
| `PRODIGI_API_KEY` | Sandbox key for testing; live key for production |
| `PRODIGI_BASE` | `https://api.sandbox.prodigi.com/v4.0` or `https://api.prodigi.com/v4.0` |
| `SITE_URL` | Public origin used for artwork + callback URLs |
| `APP_SECRET` | HMAC secret for artwork URLs (`openssl rand -hex 32`) |
| `PRODIGI_CALLBACK_SECRET` | Random path segment for the Prodigi callback |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | All three → real card payments |
| `ENABLE_SANDBOX_CHECKOUT` | `true` for demo only; never in production |

## Diagnostics

`GET /api/selftest` checks env config, homepage, artwork rendering, and runs
a full sandbox order (homepage → artwork → Prodigi order → status read-back).
Returns a JSON report. Remove or protect before production.

## Going to production (checklist)

1. **Stripe:** create the webhook in the Stripe dashboard pointing at
   `https://<your-domain>/api/webhooks/stripe` (event:
   `checkout.session.completed`), set the three `STRIPE_*` vars.
2. Set `ENABLE_SANDBOX_CHECKOUT=false` (or delete it).
3. Remove or lock down `/api/selftest` and `/api/pay/sandbox`.
4. Swap in the **live** Prodigi key + `PRODIGI_BASE=https://api.prodigi.com/v4.0`.
5. `SITE_URL` = your real domain; add the domain in Vercel.
6. Enable Stripe Tax / configure tax collection; review shipping countries in
   `app/api/checkout/route.js`.
7. Optional but recommended at volume: a real order database for history and
   analytics (the architecture is deliberately stateless, so this is additive).

## Local development

```bash
npm install
cp .env.example .env   # fill in values
npm run dev            # http://localhost:3100
```
