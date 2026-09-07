# datetime.store

We sell a t-shirt with the current datetime.

A production rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store):
the storefront shows a black tee whose chest print is a live millisecond
counter. The instant you press buy, the counter stops — and that exact
millisecond is what gets printed and posted to you.

The original used Stripe + Scalable Press. This rebuild keeps Stripe and swaps
fulfilment to the **Prodigi Print API**.

## How it works

```
browser                         server                        Stripe        Prodigi
   │  page load
   │──── POST /api/checkout ────▶│─── create PaymentIntent ────▶│   card only, capture_method: manual
   │◀─── clientSecret ───────────│
   │  pick cut + size
   │  press buy ─── freeze Date.now()
   │──── POST /api/orders/:id/prepare ──▶│
   │                             │─── POST /quotes ─────────────────────────▶│   can we print + ship this?
   │                             │─── attach shirt + address to the intent ─▶│
   │◀─── ok ─────────────────────│
   │──── stripe.confirmCardPayment ─────────────────────────────▶│              card authorised
   │──── POST /api/orders/:id ──▶│
   │                       (also: payment_intent.amount_capturable_updated webhook)
   │                             │─── POST /Orders ─────────────────────────▶│   print job accepted
   │                             │─── capture PaymentIntent ────▶│               money moves last
   │◀─── order + printer ref ────│
```

Three decisions worth calling out:

**Artwork is never stored.** The print file is a pure function of the captured
epoch milliseconds, so `GET /api/artwork/1788747812629.png` renders it on
demand at 300 DPI (4680 × 5790 px) with `@napi-rs/canvas` and a bundled Chivo
TTF. Prodigi fetches that URL when it prepares the job. No blob store, no
database, and any order can be re-rendered byte-for-byte from its timestamp
years later.

**The canvas is the print area.** Both tees have a 15.6" × 19.3" front print
area. Artwork is rendered at exactly that aspect ratio and submitted with
`sizing: fitPrintArea`, so the 8"-wide line 3" from the top lands exactly where
the storefront preview shows it. The on-screen SVG uses the same proportions.

**Nobody is charged for a shirt that cannot be printed.** Checkout quotes
Prodigi before creating the PaymentIntent, the intent uses `capture_method:
manual`, and capture happens only after Prodigi accepts the order. If Prodigi
rejects it, the authorisation is voided (or the charge refunded) and the
shopper is told nothing was charged.

There is no database. Stripe's PaymentIntent is the order record: the captured
timestamp, cut, size, server-validated shipping address, Prodigi order id and
fulfilment state all live in its metadata. Idempotency comes from that metadata
plus Prodigi's own `idempotencyKey`, so the Stripe webhook and the browser's
follow-up call cannot print two shirts.

## Endpoints

| Route | Purpose |
| --- | --- |
| `POST /api/checkout` | Opens a draft PaymentIntent so Elements can mount against a real intent |
| `POST /api/orders/[id]/prepare` | Validates the order, quotes Prodigi, attaches the shirt to the intent |
| `POST /api/orders/[id]` | Settles an authorised order (browser backstop for the webhook) |
| `GET /api/orders/[id]?client_secret=…` | Order status, including live Prodigi stage and tracking |
| `GET /api/artwork/[ts].png` | Print-ready PNG for a timestamp (`?dpi=`, `?bg=` for previews) |
| `POST /api/webhooks/stripe` | `payment_intent.amount_capturable_updated` → place print order → capture |
| `POST /api/webhooks/prodigi` | Prodigi status callbacks, re-verified against the Prodigi API |
| `GET /api/og` | Social card, rendered with the current millisecond |
| `GET /api/status` | Config self-check (reports presence of keys, never values) |

## Running it

```bash
cp .env.example .env.local   # fill in Stripe + Prodigi keys
npm install
npm run dev
```

Then, to exercise the webhook locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

In test mode, pay with `4242 4242 4242 4242`, any future expiry, any CVC.

## Catalogue

| Cut | Prodigi SKU | Product |
| --- | --- | --- |
| Fitted | `GLOBAL-TEE-BC-6004` | Bella + Canvas 6004, women's favourite tee |
| Unisex | `GLOBAL-TEE-BC-3001` | Bella + Canvas 3001, unisex classic tee |

Black, sizes S–2XL, $22.50 with free US shipping (printer cost is ~$17).

## Deliberate limits

- **US shipping only.** Prodigi ships far wider; the storefront pins the
  country so pricing stays a single flat number.
- **Cards only** (plus Apple Pay and Google Pay through the Express Checkout
  Element). Redirect-based methods are excluded because this flow settles
  in-page and needs the outcome before it fulfils. The card field is Stripe's
  Card Element rather than the Payment Element: on a card-only PaymentIntent
  the Payment Element still advertised every method enabled on the account
  (Klarna, ACH), none of which that intent can take.
- **A draft PaymentIntent is opened on page load** so Elements is built from a
  real intent. Abandoned drafts stay in `requires_payment_method` and cost
  nothing, but they do show up in the Stripe dashboard.
- **One shirt per order.** No cart, matching the original.
