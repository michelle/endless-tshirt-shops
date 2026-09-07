# Out of Office Club

Live sandbox: https://benchmark-20260907-prompt-v2-high-c.vercel.app

An original, outdoors-inspired t-shirt collection, deployed on Vercel. Next.js 16 App Router, React 19, TypeScript, CSS/Tailwind, Base UI dialog primitives, and server-side Prodigi sandbox integration.

## Test the store

1. Open the deployed URL and pick a shirt from the collection.
2. Select S–2XL, add to your bag, and change quantities or add another design.
3. Continue to checkout and click **Use sample test details**.
4. Click **Calculate shipping**, confirm the sandbox checkbox, and **Place test order**.
5. Your receipt contains the genuine Prodigi sandbox order ID. Refresh its status or copy the private receipt link. No payment, printing, shipping, or email occurs.

The bag survives reloads. Receipt access is stored in local storage and in the receipt URL fragment; the token is sent to the status endpoint in an Authorization header. Do not share receipt links publicly. The sample address is deliberately fictitious.

## Local setup

Use Node.js 22+. `npm ci`, copy `.env.example` to `.env.local`, configure values, then `npm run dev`. `PRODIGI_API_KEY` must be a sandbox key. `NEXT_PUBLIC_SITE_URL` must be a publicly reachable HTTPS origin for the print files; localhost cannot be fetched by Prodigi. `ORDER_SIGNING_SECRET` must be a cryptographically random secret of at least 32 characters. Keep it stable so existing receipt links remain valid.

- `npm run build`: production compilation and TypeScript checking
- `npm test`: validation, pricing, token integrity, expiry, and idempotency input tests
- `TEST_BASE_URL=https://your-domain node tests/deployed-smoke.mjs`: deployed smoke test, creates exactly one sandbox order containing all three designs and verifies a duplicate request returns the same ID
- `npm audit --omit=dev`: dependency audit

## Architecture and safeguards

- Shared immutable catalog in `lib/catalog.ts`; client prices and arbitrary SKUs/asset URLs are never accepted.
- `/api/quote` validates sizes, quantities and US address, gets Standard shipping from Prodigi in USD, and issues a signed quote bound to the cart, normalized recipient, and checkout ID for 15 minutes.
- `/api/orders` requires a valid matching quote and explicit sandbox acknowledgement. Stable idempotency keys protect retries. The provider retains the order and retail totals.
- `/api/orders/[id]` requires a signed scoped receipt token (90 days). It returns a limited order summary, excluding name, email and street address.
- Prodigi's sandbox origin is hardcoded. There is deliberately no switch that can accidentally enable paid printing.
- Secrets are only used by server routes. API results use `Cache-Control: no-store`. Cross-origin mutation requests are rejected. Request size, cart quantities, and provider timeouts are bounded.
- No application database: Prodigi is the durable source of sandbox orders. Cart/receipt storage is browser-local; no account or cross-device history.

## Required before real sales

This deployment is a working **sandbox storefront**, not a live-payment store.

1. **Payments and order processing:** add a payment processor (e.g. Stripe Checkout), verified payment webhooks, a durable order/payment ledger, retries/outbox processing, refunds and reconciliation. Only dispatch paid, verified orders. Never fulfill based only on a browser redirect.
2. **Fulfillment:** obtain a live Prodigi account/key; introduce an explicit gated live mode only after the payment pipeline works. Add authenticated/verified callback handling or a durable polling worker, shipping updates, support operations and transactional email.
3. **Art and samples:** review all original designs and brand availability. Source images are 1122×1402; they are suitable for sandbox integration but not 300 DPI at full chest size. Prepare genuine higher-resolution production masters matched to the chosen print-area dimensions; order and approve physical samples, placement, color and fit. The white mockup is AI-generated, illustrative, and not a photograph of a finished Gildan product. Rectangular off-white art backgrounds are intentional. The exact artwork PNGs displayed are submitted to Prodigi with `fitPrintArea`.
4. **Commercial setup:** set live retail margins using current fulfillment costs; configure sales tax, shipping eligibility, address validation, delivery estimates and international requirements if expanding beyond the US.
5. **Operations:** add distributed abuse/rate limiting, bot protection, alerting, error monitoring, data retention and deletion tooling, private support/admin access, and a customer-support email. Sandbox endpoints are publicly testable and intentionally not production-hardened against sustained abuse.
6. **Policies and domain:** publish actual business identity, privacy notice/contact, terms, return/refund/cancellation rules, and support details; connect a brand domain in Vercel and update `NEXT_PUBLIC_SITE_URL`. No company or policy claims have been fabricated.
7. **Release QA:** run a browser/device accessibility and checkout test pass, real payment test events, webhook retries, operational failure recovery, and approved physical sample orders. Browser visual/interaction QA and the optional WebMCP tool were not verified in this run.

## Assets and sources

Project-owned PNGs are under `public/art/`. Generated using the built-in image generation tool. Full prompts are in `docs/art-prompts.json`. No third-party stock photography is used.

Product specifications and sizing: https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-64000/
API, quotes, idempotency and orders: https://www.prodigi.com/print-api/docs/reference/
Sandbox behavior: https://www.prodigi.com/faq/print-api/

`docs/prodigi-product.json` is the non-secret catalog response used to validate offered variants. `docs/smoke-results.json` records deployed integration verification, excludes credentials and receipt tokens, and includes only fictitious test-order information.

## Verified deployment

The final public deployment passed the checks in `docs/smoke-results.json`: all pages and PNG assets publicly reachable, authoritative shipping/retail totals, invalid catalog and tampered quotes rejected, all three products accepted in sandbox order `ord_1170873`, retry deduplication, and authenticated receipt/status retrieval. Five unit tests passed; the deployment build and TypeScript checks passed; `npm audit --omit=dev` reported zero vulnerabilities. Sandbox acceptance does not verify physical print quality or asynchronous asset processing; a diagnostic order remained at `downloadAssets: NotStarted`, so print preparation and fulfillment remain production validation steps.
