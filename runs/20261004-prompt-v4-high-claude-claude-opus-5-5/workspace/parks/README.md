# Personal Parks Service

*Every person deserves a national park.* Customers name a "national park" after anyone or anything
("Maya's Backyard", "Grandpa Joe's Garage", "The Couch"). They pick a landscape, a palette and a motto, and
get a vintage park badge printed DTG on a Bella+Canvas 3001 tee. The terrain is generated from the park's
name, so every shirt is unique. A "Re-survey" button rerolls the terrain.

## How it works

| Piece | Where |
| --- | --- |
| Generative badge (pure SVG, text converted to outlines with opentype.js) | `lib/design.ts`, `lib/fonts.ts` |
| Print file: 3600×4500 transparent PNG (12″×15″ at 300 DPI), rendered with resvg-wasm | `app/api/print/[file]` (HMAC-signed URLs) |
| Live preview / Stripe product image | `app/api/design`, `app/api/mockup/[file]` |
| Checkout (Stripe Checkout, hosted) | `app/api/checkout` |
| Fulfilment → Prodigi `GLOBAL-TEE-BC-3001` | `lib/fulfill.ts` |
| Stripe webhook (`checkout.session.completed`, `…async_payment_succeeded`) | `app/api/webhooks/stripe` |
| Order status page (also a fallback fulfilment trigger) | `app/order/[id]` |

**Paid-only fulfilment.** An order goes to Prodigi only after Stripe reports `payment_status === "paid"`.
Fulfilment is idempotent in two ways. The Prodigi order ID is written to the PaymentIntent's metadata, and
the Checkout Session ID is sent as Prodigi's `idempotencyKey`, so a webhook retry racing the success page
gets back the same order (`AlreadyExists`).

**No database.** Stripe is the source of truth. The design, colour and size live in the Checkout Session
metadata, and the print file is re-rendered deterministically from them.

## Environment variables

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret (or restricted) key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the webhook endpoint pointing at `/api/webhooks/stripe` |
| `PRODIGI_API_KEY` | Prodigi API key |
| `PRODIGI_API_BASE` | Optional; defaults to sandbox `https://api.sandbox.prodigi.com/v4.0`. Use `https://api.prodigi.com/v4.0` for live |
| `PRINT_SIGNING_SECRET` | Random string; signs print-file URLs |
| `PUBLIC_BASE_URL` | Public origin, e.g. `https://parks.example.com` (used for Prodigi asset URLs) |

## Local development

```bash
npm install
cp env.example .env.local   # fill in values
npm run dev
npx tsx scripts/render-test.ts   # renders sample badges + a full print file into ./out
```

## Deploying

* **Temporary (no login):** `ENV_FILE=../parks.env scripts/deploy-temporary.sh [--fresh]`. This deploys a
  claimable Vercel deployment, (re)creates the Stripe webhook for its URL and redeploys with the secret.
  Unclaimed deployments expire 60 minutes after the anonymous project is created.
* **Production:** see "Going to production" in the hand-off notes. In short: `vercel link`, set the env vars
  with `vercel env add`, `vercel --prod`, point a Stripe webhook at `/api/webhooks/stripe`.
