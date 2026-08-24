All tasks complete. Here's the final report.

---

## 1. What was built and the deployed URL

A full rebuild of **datetime.store** — a novelty shop selling one product: a t-shirt printed with the exact date/time/millisecond you ordered it.

**Live URL:** https://benchmark-20260824-prodigi-high-cla.vercel.app

Stack: Next.js 16 (App Router, TypeScript, Tailwind v4), deployed on Vercel as project `benchmark-20260824-prodigi-high-claude-sonnet`. Stripe Checkout for payment, Prodigi Print API for fulfillment, and `next/og` for server-rendered print artwork. No database — the design is fully stateless (see §5).

What's on the page: the same tagline as the original ("we sell a t-shirt with the current datetime"), a live-ticking shirt preview using the original's exact SVG shirt silhouettes (fitted/unisex), a style/size/color configurator, and a "BUY NOW" button that goes through real Stripe Checkout, then polls for order confirmation and shows the Prodigi order ID/status plus a preview of the exact artwork that will be printed.

## 2. How to run and verify it

**Locally:**
```
npm install
cp .env.local.example .env.local   # fill in STRIPE_SECRET_KEY, PRODIGI_API_KEY
npm run dev
```

**Verifying the deployed app:**
1. Visit the URL above, pick a style/size/color, click "BUY NOW."
2. On Stripe Checkout, use test card `4242 4242 4242 4242`, any future expiry/CVC, and any shipping address.
3. On success you're redirected to `/success`, which polls `/api/fulfill` until the order is confirmed and shows the Prodigi order ID, status, and the exact artwork PNG sent to print.
4. I verified every piece of this pipeline directly against the live deployment and the real Stripe/Prodigi sandboxes via curl (a headless browser could not be launched in this sandbox — see §6): checkout session creation (`/api/checkout`), artwork generation (`/api/artwork`, returns a real 2000×2500 PNG), webhook delivery and signature verification (triggered via `stripe trigger checkout.session.completed`, confirmed 200 response and correct handling in Vercel logs), and Prodigi order creation + idempotent replay (`outcome: "Created"` then `"AlreadyExists"` on retry with the same key, both returning the same order ID) against a local harness hitting the real Prodigi sandbox.

## 3. Actionable steps to get this ready for real customers

1. **Claim the Stripe sandbox** (expires 2026-08-31): https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTdudmM2MzRaRnBLaWRGLDE3ODgxNTAwODIv100tHQqo8pA — or set up a real Stripe account, complete activation, and swap in live keys.
2. **Get a production Prodigi API key** and set `PRODIGI_BASE_URL=https://api.prodigi.com/v4.0` (currently pointed at the sandbox). Confirm final SKUs/pricing for `GLOBAL-TEE-GIL-64000` (unisex) and `GLOBAL-TEE-GIL-64000L` (fitted) with Prodigi, including real shipping costs.
3. **Set production env vars on Vercel**: `STRIPE_SECRET_KEY`, `PRODIGI_API_KEY`, `STRIPE_WEBHOOK_SECRET` (register a new webhook against the final domain, event `checkout.session.completed` + `checkout.session.async_payment_succeeded`).
4. **Add a custom domain** (e.g. `datetime.store`) in Vercel project settings.
5. **Review pricing** — currently a flat $22.50 (compare-at $30.00, matching the original) regardless of size/style; decide if that still covers Prodigi's cost + margin at production rates.
6. **Add legal/support basics** — refund policy, terms, privacy policy, and a support contact are not present and expected for a real storefront taking payments.
7. **Decide on order persistence** — see limitations below; a lightweight orders table (even just Vercel KV) would make support/reconciliation much easier than relying on Stripe+Prodigi dashboards.

## 4. Known limitations or assumptions

- **No database.** Orders aren't stored anywhere in this app — Stripe is the source of truth for payment, Prodigi for fulfillment, and the order-confirmation page re-derives everything (including regenerating the print artwork) from the Stripe session on each load. This keeps the architecture simple and avoids needing to provision storage, but means there's no in-app order history/search; a human resolving a support ticket needs to go to the Stripe and Prodigi dashboards directly.
- **Flat pricing** regardless of size or style, matching the original's behavior (it also charged one flat price).
- **Checkout completion could not be verified by driving an actual browser** in this environment (see §6) — I verified every component independently against the live/real sandbox APIs, but did not watch a real card payment flow through to a Prodigi order end-to-end in one continuous run. I'm confident it works because every piece (`/api/checkout`, `/api/artwork`, `/api/fulfill`, webhook signature verification, Prodigi order creation + idempotency) was independently verified against the real deployed app and real sandbox APIs.
- **Both the webhook and client-side polling can trigger fulfillment** for the same order; this is intentional (belt-and-suspenders in case the webhook is delayed) and made safe by Prodigi's idempotency key, but it does mean Prodigi's `"AlreadyExists"` outcome is expected/normal, not an error.
- **Sandbox keys only** — both Stripe and Prodigi are in test/sandbox mode; no real money moves and the Stripe sandbox itself expires 2026-08-31 unless claimed.
- Shipping is currently restricted to a fixed allow-list of countries (US, CA, GB, AU, NZ, IE, DE, FR, NL, ES, IT, SE, JP) — a reasonable starting set, not exhaustive.

## 5. Summary of decisions made and why

- **Replaced legacy Stripe.js card form + Payment Request Button with hosted Stripe Checkout.** The original used raw card tokenization and a manual form; Checkout is Stripe's current recommended approach, handles 3D Secure/SCA, address collection, and receipts for free, and is far less code to maintain securely.
- **Stateless, database-free architecture.** The print artwork is a PNG generated on-demand from URL query params (timestamp + color) via `next/og`'s `ImageResponse`, and fulfillment is keyed off the Stripe Checkout Session ID with an idempotency key sent to Prodigi. This means there's nothing to provision (no Postgres/KV/Blob) and nothing that can get out of sync — Stripe and Prodigi are the two systems of record, which is appropriate for a review-stage rebuild and can be layered with real persistence later if needed.
- **`next/og` (Satori+Resvg) instead of `sharp`+SVG for artwork rendering.** Avoids a known Vercel serverless pitfall where `sharp`/librsvg lack bundled fonts; `next/og` accepts embedded font buffers directly, guaranteeing consistent text rendering in production.
- **Kept the original's exact shirt SVG silhouettes and live-ticking millisecond clock** on the product page — this is the core novelty/identity of the product, so it was preserved pixel-for-pixel rather than redesigned.
- **Added a color option (black/white)** the original didn't expose (it hardcoded black via Scalable Press) — a low-risk product improvement, and Prodigi supports it natively.
- **Used `stripe sandbox create`** to get a fresh, isolated test environment rather than reusing any pre-existing Stripe account.

## 6. Friction encountered

- **WebFetch repeatedly paraphrased/summarized the original source instead of returning it verbatim**, citing a quote-length limit, and one summary was factually wrong about the price ($45→$22.50 instead of the actual $30.00→$22.50). Worked around this by `curl`-ing the raw GitHub files directly, which returned exact source with no truncation — this is what let me copy the shirt SVG paths and pricing precisely.
- **`create-next-app` refused to scaffold in the working directory** because its folder name contains uppercase letters (violates npm naming rules). Worked around by scaffolding in a temp directory with a valid name and moving all files (including dotfiles) into place.
- **Headless Chromium could not be launched in this sandboxed environment** (the binary was killed immediately, with and without disabling the Bash sandbox), so a real browser-driven checkout flow could not be automated end-to-end in this session. Compensated by verifying every backend piece independently (Stripe session creation, artwork generation, webhook signature verification via `stripe trigger`, and Prodigi order creation/idempotency) directly against the live deployment and real sandbox APIs via curl.
- **Prodigi's idempotency behavior wasn't documented in a way I anticipated up front** — a replayed order (same `idempotencyKey`) returns outcome `"AlreadyExists"`, which my first implementation treated as an error. Caught this by testing against the real sandbox and fixed it before deploying.
