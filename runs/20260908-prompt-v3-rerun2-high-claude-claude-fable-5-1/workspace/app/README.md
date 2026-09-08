# Under These Stars — custom star-map tees

A print-on-demand t-shirt store where every shirt is unique: the customer picks a
place, date and local time, and the store computes the real night sky above that
spot at that minute (5,000+ stars from the Yale Bright Star Catalogue, plus
constellation lines), adds their words, and prints it direct-to-garment.

## How it works

1. `/` — the designer. A live SVG preview on a shirt mockup is generated in the
   browser by `src/lib/starmap.ts`, the same code that produces the print file.
2. `POST /api/checkout` — validates the design server-side and creates a Stripe
   Checkout Session (shipping address + phone collection, two flat shipping rates).
   The design is stored in the session metadata. Nothing is sent to the printer.
3. `POST /api/webhooks/stripe` — on `checkout.session.completed` (and
   `async_payment_succeeded`) with `payment_status = paid`, `src/lib/fulfil.ts`
   builds a Prodigi order (SKU `GLOBAL-TEE-GIL-64000`, colour/size attributes,
   `fillPrintArea`) with a signed print-asset URL and writes the Prodigi order id
   back to the Stripe session metadata. Idempotent via metadata + Prodigi
   `idempotencyKey`. A 5xx makes Stripe retry.
4. `GET /api/print/<signed-token>.png` — renders the 4665×5844 (300 dpi, full
   front print area) transparent PNG on demand with resvg. Only HMAC-signed
   tokens (created at fulfilment) render, so the renderer cannot be abused.
5. `/orders/<session id>` — order status page, polls `/api/orders/<id>` which
   reads Stripe + Prodigi. Includes a safety net that fulfils a paid session if
   the webhook has not done so within two minutes.

No database: Stripe is the system of record, the print file is deterministic
from the signed token.

## Environment variables

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret (or restricted) key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the webhook endpoint pointing at `/api/webhooks/stripe` |
| `PRODIGI_API_KEY` | Prodigi API key (sandbox or live) |
| `PRODIGI_API_URL` | `https://api.sandbox.prodigi.com/v4.0` or `https://api.prodigi.com/v4.0` |
| `DESIGN_SIGNING_SECRET` | Random 32+ char secret for print-asset tokens |
| `NEXT_PUBLIC_BASE_URL` | Optional; otherwise derived from `VERCEL_PROJECT_PRODUCTION_URL` |

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # gives you STRIPE_WEBHOOK_SECRET
```

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

`npx tsx scripts/test-render.ts` renders sample PNGs to `/tmp` and checks the
astronomy (Polaris altitude ≈ latitude, J2000 sidereal time, DST handling).
`node scripts/e2e.mjs` drives a full paid checkout in headless Chromium
(`BASE_URL=https://... node scripts/e2e.mjs` for a deployment).

## Data and licences

Star and constellation data from d3-celestial (BSD-3), derived from the Yale
Bright Star Catalogue. Fonts: Marcellus and Lato (SIL Open Font License).
Geocoding: Open-Meteo geocoding API (free, no key).
