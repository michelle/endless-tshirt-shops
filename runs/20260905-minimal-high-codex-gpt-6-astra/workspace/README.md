# datetime.store

A rebuilt storefront for a black T-shirt printed with the Unix timestamp captured when checkout begins. Inspired by [michelle/datetime.store](https://github.com/michelle/datetime.store). The original Scalable Press flow has been replaced with the Prodigi Print API.

**Deployed store:** https://benchmark-20260905-minimal-high-cod.vercel.app

**Vercel project:** `benchmark-20260905-minimal-high-codex-gpt-6-astra`

This deployment uses **Stripe test payments and Prodigi sandbox orders**. It does not charge real money or manufacture shirts.

## Try it

1. Open the store. Watch the timestamp change on both the shirt and the counter.
2. Try Unisex and Fitted, choose S–XL, and open the size guide. Fit and size are remembered locally.
3. Press **Make this moment yours**. Both timestamp displays freeze while a Stripe Checkout Session is created.
4. Use a fictitious email and US shipping address. Pay with Stripe test card **4242 4242 4242 4242**, any future expiration, and any three-digit CVC. Use a five-digit ZIP.
5. After payment, the private order page should show the frozen timestamp, selection, $22.50 total, and **Accepted by Prodigi sandbox**. Fulfillment can take a few seconds. Use **Refresh order** and **Save order link**.
6. Return from Stripe before paying to test cancellation. No payment or print order should be created. Capture a fresh timestamp on the store.
7. Use **4000 0000 0000 0002** for a declined test payment. Stripe should display the decline and let you retry. No paid order should be fulfilled.

The order URL is a private capability link. Do not publish it. This store does not yet email that link automatically.

## What is implemented

- Responsive storefront, live timestamp, two actual Prodigi SKUs, four sizes, persistent size/fit preferences, accessible native size-guide dialog, FAQ, privacy/policy page, loading and error states.
- Hosted Stripe Checkout with fixed server-side USD pricing and free US shipping. No card data enters the app.
- Product availability checked through Prodigi Quotes before checkout. Quote items correctly declare the `front` print area.
- A signed immutable design binds fit, size, timestamp, and request ID. Invalid or changed artwork tokens are rejected.
- Deterministic transparent PNG print artwork: 4,677 × 5,881 pixels, 300 DPI, white Chivo digit outlines on a fixed template. Font outlines are embedded into the rasterization input; no system font dependency.
- Stripe Checkout Sessions are the durable order records. Metadata stores the design, selection, fulfillment state, and Prodigi ID. Personal shipping information stays in Stripe/Prodigi rather than an app database.
- Raw-body Stripe signature verification. Fulfillment independently retrieves the session, validates the store, mode, amount, currency, and payment state, and uses only Stripe-verified shipping information.
- A Stripe session ID is also the Prodigi idempotency key. Duplicate `AlreadyExists` responses, which can contain only an order ID, are hydrated before status is saved.
- Webhook failures return HTTP 500 for Stripe retries. The private status page can also retry paid orders. A protected daily reconciliation job scans the last seven days, capped at 500 sessions / a 40-second processing window.
- Fully refunded payments that have not been submitted to Prodigi are not newly fulfilled. Refunding an already-submitted order does **not** cancel production; manage that separately in Prodigi.
- Private order status with live Prodigi lookup, issue states, and tracking links when available.
- Server-only secrets, request size limits, strict input schemas, same-origin POST checks, basic per-instance throttling, security headers, no advertising trackers, test-mode noindex metadata, and a custom social image.

## Local development

Use Node 20.9 or newer, install with `npm ci`, and run `npm run dev`. The tested Vercel runtime builds this as a Next.js application. Dependencies are pinned in `package.json` and `package-lock.json`.

Copy `.env.example` to `.env.local` and fill the server variables. The existing workspace already contains a configured, ignored `.env.local`. Do not commit it. `APP_URL` must be the canonical public origin for deployed checkout return URLs and Prodigi artwork downloads. A localhost URL works for local UI/checkout work, but Prodigi cannot fetch artwork from localhost.

- `npm test`: commerce, security, signature, mapping, duplicate-response, and artwork tests.
- `npm run typecheck`: TypeScript checks.
- `npm run build`: production build.
- `npm run format`: formatting check.
- `vercel deploy --prod --yes`: deploy to the already-linked project.

The run-specific Vercel project is linked in ignored `.vercel/project.json`. Vercel chose the shorter canonical hostname shown above; the project itself retains the full requested name.

## Configuration

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret/restricted key, currently a claimable test-sandbox key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this deployment's Stripe webhook |
| `PRODIGI_API_KEY` | Prodigi API key, currently sandbox |
| `PRODIGI_ENVIRONMENT` | `sandbox` or `live` |
| `NEXT_PUBLIC_APP_MODE` | `test` or `live`; controls visible test copy and indexing |
| `ORDER_SIGNING_SECRET` | Long-lived HMAC secret for artwork and private order links |
| `CRON_SECRET` | Bearer secret for the reconciliation job |
| `APP_URL` | Canonical public origin, without a trailing slash |
| `STORE_ID` | Isolation identifier saved on every order |

Stripe webhook: `POST /api/stripe/webhook`, subscribed to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. The endpoint has already been registered and its secret configured in Vercel production. Do not create another endpoint just to redeploy.

Do not rotate `ORDER_SIGNING_SECRET` casually: outstanding artwork and order links depend on it. A future rotation needs support for previous keys. Keep the canonical origin available while orders may still be downloading artwork.

## Verification performed

- Production build and TypeScript passed; 12 commerce/security/artwork tests passed.
- Real Prodigi sandbox product lookups and quotes succeeded for all eight fit/size variants.
- Public deployed checkout creation and repeated-request idempotency tested.
- Stripe test payments were completed using the official Stripe CLI fixture confirmation pattern. Because no interactive browser is connected, the automated fixture supplies fictitious shipping through `payment_intent_data.shipping`; the customer flow collects shipping in hosted Checkout.
- Genuine Stripe webhook delivery independently created both a unisex and fitted Prodigi sandbox order, before accessing their order pages.
- A lost acknowledgment was simulated, followed by webhook replay and authenticated reconciliation, to verify restoration of the same Prodigi order ID. The final reconciliation run reported zero failures.
- The deployed public print endpoint served a valid transparent 300 DPI PNG. Prodigi reported both uploaded order assets as `Complete`, confirming that it downloaded them successfully.
- Paid private order lookup, invalid capability rejection, price injection rejection, cross-origin rejection, unsigned artwork rejection, forged webhook rejection, and cron authorization were checked over HTTP.
- A negative paid fixture with missing shipping was deliberately rejected before fulfillment, then refunded.

The sandbox orders are `ord_1170538` (Unisex M) and `ord_1170539` (Fitted S). Raw test evidence and private order links are saved in ignored `work/` files.

**Not verified:** interactive desktop/mobile browser behavior, an actual physical garment, or physical delivery. The environment had no available browser backend. API tests do not replace a final browser checkout review or a print sample.

## Next steps before accepting real orders

1. **Claim the Stripe sandbox before September 12, 2026.** The private claim link is in `work/stripe-sandbox.md`. This temporary sandbox/key expires unless claimed. After claiming, ensure the key remains valid or issue a durable test key and update Vercel.
2. Walk through the deployed hosted checkout manually, including mobile, cancellation, decline, and the return page. Verify the shipping address collected by Stripe reaches Prodigi.
3. Order physical samples of both cuts. The preview is generated and illustrative. Confirm ink, dimensions, template placement, material, fit, and shipping times against the actual Prodigi product.
4. Decide final pricing and tax configuration. Sandbox quotes showed $16.99 for one shirt plus standard US shipping, excluding any applicable supplier sales tax; this is not a guaranteed live cost. The store does not calculate or collect additional sales tax yet.
5. Publish the merchant's support address, final returns/cancellation policy, and delivery expectations. Add transactional order/shipping email delivery. Currently customers must save their private order link, and operational issues are handled in Stripe/Prodigi dashboards.
6. Set live Stripe and Prodigi keys, create the equivalent live Stripe webhook and signing secret, set `PRODIGI_ENVIRONMENT=live` and `NEXT_PUBLIC_APP_MODE=live`, and redeploy together. Mixed payment/fulfillment modes are rejected. Complete any account verification, billing setup, and domain setup required by those services.
7. Add monitoring/alerting for webhook errors and Prodigi issue states. At higher volume, replace the per-instance request throttle with a distributed rate limiter and move reconciliation to a durable queue/database; the current daily job is intentionally bounded.

No physical fulfillment was enabled. No custom domain, merchant email service, or live tax configuration was provisioned.

## Reference material

- [Original product](https://github.com/michelle/datetime.store)
- [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Stripe CLI test fixture](https://github.com/stripe/stripe-cli/blob/master/pkg/fixtures/triggers/checkout.session.completed.json)
- [Prodigi Print API v4](https://www.prodigi.com/print-api/docs/reference/)
- [Unisex Gildan 64000](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-64000/)
- [Fitted Gildan 64000L](https://www.prodigi.com/products/womens-clothing/t-shirts/classic/gildan-64000l/)

Self-hosted Chivo and DM Mono fonts are licensed under the SIL Open Font License; license files are in `public/fonts/`. Generated assets and prompts are documented in `ASSETS.md`.
