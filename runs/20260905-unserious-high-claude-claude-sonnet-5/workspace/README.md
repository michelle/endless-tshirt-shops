# datetime.store

We sell exactly one product: a t-shirt printed with the precise millisecond
you check out at. That's it. That's the store.

A from-scratch rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store),
same unserious concept, modern stack:

- **Next.js 15** (App Router, TypeScript, Tailwind) instead of a 2017-era
  Create React App + bootstrap.
- **Stripe Checkout** for payment (test mode), replacing the original's
  hand-rolled Stripe Elements + Payment Request Button integration.
- **Prodigi Print API** for print-on-demand fulfillment, replacing the
  original's Scalable Press integration.
- **`next/og`** to render the print artwork (and OG image) as a PNG on the
  fly from the frozen timestamp — no canvas/image asset needed.

## How it works

1. Visitor picks a color/size (cosmetic only) and watches the shirt preview
   tick the current time in raw epoch milliseconds.
2. They click **"Freeze this exact millisecond"**. `Date.now()` fires
   client-side and that number is sent to `/api/checkout`, which creates a
   Stripe Checkout Session (`$22.50`, shipping address + phone collection
   enabled) and redirects to Stripe's hosted page.
3. On successful payment, Stripe calls `/api/webhook`
   (`checkout.session.completed`). The handler:
   - renders the frozen timestamp as a print-ready PNG via
     `/api/artwork/[stamp].png`,
   - creates a Prodigi order for SKU `GLOBAL-TEE-GIL-64000` (a real Gildan
     64000 unisex tee) with that artwork on the front print area, shipped to
     the buyer's Stripe-collected address,
   - tags the Stripe PaymentIntent with the resulting Prodigi order id.
4. The buyer lands on `/success`, which fetches the safe-to-show slice of
   their Checkout Session and shows their now-frozen shirt.

Prodigi's `idempotencyKey` is set to the Stripe Checkout Session id, so a
retried webhook delivery can't create a duplicate print order.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Required environment variables (see `.env.example`):

| Variable | Where to get it |
|---|---|
| `STRIPE_SECRET_KEY` | [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen --forward-to localhost:3000/api/webhook` prints one, or create a webhook endpoint in the Dashboard |
| `PRODIGI_API_KEY` | [dashboard.prodigi.com](https://dashboard.prodigi.com) → API keys (sandbox) |

To exercise the full flow locally, run `stripe listen --forward-to
localhost:3000/api/webhook` in a second terminal so Checkout completions
reach your machine.

## Deploying

The deployed instance is wired to a **Stripe test-mode sandbox** and the
**Prodigi sandbox** — no real money moves and no real shirts get printed,
but every API call is real. To go live: swap in live Stripe keys, a
production Prodigi key (`PRODIGI_API_URL=https://api.prodigi.com`), and
point a real webhook endpoint at `/api/webhook`.

## Known gaps

- No order-status page / database — fulfillment is fire-and-forget from the
  webhook. Good enough for a joke store; a real one would persist orders.
- No inventory, discount codes, or admin dashboard. There's one SKU.
- Shipping is quoted as a flat "Budget" method rather than live Prodigi
  shipping-quote comparison.
