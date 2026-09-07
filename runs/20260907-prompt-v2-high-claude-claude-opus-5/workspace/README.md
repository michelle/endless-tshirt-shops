# Last Shift

> Apparel for jobs that no longer exist.

A working print-on-demand t-shirt store. Six original union-style crests for extinct
trades — knocker-upper, lamplighter, switchboard operator, ice cutter, human computer,
log driver — sold on a Gildan 64000, paid for through Stripe Checkout and printed and
shipped by Prodigi.

## How it hangs together

```
browser ──▶ /api/checkout ──▶ Stripe Checkout Session (cart encoded in metadata)
                                        │
                        payment ────────┤
                                        ├─▶ POST /api/stripe/webhook ─┐
                                        │      (primary fulfiller)    ├─▶ Prodigi order
                                        └─▶ GET /order?session_id=…  ─┘   (merchantReference
                                               (fallback, after 90s)        = Stripe session id)
```

There is **no database**. Two facts make that safe:

* the cart is encoded into Stripe Checkout Session metadata, so the session *is* the order record;
* the Prodigi order is keyed on `merchantReference = <stripe session id>`, so it can always be
  looked back up.

Creating a Prodigi order takes ~8 seconds, which is too slow to do inside Stripe's ~20 second
webhook window, so the webhook verifies the signature, answers immediately and fulfils in
`after()`. Because Stripe therefore never sees a failure, there are two safety nets: the
`/order` page fulfils anything still missing 90 seconds after payment, and `/api/reconcile`
sweeps recent paid sessions (wired to a daily Vercel Cron in `vercel.json`).

Prodigi has no idempotency key and happily creates duplicate orders for the same
`merchantReference` (verified against the sandbox), so `src/lib/fulfil.ts` takes a short-lived
claim on the Stripe session's metadata and re-reads it before creating anything. The webhook is
the primary writer; the `/order` page only places the order itself once the webhook has had 90
seconds to do so.

## Artwork

`src/data/designs.mjs` is the single source of truth: every crest is hand-written SVG, rendered
head-lessly to PNG by `scripts/render-art.mjs`.

* `public/prints/<slug>-<light|dark>.png` — 4665 × 5844 transparent RGBA, exactly Prodigi's
  front print area for `GLOBAL-TEE-GIL-64000` at 300 dpi. A 12″ chest print is positioned inside
  a full-print-area canvas so `sizing: fitPrintArea` maps 1:1.
* `public/art/<slug>-<light|dark>.png` — the same crest at web resolution, used in the mock-ups.

Each design exists in two inks: cream for dark garments, near-black for light ones. The garment
colour picked at checkout selects which print file is sent to Prodigi (`artPath` / `printPath`).

```bash
npm run art                  # re-render every crest (needs a local Chromium)
node scripts/gen-catalog.mjs # refresh src/data/catalog.json from designs.mjs
node scripts/render-og.mjs   # refresh public/og.png
```

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | yes | Test or live. |
| `PRODIGI_API_KEY` | yes | A key starting `test_` automatically targets the Prodigi sandbox. |
| `STRIPE_WEBHOOK_SECRET` | strongly recommended | Without it the `/order` page fulfils immediately. |
| `SITE_ORIGIN` | yes in production | Absolute origin. Prodigi fetches print files from here, so it must be publicly reachable. |
| `CRON_SECRET` | recommended | Guards `/api/reconcile`; Vercel Cron sends it as a bearer token. |
| `PRODIGI_API_BASE` | no | Override the auto-selected sandbox/live base URL. |

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the keys
npm run dev
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

`/api/health` reports which integrations are wired up and which mode they are in.
