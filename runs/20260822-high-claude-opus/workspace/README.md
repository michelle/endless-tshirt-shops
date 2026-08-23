# datetime.store

We sell a t-shirt with the current datetime.

A rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store) — the
original was a 2017 create-react-app storefront with an Express server that charged a
Stripe card token and pushed a print job to Scalable Press. This version keeps the
product exactly as it was and modernises everything underneath it: Next.js App Router,
Stripe Payment Element with deferred PaymentIntents, and webhook-driven fulfillment.

The shirt shows the epoch millisecond, ticking. Whatever it reads at the instant you
press buy is what gets printed.

## How it works

```
browser                         server                          third parties
───────                         ──────                          ─────────────
pick cut + size
press buy
  freeze epoch ms
  render 2400px PNG   ──POST /api/checkout──▶  validate order
                                              upload artwork      ──▶ SP  /v2/design
                                              quote it            ──▶ SP  /v2/quote
                                              create intent       ──▶ Stripe PaymentIntent
                      ◀──clientSecret───────
confirm payment       ────────────────────────────────────────────▶ Stripe
                                                                    │
                                 POST /api/webhooks/stripe  ◀───────┘ payment_intent.succeeded
                                              place order        ──▶ SP  /v2/order
land on /order/:id    ──GET  /api/orders/:id─▶ status (+ fulfil if the webhook has not)
```

Nothing reaches the printer until Stripe confirms the money arrived, and the quote step
runs *before* any charge — so a bad address or an out-of-stock garment fails before the
customer is charged rather than after.

### There is no database

The PaymentIntent **is** the order record. Everything fulfillment needs — Scalable Press
design id, quote token, cut, size, the printed epoch, the shipping address — lives in its
metadata, and `sp_order_status` records whether the print job was placed. That removes a
whole class of "Stripe says paid, our database says pending" bugs, and it means a preview
deployment needs no provisioning at all.

Fulfillment is idempotent and runs from two places:

- `POST /api/webhooks/stripe` — the authoritative trigger.
- `GET /api/orders/:id` — a self-healing fallback, so the store fulfils correctly on a
  fresh deployment before anyone has configured a webhook.

Both can run concurrently: Scalable Press rejects a second placement of the same order
token with `already in state`, which we treat as success.

## Running it

```bash
npm install
cp .env.example .env.local     # then fill it in
npm run dev
```

| Variable | What it is |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret (or restricted) key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` or a dashboard endpoint |
| `SP_AUTH` | Scalable Press API key, sent as the HTTP basic password |

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is inlined at build time, so changing it needs a
rebuild rather than just a restart.

For webhook fulfillment in development:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The store shows a **Test mode** banner for any non-`pk_live_` key, so a demo deployment
always says what it is.

## Verifying it

Two scripts, both runnable against local or deployed URLs.

```bash
# API flow: quote, PaymentIntent, test-card payment, fulfillment, idempotency, authz
BASE_URL=http://localhost:3000 npm run verify

# Real browser: ticking preview, canvas artwork, Stripe Elements, screenshots
BASE_URL=http://localhost:3000 npm run verify:browser
```

`verify` confirms the PaymentIntent server-side with `pm_card_visa`, so it needs no
browser. `verify:browser` drives Chromium through the actual form with test card
`4242 4242 4242 4242` and writes screenshots to `./screenshots`. If the bundled Chromium
will not start, `PLAYWRIGHT_CHANNEL=chrome` uses a locally installed Google Chrome.

## Deploying

```bash
vercel --yes --name datetime-store
vercel env add STRIPE_SECRET_KEY production          # and preview / development
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add SP_AUTH production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel --yes --prod --name datetime-store            # rebuild with the keys in place
```

The publishable key is inlined at build time, so the redeploy after setting env vars is
required — not optional.

Point a Stripe webhook endpoint at `https://<domain>/api/webhooks/stripe` subscribed to
`payment_intent.succeeded` and `payment_intent.payment_failed`, and set its signing
secret as `STRIPE_WEBHOOK_SECRET`.

Live deployment: <https://benchmark-20260822-high-claude-opus.vercel.app>

## Notable decisions

**Deferred PaymentIntents.** Elements is created with `mode: 'payment'` and a known
amount; the intent itself is only created on submit, once the print job has been quoted.
One code path serves both the card form and the wallet button.

**`capture_method` must match.** Stripe defaults new PaymentIntents to
`automatic_async`, while Elements defaults to `automatic`; confirmation is refused if
they disagree. Both are pinned to `automatic` explicitly.

**Shipping is not set on the PaymentIntent server-side.** Stripe writes it from the
Address Element at confirmation, and an intent whose shipping was set with a secret key
cannot be updated from the browser. Our own copy lives in metadata.

**Artwork is rendered in the browser at 300 DPI** (2400 × 560 px for an 8-inch print) and
validated server-side — real PNG, plausible print dimensions, size-capped. The original
screenshotted the small on-screen preview canvas, which upscaled badly.

**The fitted cut changed garment.** The original's `next-level-boyfriend-tee` no longer
returns a DTG quote from Scalable Press (HTTP 500), so the fitted cut is
`gildan-ladies-missy-t-shirt`. `next-level-fitted-crew` is unchanged from the original.

**Timestamps are sanity-checked.** A client-claimed epoch more than 5 minutes ahead or 6
hours behind the server clock is rejected, so the printed number is honestly "when you
bought it".

## Known limitations

- **US only.** Scalable Press shipping and the original store were both US-only, so the
  Address Element is restricted to `US`.
- **Print artwork is rendered client-side.** The server validates that it is a real PNG
  of plausible print size, but cannot verify the digits match the claimed timestamp.
  Rendering it server-side would need a rasteriser with a real font face; the timestamp
  recorded in metadata is server-validated regardless.
- **One colour, one print position.** Black garment, white ink, 8 inches across the
  chest, 3 inches down — as the original had it.
- **Wallet payments are untested end to end.** Apple Pay and Google Pay need a real
  device and a verified domain; the Express Checkout Element is wired up and hides itself
  when no wallet is available.
- **`$22.50` is below cost at test-mode prices.** Scalable Press quotes about `$15.09`
  wholesale plus shipping. The original's price is kept deliberately; revisit before
  going live.
