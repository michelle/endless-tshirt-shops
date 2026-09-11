# Sidereal — the sky above your moment, on a shirt

A print-on-demand t-shirt store where every shirt is generated for one customer.
The buyer names a place, a date and a time; the app computes the real night sky
overhead at that instant (≈5,000 catalogue stars, constellation figures, cardinal
points), lays their words under it, and prints the result direct-to-garment.

* **Frontend / API:** Next.js 16 (App Router) on Vercel
* **Payments:** Stripe Checkout (hosted) + signed webhooks
* **Printing & shipping:** Prodigi Print API v4 (sandbox by default)
* **Storage:** Vercel Blob for order records and print-ready PNGs
* **Rendering:** deterministic SVG → PNG via `@resvg/resvg-js` with bundled fonts

## Flow

1. `/design` — the studio. Live preview, geocoding (Open-Meteo), shirt colour/size.
2. `POST /api/checkout` — creates a Stripe Checkout Session. The whole design is
   encoded (base64url JSON, < 500 chars) into the session metadata.
3. Stripe → `POST /api/webhooks/stripe` (`checkout.session.completed`), signature
   verified. Only if `payment_status === "paid"` we call `fulfillCheckoutSession`.
4. Fulfilment renders the 4680 × 5790 px print file, stores it in Blob, and
   creates the Prodigi order (recipient = the shipping address Stripe collected).
   The Stripe session id is Prodigi's `idempotencyKey`, so retries never
   double-print. The Prodigi order id is mirrored onto the PaymentIntent metadata.
5. `/order/[sessionId]` — thank-you page with live status polled from Prodigi.
   If the webhook hasn't landed yet it falls back to fulfilling from here.
6. `/admin?token=…` — order list with retry.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev -- -p 3456
stripe listen --forward-to localhost:3456/api/webhooks/stripe   # gives STRIPE_WEBHOOK_SECRET
```

Environment variables:

| name | purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret (test or live) |
| `STRIPE_WEBHOOK_SECRET` | signing secret of the webhook endpoint |
| `PRODIGI_API_KEY` | Prodigi API key |
| `PRODIGI_API_URL` | `https://api.sandbox.prodigi.com` or `https://api.prodigi.com` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (set automatically when the store is linked) |
| `SITE_URL` | public origin, used for Stripe redirect URLs and image URLs |
| `ADMIN_TOKEN` | password for `/admin` and `/api/admin/fulfill` |

## Testing a purchase

Use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC, any
address in a supported country. `scripts/e2e-checkout.mjs` drives the whole
thing headlessly with Playwright:

```bash
node scripts/e2e-checkout.mjs https://<your-deployment>
```

## Going live

See the checklist in the final handover notes: claim the Stripe sandbox, switch
to live keys and a live webhook endpoint, switch `PRODIGI_API_URL` to
production, add a custom domain, and review shipping rates against Prodigi's
real quotes.
