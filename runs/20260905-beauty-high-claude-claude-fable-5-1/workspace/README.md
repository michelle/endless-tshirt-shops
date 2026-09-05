# datetime.store

> we sell a t-shirt with the current datetime.

A rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store). Every shirt is printed with the
Unix timestamp, in milliseconds, of the instant the buyer pressed **Freeze this moment**. Payments run through
Stripe (embedded Checkout); printing and shipping run through the Prodigi Print API (replacing the original
Scalable Press integration).

## How it works

1. `components/Shirt.tsx` ticks `Date.now()` onto an SVG tee every animation frame.
2. **Freeze this moment** stops the clock client-side and posts `{ ts, style, color, size }` to `POST /api/checkout`,
   which sanity-checks the timestamp (`lib/time.ts`) and creates an embedded Stripe Checkout Session with the moment in
   `metadata`, free worldwide shipping, and address collection.
3. On payment, Stripe calls `POST /api/stripe/webhook` (`checkout.session.completed`). `lib/fulfill.ts` turns the
   session into exactly one Prodigi order: `merchantReference` and `idempotencyKey` are the session id, and we look up
   by reference before creating. The thank-you page (`/thanks?session_id=…` → `GET /api/orders/:id`) runs the same
   idempotent function, so orders are fulfilled even if the webhook is late or unconfigured.
4. The print file is rendered on demand at `GET /art/<ts>.png?ink=white|black` (`app/art/[file]/route.tsx`) with
   `next/og`: a transparent 2340×2895 PNG (Bella + Canvas front print area at 150 dpi) with the digits ~8.5 in wide,
   ~3 in below the collar. `?preview=1&bg=black|white` returns a small mock-up used for the Stripe line item and the
   thank-you page.

Products (verified against the Prodigi sandbox catalog):

| Cut    | SKU                  | Colours       | Sizes   |
|--------|----------------------|---------------|---------|
| Unisex | `GLOBAL-TEE-BC-3001` | black, white  | S – 2XL |
| Fitted | `GLOBAL-TEE-BC-6004` | black, white  | S – 2XL |

Price is $22.50 (list $30.00), free shipping. Prodigi sandbox quote for a US order is ~$16.99 all-in.

## Endpoints

| Route                          | Purpose                                                                 |
|--------------------------------|-------------------------------------------------------------------------|
| `GET /api/health`              | Checks Stripe, webhook secret, Prodigi, and that the art URL is public. |
| `POST /api/checkout`           | Creates an embedded Checkout Session for one moment.                   |
| `POST /api/stripe/webhook`     | Signature-verified; fulfils paid sessions via Prodigi.                  |
| `GET /api/orders/:sessionId`   | Order status (Stripe + Prodigi); also the fulfilment fallback.          |
| `GET /api/stats`               | Count of paid sessions for the “moments claimed” ticker (cached 60 s).  |
| `POST /api/prodigi/callback`   | Receives Prodigi status callbacks (logged; no DB in this deployment).   |
| `GET /art/:ts.png`             | Print artwork / preview.                                                 |

## Environment

```
STRIPE_SECRET_KEY                   sk_/rk_ test or live key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  pk_ key
STRIPE_WEBHOOK_SECRET               whsec_ for the /api/stripe/webhook endpoint
PRODIGI_API_KEY                     Prodigi API key
PRODIGI_API_BASE                    https://api.sandbox.prodigi.com/v4.0  (or https://api.prodigi.com/v4.0)
NEXT_PUBLIC_SITE_URL                public https origin; Prodigi fetches artwork from here
```

## Develop

```
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

`npm run build` type-checks and builds. There is no database: Stripe is the order ledger, Prodigi is the fulfilment
ledger, and the Checkout Session id links the two.
