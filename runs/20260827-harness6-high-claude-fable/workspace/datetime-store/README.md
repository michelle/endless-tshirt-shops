# datetime.store — rebuilt

A production-quality rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store):
a one-page shop that sells a black t-shirt printed with the current datetime —
specifically, the Unix epoch **millisecond** at which you press "Buy now".

- **Live (test mode):** https://benchmark-20260827-harness6-high-cl-iota.vercel.app
- **Stack:** Next.js 15 (App Router, TypeScript) · Stripe Checkout · Prodigi Print API (sandbox) · Vercel

## How it works

1. `app/page.tsx` renders the shirt (the original SVG silhouettes) with a
   live-ticking epoch-milliseconds readout, style (Fitted / Unisex) and size
   (S–XL) selectors, and the original $~~30.00~~ → $22.50 pricing.
2. Pressing **Buy now** freezes the displayed millisecond and POSTs
   `{style, size, ts}` to `app/api/checkout`, which creates a Stripe Checkout
   Session ($22.50, free-shipping rate, shipping address collection, the
   timestamp/style/size in metadata) and redirects the customer to Stripe.
3. `app/api/artwork` renders the print file on demand with `next/og` (satori):
   white Chivo digits on a transparent 2400×800 PNG (300dpi for an 8"-wide
   chest print, matching the original's print spec). `?variant=preview`
   returns a black product tile used as the Checkout line-item image.
4. On `checkout.session.completed`, Stripe calls `app/api/stripe-webhook`,
   which verifies the signature, re-fetches the session, and places a Prodigi
   order (SKU by style, black, size, `fitPrintArea`, artwork URL for the
   frozen timestamp). Idempotency: Prodigi `idempotencyKey` = session id, and
   the Prodigi order id is written back to the PaymentIntent metadata.
5. `/success` shows the frozen millisecond, receipt email, and the Prodigi
   order id (auto-refreshing until the webhook lands).

## Products

| Style  | Prodigi SKU          | Garment                                   |
| ------ | -------------------- | ----------------------------------------- |
| Fitted | GLOBAL-TEE-BC-6004   | Bella + Canvas 6004 women's favourite tee |
| Unisex | GLOBAL-TEE-GIL-64000 | Gildan 64000 unisex softstyle tee         |

## Environment variables

| Name                    | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | Stripe secret (currently a sandbox restricted key)   |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the `checkout.session.completed` webhook endpoint |
| `PRODIGI_API_KEY`       | Prodigi API key (currently sandbox)                  |
| `PRODIGI_API_BASE`      | `https://api.sandbox.prodigi.com` (omit or set to `https://api.prodigi.com` for live) |
| `PUBLIC_BASE_URL`       | Canonical public URL (used for redirect + artwork URLs Prodigi fetches) |

## Run locally

```bash
npm install
STRIPE_SECRET_KEY=sk_test_... PRODIGI_API_KEY=... npm run dev
# Webhooks locally:
stripe listen --forward-to localhost:3000/api/stripe-webhook
# put the printed whsec_... in STRIPE_WEBHOOK_SECRET
```

## Verify the full flow

1. Open the site, pick a style/size, press **Buy now**.
2. Pay on Stripe Checkout with `4242 4242 4242 4242`, any future expiry/CVC,
   any US address.
3. You land on `/success` with your frozen millisecond; within a few seconds
   the Prodigi order id (`ord_…`) appears.
4. Cross-check:
   - `stripe charges list --limit 1` → $22.50 succeeded
   - `curl -H "X-API-Key: $PRODIGI_API_KEY" https://api.sandbox.prodigi.com/v4.0/Orders/ord_…`
     → order `InProgress` with your artwork URL.

A scripted version of this flow lives in `../e2e/checkout.mjs` (Playwright).
