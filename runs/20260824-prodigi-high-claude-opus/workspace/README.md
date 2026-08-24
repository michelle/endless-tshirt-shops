# datetime.store

We sell a t-shirt with the current datetime.

A rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store) on Next.js,
with fulfillment moved from Scalable Press to the [Prodigi Print API](https://www.prodigi.com/print-api/).

The shirt shows a live Unix millisecond timestamp. It ticks until you pay. Whatever it said the
instant you paid is what gets printed.

Live (Stripe test mode + Prodigi sandbox):
**https://benchmark-20260824-prodigi-high-cla-one.vercel.app**

## How it works

The interesting constraint is that every order is a one-off design, and nothing may be printed
until the money clears.

**The timestamp is decided at payment time.** Stripe Elements runs in
[deferred intent](https://docs.stripe.com/payments/accept-a-payment-deferred) mode: the form
mounts with only `{mode: 'payment', amount, currency}`, and the PaymentIntent is not created
until you press *Buy*. So the flow is: freeze `Date.now()` → create the intent with that
timestamp in its metadata → confirm. The server re-checks the submitted timestamp against its own
clock and substitutes server time if it is more than 10 minutes out
([`lib/timestamp.ts`](lib/timestamp.ts)), so a tampered client can't order a shirt stamped 1969.

**Artwork is a URL, not a file.** `/api/artwork?t=<ms>&format=print` renders the print asset on
demand — white Chivo Bold on transparent, 2340 × 2895 px, which is Prodigi's 15.6 × 19.3 in front
print area at 150 dpi. It's a pure function of `t`, so it needs no blob storage, is served
`immutable`, and Prodigi fetches it straight from us at print time. The same endpoint with
`format=preview` renders the thumbnail on the confirmation page.

**The PaymentIntent is the order database.** There is no database. Style, size, timestamp, the
Prodigi order id and any fulfillment error all live in PaymentIntent metadata, which makes the
Stripe dashboard the order dashboard.

**Fulfillment is idempotent and has two triggers.** The `payment_intent.succeeded` webhook is the
primary path; the order page also fulfills lazily if it arrives first. Both funnel into
[`lib/fulfillment.ts`](lib/fulfillment.ts), which short-circuits on
`metadata.prodigi_order_id` and passes the PaymentIntent id to Prodigi as an `idempotencyKey` —
so a webhook retry racing the order page cannot print two shirts.

```
components/Checkout.tsx  ──▶ POST /api/payment-intent  ──▶ Stripe PaymentIntent (metadata: t, style, size)
                                                             │
                            Stripe confirms payment ─────────┤
                                                             ▼
                    POST /api/stripe-webhook ──┐      lib/fulfillment.ts ──▶ POST prodigi /Orders
                    GET  /api/order ───────────┘              │                    │
                                                              │            fetches /api/artwork?t=…
                                                              ▼
                                            PaymentIntent.metadata.prodigi_order_id
```

## Layout

| Path | |
|---|---|
| `lib/catalog.ts` | styles, sizes, price, Prodigi SKUs, shipping allowlist |
| `lib/artwork.ts` | print geometry (dpi, print area, text placement) |
| `lib/prodigi.ts` | Prodigi v4 client — quotes, orders, order status |
| `lib/fulfillment.ts` | paid PaymentIntent → Prodigi order, idempotently |
| `lib/timestamp.ts` | timestamp validation and clock-skew tolerance |
| `app/api/artwork/route.tsx` | the print asset renderer |
| `components/Shirt.tsx` | the ticking shirt (original SVG paths) |
| `components/Checkout.tsx` | Express Checkout + card form |
| `scripts/verify.mjs` | end-to-end check against any deployment |

## Running it

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://localhost:3000
```

| Variable | |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` / `rk_test_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…`; `stripe listen` prints one for local use |
| `PRODIGI_API_KEY` | sandbox or live key |
| `PRODIGI_ENVIRONMENT` | `sandbox` (default) or `live` |
| `PRODIGI_DRY_RUN` | `true` records fulfillment without calling Prodigi |
| `PUBLIC_BASE_URL` | origin Prodigi should fetch artwork from; inferred on Vercel |

`PUBLIC_BASE_URL` must be publicly reachable. Prodigi fetches the artwork itself, so a
tunnel-less `localhost` or a deployment behind Vercel Deployment Protection will produce orders
that fail at the printer. `GET /api/health?deep=1` checks exactly this.

## Verifying

```bash
npm run typecheck
npm run verify                                    # against localhost:3000
node scripts/verify.mjs https://your-deploy.app   # against a deployment
```

`scripts/verify.mjs` walks the real customer path against the live Stripe test and Prodigi sandbox
APIs: it creates a PaymentIntent through our own endpoint, confirms it with `pm_card_visa` and a
shipping address, lets the order endpoint drive fulfillment, then queries Prodigi directly to
confirm the print order carries the right SKU, size, color, recipient, and an artwork URL bearing
the right timestamp. It also asserts the PNG is 2340 × 2895 with an alpha channel, that a second
fulfillment attempt reuses the same print order, that a wrong client secret 404s, and that the
webhook rejects unsigned payloads. It creates real sandbox orders each run; nothing is charged and
nothing is printed.

`GET /api/health?deep=1` is the cheap version: config, Stripe and Prodigi reachability, live unit
economics (Prodigi quote vs. our retail price), and whether our own artwork endpoint is reachable
from the public internet.

Reachability and economics are reported as separate checks on purpose. Prodigi's `/quotes` endpoint
has downtime independent of `/Orders`, and we can still take and print orders while it is out — so
a failed quote is advisory and does not mark the shop unhealthy. Only a failed catalog read means
we genuinely cannot print. Prodigi calls carry an 8s per-attempt timeout and one retry on
timeouts, 429s and 5xx; that is safe because reads are reads and `POST /Orders` is idempotent.

## Going live

See the handover notes for the full list; the short version is: swap to live Stripe and Prodigi
keys, repoint the webhook, add real shipping rates and tax, and put the legal pages in the footer.
