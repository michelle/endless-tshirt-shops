# datetime.store

We sell a t-shirt with the current datetime. ⏱

A rebuild of [datetime.store](https://github.com/michelle/datetime.store): you pick a fit and a
size, the moment you click buy the clock **freezes**, and that exact millisecond gets printed on a
black tee and shipped to you by [Scalable Press](https://scalablepress.com).

- **Live:** https://benchmark-20260823-isolated-high-cl-hazel.vercel.app
- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Stripe · Scalable Press v2
- **Payments:** Stripe test mode. Card `4242 4242 4242 4242`, any future expiry, any CVC.

---

## How it works

```
browser                          server                        Scalable Press        Stripe
───────                          ──────                        ──────────────        ──────
click "buy"
  freeze Date.now()
  render 2400px PNG (canvas)
                    ──POST /api/checkout──▶
                                           ──POST /design──────▶  designId
                                           ──POST /quote───────▶  orderToken + cost
                                           (address validated here, before any charge)
                                           ──────────────────────────────────────────▶ PaymentIntent
                                                                                       (metadata =
                    ◀──clientSecret────────                                             orderToken,
  confirmPayment()  ─────────────────────────────────────────────────────────────────▶  design, size…)
                                                                                       succeeded
                                           ◀──webhook payment_intent.succeeded─────────
                                           ──POST /order───────▶  orderId
                                           ──────────────────────────────────────────▶ write sp_order_id
                                                                                        to metadata
  /thanks polls /api/order ──────────────▶ (same fulfil path, as a fallback)
```

### There is no database

The Stripe PaymentIntent **is** the order record. Its `metadata` holds `sp_design_id`,
`sp_order_token`, `sp_order_id`, `sp_status`, `sp_cost_usd`, and the frozen `shirt_timestamp`. This
removes an entire tier of infrastructure and makes Stripe the single place a human looks when a
customer emails about an order. It's viable because the product is exactly one SKU with no
inventory, accounts, or order history.

### Fulfilment is idempotent and runs from two places

`fulfill()` (`src/lib/fulfill.ts`) is called by both the Stripe webhook and the `/api/order` poll
that the thank-you page makes. Either one alone completes the order, so a dropped webhook doesn't
lose a shirt and a customer who closes their laptop doesn't either.

Safety comes from three layers:

1. A Scalable Press `orderToken` can only be placed **once** — a second `POST /order` is rejected
   with `already in state`, which we treat as success rather than an error.
2. `POST /api/checkout` passes `idempotencyKey: pi:<orderToken>` to Stripe, so a retried checkout
   reuses the same PaymentIntent instead of creating a second one.
3. `fulfill()` early-returns if `sp_order_id` is already recorded. On the duplicate path it asks
   **Scalable Press** which order that token became (`findOrderIdByToken`) rather than trusting our
   own metadata, then records the answer.

That third layer matters more than it looks. If `POST /order` succeeds but the write back to Stripe
then fails, the order id exists *only* at the printer. Recovering it from our own metadata would
never succeed, so the webhook would return 503 forever and the customer would sit on "placing"
while their shirt was actually printing. Asking the printer makes fulfilment self-healing; falling
back to re-reading the PaymentIntent covers a concurrent caller of ours winning the race.

Transient failures (Scalable Press 5xx, network) return `placing`, and the webhook responds **503**
so Stripe retries with backoff. Only permanent rejections write `sp_status: failed`.

### Only our own PaymentIntents get printed

Every webhook endpoint on a Stripe account receives *every* event on that account. If a second
application shares the account — and during development one did — its `payment_intent.succeeded`
events arrive here too. So `/api/checkout` stamps `app: "datetime.store"` on each PaymentIntent, and
both the webhook and `/api/order` ignore anything without that tag (`isOurOrder` in
`src/lib/stripe.ts`). Without it, a foreign app's metadata would be read as an order and sent to our
printer.

For the same reason, order state is read from `sp_order_id` rather than `sp_status`: a foreign
read-modify-write on the metadata can clobber a status field, but the presence of an order id is
what actually means "this shirt is being printed".

### The address is validated before the customer is charged

`/api/checkout` uploads the design and gets a Scalable Press quote *first*. A bad address or an
out-of-stock size fails with a 400 and the real Scalable Press issue text, before a PaymentIntent
exists. No charge to refund.

### Order lookup needs no accounts

`GET /api/order` requires both `payment_intent` and `payment_intent_client_secret`, and
constant-time compares the secret against the PaymentIntent's own. The client secret the browser
already holds is the bearer token, so the thank-you page works with no session, cookie, or login —
and a bare PaymentIntent id gets a 404.

### Artwork is rendered for print, not for screen

`src/lib/artwork.ts` rasterises the frozen timestamp to a transparent PNG **2400px wide** — 8 inches
at 300dpi, matching the print area — in white ink for a black shirt. Digits are laid out on a
fixed advance width computed from the widest glyph, so the live counter doesn't jitter as the
milliseconds tick. Glyphs are tight-cropped via `actualBoundingBox*` so Scalable Press scales the
ink, not the padding.

---

## Run it locally

```bash
npm install
cp .env.example .env.local     # then fill in the four values
npm run dev                    # http://localhost:3000
```

| Variable | Where to get it |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys (test mode) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | same page, `pk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |
| `SP_AUTH` | Scalable Press → Account → API key |

`GET /api/health` reports which credentials are present and whether the Stripe keys are test or
live, without echoing secrets. It returns 503 if anything is missing.

## Verify it

```bash
npm run typecheck
npm test              # 61 unit tests
npm run build
```

An automated browser purchase (picks a fit and size, fills the Payment Element, asserts the
thank-you page shows a Scalable Press order id, and leaves screenshots in `/tmp`):

```bash
npm i --no-save playwright && npx playwright install chromium
BASE=https://benchmark-20260823-isolated-high-cl-hazel.vercel.app node scripts/verify-purchase.mjs
```

Then a real end-to-end purchase in test mode:

1. Open the site, pick a fit and size, click **buy this shirt** — the clock should freeze.
2. Pay with `4242 4242 4242 4242`.
3. You land on `/thanks`, which shows the frozen shirt and, within a few seconds, a Scalable
   Press order id.
4. Cross-check: the PaymentIntent in the Stripe dashboard has `sp_order_id` in its metadata, and
   `GET https://api.scalablepress.com/v2/order/<sp_order_id>` (basic auth, key as the *password*)
   shows `"status": "order"` and `"mode": "test"`.

To exercise the webhook path in isolation, pay and then check the PaymentIntent metadata *without*
loading `/thanks` — `sp_order_id` should appear anyway.

---

## Scalable Press API quirks worth knowing

Each of these cost real debugging time and is encoded in the client:

- Failures sometimes arrive as HTTP **200** with a `statusCode: 500` field in the body, so `parse()`
  checks the body, not just the HTTP status.
- Auth is HTTP basic with an **empty username** and the API key as the **password**.
- `GET /order/{orderToken}` returns a 500 — that endpoint only accepts an `orderId`.
- `GET /order?limit=25` responds in ~40ms; **`limit=50` hangs for over 45 seconds.** The recovery
  path pages at 25 and times every request out at 8s.
- `zip` must be a **string**; sending a number gives a validation error.
- `next-level-boyfriend-tee` (the original store's product) now 500s on quote. Both fits were
  remapped to products that quote cleanly.

## Product decisions

| | |
| --- | --- |
| Price | **$22.50**, shown against a struck-through $30.00 list price. Server-authoritative in `src/lib/catalog.ts`; the client never sends an amount. |
| Cost | ~$15.09 per order at Scalable Press (blank + printing + shipping + tax), so ~$7.40 gross margin. |
| Shipping | Free, US only. Non-US addresses are rejected in the schema and in the wallet handler. |
| Fits | **Fitted** (Next Level Fitted Crew) and **Unisex** (Bella+Canvas), black, XS–3XL. |
| Payment methods | Card, plus Apple Pay / Google Pay / Link via the Express Checkout Element. |

The original used `next-level-boyfriend-tee`; that product now returns HTTP 500 from the Scalable
Press quote endpoint, so both fits were remapped to products that quote successfully. See the
comment in `src/lib/catalog.ts`.

## Layout

```
src/lib/
  catalog.ts        one SKU, prices, size-code mapping, print geometry
  schema.ts         zod request validation + PNG decoding
  scalablepress.ts  v2 client: design / quote / order, retries, error mapping
  stripe.ts         lazy client + the OrderMetadata contract
  fulfill.ts        idempotent fulfilment, shared by webhook and poll
  artwork.ts        canvas print rendering + live preview
src/app/api/
  checkout/         design → quote → PaymentIntent
  webhooks/stripe/  signature-verified fulfilment
  order/            client-secret-authorised status + fulfilment fallback
  health/           credential presence and test/live mode
```

## Known limitations

- **US only.** Shipping quotes, the ZIP regex, and the wallet handler all assume US.
- **Sales tax is not collected.** Scalable Press charges us tax; we don't charge the customer.
  Wire up Stripe Tax before going live.
- **No emails.** Stripe sends a receipt (`receipt_email`); there is no "your shirt shipped" mail.
- **No admin UI.** Failed fulfilments surface as `sp_status: failed` plus `sp_error` on the
  PaymentIntent; someone has to look in Stripe.
- **Print colour is fixed to white,** which assumes the black shirt.
- **Interactive browser QA has not been run.** The server flow is verified end to end (real Stripe
  test payments, real Scalable Press test orders, via both the webhook and the poll), and the client
  bundle is verified to contain the expected wiring, but Chromium cannot execute in the sandbox this
  was built in, so `scripts/verify-purchase.mjs` has not actually been run. Do that first.
- **Apple Pay needs domain verification.** The Express Checkout Element is wired up, but Apple Pay
  will not appear until the production domain is registered in the Stripe dashboard.
