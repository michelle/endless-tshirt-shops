# datetime.store

We sell a t-shirt with the current datetime.

The clock on the shirt ticks in real time. When you press **Buy this
millisecond** it stops, and that exact 13-digit epoch value — the one you were
looking at — is what gets printed, paid for and shipped.

A rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store)
on Next.js, Stripe Payment Elements and the Prodigi Print API.

---

## How it works

```
browser                     this app                        Stripe        Prodigi
───────                     ────────                        ──────        ───────
tick, tick, tick
click "buy"  ──────────────▶ freeze epochMs (client)
                             POST /api/checkout
                               validate ts / style / size
                               price it server-side  ─────▶ PaymentIntent
                                                            (metadata:
confirmPayment ────────────────────────────────────────────▶ epoch_ms, style,
                                                             size, sku,
                                                             artwork_url)
                             POST /api/orders/finalize
                               verify client_secret
                               fulfil ─────────────────────────────────────▶ POST /Orders
                                                                             (idempotencyKey
                                                                              = PaymentIntent id)
                                                            ◀──────────────  fetches
                                                                             /api/artwork/<ts>.png
     ◀───────────────────── order number
                             ◀── payment_intent.succeeded ── (webhook, same
                                  runs the same fulfil code   idempotent path)
```

There is no database. The PaymentIntent *is* the order record: the shirt spec
lives in its metadata, and the Prodigi order id is written back to it once
fulfilment succeeds. That keeps a one-product shop stateless and makes Stripe
the single source of truth for what was bought and what was printed.

### Artwork

`GET /api/artwork/<epochMs>.png` renders the print separation on demand: white
Chivo digits on transparency, 3600 x 4800 px — a 12 x 16 in front print area at
300 DPI, with the number 8 in wide and 3 in down from the top of the print area.

The URL is deterministic and immutable, which is what lets Prodigi fetch it
asynchronously, minutes or hours after the customer has closed the tab. The
same geometry (`lib/artwork.ts`) drives the on-site SVG preview, so the mock-up
and the separation cannot drift apart.

### Idempotency

Two things try to fulfil every payment: the browser, right after
`confirmPayment`, and the `payment_intent.succeeded` webhook. Three layers keep
that from printing two shirts:

1. `prodigi_order_id` on the PaymentIntent metadata — the fast path.
2. An in-process promise map, for a same-instance race.
3. Prodigi's idempotency key (the PaymentIntent id) — a repeat POST returns
   `AlreadyExists` with the original order.

If fulfilment fails, the browser still shows a success state (the customer has
paid), the error is recorded in `fulfillment_error` metadata, and the webhook
retries for days.

---

## Running it

```bash
npm install
cp .env.example .env.local     # fill in the values below
npm run dev                    # http://localhost:3000
```

| Variable | What it is |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…` (or a restricted key with PaymentIntent write) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from `stripe listen` or the Dashboard |
| `PRODIGI_API_KEY` | Prodigi sandbox or live key |
| `PRODIGI_ENV` | `sandbox` (default) or `live` |
| `NEXT_PUBLIC_SITE_URL` | Public origin. Inferred on Vercel; needed locally only if you want Prodigi to reach your artwork |

Locally, fulfilment deliberately refuses to run: Prodigi cannot fetch
`http://localhost/...`, so `/api/orders/finalize` returns a clear error instead
of creating an order with a dead asset. Point `NEXT_PUBLIC_SITE_URL` at a tunnel
(`ngrok`, `cloudflared`) if you want the whole chain locally.

For webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Verifying it

```bash
curl -s $URL/api/health | jq        # every check should be true
```

`/api/health` reports which credentials are present, which mode Stripe and
Prodigi are in, and whether the artwork origin is publicly reachable. It never
echoes a secret.

Then buy a shirt with `4242 4242 4242 4242`, any future expiry, any CVC. You
should end up with a Stripe payment, a Prodigi order id on the confirmation
panel, and `downloadAssets: Complete` on the Prodigi order once it has pulled
the PNG.

## Layout

```
app/
  page.tsx                     the store
  order/[id]/page.tsx          order status (needs the payment client secret)
  api/checkout/                creates the PaymentIntent, prices server-side
  api/orders/finalize/         browser-side fulfilment trigger
  api/orders/[id]/             order status, gated on the client secret
  api/webhooks/stripe/         authoritative fulfilment
  api/artwork/[ts]/            the print-ready PNG
  api/health/                  config self-check
components/                    Shirt (the clock), Store, Checkout, OrderStatus
lib/
  product.ts                   prices, SKUs, sizes, shipping countries
  artwork.ts                   print + preview geometry, one source of truth
  fulfillment.ts               PaymentIntent -> Prodigi order, idempotently
  prodigi.ts                   typed Prodigi v4 client
```

## Product decisions

- **$22.50, down from $30**, free shipping — the original's pricing, kept.
- **Two cuts**: fitted (Bella + Canvas 6004) and unisex (Bella + Canvas 3001),
  black, S–2XL. Prices are identical, so the choice never changes the total.
- **Wallets on top, card below.** The card form is deliberately card-only:
  leaving it on automatic payment methods turns on Link sign-up, whose
  pre-ticked "save my information" box makes a mobile number mandatory, and a
  customer who filled in everything else gets blocked by "your phone number is
  incomplete". Apple Pay, Google Pay, Link and Klarna all live in the express
  button above it.
- **The clock keeps its own time.** The timestamp freezes on click, not on
  payment, so the number you bought is the number you were looking at. The
  server re-checks it is no more than 30 minutes old and not in the future.
