# Overhead — custom star-map tees

Customers pick a place and a moment. The store computes the real night sky above that spot (stars, constellations, planets and the Moon in its true phase), sets it with their own words, and prints it direct-to-garment on a Bella+Canvas 3001 tee via Prodigi.

## How it fits together

```
Browser (public/)                         Vercel functions (api/)
─────────────────                         ────────────────────────
app.js ── shared/render.js ──► live SVG preview (same code as print)
   │ POST /api/checkout ──────────────►   validate design, live Prodigi shipping quote,
   │                                      create Stripe Checkout Session (design in metadata)
   ▼
Stripe Checkout (hosted) ── pays ──► webhook /api/stripe-webhook ─┐
   │                                                              ├─► lib/fulfill.js
   ▼                                                              │   (only if payment_status = paid)
success.html ── polls /api/order ─────────────────────────────────┘   Prodigi POST /orders
                                                                      asset url = /api/print?d=…&s=HMAC
Prodigi ── downloads ──► /api/print  (renders 4680×5790 transparent PNG, 300 DPI)
```

* **No database.** The design travels as a compact token in Stripe metadata. The print URL is HMAC-signed, so only real orders can render print files.
* **Exactly-once fulfilment.** Both the webhook and the success page call `fulfillSession`. It checks the PaymentIntent for `prodigi_order_id`, and Prodigi de-duplicates on `idempotencyKey` = Checkout Session id. Both paths were tested.
* **Webhook trust.** The webhook verifies `STRIPE_WEBHOOK_SECRET` if it's set. Otherwise it re-fetches the event from the Stripe API and never trusts the posted body.
* **Print quality.** Vector artwork rasterised at 300 DPI with solid, opaque inks and no transparency effects. Line and star sizes have a minimum of about 0.6 mm. Labels knock out the stars underneath instead of overprinting them. Light inks are used on dark shirts and dark inks on light shirts.

## Environment variables

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret (or restricted) key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the webhook endpoint `https://<site>/api/stripe-webhook` (events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`) |
| `PRODIGI_API_KEY` | Prodigi API key |
| `PRODIGI_API_URL` | Optional. Defaults to sandbox `https://api.sandbox.prodigi.com/v4.0`. Use `https://api.prodigi.com/v4.0` for live |
| `ART_SIGNING_SECRET` | Random 32+ byte hex used to sign print-file URLs (`openssl rand -hex 32`) |
| `SITE_URL` | Optional canonical URL (otherwise taken from the request host) |
| `TEE_PRICE_CENTS` | Optional, default `3400` |

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
node --env-file=.env.local scripts/dev-server.js   # http://localhost:3000
node scripts/render-test.js /tmp/test.png '#141416'   # render a sample print file
```

## Deploying (Vercel)

```bash
vercel login
vercel link
vercel env add STRIPE_SECRET_KEY production   # …repeat for each variable
vercel deploy --prod
```

Then create the Stripe webhook endpoint for `https://<your-domain>/api/stripe-webhook` and set `STRIPE_WEBHOOK_SECRET`.

## Credits

Star catalogue and constellation lines: [d3-celestial](https://github.com/ofrohn/d3-celestial) (BSD-3-Clause), from Hipparcos and the Yale Bright Star Catalogue. Ephemerides: [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT). Fonts: Cormorant Garamond and Jost (SIL OFL). Geocoding: [Open-Meteo](https://open-meteo.com/) (the free tier is for non-commercial use, so get an API plan or switch geocoders for production).
