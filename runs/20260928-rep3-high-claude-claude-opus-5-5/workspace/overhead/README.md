# Overhead: custom star-map tees

Customers pick a moment (date, local time, place) and some words. We compute the real sky
above that spot (2,300+ stars, constellation lines, the moon in its true phase and orientation,
and the visible planets) and print it DTG on a Bella+Canvas 3001 via Prodigi.

## How it works

| Piece | Where |
|---|---|
| Sky maths (precession-corrected star positions, moon/planet ephemeris) | `lib/sky.ts` (astronomy-engine) |
| Artwork renderer, shared by the browser preview and the print file | `lib/render.ts` |
| Design model + validation + compact encoding | `lib/design.ts` |
| Catalog, pricing, shipping countries | `lib/catalog.ts` |
| Checkout (server-priced Stripe Checkout Session) | `app/api/checkout/route.ts` |
| Stripe webhook → Prodigi order (only after `payment_status === "paid"`) | `app/api/stripe/webhook/route.ts`, `lib/server/fulfill.ts` |
| Signed, stateless print/mockup PNG URLs (resvg) | `app/api/art/[kind]/route.ts`, `lib/server/sign.ts` |
| Order status page (Stripe + live Prodigi status) | `app/order/[id]/page.tsx` |

No database: Stripe (line-item product metadata holds each design) and Prodigi are the systems of record.
Fulfilment is idempotent. The PaymentIntent metadata stores `prodigi_order_id`, and Prodigi's
`idempotencyKey` is the Checkout Session id, so webhook retries and the order page's fallback never double-print.

## Environment

| Var | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret/restricted key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the webhook endpoint `/api/stripe/webhook` |
| `PRODIGI_API_KEY` | Prodigi key |
| `PRODIGI_API_URL` | Optional; defaults to sandbox `https://api.sandbox.prodigi.com/v4.0`. Use `https://api.prodigi.com/v4.0` for live |
| `ART_SIGNING_SECRET` | HMAC secret for art URLs (don't rotate while orders are in production) |
| `SITE_URL` | Public origin, used in URLs handed to Stripe/Prodigi |
| `NEXT_PUBLIC_TEST_MODE` | `1` shows the test-card hint in the bag |

Webhook events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.

## Develop

```
npm install
npm run dev      # needs .env.local with the vars above
stripe listen --forward-to localhost:3000/api/stripe/webhook   # local webhooks
```

End-to-end test (real browser → Stripe test card → Prodigi sandbox):
`npm i --no-save playwright && npx playwright install chromium && node scripts/e2e-checkout.mjs`

Star data © Olaf Frohn (d3-celestial, BSD-3), derived from the Yale Bright Star Catalogue.
Fonts: Cormorant Garamond and Jost (SIL OFL).
