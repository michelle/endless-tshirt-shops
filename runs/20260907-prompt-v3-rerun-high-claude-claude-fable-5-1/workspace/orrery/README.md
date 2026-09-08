# Orrery — the solar system on your day, printed on a tee

A print-on-demand t-shirt store where every shirt is computed for one customer.
The buyer picks a date, a caption, a tee colour and an accent; the site computes the
heliocentric position of every planet on that date (JPL approximate orbital elements,
Kepler's equation) and draws a 300 dpi, transparent-background print file that goes
straight to a DTG printer via Prodigi. Payment is Stripe Checkout; Prodigi orders are
placed only after Stripe reports the session as paid.

## Stack

- Next.js 15 (App Router) on Vercel, TypeScript, Tailwind v4
- Stripe Checkout (hosted page) + webhook
- Prodigi Print API v4.0, SKU `GLOBAL-TEE-GIL-64000` (Gildan Softstyle, front DTG print, 4677×5881 px)
- `@resvg/resvg-js` to rasterise the SVG design server-side (font: Space Mono, bundled)

## How an order flows

1. `POST /api/checkout` validates the design, encodes it into Stripe session metadata and
   redirects the customer to Stripe Checkout (shipping address + phone collected there).
2. Stripe sends `checkout.session.completed` to `POST /api/webhooks/stripe`.
   The handler verifies the signature, checks `payment_status === "paid"` and calls
   `ensureFulfilled(sessionId)`.
3. `ensureFulfilled` creates the Prodigi order with `idempotencyKey` and
   `merchantReference` both set to the Stripe session id, pointing the print asset at
   `GET /api/print/<sessionId>.png`. That route re-renders the artwork from the paid
   session's metadata, so the print always matches what was paid for. The Prodigi order
   id is written back to the PaymentIntent metadata.
4. The customer lands on `/order/<sessionId>`, which shows the design, shipping details
   and live Prodigi production status. The page also calls `ensureFulfilled` as a
   fallback in case a webhook was missed. All paths are idempotent.

No database is needed: Stripe holds the order, Prodigi holds fulfilment, and the artwork
is a deterministic function of the metadata.

## Environment variables

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret (sandbox/test key today) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the webhook endpoint |
| `PRODIGI_API_KEY` | Prodigi API key (sandbox key today) |
| `PRODIGI_API_BASE` | `https://api.sandbox.prodigi.com` or `https://api.prodigi.com` |
| `NEXT_PUBLIC_SITE_URL` | Optional; overrides the auto-detected Vercel production URL |

## Local development

```
npm install
cp .env.local.example .env.local   # fill in keys
npm run dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # and set STRIPE_WEBHOOK_SECRET to the printed whsec_
```

## Going to production

1. Claim the Stripe sandbox (`stripe sandbox claim`), activate the account, and swap
   `STRIPE_SECRET_KEY` for a live key. Recreate the webhook endpoint in live mode and set
   its `STRIPE_WEBHOOK_SECRET`.
2. Get a live Prodigi API key, set `PRODIGI_API_BASE=https://api.prodigi.com`, and add a
   payment method to the Prodigi account.
3. Put a custom domain on the Vercel project (or set `NEXT_PUBLIC_SITE_URL`).
4. Review `src/lib/catalog.ts` for price, sizes, colours and the shipping country list in
   `src/lib/stripe.ts`. Consider Stripe Tax and per-region shipping rates.
5. Order a sample shirt and check the print scale/placement before launch.
