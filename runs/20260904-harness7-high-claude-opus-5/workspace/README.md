# datetime.store

We sell a t-shirt with the current datetime.

A rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store) on Next.js,
Stripe Checkout and the **Prodigi** Print API (replacing the original's Scalable Press flow).

The product is unchanged: a black tee printed with the Unix millisecond timestamp of the
instant you hit buy. The number on screen runs live until you commit, then freezes — that
frozen value is what gets printed.

---

## How it works

```
browser                    this app                     Stripe            Prodigi
   │
   │ Date.now() at click
   ├──── POST /api/checkout ────►
   │                        creates Checkout Session ────►
   │                        (ts/style/size in metadata)
   ◄──── redirect to hosted Checkout ────────────────────►
   │                                                  buyer pays
   │                             ◄── checkout.session.completed ──┤
   │                        POST /api/webhooks/stripe
   │                        fulfilSession() ─────────────────────────────►  create order
   │                                                                        asset URL =
   ◄──── /success?session_id=… ──                                           /api/artwork/<ts>.png
   │ polls /api/order/<id> ────► (also a fulfilment backstop)      ◄──────  Prodigi fetches it
```

### Design decisions worth knowing

**No artwork storage.** `/api/artwork/<ts>.png` renders the print asset deterministically
from the timestamp in the URL, so the same URL always produces the same bytes. Prodigi pulls
print assets from a URL, which means the URL *is* the design — there is no upload step, no
blob store, and nothing to garbage-collect. The original had to POST the canvas bitmap to
Scalable Press to mint a `designId`; this is strictly less machinery.

**No database.** The only durable state a purchase creates is "does a Prodigi order exist for
this payment", and that is written to the Stripe PaymentIntent's metadata
(`prodigi_order_id`). Stripe is the order ledger; Prodigi is the production ledger.

**Two fulfilment paths, one idempotent function.** The Stripe webhook is primary. The
order-status endpoint the confirmation page polls is a backstop, so a buyer still gets their
shirt if the webhook is delayed or misconfigured. `fulfilSession()` short-circuits on the
recorded order id and passes the Stripe session id to Prodigi as an `idempotencyKey`, so the
two racing cannot print two shirts.

**Hosted Stripe Checkout instead of Elements.** The original hand-rolled a card form plus a
Payment Request button for Apple Pay. Hosted Checkout gets wallets, Link, SCA, address
validation and localisation for free, and keeps card data entirely off our origin.

**Print geometry is pinned to the lab.** Prodigi reports a 4665 × 5844 px front print area for
these tees. The artwork canvas is rendered at that exact aspect ratio (2800 × 3508, ~245 DPI)
and submitted with `sizing: fillPrintArea`, so the mapping from canvas to garment is 1:1. The
timestamp lands ~8in wide, ~3in below the collar — the original's placement.

---

## Run it locally

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run dev                    # http://localhost:3000
```

Forward webhooks to your dev server in a second terminal, and use the `whsec_…` it prints as
`STRIPE_WEBHOOK_SECRET`:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Verify it

```bash
npm test          # pure logic: input validation, catalogue mapping, print geometry
npm run build     # type-checks the whole app
curl localhost:3000/api/health
```

`/api/health` reports which environments you are pointed at:

```json
{"ok":true,
 "stripe":{"configured":true,"mode":"test","webhookConfigured":true},
 "prodigi":{"configured":true,"env":"sandbox"}}
```

**Check the print asset.** Artwork is white-on-transparent, so it looks blank in a viewer.
Inspect its alpha bounding box instead:

```bash
curl -s "localhost:3000/api/artwork/$(node -p Date.now()).png" -o art.png
file art.png    # PNG image data, 2800 x 3508, 8-bit/color RGBA
```

**Walk the whole customer flow.** With test mode on, buy a shirt with card
`4242 4242 4242 4242`, any future expiry, any CVC. Then confirm the print order landed:

```bash
curl -s "https://api.sandbox.prodigi.com/v4.0/Orders/<ord_id>" -H "X-API-Key: $PRODIGI_API_KEY"
```

The field that proves the whole chain works is `status.details.downloadAssets: "Complete"` —
Prodigi reached our artwork URL over the public internet and accepted the file.

---

## Configuration

| Variable | Required | Notes |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | yes | Test or live. A non-`live` key shows the test-mode badge on the storefront. |
| `STRIPE_WEBHOOK_SECRET` | yes | The endpoint refuses to process events without it. |
| `PRODIGI_API_KEY` | yes | Sandbox keys start with `test_`. |
| `PRODIGI_ENV` | no | `sandbox` (default) or `live`. **Only the exact string `live` sends real orders.** |
| `PUBLIC_BASE_URL` | in prod | Absolute public origin. Prodigi fetches artwork from it, so it must be reachable from the open internet. Falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then the request host. |

## Layout

```
app/
  page.tsx                          storefront
  success/page.tsx                  confirmation, polls order status
  icon.tsx                          favicon
  api/checkout/                     creates the Stripe Checkout Session
  api/webhooks/stripe/              primary fulfilment trigger
  api/order/[sessionId]/            order status + fulfilment backstop
  api/artwork/[slug]/               print-ready PNG (white on transparent)
  api/preview/[style]/[slug]/       shop mockup (black shirt, white type)
  api/health/                       configuration smoke test
components/
  Shirt.tsx                         SVG garment + rAF millisecond ticker
  Storefront.tsx                    cut/size pickers, buy button
  Receipt.tsx                       confirmation screen
lib/
  catalog.ts                        prices, SKUs, and all input validation
  artwork.ts                        print geometry
  prodigi.ts                        Prodigi Print API v4 client
  fulfill.ts                        idempotent Stripe session -> Prodigi order
  stripe.ts  urls.ts  font.ts  shirt-path.ts
tests/logic.test.ts
```
