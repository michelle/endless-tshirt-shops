# Stellara — custom star map t-shirts

Wear the night that mattered. Stellara prints a customer's exact night sky —
computed from a date and place — onto a direct-to-garment (DTG) t-shirt, made
to order and shipped on demand.

## How it works

1. **Design** (`/design`) — the customer picks a date, a place (lat/lng), a
   title and an optional subtitle, plus shirt colour and size. A live preview
   renders the real star positions for that moment.
2. **Pay** — checkout is handled by **Stripe Checkout**, which also collects
   the shipping address.
3. **Fulfil** — a Stripe webhook fires on `checkout.session.completed` (only
   when `payment_status` is `paid`), and the order is sent to the **Prodigi
   Print API** to be printed and shipped. Nothing is sent to Prodigi until
   payment has succeeded.

## Stack

- **Next.js 14** (App Router) on Vercel
- **Stripe** for payments (Checkout + webhooks)
- **Prodigi Print API** (sandbox) for DTG fulfilment
- **sharp** to rasterise the generated star-map SVG into a print-ready PNG

## Key files

- `lib/starMap.ts` — astronomy (sidereal time, alt/az, stereographic
  projection) and SVG generation, with an embedded bright-star catalogue and
  constellation lines.
- `lib/catalog.ts` — bright-star catalogue and constellation definitions.
- `lib/prodigi.ts` — Prodigi order creation.
- `lib/stripe.ts` — Stripe client.
- `app/api/checkout/route.ts` — creates a Stripe Checkout Session.
- `app/api/webhook/route.ts` — verifies the Stripe signature and creates the
  Prodigi order after payment.
- `app/api/star-map/route.ts` — renders the star map as SVG (preview) or PNG
  (print).

## Environment variables

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key (test mode) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `PRODIGI_API_KEY` | Prodigi sandbox API key |

## Local development

```sh
npm install
STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... PRODIGI_API_KEY=... npm run dev
```

To test webhooks locally, run `stripe listen --forward-to localhost:3000/api/webhook`.

## Production notes

- The Prodigi key is a **sandbox** key (`api.sandbox.prodigi.com`). Switch to a
  live key and `api.prodigi.com` before taking real orders.
- Pricing is a flat `$34 + $6` shipping. Use Prodigi's quote endpoint for
  accurate per-destination shipping before launch.
- The Stripe key is a claimable sandbox key; replace with a real restricted key
  scoped to Checkout + webhooks.
