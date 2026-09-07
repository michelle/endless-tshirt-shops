# The Obsolete Guild — union tees for extinct trades

A print-on-demand t-shirt store. Each design is a union/guild badge for a profession that no longer
exists (lamplighters, knocker-uppers, human computers, pinsetters…). Shirts are printed and shipped by
[Prodigi](https://www.prodigi.com/print-api/) on Bella + Canvas 3001 tees.

## Stack

- Next.js 16 (App Router) + Tailwind 4, deployed on Vercel
- Prodigi Print API v4 for shipping quotes, order creation and order status
- Stripe Checkout for payment (optional; the store runs a no-payment test checkout when Stripe is not configured)
- No database: the Prodigi order is the system of record, cart lives in `localStorage`

## Layout

| Path | What |
| --- | --- |
| `lib/designs.json` | The ten designs: names, mottos, founding years, history blurbs |
| `design/generate.mjs` | Renders every design (two ink variants) to print-ready PNG + web preview with resvg |
| `public/designs/` | Generated artwork. `*-print.png` is 4500×5400 px (15×18 in at 300 dpi), transparent |
| `lib/catalog.ts` | SKU, colours (with which ink variant they use), sizes, price |
| `lib/prodigi.ts` | Prodigi client: quotes, create order, get order |
| `app/api/quote` | Live shipping quote for the cart + destination country |
| `app/api/checkout` | Creates a Stripe Checkout session, or (test mode) places the Prodigi order directly |
| `app/api/stripe/webhook` | `checkout.session.completed` → Prodigi order (idempotent on session id) |
| `app/orders/stripe/[sessionId]` | Stripe success URL; also fulfils if the webhook hasn't landed yet |
| `app/orders/[id]` | Order status straight from Prodigi (tracking numbers appear when shipped) |
| `scripts/e2e-flow.mjs` | Headless-Chrome end-to-end purchase test: `node scripts/e2e-flow.mjs https://your-host` |

## Running locally

```bash
cp .env.example .env.local   # fill in PRODIGI_API_KEY (sandbox)
npm install
npm run dev
```

Regenerate artwork after editing `lib/designs.json` or the icon paths:

```bash
node design/generate.mjs            # all designs
node design/generate.mjs lamplighters
```

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `PRODIGI_API_KEY` | yes | Sandbox key while testing, live key for production |
| `PRODIGI_API_BASE` | no | Defaults to the sandbox. Set `https://api.prodigi.com/v4.0` for production |
| `STRIPE_SECRET_KEY` | for real payments | When unset, checkout runs in test mode and takes no payment |
| `STRIPE_WEBHOOK_SECRET` | with Stripe | Signing secret for the `/api/stripe/webhook` endpoint |
| `SITE_URL` | recommended | Public origin used to build print-file URLs sent to Prodigi |

## Going to production

1. Add `STRIPE_SECRET_KEY` and create a webhook for `checkout.session.completed` pointing at `/api/stripe/webhook`; add its secret as `STRIPE_WEBHOOK_SECRET`.
2. Replace the Prodigi sandbox key with a live key and set `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`.
3. Set `SITE_URL` to the final domain so Prodigi always fetches print files from a stable host.
4. Order a sample of each design to check print placement and colour on real garments.
