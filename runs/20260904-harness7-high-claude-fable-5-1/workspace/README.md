# datetime.store

> we sell a t-shirt with the current datetime.

A production-grade rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store):
a single-page shop selling a black tee printed with the Unix time, in milliseconds, at the instant
the customer clicks **Buy**. Payments by Stripe, printing and shipping by Prodigi.

## How it works

```
browser                       Next.js (Vercel)                  Stripe            Prodigi
  │ pick style/size               │                               │                 │
  │ click Buy → ts = Date.now()   │                               │                 │
  ├─ POST /api/checkout ─────────►│ create PaymentIntent ────────►│                 │
  │◄─ client_secret ──────────────│   metadata {style,size,ts}    │                 │
  │ Stripe Elements (wallets/card)│                               │                 │
  ├─ confirmPayment ─────────────────────────────────────────────►│                 │
  │◄─ succeeded ─────────────────────────────────────────────────-│                 │
  ├─ POST /api/orders/finalize ──►│ fulfil(pi) ──────────────────────────────────►  │ create order
  │                               │◄── webhook payment_intent.succeeded ───────────│ (idempotent)
  │◄─ {prodigiOrderId} ───────────│ write order id to PI metadata │                 │
  │                               │◄── GET /api/artwork/<ts>.png ──────────────────│ downloads print file
```

* **No database.** The Stripe PaymentIntent is the system of record: the shirt spec is pinned in its
  metadata when checkout starts, and the Prodigi order id / status are written back after fulfilment.
* **Artwork is a pure function** of `(style, timestamp)`, rendered on demand at the garment's full
  300 dpi print-area resolution (`/api/artwork/<ts>.png?style=…`), so nothing has to be uploaded or stored.
* **Fulfilment is idempotent** and triggered twice on purpose: from the browser right after payment
  (fast feedback) and from the Stripe webhook (survives closed tabs). Prodigi's `idempotencyKey`
  plus the metadata check guarantee one physical shirt per payment.

## Run locally

```bash
cp .env.example .env.local     # fill in the values
npm install
npm run dev                    # http://localhost:3000
```

Forward webhooks in a second terminal while testing locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # copy the whsec_ into .env.local
```

## Verify

```bash
npm test                                   # unit tests (catalog, artwork, Prodigi order mapping)
npm run build                              # type-check + production build
STRIPE_SECRET_KEY=sk_test_… BASE_URL=https://… node scripts/verify-flow.mjs   # API-level end-to-end
BASE_URL=https://… npm run test:e2e        # real browser: Stripe Elements + test card 4242
```

Test card: `4242 4242 4242 4242`, any future expiry, any CVC. Prodigi sandbox orders are free and
never printed.

Back office: `/admin/orders?token=$ADMIN_TOKEN` lists payments with their Prodigi status.
Health: `/api/health`.

## Environment

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe API keys (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `/api/webhooks/stripe` |
| `PRODIGI_API_KEY` | Prodigi Print API key (sandbox or live) |
| `PRODIGI_ENV` | `sandbox` (default) or `live` – selects the Prodigi base URL |
| `NEXT_PUBLIC_SITE_URL` | Public origin; Prodigi downloads artwork from here |
| `ADMIN_TOKEN` | Protects `/admin/orders` |
| `SHIP_COUNTRIES` | Comma-separated ISO codes allowed at checkout (default `US`) |

## Deploy

```bash
vercel --prod
stripe webhook_endpoints create --url https://<your-domain>/api/webhooks/stripe \
  -d "enabled_events[]=payment_intent.succeeded"       # then set STRIPE_WEBHOOK_SECRET
```

## Products

| Style | Prodigi SKU | Garment | Print area |
| --- | --- | --- | --- |
| Fitted | `GLOBAL-TEE-BC-6004` (black) | Bella + Canvas 6004 Women's Favourite | 4665 × 5844 px |
| Unisex | `GLOBAL-TEE-BC-3001` (black) | Bella + Canvas 3001 Unisex Classic | 4677 × 5881 px |

Price $22.50 shipped (list $30.00). Sandbox quotes for US delivery were $16.90 / $18.25 landed.
