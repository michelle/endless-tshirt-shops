# Department of Obsolete Futures — t-shirt store

Print-on-demand shirt store. Seven original "bureau seal" designs for futures that never
arrived (jetpack commuting, lunar hotels, meal pills…). Next.js 16 App Router, Stripe
Checkout for payment, Prodigi Print API for printing and shipping.

## How it works

1. `src/lib/catalog.ts` defines the products, shirt colours and sizes.
2. `src/lib/designs.ts` generates each seal as SVG. The same code renders the on-site
   previews and the print files, so what you see is what gets printed.
3. `npm run render` rasterises every design/ink combination to `public/print/*.png`
   (15.6in × 19.3in at 300 DPI, transparent) plus web previews in `public/designs/`.
4. Cart lives in `localStorage`. `POST /api/checkout` validates it against the catalog and
   creates a Stripe Checkout Session (shipping address + phone collected by Stripe).
5. After payment, **both** the Stripe webhook (`/api/webhooks/stripe`) and the success page
   (`/api/orders/confirm`) call `fulfilSession`, which creates the Prodigi order using the
   Stripe session id as Prodigi's `idempotencyKey`. Exactly one print order per payment,
   whichever path runs first.
6. `/order/<prodigi id>` shows live status and tracking straight from Prodigi.

## Local development

```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev
```

Test cards: `4242 4242 4242 4242`, any future expiry, any CVC.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PRODIGI_API_KEY` | Prodigi API key (sandbox or live) |
| `PRODIGI_API_URL` | `https://api.sandbox.prodigi.com/v4.0` or `https://api.prodigi.com/v4.0` |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the `checkout.session.completed` webhook |
| `NEXT_PUBLIC_SITE_URL` | Public origin; optional on Vercel (falls back to `VERCEL_PROJECT_PRODUCTION_URL`) |

The site must be publicly reachable for Prodigi to download the print PNGs.

## Scripts

- `npm run render` – regenerate print files and previews after editing designs
- `npm run typecheck`, `npm run lint`, `npm run build`
- `npm run e2e -- https://your-site` – Playwright purchase test with a Stripe test card
