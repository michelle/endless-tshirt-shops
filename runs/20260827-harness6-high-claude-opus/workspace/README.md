# datetime.store

We sell a t-shirt with the current datetime.

A rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store) on Next.js,
Stripe Checkout and the Prodigi print API. The shop has exactly one product: a black tee printed
with the Unix timestamp, in milliseconds, of the instant you pressed buy. The number on the shirt
ticks until you commit, then it's yours.

## How it works

```
browser                     server                         Stripe            Prodigi
───────                     ──────                         ──────            ───────
ticking clock (rAF)
  │ click buy → freeze ts
  ├──POST /api/checkout ───▶ create Checkout Session ─────▶ session
  │                          metadata: {ts, style, size}
  ◀── clientSecret ─────────
  │
  ├─ embedded Checkout ────────────────────────────────────▶ payment
  │  (card / Apple Pay / Link, shipping address collected)
  │
  ◀── onComplete
  ├──GET  /api/order/[id] ─▶ read session (fast)  ─────────▶ receipt shown
  └──POST /api/order/[id] ─▶ fulfil ──────────────────────────────────────▶ create order
                                                                             asset = /api/artwork?ts=…
       Stripe webhook ─────▶ /api/stripe/webhook ──────────────────────────▶ (same, idempotent)
```

Two things are worth calling out:

**The timestamp is the only source of truth.** It is frozen client-side at the click, carried on
the Checkout Session metadata, and everything downstream — the print asset, the Prodigi order, the
receipt — is derived from it. There is no artwork upload, no blob storage, and no way for the
printed shirt to disagree with the receipt.

**Fulfilment runs from two places and is safe either way.** The Stripe webhook is authoritative; the
order page also triggers it so a shop with no webhook configured still ships, and so a customer who
refreshes gets an answer instead of a spinner. Prodigi de-duplicates on `idempotencyKey` (the Stripe
session id), and the resulting order id is written back to the PaymentIntent metadata, so repeat
calls cost one API read and create nothing.

There is no database. Stripe is the order store: the session holds what was bought, the
PaymentIntent holds the Prodigi order id and any fulfilment error. That is a deliberate trade — see
*Limitations*.

## Running it

```bash
npm install
cp .env.example .env.local     # fill in the four required values
npm run dev                    # http://localhost:3000
```

Forward webhooks while developing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# paste the printed whsec_… into STRIPE_WEBHOOK_SECRET
```

### Verifying

`GET /api/health` checks configuration *and* prices a live Prodigi quote, so it tells you whether
you are still selling above cost:

```json
{
  "ok": true,
  "stripe": { "configured": true, "testMode": true, "webhookConfigured": true },
  "prodigi": { "ok": true, "sandbox": true,
               "landedCost": "$16.99", "price": "$22.50", "grossMargin": "$5.51" }
}
```

There is a scripted version of the whole purchase in `scripts/smoke-purchase.mjs`:

```bash
npm i -D playwright                                   # not a project dependency
BASE=http://localhost:3000 node scripts/smoke-purchase.mjs
```

It picks a cut and size, pays with a test card, and prints the receipt including the Prodigi order
id. Screenshots of each step land in `$OUT` (default `/tmp`).

To do it by hand, buy a shirt with test card `4242 4242 4242 4242`, any future expiry,
any CVC. Then confirm the print asset actually reached the printer:

```bash
curl -s https://api.sandbox.prodigi.com/v4.0/Orders/<ord_id> \
  -H "X-API-Key: $PRODIGI_API_KEY" \
  | jq '{stage: .order.status.stage, details: .order.status.details,
         asset: .order.items[0].assets[0].status}'
# want: downloadAssets "Complete", asset status "Complete"
```

## The artwork

`/api/artwork?ts=…&print=1` renders the press-ready PNG with Satori + resvg (`next/og`): white Chivo
Bold digits on a transparent canvas, sized so the number lands about 9in wide inside the ~11.7in
chest print area, at roughly 300dpi. The canvas is sized from the digit count rather than fixed, so
the design keeps its proportions when timestamps gain a digit.

Prodigi is told `sizing: fitPrintArea`, which scales the *whole image* — padding included — into the
print area. The transparent margin is therefore load-bearing: it is what stops the number running
off the seams. If you change `TEXT_WIDTH_RATIO`, you are changing the physical print size.

Without `print=1` the same route renders a 1200×630 dark preview used for Stripe line-item images
and social cards.

## Layout

```
app/
  page.tsx                     the shop
  order/[sessionId]/page.tsx   bookmarkable receipt
  api/
    checkout/                  POST → Checkout Session
    order/[sessionId]/         GET = read (fast) · POST = fulfil (~7s)
    stripe/webhook/            signature-verified fulfilment
    prodigi/callback/          Prodigi status callbacks (log only, unsigned)
    artwork/                   the design, print + preview
    health/                    config check + live margin
lib/
  catalog.ts                   price, SKUs, sizes, validation — the whole catalogue
  fulfill.ts                   Checkout Session → Prodigi order, idempotent
  prodigi.ts   stripe.ts   site.ts   fonts.ts
components/
  Shirt.tsx                    SVG silhouette + rAF clock
  Store.tsx                    picker → embedded Checkout → receipt
  OrderReceipt.tsx             two-phase status
```

## Limitations

- **No database.** Order state lives in Stripe metadata. Fine at this volume and it keeps the
  deploy to one service, but it means no admin view, no "all stuck orders" query beyond filtering
  PaymentIntents on `prodigi_error`, and a hard dependency on Stripe being up to render a receipt.
- **US only.** `SHIPPING_COUNTRIES` in `lib/catalog.ts` is a one-line change, but shipping cost and
  duties are not modelled — free international shipping at $22.50 would lose money.
- **Margin is thin.** $5.51 before Stripe fees (~$0.95 on this basket), so roughly $4.55 a shirt.
  Any shipping upgrade or a colour change wipes it out.
- **No email beyond Stripe's receipt.** There is no "your shirt shipped" mail; tracking only appears
  if the customer returns to their order page.
- **Link enrolment is pre-checked in Checkout**, and ticking it makes a phone number mandatory —
  noticeable friction on a $22.50 impulse buy. Pinning `payment_method_types: ['card']` does *not*
  remove it; Link is surfaced independently. Turn it off in the Stripe Dashboard under
  Settings → Payments → Link if you want the leanest checkout.
- **Print placement is Prodigi's default centring** within the front print area. The original
  positioned the design 3in from the collar. Order a sample before selling.
