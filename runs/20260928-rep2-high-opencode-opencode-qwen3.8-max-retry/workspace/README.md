# Moonworn — the night you love, worn

A fully customised t-shirt store. Every shirt is a keepsake of **one night in
one place**: the customer picks a date, a place and a few words, and the store
renders that night as a poster — the moon in its *true phase* for the chosen
date, plus a starfield, constellation and shooting star seeded deterministically
from the date+place — then prints it **one of one** on a Bella+Canvas 3001 with
direct-to-garment (DTG) ink.

DTG is the enabling technology: unlike screen printing it has no setup cost, so
every single shirt can carry its own full-colour artwork. Moonworn leans into
that completely — there is no catalogue of designs at all, only the customer's
moment.

## The pipeline

```
studio (browser)                      Stripe                      Moonworn server              Prodigi
─────────────────                     ──────                      ───────────────              ───────
date+place+caption+palette  ─POST──►  Checkout Session
+ colour/size/qty                    (design stored in
        │                             session metadata)
        │◄── hosted checkout URL ────
        │        pay (test card / live)
        │                             payment_status = paid
        └──► /success?session_id ──────────────────────────►  fulfillSession()
                                                                  │ 1. retrieve session
                                                                  │ 2. GATE: paid?
                                                                  │ 3. re-render artwork
                                                                  │    to a signed URL
                                                                  │ 4. POST /v4.0/Orders ──► print + ship
                                                                  │ 5. record prodigiOrderId
                                                                  │    in session metadata
/success shows order + print id ◄────────────────────────────────┘
/api/webhooks/stripe does the same fulfilment on checkout.session.completed
```

Fulfilment is **strictly payment-gated**: `lib/fulfill.ts` only ever calls
Prodigi when Stripe reports `payment_status === 'paid'`. Nothing is sent to the
printer otherwise. Re-running fulfilment is idempotent (Stripe metadata flag +
Prodigi `idempotencyKey`).

No database. The design travels inside Stripe Checkout Session metadata; the
artwork itself is a pure function of that design, served from a signed,
cacheable URL (`/api/design?d=…&sig=…`) that Prodigi downloads at print time.

## Layout

| Path | What |
| --- | --- |
| `components/studio.tsx` | the customiser: live poster preview, shirt colour/size/qty, checkout |
| `components/shirt-mockup.tsx` | SVG tee mockup with the chest print |
| `lib/design.ts` | design spec, validation, HMAC-coded payloads, PRNG sky, moon-phase math |
| `lib/poster.tsx` | the poster as satori JSX — one pure renderer for every size |
| `lib/catalog.ts` | the single product: Prodigi SKU, attrs (verified against sandbox), prices |
| `lib/stripe.ts`, `lib/prodigi.ts` | API clients |
| `lib/fulfill.ts` | the payment gate + Prodigi order creation |
| `app/api/design/route.tsx` | artwork endpoints (`GET` signed print/preview, `POST` live preview) |
| `app/api/checkout/route.ts` | creates the Stripe Checkout Session |
| `app/api/fulfill/route.ts` | payment-gated fulfilment trigger (POST) |
| `app/api/webhooks/stripe/route.ts` | webhook fallback for fulfilment (off unless configured) |
| `app/success/page.tsx`, `app/track/page.tsx` | order confirmation + tracking |
| `scripts/gen-fonts.mjs` | bundles poster fonts into `lib/fonts-data.ts` (regenerate fonts) |
| `scripts/e2e.mjs` | Playwright smoke test: design → pay → print → track |

## Run locally

Requirements: Node 20.11+, a Stripe secret key (test mode is fine), a Prodigi
API key (sandbox or live), and your own random hex string for artwork signing.

```sh
npm install
npm run gen-fonts               # only if you change the fonts
cp .env.example .env.local      # then fill in the four values
npm run build && npm start      # or: npm run dev
open http://localhost:3100
```

`npm run e2e` runs the whole purchase flow in a headless browser (Stripe test
card `4242 4242 4242 4242`, any future expiry/CVC), including the Prodigi
fulfilment assertion. Screenshots land in `e2e-artifacts/`.

## Deploy (Vercel)

```sh
vercel link ...                 # or first deploy creates the project
vercel env add STRIPE_SECRET_KEY production        # paste test/live key
vercel env add PRODIGI_API_KEY production          # sandbox or live key
vercel env add ARTWORK_SIGNING_KEY production      # openssl rand -hex 32
vercel deploy --prod
```

Also add the same three vars for `preview` if you want branches to work.
The app derives its own origin from request headers, so no URL configuration
is needed.

## What is wired, what is not

* Payments: Stripe Checkout, fully client-hosted; test mode in this demo.
* Fulfilment: Prodigi Print API v4, sandbox in this demo (`api.sandbox.prodigi.com`).
* Webhooks: implemented and signature-verified, but **inactive** until
  `STRIPE_WEBHOOK_SECRET` is set (see "Go live" below). The return-URL path
  already makes fulfilment robust without them; webhooks remove the last gap
  (customer closes the tab before the redirect).

### Known gaps / deliberate simplifications

* **No refunds, email receipts, or cancellation flow.** Stripe handles the
  receipt email; cancellation happens in the Stripe dashboard / Prodigi
  dashboard while the order is still in its pause window.
* **The starfield is artistic, not astronomical.** The moon phase is computed
  from the synodic cycle (accurate to a few % of illumination — ample for a
  keepsake); stars are generative art seeded from the moment. The site says so.
* **No taxes.** `automatic_tax` is not enabled; prices are inclusive-as-shown.
* **One product.** Adding hoodies etc. means extending `lib/catalog.ts` and the
  studio — the pipeline itself is product-agnostic.
* **Prices are hardcoded** in `lib/catalog.ts`, not pulled from a Prodigi quote.

## Going live (checklist)

1. **Stripe**: move the account out of test mode → use a live secret key in
   `STRIPE_SECRET_KEY`; set `STRIPE_WEBHOOK_SECRET` and point the endpoint
   `checkout.session.completed` (+ `checkout.session.async_payment_succeeded`)
   at `https://<your-domain>/api/webhooks/stripe`.
2. **Prodigi**: swap `PRODIGI_API_KEY` for the live key and set
   `PRODIGI_ENV=live` (otherwise the sandbox URL is used regardless of key).
   Configure an order pause window in the dashboard as a safety net while you
   watch early orders.
3. **Rotate** `ARTWORK_SIGNING_KEY` once (invalidates any artwork URLs minted
   with the old key; sessions carry the design so orders can be re-rendered).
4. Add your domain in Vercel; set real copy for refunds/returns/GPSR (EU) in
   the FAQ and a terms page.
5. Real print cost reconciliation: pull wholesale costs per SKU attribute
   (quote endpoint) and reconcile margins per order.

Signed artwork URLs contain no secrets and no PII beyond the place/caption the
customer chose to put on their shirt.
