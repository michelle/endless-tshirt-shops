# datetime.store

We sell a t-shirt with the current datetime.

The shirt on the page shows milliseconds since the Unix epoch, ticking live. Clicking **Buy
now** freezes the number, rasterizes it at 300 DPI, and sends it to a direct-to-garment
printer. Every shirt is unrepeatable by construction.

A rebuild of [michelle/dt-shirt](https://github.com/michelle/dt-shirt) on Next.js, Stripe
Payment Intents, and the Scalable Press v2 API.

## How checkout works

The original charged the card and *then* asked Scalable Press to make the shirt, so an
unfulfillable order still took the customer's money. This version inverts that:

```
browser                    /api/quote                       Scalable Press / Stripe
   │  artwork + address ──────▶ POST /design ──────────────▶ designId
   │                            POST /quote  ──────────────▶ orderToken (validates
   │                                                          address, stock, price)
   │  ◀── clientSecret ──────── paymentIntents.create
   │
   ├── stripe.confirmCardPayment(clientSecret) ────────────▶ card is charged
   │
   │                           /api/order
   │  paymentIntentId ────────▶ verify status === succeeded
   │                            POST /order ──────────────▶ orderId
   │  ◀── order reference ───── record orderId on the PaymentIntent
```

Consequences worth knowing:

- **A bad address never becomes a charge.** The quote fails first, and the customer sees
  the reason.
- **Fulfillment is idempotent.** The `sp_order_id` recorded on the PaymentIntent is the
  idempotency record, so no one gets two shirts.
- **A dropped browser still gets a shirt.** `payment_intent.succeeded` reaches
  `/api/webhook`, which runs the same fulfillment path.

## Running it

```bash
npm install
cp .env.example .env.local     # then fill in the values below
npm run dev                    # http://localhost:3000
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | yes | Stripe.js. A `pk_test_…` key turns on the test-mode banner. |
| `STRIPE_SECRET_KEY` | yes | Payment Intents, fulfillment bookkeeping. |
| `SP_AUTH` | yes | Scalable Press API key (HTTP Basic password). |
| `SP_SUBMIT_ORDERS` | no | `true` places **real** print orders. Anything else is a dry run. |
| `STRIPE_WEBHOOK_SECRET` | no | Enables `/api/webhook`. Without it that route returns 501 rather than trusting unsigned input. |

### Dry-run mode

Scalable Press has no test mode — this API key reports `"mode": "live"`, and `POST /order`
bills a real garment to a real facility. So `SP_SUBMIT_ORDERS` defaults to off: design
upload, quoting, address validation, payment, and order bookkeeping all run for real, and
only the final production call is stubbed with a `dryrun_…` id. The success screen says so
plainly when it happens.

## Verifying it

```bash
node scripts/verify-flow.mjs                      # against localhost:3111
node scripts/verify-flow.mjs https://your-deploy  # against a deployment
```

The script drives a real purchase: Scalable Press design and quote, a Stripe test-card
payment, order submission, then it re-submits to prove fulfillment is idempotent and posts
garbage to prove input validation rejects it before charging anything.

In a browser, pay with `4242 4242 4242 4242`, any future expiry, any CVC.

To exercise the webhook locally:

```bash
stripe listen --forward-to localhost:3000/api/webhook   # prints the whsec_… to export
```

## Layout

```
app/
  page.tsx              store page; reads config, renders the shirt + checkout
  api/quote/route.ts    design + quote + PaymentIntent
  api/order/route.ts    verify payment, submit to production
  api/webhook/route.ts  payment_intent.succeeded safety net
components/
  ShirtPreview.tsx      SVG garment, live millisecond ticker
  CheckoutForm.tsx      pickers, floating-label fields, Stripe Card Element
lib/
  catalog.ts            products, sizes, price, print geometry
  artwork.ts            300 DPI canvas render of the timestamp
  scalablepress.ts      v2 client (design, quote, order)
  fulfill.ts            idempotent PaymentIntent -> print order
  validate.ts           request validation for both endpoints
```

Prices, sizes, and the Scalable Press product ids live in `lib/catalog.ts` only, so the
pickers and the fulfillment payload cannot drift apart.
