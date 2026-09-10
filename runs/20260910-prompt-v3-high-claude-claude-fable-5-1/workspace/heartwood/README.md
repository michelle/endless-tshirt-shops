# Heartwood — your years, drawn as rings

A direct-to-garment t-shirt store where every shirt is generated for one person: one ring per year
lived (wider in the fast-growing early years, wobbling like real wood), with the customer's milestone
years highlighted and labelled. Nothing is stocked; the print file is generated at checkout and only
sent to the print lab after payment succeeds.

Stack: Next.js 16 (App Router) · Stripe Checkout + webhooks · Prodigi Print API v4 · resvg for
print-file rasterisation · Vercel.

## How an order flows

1. `/design` — the customer types a name, birthday, up to six moments, picks a palette/grain/shirt.
   The SVG is generated live in the browser by `lib/rings.ts`.
2. `POST /api/checkout` — validates the design, signs it (HMAC, `DESIGN_SECRET`), fixes the price
   server-side and creates a Stripe Checkout Session. The signed design travels in session metadata.
3. Stripe hosts payment (address + phone collected there).
4. `POST /api/webhooks/stripe` — on `checkout.session.completed` with `payment_status === "paid"`,
   `lib/fulfill.ts` creates the Prodigi order. The order's front asset is
   `/api/print/<signed-token>.png`, a 4665×5844 px transparent PNG (Prodigi's print area for the
   Gildan 64000 at 300 dpi) that Prodigi downloads from us. Fulfilment is idempotent: the Prodigi
   order id is written back to the PaymentIntent metadata and the Stripe session id is used as
   Prodigi's `idempotencyKey`.
5. `/order/<session id>` — success page. It also calls the same fulfil function as a fallback
   (so a missed webhook can't strand a paid order) and shows live Prodigi status + tracking.

No database: the design lives in the signed token, order state lives in Stripe + Prodigi.

## Environment variables

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the `checkout.session.completed` endpoint |
| `PRODIGI_API_KEY` | Prodigi API key (sandbox or live) |
| `PRODIGI_API_BASE` | `https://api.sandbox.prodigi.com` or `https://api.prodigi.com` |
| `DESIGN_SECRET` | Random string used to sign design tokens |
| `SITE_URL` | Optional; public base URL. Defaults to Vercel's production URL. |

`GET /api/health` reports which of these are configured (never their values).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev                  # http://localhost:3000
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # gives you STRIPE_WEBHOOK_SECRET
```

Render a print file without the app: `npx tsx scripts/smoke.ts aurora` writes PNGs to `/tmp`.

## Pricing and catalogue

`lib/catalog.ts`: $38 per shirt, $6.95 flat shipping, Gildan 64000 in 8 colours, XS–3XL, ~40 ship-to
countries. Prodigi's sandbox quote for a US order was $12.20 + $4.74 shipping.
