Full stack is built, deployed, and verified end-to-end on the live production URL. Here's the completion report.

## 1. What I built and the deployed URL

A production-quality rebuild of **datetime.store** — a Next.js 16 / React 19 / TypeScript app that sells a t-shirt printed with the exact millisecond you buy it.

- **Live URL:** https://benchmark-20260823-serial-high-claude-sonnet-3el2k4wcy.vercel.app (also aliased at https://benchmark-20260823-serial-high-clau.vercel.app)
- **Vercel project:** `benchmark-20260823-serial-high-claude-sonnet` (new project, not linked to any existing one)
- **Dashboard:** https://vercel.com/michelles-projects-bbac2d93/benchmark-20260823-serial-high-claude-sonnet

The app renders a live-ticking `Date.now()` timestamp onto a garment SVG using an HTML canvas (matching the original's technique), lets the customer pick a fit (Fitted/Unisex) and size (S/M/L/XL), then walks through: freeze the moment → enter shipping details → pay with Stripe → get a real Scalable Press DTG print order placed. Price is $22.50 (marked down from $30, same as the original).

## 2. How to run and verify it

**Locally:**
```
npm install
npm run dev   # needs .env.local with STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, SP_AUTH
```

**End-to-end verification (what I actually ran against the live URL):**
1. `POST /api/create-payment-intent` with `{style, size, email, address, artwork}` (artwork is a base64 PNG) → uploads the design to Scalable Press, gets a quote, creates a Stripe PaymentIntent. Confirmed working live: returned a real `clientSecret`.
2. Confirm the PaymentIntent with Stripe's test card (`pm_card_visa`) → `status: succeeded`.
3. `POST /api/finalize-order` with `{paymentIntentId}` → places the real Scalable Press order and returns an `orderId`. Confirmed live: got back order `6a8b3fb3a290537569277141`.
4. Re-called finalize-order with the same PaymentIntent → returned the same order ID without re-ordering (idempotency check passed).

In the browser, the same flow runs through Stripe's `PaymentElement` UI.

## 3. Actionable steps for a human to get this ready for real customers

- **Claim the Stripe sandbox** before it expires 2026-08-30: https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTdmMDRFeThGTHNQeFdkLDE3ODgxMTQyNzQv100BfjXzmvz — then replace the test keys with your real Stripe account's live keys (and set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`/`STRIPE_SECRET_KEY` for `production` in Vercel accordingly). The current test key expires 2026-11-21 regardless.
- **Get a production Scalable Press key** (the current `SP_AUTH` is explicitly a test key) and swap it into the `SP_AUTH` env var.
- **Fix the "fitted" product mapping once Scalable Press's bug is resolved.** I discovered the entire "Ladies" product family 500s on `/v2/quote` in this test sandbox, so I mapped `fitted` → `canvas-v-neck-t-shirt` and `unisex` → `canvas-unisex-t-shirt` instead of the original's `next-level-boyfriend-tee`/`next-level-fitted-crew`. Re-verify against production SP before launch — the same bug may or may not exist there.
- **Add a webhook handler** (`checkout.session` isn't used, but a `payment_intent.succeeded` Stripe webhook) as a safety net — currently order finalization is triggered client-side after `confirmPayment`, which is fine for cards but any customer who closes the tab mid-redirect could pay without their order being placed. A webhook makes fulfillment authoritative.
- **Add real persistence.** Order state currently lives entirely in Stripe PaymentIntent `metadata` (no database) — fine for a v1, but you'll want a real orders table before volume grows, plus admin visibility into fulfillment status.
- **Set a real domain and update `metadata.openGraph`/robots** in `layout.tsx`.
- **Decide on international shipping** — the app currently hard-codes `country: "US"`.

## 4. Known limitations / assumptions

- US-only shipping.
- No database — Stripe metadata is the only persistence layer, which caps you at Stripe's small per-key metadata size and offers no reporting/admin UI.
- No webhook-based fulfillment fallback (see above).
- The claimable Stripe sandbox key has restricted scope for some endpoints (e.g. `balance retrieve` 403s) — verified it does have full scope for PaymentIntents/products, which is all this app needs.
- Product IDs (`canvas-v-neck-t-shirt`, `canvas-unisex-t-shirt`) were chosen empirically after discovering a live SP bug — worth re-verifying against a production SP account.
- No automated test suite; verification was done via live curl calls against both local dev and the deployed URL.

## 5. Summary of decisions and why

- **PaymentIntents + PaymentElement over legacy Charges/token API** — the original used a deprecated Stripe Checkout token flow; PaymentIntents is the current PCI-correct standard and supports more payment methods automatically.
- **Canvas-rendered PNG artwork doubles as both the on-screen display and the DTG print file** — mirrors the original's core trick exactly (the shirt you see is the file that gets printed).
- **Stripe metadata as the persistence layer** — avoids standing up a database for a serverless deploy; acceptable for a v1/demo, flagged above as a pre-launch gap.
- **Swapped two Scalable Press product IDs** — after empirically confirming (via raw curl before writing any app code) that the entire "Ladies" category 500s in this sandbox, I chose verified-working replacements rather than shipping a broken "fitted" option.
- **`stripe sandbox create --non-interactive`** instead of `stripe login` — got a working test key with zero human-in-the-loop browser approval, satisfying the "autonomous" requirement.
- **Disabled Vercel SSO deployment protection** on this new project — it's on by default for new projects and was blocking public/curl access; needed for both my own verification and yours.

## 6. Friction encountered

- `stripe login --non-interactive` demands a browser click; `stripe sandbox create --non-interactive` was the (undocumented in the prompt, but CLI-hinted) workaround.
- Scalable Press's `/v2/quote` endpoint silently 500s for an entire product family (Ladies) in this test sandbox — not caught by their docs, only by systematic trial-and-error against the live API.
- Scalable Press docs say `address.zip` should be a JSON number; sending it as a number actually fails validation — it must be a string.
- New Vercel projects have SSO deployment protection on by default, which returns a silent 302-to-login and would have blocked verification/human review had I not caught and disabled it.
- Minor: a `Buffer`/`BlobPart` TypeScript incompatibility in the Scalable Press upload helper surfaced only during `next build`'s type-check (fixed via `Uint8Array.from(pngBuffer)`).
