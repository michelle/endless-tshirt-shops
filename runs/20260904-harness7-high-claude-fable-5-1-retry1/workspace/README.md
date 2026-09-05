# datetime.store

> we sell a t-shirt with the current datetime.

A production-quality rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store):
one black tee, printed with the Unix time in milliseconds at the exact moment you click **Buy now**.
Every shirt is unique.

- **Next.js 16** (App Router, TypeScript) on **Vercel**
- **Stripe** Payment Element + Express Checkout (Apple Pay / Google Pay / Link) with deferred PaymentIntents
- **Prodigi Print API v4** for print-on-demand fulfillment (replaces the original Scalable Press flow)
- No database: the Stripe PaymentIntent is the order record; the print file is generated deterministically from the timestamp

## How it works

```
browser                          server (Next.js route handlers)               third parties
-------                          ------------------------------                -------------
pick cut + size
shirt ticks every frame
click Buy now  ──freeze ts──▶    POST /api/checkout {style,size,ts,email,ship}
                                   validates, creates PaymentIntent            ─▶ Stripe
                ◀── clientSecret ──
stripe.confirmPayment(...)                                                     ─▶ Stripe
                                 POST /api/orders/{pi}  (fast path)
                                 POST /api/stripe/webhook (authoritative)      ◀─ Stripe payment_intent.succeeded
                                   ensureFulfilled(pi): if paid & no prodigi id
                                     create Prodigi order (idempotencyKey = pi) ─▶ Prodigi
                                     store prodigi_order_id in pi.metadata      ─▶ Stripe
                                                                               ◀─ Prodigi fetches
                                 GET /api/artwork/{style}-{ts}.png                 the print file
                                 POST /api/prodigi/callback (status updates)   ◀─ Prodigi
success view / GET /orders/{pi}
```

Key files:

| Path | Purpose |
| --- | --- |
| `lib/products.ts` | Catalog (two cuts → two Prodigi SKUs), price, shipping countries |
| `lib/layout.ts` | Print layout shared by the on-screen shirt and the print file |
| `lib/artwork.tsx` | Renders the transparent print-ready PNG (`next/og`, Chivo font) |
| `lib/fulfill.ts` | Idempotent Stripe → Prodigi fulfillment; order view |
| `lib/prodigi.ts` | Small Prodigi v4 client (sandbox/live by `PRODIGI_ENV`) |
| `components/Shirt.tsx` | SVG tee with the live ticking timestamp |
| `components/Checkout.tsx` | Pickers, Express Checkout, Address + Payment Elements |
| `app/orders/[id]/page.tsx` | Order status page (payment + print status) |
| `scripts/verify-flow.mjs` | Headless end-to-end test of the whole purchase |

## Running locally

```bash
cp .env.example .env.local   # fill in keys (see below)
npm install
npm run dev                  # http://localhost:3000
```

Environment variables:

| Name | Notes |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…` / `rk_…` (a `stripe sandbox create` key works) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…`; inlined at build time |
| `STRIPE_WEBHOOK_SECRET` | signing secret of a `payment_intent.succeeded` endpoint pointing at `/api/stripe/webhook` |
| `PRODIGI_API_KEY` | Prodigi sandbox or live key |
| `PRODIGI_ENV` | `sandbox` (default) or `live` |
| `PRODIGI_CALLBACK_TOKEN` | optional shared secret appended to the Prodigi callback URL |
| `PUBLIC_BASE_URL` | optional; defaults to the Vercel production URL. Prodigi must be able to fetch `/api/artwork/…` from here |
| `PRICE_CENTS`, `COMPARE_AT_CENTS`, `SHIP_COUNTRIES` | optional overrides (defaults 2250, 3000, `US`) |

Local webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and put the printed
`whsec_…` in `.env.local`. (Without it the client fast path still fulfills orders; the webhook is the
safety net for redirects and closed tabs.) Note that Prodigi can't download print files from
`localhost`, so sandbox orders placed from a local server will show an asset download error — that is expected.

## Verifying the customer flow

```bash
BASE_URL=https://<deployment> PRODIGI_API_KEY=… node scripts/verify-flow.mjs
```

The script opens the shop in headless Chromium, confirms the shirt is ticking, picks *Unisex / L*, fills the
address and the `4242 4242 4242 4242` test card, buys, and then asserts:

1. the success view shows the frozen timestamp and the shirt preview matches it,
2. `GET /api/orders/{id}` reports `paid` and a Prodigi order id,
3. the print file URL returns a PNG,
4. the order page renders the Prodigi order,
5. the order on Prodigi has the right SKU / size / colour and the print-file URL as its asset.

Screenshots and the print file land in `verify-artifacts/`.

Manual check: open the site, use card `4242 4242 4242 4242`, any future expiry, any CVC, ZIP `94107`.
Then look at the PaymentIntent in the Stripe dashboard (metadata holds the design and `prodigi_order_id`)
and the order in the Prodigi sandbox dashboard.

## Deploying

```bash
vercel link --project <name>
vercel env add STRIPE_SECRET_KEY production   # … and the rest of the table above
vercel deploy --prod
stripe webhook_endpoints create --url=https://<domain>/api/stripe/webhook -d "enabled_events[]=payment_intent.succeeded"
```

## Going live (checklist)

- Claim the Stripe sandbox / use your real account; swap in **live** keys and a live webhook endpoint.
- Switch `PRODIGI_ENV=live` with a live Prodigi key, add a payment method on Prodigi, and place one real order to check print placement.
- Register the production domain for Apple Pay (`stripe payment_method_domains create --domain_name=…`).
- Set `PRICE_CENTS` with real unit + shipping costs in mind (sandbox quote: ~$12–14 tee + ~$4.73 US Standard shipping) and decide whether to collect sales tax (Stripe Tax).
- Add a custom domain and set `PUBLIC_BASE_URL` if you don't want the `*.vercel.app` URL in Prodigi's asset links.
- Optional: write a terms/returns page (every shirt is one of a kind, so returns are probably store credit only).
