# Bloomprint

**A one-of-one botanical specimen, grown from your name.**

Customers enter a name, an optional date and a climate. A deterministic generator grows a plant
that has never existed before (stem, leaves, flowers, roots, a Latin binomial and a herbarium label),
renders it as a vintage botanical plate, and prints it direct-to-garment on a Bella+Canvas 3001 tee
through the Prodigi Print API. Payment is Stripe Checkout; nothing is sent to print until Stripe
reports the session as paid.

## How it works

```
/design  ──▶  POST /api/checkout  ──▶  Stripe Checkout (hosted)  ──▶  /order/{session}
                (design in metadata)          │
                                              ▼  checkout.session.completed (signed)
                                     POST /api/stripe/webhook
                                              │  payment_status === "paid"
                                              ▼
                                     fulfillCheckoutSession()  ──▶  Prodigi order
                                              │                     asset = /api/print/{signed}.png
                                              ▼
                                     PaymentIntent.metadata.prodigi_order_id
```

* `src/lib/botanical/` – the generator. Pure TypeScript, runs identically in the browser (live preview)
  and on the server (print file), seeded by name + date + climate + "regrow" counter.
* `src/lib/render.ts` – SVG → PNG at the print area's native resolution (4680 × 5790 px, ~300 dpi)
  using resvg with the embedded Cormorant Garamond fonts.
* `src/app/api/print/[token]` – renders a design whose token is HMAC-signed by the server. Prodigi
  downloads the print file from here; Stripe uses the preview size as the product image.
* `src/lib/fulfillment.ts` – the only path to Prodigi. Requires a *paid* session, is idempotent
  (Prodigi `idempotencyKey` + order id stored on the PaymentIntent), and is triggered by the webhook.
  The order page also calls it as a fallback if the webhook is late or unconfigured; it is still
  gated on Stripe reporting `paid`.
* Order state lives in Stripe (Checkout Session + PaymentIntent metadata). No database is needed.

## Environment variables

See `.env.example`. Required: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`,
`PRODIGI_API_BASE`, `PRINT_ASSET_SECRET`.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
# in another terminal, forward Stripe events:
stripe listen --forward-to localhost:3000/api/stripe/webhook   # copy the whsec_ into .env.local
```

## Deploy

```bash
vercel link
vercel env add PRODIGI_API_KEY production
vercel env add PRODIGI_API_BASE production        # https://api.sandbox.prodigi.com/v4.0 or https://api.prodigi.com/v4.0
vercel env add PRINT_ASSET_SECRET production      # openssl rand -hex 32
vercel deploy --prod
./scripts/configure-stripe.sh https://<your-domain> sk_test_...   # creates webhook, stores keys, redeploys
```

## Testing

* Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC.
* `scripts/webhook-test.mjs` – exercises signature verification and payment gating against a local server.
* `scripts/prodigi-sandbox-order.ts` – creates a sandbox print order with the deployed asset URL.
* `scripts/sign-token.ts` – prints a signed print-asset token for a design.

## Going to production

1. Swap Stripe test keys for live keys and re-run `configure-stripe.sh` with the live key.
2. Set `PRODIGI_API_BASE=https://api.prodigi.com/v4.0` with a live Prodigi key (orders then cost money).
3. Configure Stripe Tax (or fold tax into price) and review `SHIP_COUNTRIES` / pricing in `src/lib/catalog.ts`.
4. Point a custom domain at the project and set `NEXT_PUBLIC_SITE_URL` if you use one.
5. Consider Prodigi callbacks (`callbackUrl`) or a cron to sync shipment tracking into customer emails.
