# 4000 Fridays

A t-shirt store for people who can count. **You get about 4,000 Fridays in a
life — every shirt is a custom life calendar: one dot for every week you've
been alive, the week you're living now ringed in your accent colour, and the
rest of your 4,160 weeks as faint dots.** No two customers get the same print.

Because fulfilment uses **DTG (direct-to-garment)** printing, every shirt is
generated to order from the customer's name + birth date — no inventory, no
design catalogue, no print runs.

- **Payments:** Stripe Checkout (test mode keys in this deployment)
- **Fulfilment:** Prodigi Print API v4 (sandbox in this deployment) —
  Bella+Canvas 3001 tee (`GLOBAL-TEE-BC-3001`), front print area 15.6"×19.3"
  at 300 DPI (4680×5790 px)
- **Stack:** Next.js 14 (App Router, TypeScript), no database. Artwork is
  deterministic pure functions, so preview == print file, forever.

## The order flow

```
customer                 this app (Vercel)              Stripe           Prodigi
   │  design shirt            │                            │                │
   │  (live SVG preview)      │                            │                │
   │──── POST /api/checkout ─▶│ validate + freeze timeline │                │
   │                          │──── create session ──────▶│                │
   │◀── redirect to Checkout ─│                            │                │
   │──── pay (card) ─────────────────────────────────────▶│                │
   │◀─ redirect /success ─────│                            │                │
   │                          │ retrieve session (API)     │                │
   │                          │ payment_status == paid?    │                │
   │                          │  NO  → nothing is ordered  │                │
   │                          │  YES → render print PNG    │                │
   │                          │       md5 + signed URL    │                │
   │                          │──── create order ──────────────────────────▶│
   │◀── order confirmation ───│                            │                │
   │                          │ (webhook does the same, idempotently)       │
```

Two idempotent triggers send the shirt to Prodigi, both **only after Stripe
confirms `payment_status === "paid"`** (retrieved from the Stripe API, never
trusted from the browser):

1. `/success?session_id=...` — server component, retrieves the session and
   fulfils inline so the customer sees their print order immediately.
2. `POST /api/stripe-webhook` — `checkout.session.completed`, signature
   verified with `STRIPE_WEBHOOK_SECRET`.

Idempotency: the Prodigi order carries `idempotencyKey = stripe-<session id>`,
so double delivery, page refreshes or the two triggers racing produce a single
print order (`alreadyExists` returns the original).

## Artwork pipeline

- `lib/design.ts` — pure, dependency-free design generator. The **same**
  `renderDesignSVG` runs in the browser (live preview, inline SVG) and on the
  server (print file), so the preview is the print.
- The timeline is **frozen at purchase time**: `/api/checkout` stamps
  `asof` (UTC date) into the design, stored in Stripe session metadata. The
  print file therefore never changes after purchase.
- `lib/render.ts` — rasterises to 4680×5790 PNG with `@resvg/resvg-js` and
  bundled OFL fonts (Archivo Black, Space Mono) for byte-identical output.
- `GET /api/print-file?d=…&s=…` — regenerates the PNG deterministically for
  Prodigi to download. `d` is a base64url compact design, `s` is an HMAC-SHA256
  signature over `APP_SECRET`, so only this app can mint print URLs, and the
  PNG bytes always match the `md5Hash` supplied with the Prodigi order.

## Local development

```sh
npm install
cp .env.example .env.local   # fill in the values
npm run dev                 # http://localhost:3000
```

Render local print files (no server needed):

```sh
npm run preview:print       # writes out/*.png at full print resolution
```

Two example print files (rendered by this exact code path) are checked in
under `samples/`.

Test the webhook locally with the Stripe CLI:

```sh
stripe listen --forward-to localhost:3000/api/stripe-webhook
# put the printed whsec_... in .env.local as STRIPE_WEBHOOK_SECRET
```

## Testing (Stripe test cards)

| Card | Result |
| --- | --- |
| `4242 4242 4242 4242` | payment succeeds → shirt is sent to Prodigi |
| `4000 0000 0000 0002` | card declined → no order |
| Any future expiry, any CVC | — |

After a test purchase, verify the print order exists:

```sh
curl -H "X-API-Key: $PRODIGI_API_KEY" \
  "https://api.sandbox.prodigi.com/v4.0/orders?top=5"
```

## Environment variables (Vercel)

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe API key (sandbox/test here) |
| `PRODIGI_API_KEY` | Prodigi Print API key (sandbox here) |
| `APP_SECRET` | HMAC key signing `/api/print-file` URLs |
| `SITE_BASE_URL` | Public base URL used for print-file URLs |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint signing secret (optional) |
| `PRODIGI_API_BASE` | Override Prodigi base (defaults to sandbox) |

## Verified end-to-end (2026-09-29, sandbox + Stripe test mode)

- Paid order (card `4242…`): `/success` shows the print order id;
  Prodigi order `GLOBAL-TEE-BC-3001`, correct colour/size attributes,
  recipient from Stripe Checkout, `downloadAssets: Complete`, asset md5
  matches the served PNG byte-for-byte.
- Webhook `checkout.session.completed` delivered and fulfilled the order
  before the success page in one run (the page then reported the same order
  via the idempotency key — no duplicate).
- Declined card (`4000 0000 0000 0002`): stays on checkout, no Prodigi
  order, `/success` reports unpaid and refuses to fulfil.
- Unsigned `/api/print-file` requests: 404.

## Going to production — checklist

1. **Stripe:** claim/upgrade the account, replace `STRIPE_SECRET_KEY` with a
   live restricted key, and register the webhook against the production
   domain. Verify webhook secret is set.
2. **Prodigi:** switch to the live account keys (`api.prodigi.com`) — replace
   `PRODIGI_API_KEY` and set `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`.
   Confirm billing settings and (optionally) Prodigi Pro pricing.
3. **Domain & SEO:** attach a custom domain, set `SITE_BASE_URL` to it
   (print URLs must remain reachable for 30 days after each order), and
   register 4000fridays.com.
4. **Ops gaps by design** (be aware, see also "Known gaps" in the handover):
   - No order database: state lives in Stripe + Prodigi. Add a lightweight
     store (e.g. Upstash/Turso) if you want customer-facing order history.
   - No email receipts beyond Stripe's built-in one; consider a transactional
     email on `checkout.session.completed`.
   - Quote-at-checkout: retail pricing is flat ($32 + $6.99). Prodigi costs
     vary by destination/lab; margins were verified via the sandbox quote API
     (~$16.57 landed for a US order at time of writing). Consider calling
     `/v4.0/quotes` for region-specific pricing/tax (e.g. US sales tax).

## Fonts

Archivo Black and Space Mono (both SIL OFL 1.1), bundled as TTFs in `fonts/`
sourced from the Google Fonts repository.
