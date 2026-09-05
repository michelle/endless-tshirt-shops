# datetime.store

A shop with one product: a t-shirt printed with the exact millisecond you decided to buy it.

A rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store), with the
Scalable Press fulfilment swapped for the **Prodigi Print API**.

## How it hangs together

```
browser                    /api/checkout            Stripe            /api/stripe/webhook      Prodigi
  |  freeze a millisecond  ------------->  PaymentIntent (spec in metadata)
  |  Payment Element        confirmPayment ------->  payment_intent.succeeded -->  create order
  |                                                                                    |
  |  /order/[id]  <-------------------------------------------------------------  print job id
```

There is **no database**. The order specification — the millisecond, the dialect, the fit, the
size, the colour, the postage — lives in the PaymentIntent's metadata, and the shipping address
and email live on the PaymentIntent itself. Everything the store needs to know about an order can
be recovered from Stripe.

### The print file

`/api/artwork` renders the artwork on demand, and Prodigi's printers fetch that URL directly.

- `src/lib/dialects.ts` composes a moment into a list of blocks laid out in a 1000-unit column.
  Both the live browser preview and the print renderer read that one function, so what ticks on
  screen is what gets printed.
- `src/print/render.ts` converts each block to glyph outlines with `opentype.js` and rasterises
  with `sharp`. No fonts are needed at the printer and there is no rasterised text anywhere.
- URLs are signed with an HMAC (`ARTWORK_SECRET`) so the endpoint cannot be used to render
  arbitrary text, while staying open to an unauthenticated printer.

### Fulfilment

`fulfil()` in `src/lib/fulfill.ts` is idempotent twice over: it bails if the PaymentIntent already
carries a `ds_prodigiOrderId`, and it passes the PaymentIntent id to Prodigi as an idempotency key.
It is called from the webhook (the real path) and again from the order page (the safety net for a
slow or unconfigured webhook).

## Running it

```sh
npm install
cp .env.example .env.local   # fill in the keys
npm run dev
```

| Variable | What it is |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `/api/stripe/webhook` |
| `PRODIGI_API_KEY` | Prodigi key. A `test_` prefix routes to the sandbox automatically. |
| `ARTWORK_SECRET` | Any random string; signs artwork URLs |
| `NEXT_PUBLIC_SITE_URL` | Public origin. Falls back to the Vercel deployment URL. |

Add `&fmt=svg` to any artwork URL to see the vector the raster is made from.

## Catalogue

Two Prodigi SKUs, four colourways available on both, five ways of writing down a moment.
All of it lives in `src/lib/catalog.ts` and `src/lib/dialects.ts`.
