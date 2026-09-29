# ONE OF ONE STUDIO

**Type a word. Wear what it grows into.**

Every shirt begins with a word that means something to the customer — a name, a
place, a promise. A seeded generative engine grows that word into a flowing
flow-field artwork that has never existed before, and we print it
(direct-to-garment) on exactly one shirt on Earth. Same word + palette = same
art, forever; a different word is a different piece. DTG means no minimums and
no setup cost, so *everything in the store is an edition of one*.

Live: https://benchmark-20260928-rep2-high-openco-seven.vercel.app

## Stack

- **Next.js 15** (App Router) on **Vercel**
- **Stripe Checkout** (sandbox) for payment, with `checkout.session.completed`
  webhook → fulfillment
- **Prodigi Print API v4** (sandbox) for DTG printing + shipping
  (`GLOBAL-TEE-BC-3001`, Bella+Canvas 3001)
- **sharp** to rasterize the SVG artwork to a 3120×3860 (200 dpi @ 15.6″×19.3″)
  transparent PNG print file

## How it flows

1. `/create` — the customer types a word, picks a palette / shirt color / size.
   The preview is generated **in the browser** by `lib/art.js` (isomorphic JS).
2. `POST /api/checkout` — creates a Stripe Checkout Session; the design
   parameters travel in session `metadata`. Stripe collects shipping address
   and phone.
3. Payment completes → Stripe fires `checkout.session.completed` to
   `POST /api/webhooks/stripe` (signature-verified). The handler calls
   `lib/fulfill.js#fulfillSession`, which:
   - re-retrieves the session from Stripe and **refuses unless
     `payment_status === "paid"`**;
   - checks Prodigi for an existing order with `merchantReference = session.id`
     and uses the session id as Prodigi `idempotencyKey` — so the webhook,
     retries, and the success-page fallback can never double-print;
   - creates the Prodigi order with a signed `/api/art?...` asset URL.
4. `/success` also calls `fulfillSession` as a fallback (same idempotency), so
   a paid order reaches the lab even if the webhook is delayed or
   unconfigured.
5. `/api/art` regenerates the identical artwork server-side (deterministic
   seed) and returns the print PNG when Prodigi downloads it. The URL is
   HMAC-signed (`ART_SIGNING_SECRET`) so the endpoint can't be used to mint
   arbitrary art; responses are CDN-cached (`immutable`).
6. `/order/[sessionId]` shows live order status (Stripe + Prodigi stage and
   tracking).

## Env vars

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key (test key from `stripe sandbox create`) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` for the `checkout.session.completed` endpoint |
| `PRODIGI_API_KEY` | Prodigi sandbox key (`test_…`) |
| `ART_SIGNING_SECRET` | HMAC secret signing `/api/art` URLs |
| `PRODIGI_BASE_URL` | optional override (default `https://api.sandbox.prodigi.com`) |

## Local dev

```sh
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

## Scripts

- `node scripts/test-art.mjs [word:palette …]` — render sample artworks locally
- `node scripts/make-samples.mjs` — regenerate `public/samples/*` landing art
- `node scripts/screenshots.mjs [site]` — desktop/mobile screenshots
- `node scripts/e2e-payment.mjs [site] [word]` — full E2E: creates a real
  Checkout Session, pays with Stripe test card `4242 4242 4242 4242` via
  Playwright, and verifies a Prodigi order is created. (`HEADED=1` recommended;
  Stripe withholds the card element from some headless sessions.)

## Known limitations (sandbox stage)

- Stripe sandbox is a **claimable sandbox** with a restricted key
  (`rkcs_test_…`). It expires 2026-10-06 unless claimed. Everything works, but
  Radar/tax/etc. are unavailable.
- Prodigi is the **sandbox** environment: orders are validated and processed
  but never physically printed or charged.
- No database by design: order state lives in Stripe session metadata +
  Prodigi (looked up by `merchantReference`). A real store would persist
  orders and send confirmation/tracking email (Prodigi callbacks are stubbed
  out; status page polls Prodigi live instead).
- Prices are a flat $36 with standard shipping included; no tax collection
  (Stripe Tax off in the sandbox).
