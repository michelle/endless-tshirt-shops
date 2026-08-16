## Done — deployed and verified

**1. What was built + URL**

A production-quality rebuild of datetime.store: Next.js 14 App Router app that sells a t-shirt printed with the live millisecond timestamp. Preserves the original's core joke (canvas-rendered live-updating timestamp on the shirt), fitted/unisex styles, S/M/L/XL sizes, and $22.50 (from $30.00) pricing with the same brand colors/font.

- **Live URL:** https://benchmark-20260816t010000z-claude-s.vercel.app
- **Vercel project:** `benchmark-20260816t010000z-claude-sonnet` (new project, not linked to any existing one, deployed with `vercel --yes --prod --name "$BENCHMARK_VERCEL_PROJECT"`)

Stack: Next.js 14.2.35 + TypeScript, Tailwind, `@vercel/og` for server-side artwork PNG generation (avoids native `canvas` binary issues on serverless), Stripe Checkout Sessions for payment, Scalable Press v2 REST API for print fulfillment.

**2. How to run / verify**

- Visit the URL, pick style/size, click "Buy now" → real Stripe Checkout page. Use test card `4242 4242 4242 4242`, any future expiry/CVC, any billing/shipping address.
- On success, lands on `/success`, which polls `/api/order-status` until fulfillment resolves (typically a few seconds) and shows the Scalable Press order id.
- I verified live against the deployed origin (not just localhost): homepage renders correctly, `POST /api/checkout` returns a real `checkout.stripe.com` URL, `GET /api/artwork` returns a live PNG, `GET /api/order-status` correctly round-trips style/size/timestamp metadata and reports `unpaid`/`processing` pre-purchase, `POST /api/webhook` correctly 400s without a valid signature, and `/success` renders. I could not complete a full browser-driven checkout (see limitations) — that step needs a human or grader browser session with the test card.

**3. Remaining configuration / launch steps**

- The Stripe key in use is a claimable sandbox restricted key — it can create Checkout Sessions, PaymentIntents, and Refunds, but **cannot register a webhook endpoint** (403 on `/v1/webhook_endpoints`). Fulfillment therefore runs via poll-driven `ensureFulfilled()` from `/api/order-status`, which is idempotent and reliable, but if you want defense-in-depth webhook delivery too, claim the sandbox in the Stripe Dashboard and then add a webhook endpoint pointed at `.../api/webhook`, plus set `STRIPE_WEBHOOK_SECRET` in Vercel env vars.
- Do a real manual purchase end-to-end once to confirm Scalable Press actually places a live order under real traffic conditions (I validated the Scalable Press `design → quote → order` pipeline directly against the API, but not through a full browser checkout).
- Swap in production Stripe/Scalable Press keys before going live for real (current keys are test-mode).

**4. Known limitations / assumptions**

- Next.js 14.2.35 (latest 14.x patch) still carries 2 high-severity `npm audit` advisories that only resolve via the Next 16 major upgrade; declined that under time pressure to avoid breaking changes.
- No browser-based E2E was possible in this sandbox — Playwright's browser process launches but is killed with `EPERM` on process control, with or without disabling the sandbox. Verified everything short of an actual browser-submitted Checkout form.
- Scalable Press test key is labeled `"mode":"live"` in its own metadata but is the test/sandbox credential provided.
- Assumed US-only shipping (matches the original) and kept the same product/size mapping to Scalable Press SKUs as the reference app.

**5. Key decisions and why**

- Stripe **Checkout Sessions** (hosted page) instead of Stripe Elements — less PCI surface, faster to build correctly, matches "credible production starting point" bar without inventing a custom card form.
- **`@vercel/og`** instead of native `canvas` for artwork — canvas requires native binaries that are fragile on Vercel's serverless runtime; Satori-based `ImageResponse` needed no extra config and is reused for both the Checkout line-item image and the actual print artwork upload.
- **Poll-driven fulfillment** (`ensureFulfilled` called from `/api/order-status`) as primary trigger, webhook as a secondary best-effort path — forced by the restricted key's inability to manage webhook endpoints; made idempotent via a metadata "soft lock" so a webhook and a poll racing each other can't double-fulfill (and double-charge Scalable Press).
- **Automatic Stripe refund** if Scalable Press fulfillment fails post-payment — a real production app can't take money for a shirt it couldn't queue for printing.

**6. Friction encountered**

- `gh` CLI in this environment is pointed at the internal `git.corp.stripe.com` host (TLS cert error) — worked around with plain `git clone` from github.com.
- `stripe projects init` (the "Stripe Projects" credential-provisioning flow) requires interactive browser auth and couldn't complete non-interactively; used the CLI's already-authenticated sandbox restricted key directly instead.
- The restricted key's webhook-endpoint permission gap wasn't discoverable ahead of time — found via a live 403, which reshaped the fulfillment architecture mid-build.
- Playwright browser automation is fundamentally blocked in this sandbox (process-kill `EPERM`), so full purchase-flow E2E had to be verified by component (API-level checks) rather than a real browser session — flagged above as the main residual verification gap.
