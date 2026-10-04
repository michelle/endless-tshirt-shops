# Lifeline Transit Co.

**Your life, as a transit map.** Customers design a t-shirt that maps their story as a subway line, with every stop named by them. A *solo line* suits a life story, graduation, or pub crawl. *Two lines that merge* suits couples: two routes join at the stop where they met and run side by side after that. Every shirt is one of one, printed on demand with DTG (direct-to-garment).

## How it works

```
Browser (public/)                  Vercel functions (api/)              External
──────────────────                 ───────────────────────              ────────
designer + live preview  ──POST──▶ /api/checkout  ── create session ──▶ Stripe Checkout
 (public/js/design.js renders                                          │ customer pays
  the SAME SVG as the print file)                                      ▼
                                   /api/webhook   ◀── checkout.session.completed
order.html ◀── polls ──────────── /api/order     ──┐
                                   (sweep, on each │ fulfillSession():
                                    checkout)    ──┤  1. re-fetch session from Stripe, require payment_status=paid
                                   /api/reconcile ─┘  2. POST Prodigi order (idempotencyKey = session id)
                                                      3. save prodigi_order_id on the PaymentIntent
Prodigi ── downloads ────────────▶ /print/<session>.<hmac>.png  (4680×5880 transparent PNG, rendered on demand)
```

- **No database.** The design is stored in the Checkout Session metadata, and the Prodigi order ID on the PaymentIntent metadata. Stripe is the source of truth.
- **Shirts go to Prodigi only after payment.** Every fulfillment path re-reads the session from the Stripe API and requires `payment_status === 'paid'`. Delayed methods such as bank debits are fulfilled on `checkout.session.async_payment_succeeded`.
- **Exactly once.** Fulfillment can be triggered by the webhook, the order page, or the reconciliation sweep. Prodigi dedupes on `idempotencyKey = session id`, so overlapping triggers are harmless. This was tested.
- **Print file.** `public/js/design.js` lays out the map for the Bella+Canvas 3001 front print area: 4680×5880 px, about 15.6"×19.6" at 300 dpi. The artwork is at most 12" wide and about 15.7" tall, top-aligned like a standard chest print. It has no semi-transparent ink. Station centers are unprinted on light tees and solid white on dark tees. `lib/render.js` rasterizes it with resvg-wasm, using the same bundled Barlow fonts as the browser. A metrics table (`public/js/metrics.js`) makes the layout match exactly between preview and print.

## Pricing & product

| | |
|---|---|
| Product | Prodigi `GLOBAL-TEE-BC-3001`, sizes S–3XL, 6 curated colors |
| Price | $38 per shirt |
| Shipping | Standard $5.95 (+$2 per extra shirt), Express $24.95 (+$4 per extra shirt) |
| Countries | US, CA, GB, IE, most of the EU, CH, NO, AU, NZ (`lib/config.js`) |

Sandbox Prodigi cost for one shirt is about $16.50–$30 landed (standard) and $31–$45 (express). Those numbers come from the quotes API.

## Environment

| Var | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (or restricted key) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` for `/api/webhook`. If unset, each event is verified by re-fetching it from the Stripe API |
| `PRODIGI_API_KEY` | Prodigi API key |
| `PRODIGI_API_BASE` | Defaults to sandbox `https://api.sandbox.prodigi.com/v4.0`. Use `https://api.prodigi.com/v4.0` for live |
| `PRINT_SIGNING_SECRET` | HMAC key for print-file URLs |
| `CRON_SECRET` | Bearer token for `/api/reconcile` (Vercel Cron sends it automatically) |
| `PUBLIC_BASE_URL` | Optional. Overrides the host used in print URLs and redirects |

## Local dev

```bash
npm install
node scripts/dev.mjs                         # http://localhost:3000 (reads .env.local)
node scripts/qa.mjs love white navy          # preview print files on garment colors -> out/
node scripts/e2e-checkout.mjs <base-url> black   # full checkout with a Stripe test card (needs local Chrome)
```

## Deploy

```bash
scripts/deploy.sh            # anonymous Vercel deployment (expires in about 1 hour unless claimed)
scripts/deploy.sh --linked   # your own Vercel project, after `vercel login && vercel link`
```

After linking, add a daily reconciliation cron to `vercel.json`. Anonymous deployments can't define crons.

```json
"crons": [{ "path": "/api/reconcile", "schedule": "17 9 * * *" }]
```
