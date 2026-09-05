# datetime.store

We sell one t-shirt: printed with the exact datetime you buy it, down to the
millisecond. This is a modern rebuild of the original
[michelle/datetime.store](https://github.com/michelle/datetime.store) — same
concept, rebuilt on Next.js with Stripe Checkout for payment and the
**Prodigi Print API** for fulfillment (replacing the original's Scalable
Press integration).

## How it works

1. **Pick a moment** — choose a fit (Unisex / Fitted) and size (S–XL) on the
   homepage. A live, millisecond-precision clock renders over a shirt mockup.
2. **Buy** — clicking "Buy this exact moment" captures `Date.now()` in the
   browser and starts a Stripe Checkout Session for that exact style/size/
   timestamp. Stripe hosts the whole payment page (cards, Apple Pay, Google
   Pay, Link, etc.) and collects the shipping address — we never touch card
   data.
3. **Fulfillment** — on `checkout.session.completed`, our webhook places an
   order with Prodigi, referencing a print-ready PNG generated on the fly at
   `/api/artwork?ts=...&style=...` (via `next/og`) and the shipping address
   Stripe collected. Prodigi prints, packs, and ships the shirt.

There's no database: the order's entire state (style, size, timestamp, and
a link back to the generated artwork) travels in the Stripe Checkout
Session's metadata, and the shipping address comes straight from Stripe.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Stripe Checkout** for payment
- **Prodigi Print API** for print fulfillment (`GLOBAL-TEE-GIL-64000` /
  `GLOBAL-TEE-GIL-64000L`, black, DTG front print)
- **next/og** (`ImageResponse`) to render the print artwork server-side

## Project layout

- `app/page.tsx` + `components/ProductConfigurator.tsx` / `ShirtPreview.tsx`
  — the storefront
- `app/api/checkout/route.ts` — creates the Stripe Checkout Session
- `app/api/artwork/route.tsx` — renders the print-ready PNG for a given
  timestamp + style
- `app/api/webhook/route.ts` — verifies the Stripe webhook and places the
  Prodigi order
- `app/success/page.tsx` / `app/cancel/page.tsx` — post-checkout pages
- `lib/shirt.ts` — shared product/SKU/pricing constants
- `lib/stripe.ts`, `lib/prodigi.ts` — thin API clients

## Environment variables

See `.env.example`:

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `PRODIGI_API_KEY`, `PRODIGI_API_BASE_URL` (defaults to the Prodigi sandbox)

## Local development

```bash
npm install
cp .env.example .env.local # fill in real values
npm run dev
```

To exercise the webhook locally, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```
