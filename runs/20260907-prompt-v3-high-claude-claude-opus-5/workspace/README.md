# Cryptidæ

A t-shirt store where the product does not exist until someone orders it.

The customer answers five questions — their name, the place it haunts, the hour
it stirs, what it feeds on, and how it behaves. A generative illustrator turns
those answers into a creature and sets it into a full nineteenth-century
naturalist's plate: Latin binomial derived from their name, field notes, a
height bracket against a 1.75 m human, danger pips, specimen number, and their
name in the credits. That plate is printed direct-to-garment on a Bella + Canvas
3001, in a run of exactly one.

DTG is the whole premise: full-colour, photographic-detail artwork at a minimum
order quantity of one. Nothing about this product is possible with screen
printing.

## How it fits together

```
components/Summoner.tsx   five questions, live preview, garment picker
lib/spec.ts               the customer's answers + compact URL-safe encoding
lib/genome.ts             answers -> creature genome + all plate copy
lib/art/creature.ts       modular creature illustrator (6 archetypes)
lib/art/plate.ts          full field-guide plate composition (1200x1600)
lib/render.ts             SVG -> PNG via resvg, with bundled fonts
app/api/art/[ink]/[token] the print file Prodigi downloads (4680x5790 PNG)
app/api/checkout          creates the Stripe Checkout Session
app/api/webhooks/stripe   verifies the signature, then fulfils
lib/fulfill.ts            paid session -> Prodigi order
app/order/[id]            live order + print status
```

Two properties make the whole thing simple:

**The artwork is a pure function of the answers.** The same spec always produces
byte-identical output, in the browser and on the server. The preview the
customer approves *is* the file the press receives — there is no separate
render step that could drift.

**Nothing is stored.** The design is encoded into the Stripe Checkout Session
metadata and into the print-file URL. The webhook replays it; the order page
replays it. There is no database to keep in sync with Stripe, and print files
are regenerated on demand from a permanently cacheable URL.

## Payment safety

- Prodigi is only ever called from `fulfillSession()`, which refuses to act
  unless Stripe reports `payment_status === "paid"`.
- The Stripe webhook signature is verified before anything is read from the
  body; unsigned requests get a 400.
- `idempotencyKey` on the Prodigi order is the Stripe session id, so retried
  webhooks return the original order rather than printing a second shirt.
- The order page calls the same fulfilment path as a fallback, in case the
  webhook is delayed or misconfigured. It cannot double-print, for the reason
  above.
- On failure the webhook returns 500 so Stripe retries — a successful payment is
  never silently dropped.

## Environment

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `/api/webhooks/stripe` |
| `PRODIGI_API_KEY` | Prodigi Print API key |
| `PRODIGI_API_BASE` | `https://api.sandbox.prodigi.com/v4.0` or `https://api.prodigi.com/v4.0` |
| `SITE_URL` | Public origin. Prodigi fetches print files from here, so it must be reachable from the open internet. |

## Local development

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Useful scripts:

```bash
npx tsx scripts/preview.ts /tmp/plates   # contact sheet of generated plates
npx tsx scripts/printtest.ts             # render one full print file, report size/time
node scripts/e2e.mjs <site-url>          # buy a shirt end to end with a test card
```

## The catalogue

`lib/catalog.ts` is checked against the live Prodigi feed for
`GLOBAL-TEE-BC-3001`. The eight garment colours are the ones Prodigi can
fulfil in every size we sell across all 108 countries in `SHIPPING_COUNTRIES`.
If you add a colour, re-verify against the product endpoint first — availability
varies per colour *and* per size, and some colours are US-only.
