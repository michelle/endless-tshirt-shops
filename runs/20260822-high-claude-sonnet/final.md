Both success and failure paths are verified live. Here's the final report.

## 1. What was built and where it's deployed

A production-style rebuild of **datetime.store** — a storefront that sells a t-shirt printed with the exact millisecond timestamp of purchase.

- **Live URL:** https://benchmark-20260822-high-claude-sonn.vercel.app
- **Vercel project:** `benchmark-20260822-high-claude-sonnet` (new project, not linked to any existing one, created via `vercel --yes --name "$BENCHMARK_VERCEL_PROJECT"`)
- **Stack:** Next.js 16.3.2 (App Router, TypeScript, Turbopack), Tailwind CSS, deployed on Vercel.
- **Core experience:** style toggle (Fitted / Unisex) and size picker (S–XL), a live shirt preview with a millisecond clock ticking on the shirt graphic (mirrors the original React app's `Shirt.js`), a $22.50 price (marked down from $30, matching the original), and an inline checkout form (name/email/address + Stripe card element).
- **Payment:** Stripe PaymentIntents, created and confirmed server-side against a Stripe test-mode sandbox I provisioned myself (`stripe sandbox create --non-interactive`).
- **Fulfillment:** on successful payment, the server renders a PNG of the exact purchase timestamp (via `next/og`'s `ImageResponse`), uploads it as DTG artwork to Scalable Press, requests a quote for the chosen product/size, and places a real (test-mode) SP order — synchronously, in the same request, so the customer sees a confirmation with an order reference immediately.

## 2. How to run and verify it

**Live, via curl (no browser needed):**
```bash
curl -X POST https://benchmark-20260822-high-claude-sonn.vercel.app/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"style":"fitted","size":"M","email":"you@example.com",
       "paymentMethodId":"pm_card_visa",
       "address":{"name":"Jenny Rosen","address1":"185 Berry St","city":"San Francisco","state":"CA","zip":"94107"}}'
# → {"order":"<scalable press order id>"}
```
I verified this exact call against the live deployment moments ago, along with a decline case (`pm_card_chargeDeclined` → `{"error":"Your card was declined."}`).

**In a browser:** visit the URL above, pick a style/size, fill in the form, and use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC. I couldn't drive this through a real browser myself (headless Chromium can't launch in this sandbox), so the visual/UX polish of the live card Element hasn't been eyeballed post-deploy — the API-level flow is fully verified, the UI has not been.

**Locally:** `npm install && npm run build && npm run start -- -p 3411`, using the same `.env.local` already in the project.

## 3. Remaining configuration / launch steps

- **Claim the Stripe sandbox.** I created a test-mode Stripe sandbox non-interactively rather than logging into an existing account. It's usable now, but Stripe sandboxes created this way are claimable/expiring — you should run `stripe login`/claim it (or swap in your own Stripe test keys) before it lapses, so you don't lose access to the test data and dashboard.
- **Get a live Scalable Press key for production** — `$SP_AUTH` is a test key; test-mode orders never actually print/ship.
- **Swap Stripe test keys for live keys** when ready to accept real payments, and re-verify the flow against live mode.
- **Custom domain**, if desired — currently only the `*.vercel.app` alias.
- **Receipts/emails** — Stripe's `receipt_email` is set on the PaymentIntent, but there's no separate order-confirmation email; Stripe's own receipt is the only email sent today.

## 4. Known limitations / assumptions

- No webhooks — fulfillment happens synchronously inside the checkout request. This is simple and fully verifiable without a browser, but it means a slow/failed Scalable Press call after a successful charge surfaces as an error to the customer even though they were charged (the response says so explicitly and includes the PaymentIntent ID, but there's no automatic retry or reconciliation job).
- No order persistence/database — the only record of an order is in Stripe (PaymentIntent metadata) and Scalable Press. Fine for a launch-quality MVP, not for order lookup/support tooling.
- Two of the original repo's product SKUs (`next-level-boyfriend-tee`, and several others) return server errors from Scalable Press's own test API regardless of request shape — I remapped `fitted`→`next-level-fitted-crew` and `unisex`→`canvas-unisex-t-shirt`, both verified working end-to-end.
- No Apple Pay/Google Pay (the original had a Payment Request Button); dropped in favor of a plain card field, since testing a wallet button requires a real browser/device.
- UI has been build-verified and API-verified but not manually browser-tested by me, per the point above.

## 5. Key decisions and why

- **Inline Stripe Elements + server-confirmed PaymentIntent, instead of hosted Checkout Sessions.** Checkout Sessions defer PaymentIntent creation until a real browser loads Stripe's hosted page, and headless browser automation is blocked in this environment — so a Checkout Session flow would have been undeployable-without-verification here. The inline-card approach is fully testable via `curl` and is arguably closer to the original app's own inline card form anyway.
- **Synchronous fulfillment on the request thread** rather than webhooks, to keep the whole purchase→print pipeline verifiable in one API call, appropriate for this scope.
- **`next/og` for artwork generation** instead of `canvas`/`sharp`, to avoid native-binary build issues on Vercel.
- **Remapped two Scalable Press SKUs** after confirming (via SP's own docs and live test calls) that the original repo's SKUs 500-error on their current test catalog.

## 6. Friction encountered

- `create-next-app` refused to scaffold into this directory (uppercase letters in the path violate npm naming rules) — worked around by hand-authoring the Next.js project files.
- Next 14 → 16.3.2 upgrade needed to clear 3 high-severity `npm audit` findings.
- Two TypeScript build errors (Buffer→Blob type mismatch in the SP upload, Stripe SDK `apiVersion` literal mismatch) — both quick fixes.
- Biggest detour: discovering Checkout Sessions can't be completed without a browser, then discovering Playwright/Chromium can't launch in this sandbox at all — led to the architecture pivot described above.
- A `next/og` layout error ("div must have explicit display if it has more than one child") broke fulfillment on the very first end-to-end test after deploying; fixed by adding explicit `display: "flex"` to the artwork's child `<div>`s and reverified live.
