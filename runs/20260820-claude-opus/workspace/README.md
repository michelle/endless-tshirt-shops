# datetime.store

We sell a t-shirt with the current datetime on it.

A production-quality rebuild of [datetime.store](https://github.com/michelle/dt-shirt): the
milliseconds-since-epoch clock ticks live on the garment, and the instant you press **Buy** is the
instant that goes to print. Payments run through Stripe; the shirt is printed on demand by Scalable
Press.

## Stack

| Concern | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript strict |
| Payments | Stripe PaymentIntents + Stripe Elements (`CardElement`) |
| Fulfillment | Scalable Press v2 (`/design` → `/quote` → `/order`) |
| Styling | Hand-written CSS, no framework |
| Hosting | Vercel |

There is no database. The PaymentIntent **is** the order record — design ID, order token, garment,
printed timestamp and fulfillment state all live in its metadata. That keeps the deployment
stateless while still making fulfillment idempotent and replayable.

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | yes | Server-side Stripe calls |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | yes | Stripe Elements in the browser |
| `SP_AUTH` | yes | Scalable Press API key (HTTP basic *password*) |
| `STRIPE_WEBHOOK_SECRET` | recommended | Verifies `/api/stripe/webhook` |
| `SP_DRY_RUN` | no | `true` skips the real `/order` submission |

## Verifying

```bash
curl -s localhost:3000/api/health | jq       # integration readiness
```

Then buy a shirt with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
The page shows a test-mode banner whenever the publishable key is a `pk_test_` key.

Useful test cards:

| Card | Behaviour |
| --- | --- |
| `4242 4242 4242 4242` | succeeds |
| `4000 0000 0000 0002` | declined |
| `4000 0000 0000 9995` | insufficient funds |

## Order flow

```
browser                        server                     Stripe        Scalable Press
   │  press Buy (clock freezes)
   │  render 300dpi PNG
   ├──POST /api/checkout───────────►
   │                               ├──────────────────────────────────────► POST /design
   │                               ├──────────────────────────────────────► POST /quote
   │                               ├───────────► PaymentIntent
   │◄──clientSecret────────────────┤
   ├──confirmCardPayment──────────────────────► charge
   ├──POST /api/fulfill────────────►
   │                               ├──retrieve, assert succeeded──►
   │                               ├──────────────────────────────────────► POST /order
   │◄──orderId─────────────────────┤
```

`POST /api/stripe/webhook` performs the same fulfillment on `payment_intent.succeeded`, so a
customer who closes the tab mid-checkout still gets their shirt. Both paths call the same idempotent
routine.

### Fulfillment states

Stored on the PaymentIntent as `fulfillment_state`:

- `ready` — order-ready quote in hand, awaiting payment
- `submitted` — sent to Scalable Press; `sp_order_id` set
- `deferred` — paid but not yet submitted (print partner unavailable); safe to replay
- `failed` — submission rejected for a non-retryable reason; needs a human

A print-partner outage never blocks a sale. Checkout falls back to a quote-only pricing call, the
payment completes, and the order is left `deferred` for replay:

```bash
curl -sX POST "$URL/api/fulfill" \
  -H 'content-type: application/json' \
  -d '{"paymentIntentId":"pi_..."}'
```

## Artwork

The on-screen shirt is SVG so it stays crisp at any size, and `textLength` pins the print to the
chest panel so a 13-digit epoch can never spill past the seams. The artwork actually sent to the
printer is rendered separately onto an offscreen canvas at **2400×720 (8in × 2.4in at 300dpi)**
rather than upscaling the preview, and is uploaded with a transparent background so DTG prints only
the inked pixels.

## Project layout

```
app/
  page.tsx                     shell, test-mode banner, footer
  layout.tsx                   metadata, Chivo webfont
  globals.css                  all styling
  api/checkout/route.ts        design + quote + PaymentIntent
  api/fulfill/route.ts         browser-driven fulfillment
  api/stripe/webhook/route.ts  server-authoritative fulfillment
  api/health/route.ts          readiness probe
components/
  Store.tsx                    client state, Elements provider
  Shirt.tsx                    garment, live clock, print-res artwork
  CheckoutForm.tsx             sizes, address, card, submit
  Success.tsx                  receipt
  Masthead.tsx                 header clock
lib/
  catalog.ts                   products, sizes, price
  scalablepress.ts             print-partner client
  fulfillment.ts               idempotent order submission
  order-request.ts             request validation
  api.ts                       error → safe HTTP response
  stripe.ts, env.ts
```

## Known limitations

**Scalable Press order-ready quotes are currently failing.** As of 2026-08-20 the test account's
`POST /v2/quote` returns `500 Internal Server Error` whenever an `address` is present — including
for `"address": {}` and for the exact request body in Scalable Press's own documentation. Quote-only
calls (no address) succeed and return real pricing, and `POST /v2/order` is healthy (it returns a
well-formed `404` for an unknown token), so this is a fault on their side, not in this integration.

The consequence is that no `orderToken` can be obtained right now, so live orders land in the
`deferred` state: the design is uploaded, the payment is captured, and the order waits for a replay
of `/api/fulfill`. The submission path itself is exercised and correct — pointing it at a token
Scalable Press does not recognise produces a proper non-retryable `failed` classification. Once
their quote endpoint recovers, orders will flow straight through to `submitted` with no code change.

Other notes:

- **US-only.** Address validation assumes US states and ZIPs, matching the original store.
- **Flat $22.50.** Shipping and tax are absorbed rather than quoted per-destination. The quote
  response is captured, so charging the true landed cost is a small change.
- **No order history.** Orders are queryable in Stripe (by PaymentIntent metadata) but there is no
  customer-facing lookup page.
- **Webhook is unregistered.** The endpoint is implemented and signature-verified but the sandbox
  API key cannot create webhook endpoints; see the launch steps below.

## Launch steps

1. **Register the webhook** so fulfillment does not depend on the browser:
   ```bash
   stripe webhook_endpoints create \
     --url https://<your-domain>/api/stripe/webhook \
     --enabled-events payment_intent.succeeded \
     --enabled-events payment_intent.payment_failed
   ```
   Put the returned `whsec_...` in `STRIPE_WEBHOOK_SECRET` and redeploy.
2. **Swap in live keys** (`sk_live_`, `pk_live_`) and a production Scalable Press key. The test-mode
   banner disappears automatically once the publishable key is no longer `pk_test_`.
3. **Sweep deferred orders.** Add a cron that lists PaymentIntents with
   `metadata.fulfillment_state=deferred` and replays `/api/fulfill` for each.
4. **Alert on `failed`.** That state means a paid order needs a human.
5. Confirm the Scalable Press account has a payment method on file for live production.
