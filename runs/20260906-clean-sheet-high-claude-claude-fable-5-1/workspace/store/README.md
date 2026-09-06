# status.tees — HTTP status code t-shirts

A print-on-demand t-shirt store for people who think in HTTP. Pick a status code
(200 OK, 404 Not Found, 418 I'm a teapot…), a print design, a shirt colour and a
size; pay with Stripe Checkout; the order is placed automatically with Prodigi,
who print and ship it.

## How it works

| Piece | Where |
|---|---|
| Catalog (codes, colours, sizes, prices, Prodigi SKU) | `lib/catalog.ts` |
| Artwork generator (one SVG for preview *and* print) | `lib/design.ts` |
| 300dpi PNG rendering with bundled JetBrains Mono | `lib/render.ts`, `app/print/[file]`, `app/mockup/[file]` |
| Stripe Checkout Session creation | `app/api/checkout/route.ts` |
| Stripe webhook → Prodigi order | `app/api/stripe/webhook/route.ts`, `lib/fulfill.ts` |
| Order status page (polls Stripe + Prodigi) | `app/order/[sessionId]`, `app/api/order/[sessionId]` |

There is no database. The Checkout Session's metadata holds the tee spec, the
PaymentIntent's metadata holds the Prodigi order id, and Prodigi's
`idempotencyKey` (= the session id) makes fulfilment safe to retry. The order
page also calls `ensureFulfilled` as a fallback if the webhook is late or
misconfigured.

## Environment variables

| Name | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret (or restricted) key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the `checkout.session.completed` webhook |
| `PRODIGI_API_KEY` | Prodigi Print API key |
| `PRODIGI_API_URL` | `https://api.sandbox.prodigi.com/v4.0` or `https://api.prodigi.com/v4.0` |
| `SITE_URL` | Optional; defaults to the Vercel production URL. Must be public so Prodigi can download print files. |

## Local development

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
# in another terminal, forward webhooks:
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Locally, Prodigi cannot fetch print files from `localhost`; set `SITE_URL` to a
public tunnel or rely on the deployed site for end-to-end testing.

## Testing a purchase

1. Open `/tee/418`, choose a design/colour/size, click **Buy**.
2. On Stripe Checkout use card `4242 4242 4242 4242`, any future expiry, any CVC, any US address, any phone.
3. You land on `/order/<session id>`; within a few seconds it shows the Prodigi order id and stage.
4. Print file Prodigi receives: `/print/<code>-<style>-<ink>.png` (4665×5844, transparent).

## Going live

- Claim the Stripe sandbox / switch to a live key and a live webhook secret.
- Switch `PRODIGI_API_URL` to production and use a live Prodigi key (this charges real money per order).
- Point a real domain at the Vercel project and set `SITE_URL` if it differs.
