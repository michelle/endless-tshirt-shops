# Sidereal — wear the sky of your moment

A fully functional print-on-demand t-shirt store. Every shirt carries the **real night sky**
above one specific place at one specific moment — computed from the Yale Bright Star Catalog,
rendered as vector art, and DTG-printed on a Bella+Canvas 3001 by Prodigi's global print
network. Payment via Stripe Checkout; shirts are sent to print **only after payment succeeds**.

## Stack

- **Next.js 15** (App Router, TypeScript), no database — the design is a pure function of its
  parameters, so the print file is a deterministic URL.
- **Stripe Checkout** (hosted payment page) + webhook fulfillment.
- **Prodigi Print API v4** for print + worldwide shipping (SKU `GLOBAL-TEE-BC-3001`).
- **sharp** rasterizes the SVG design to a 4680×5790 print PNG; text is converted to vector
  paths with **opentype.js** (embedded Marcellus TTF) so server-side rendering needs no fonts.

## How it works

```
/design         → live SVG preview on a shirt mockup (client-side, same code as print)
/api/design.png → deterministic print file; Prodigi downloads this URL after ordering
/api/checkout   → creates a Stripe Checkout Session, order payload stored in metadata
/api/stripe/webhook → checkout.session.completed → fulfill
/order/[id]     → status page; also a fulfillment fallback if the webhook is missed
```

Fulfillment (`src/lib/fulfill.ts`) is idempotent: a `fulfilled` flag in Stripe session
metadata + Prodigi `idempotencyKey` = the Stripe session id.

## Data & regenerating it

`scripts/build-data.mjs` turns the raw catalogs in `data-raw/` into compact embedded
TypeScript modules in `src/data/` (stars ≤ mag 5.5, constellation lines, cities ≥ 250k pop
plus capitals, country names, the font). Sources: Yale BSC via
github.com/brettonw/YaleBrightStarCatalog, d3-celestial (MIT), GeoNames (CC-BY 4.0),
Marcellus (SIL OFL 1.1, license in `data-raw/Marcellus-OFL.txt`).

```sh
node scripts/build-data.mjs
```

## Local development

```sh
npm install
npm run dev
```

Copy `.env.example` values into `.env.local` to exercise checkout/fulfillment locally
(not needed to browse the designer).

## Environment variables

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the webhook endpoint pointing to `/api/stripe/webhook` |
| `PRODIGI_API_KEY` | Prodigi Print API key (sandbox or live) |
| `PRODIGI_BASE_URL` | `https://api.sandbox.prodigi.com/v4.0` or `https://api.prodigi.com/v4.0` |
| `APP_BASE_URL` | Optional override for absolute URLs (defaults to the Vercel production URL) |

## Deploy

```sh
vercel link --project <project>
vercel env add STRIPE_SECRET_KEY production   # ...and the rest of the table
vercel deploy --prod
# then point a Stripe webhook at https://<domain>/api/stripe/webhook
# (checkout.session.completed) and set STRIPE_WEBHOOK_SECRET accordingly.
```
