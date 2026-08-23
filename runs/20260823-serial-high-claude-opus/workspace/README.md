# datetime.store

We sell a t-shirt with the current datetime on it. The number printed on the
shirt is the Unix millisecond timestamp of the moment you pressed **Buy** — so
every shirt is, unavoidably, one of a kind.

A rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store)
on Next.js, Stripe, and Scalable Press.

## How it works

```
browser                     our server                    Stripe        Scalable Press
   |                             |                            |                |
   | Buy pressed (t = now)       |                            |                |
   |---- POST /api/checkout ---->|                            |                |
   |                             |-- render 300dpi artwork --->|                |
   |                             |------------- POST /design ------------------>|
   |                             |------------- POST /quote  ------------------>|
   |                             |                            |    orderToken   |
   |                             |-- create PaymentIntent --->|                |
   |<---- clientSecret ----------|   (token + order in metadata)                |
   |                             |                            |                |
   |---- confirmPayment (Stripe Elements, card never touches us) -------------->|
   |                             |                            |                |
   |---- POST /api/order ------->|-- read PI: paid? --------->|                |
   |                             |------------- POST /order (redeem token) --->|
   |                             |   sp_order_id -> PI metadata                 |
   |<---- order placed ----------|                            |                |
                                 |<-- webhook payment_intent.succeeded --|      (same, idempotent)
```

Three design decisions carry most of the weight:

**The printer commits before the customer is charged.** `/design` and `/quote`
run *before* the PaymentIntent is created, so a bad address or an unavailable
blank is a validation message, never a refund. The `orderToken` from the quote is
what makes this safe — it's a price the printer has already agreed to.

**Stripe is the database.** There isn't one. Order state lives in the
PaymentIntent's `metadata` and `receipt_email`. Payment state and fulfilment
state therefore cannot drift apart, and there is no migration, backup, or
connection pool to operate. The cost is that querying is limited to what
Stripe's API offers — fine at this scale, and revisitable if it stops being.

The shipping address is part of that metadata (`ship_address`) rather than
`PaymentIntent.shipping`, for two reasons. Stripe.js writes `shipping` itself
when it confirms next to an AddressElement, and it refuses to overwrite a value
a *restricted* key wrote — which is what a Stripe sandbox key is, so setting
both ends in a 400 at confirm time. Keeping our own copy also means the address
the printer ships to is the one the server validated and got a quote for, not
one the browser wrote on the way past. `pi.shipping` still gets populated by
Stripe.js on browser purchases, so the Stripe dashboard looks normal.

**Fulfilment is idempotent with two triggers.** Both the confirmation page and
the Stripe webhook call `fulfill()`. It takes a 90-second `placing` lease and
treats `sp_order_id` as the done-marker, so concurrent triggers can't double-order.
A misconfigured webhook degrades the shop to "slower", not "silently unfulfilled".

## Running it locally

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://localhost:3000
```

| Variable | What it's for |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server-side Stripe calls. `sk_test_…` / `rk_test_…` for test mode. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Elements in the browser. `pk_test_…`. |
| `SP_AUTH` | Scalable Press API key. Sent as the *password* of HTTP basic auth. |
| `STRIPE_WEBHOOK_SECRET` | Verifies webhook signatures. `whsec_…`. |
| `OPS_TOKEN` | Shared secret for `/api/ops/fulfillment`. Unset ⇒ that route 404s. |
| `CRON_SECRET` | Set equal to `OPS_TOKEN` so Vercel Cron can authenticate. |

`SP_API_BASE` optionally overrides the Scalable Press base URL.

## Verifying it

```bash
npm run typecheck
npm run build
npm run verify:products      # every blank × size actually quotes, with an address
node scripts/buy.mjs <url>   # drives a real purchase in a real browser
```

`scripts/buy.mjs <base-url> [style] [size]` is the end-to-end check: it fills
Elements with `4242…`, confirms, follows the redirect to `/order`, and prints the
Scalable Press order id. It needs a local Chrome (`channel: 'chrome'`) — the
bundled Playwright browser doesn't launch in every sandbox.

One thing worth knowing if you extend it: two Elements settings must agree with
the PaymentIntent the server creates, or `confirmPayment` fails with a mismatch
error instead of a validation message. `captureMethod` in `src/lib/stripe-client.ts`
must equal `capture_method` in `src/app/api/checkout/route.ts`, and the server
must not set any field Stripe.js also sets (see the shipping note above). This is
inherent to the deferred-intent flow: Elements is configured before the intent
exists, so Stripe.js re-checks the two descriptions at confirm time.

`verify:products` is the one to run on a schedule. Scalable Press has plenty of
catalog entries that quote fine with no address and then return a bare HTTP 500
the moment you supply one — the two blanks in `src/lib/catalog.ts` were chosen
because they don't.

### A full test purchase

Use `4242 4242 4242 4242`, any future expiry, any CVC. Or drive it from the API:

```bash
# 1. design + quote + PaymentIntent
curl -s -X POST localhost:3000/api/checkout -H 'content-type: application/json' -d '{
  "timestampMs": 1787512863996, "style": "fitted", "size": "M",
  "email": "you@example.com",
  "address": {"name":"Ada Lovelace","address1":"510 Townsend St",
              "city":"San Francisco","state":"CA","zip":"94103","country":"US"}}'

# 2. pay it (test mode only)
curl -s -X POST https://api.stripe.com/v1/payment_intents/$PI/confirm \
  -u "$STRIPE_SECRET_KEY:" -d payment_method=pm_card_visa \
  -d return_url=http://localhost:3000/order

# 3. place it with the printer — idempotent, run it twice
curl -s -X POST "localhost:3000/api/order?payment_intent=$PI&payment_intent_client_secret=$SECRET"
```

Step 3 should report `"outcome":"placed"` and an `orderId`, then
`"outcome":"already_placed"` on the second call. `timestampMs` must be within ten
minutes of now or checkout rejects it as stale.

Webhooks locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | The store. |
| `/order` | Confirmation page. Triggers fulfilment, then polls for the printer's order id. |
| `POST /api/checkout` | Validate → design → quote → PaymentIntent. |
| `GET/POST /api/order` | Order status / trigger fulfilment. Authorised by the PI client secret. |
| `POST /api/stripe/webhook` | `payment_intent.succeeded` ⇒ fulfil. |
| `GET /api/artwork?t=` | The exact PNG that gets printed. |
| `GET/POST /api/ops/fulfillment` | Backlog of paid-but-unfulfilled orders; `?retry=1` works it. |

`vercel.json` points a cron at that last one as the final safety net, for orders
the webhook and the confirmation page both missed. It runs **daily**, which is
the most a Hobby account allows — on Pro, change the schedule to `0 * * * *` so a
Scalable Press outage costs hours rather than a day. Vercel Cron authenticates
with `CRON_SECRET`, which is why that needs to equal `OPS_TOKEN`.

## Notes on the artwork

The print is rendered server-side with `@napi-rs/canvas` at 300 DPI — a
2400 × 376 transparent PNG, 8 inches wide, white Chivo Bold. The browser preview
uses the same TTF at the same proportions, so the preview is the print.

Rendering on the server rather than uploading a client canvas matters twice
over: we print the timestamp we recorded rather than one a client could tamper
with, and 2400px beats the original's 300 × 150 canvas by enough to matter on
fabric.

## Layout

```
src/lib/          catalog, artwork renderer, Stripe + Scalable Press clients,
                  order/metadata mapping, the fulfilment engine, validation
src/app/          pages and route handlers
src/components/   the shirt, the option pills, the checkout, the order status
scripts/          product verification, browser purchase driver, screenshots
```
