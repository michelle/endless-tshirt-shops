# Night Shift

An astronomy t-shirt store built with Next.js, Stripe Checkout, and the Prodigi Print API. Three original designs, black Gildan 64000 shirts, S–2XL, $32 USD each and $6 flat US shipping. This release is explicitly test-only.

Production: https://benchmark-20260906-clean-sheet-high-codex-gpt-6-astra.vercel.app

Vercel project: `benchmark-20260906-clean-sheet-high-codex-gpt-6-astra`

## Try an order

1. Select Orbit, Moon, or Pluto, then a size. Add shirts to your bag.
2. Continue to Stripe Checkout. Use `4242 4242 4242 4242`, any future expiry, any three-digit CVC, and a US test delivery address. The server calculates prices and verifies a Prodigi shipping quote before creating checkout.
3. Complete the test payment. Keep the private confirmation URL. It polls status every seven seconds and displays the Prodigi reference after the Stripe webhook runs.
4. Check the sandbox order in Prodigi. No physical item is printed and no real money changes hands.
5. To test a decline, use Stripe's `4000 0000 0000 0002` test card. Cancelling Checkout returns to the saved shopping bag.

The Stripe sandbox expires September 13, 2026 unless claimed. Open `PRIVATE_HANDOFF.md` for the private claim link. Do not publish that file.

## Development

```sh
npm ci
cp .env.example .env.local
# Set the test credentials and STORE_URL=http://localhost:3000.
npm run dev
```

The current ignored `.env.local` already contains the provisioned test credentials. Do not overwrite it unless configuring a different environment. For local webhooks, run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` with the appropriate Stripe CLI profile and set its `whsec_...` value locally. The deployed webhook has a different signing secret.

```sh
npm test
npm run build
vercel deploy --prod
```

Vercel is linked in `.vercel/`; secrets are installed as production environment variables. `STORE_URL` is a trusted canonical origin; cross-origin checkout requests are rejected. The canonical project domain is attached to the Vercel project and deployment protection is disabled so shoppers, Stripe, and Prodigi can reach it. `vercel.json` explicitly selects Next.js.

## Order flow

- The server validates design/size/quantity, ignores no client prices (extra fields are rejected), checks availability using Prodigi quotes, and creates hosted Stripe Checkout with address collection.
- Stripe metadata stores the validated bag, artwork revision, store ID, and order reference. Stripe is the durable payment/order record; no ephemeral filesystem or in-memory fulfillment state is used.
- `/api/webhooks/stripe` verifies the raw body signature, retrieves the Checkout Session from Stripe again, and requires a complete paid test session with the exact expected total/currency and a US delivery address.
- The webhook submits front-print PNGs to `https://api.sandbox.prodigi.com/v4.0/orders` using SKU `GLOBAL-TEE-GIL-64000`. Each order uses a deterministic SHA-256 idempotency key derived from its Stripe session. Prodigi retains that key, so even a crash before writing the Prodigi ID back to Stripe cannot duplicate production.
- The returned Prodigi ID is saved to Stripe metadata. A failed fulfillment returns HTTP 500 for Stripe retry. Retrying a completed order is harmless.
- The confirmation page reads Stripe and Prodigi server-side through `/api/orders`. It returns order contents, payment state, and fulfillment state; it does not expose delivery addresses or email. The high-entropy Checkout Session ID acts as a private receipt token.
- Print files are 4677 × 5881 transparent PNGs, marked 300 DPI. Matching SVG previews are used on the product page. Existing versioned assets are retained. The artwork revision is captured at checkout.

## Verification

`verification.json` records deployed API integration checks and the actual paid test order. Tests cover tampered prices, invalid variants/quantities, wrong origin, invalid receipt tokens, unsigned webhooks, unpaid-session fulfillment refusal, and successful payment-to-webhook-to-Prodigi processing. Prodigi confirmed asset downloads and no order issues. A repeated paid webhook returned the same fulfillment reference. `prodigi-verification.json` records a separate direct sandbox idempotency check (an earlier setup order; use the paid order in `verification.json` as the final integration evidence).

- `npm test`: catalog, pricing, paid-order validation, stable idempotency, and print revision tests.
- `scripts/verify-deployed.mjs`: creates an unpaid test Checkout and tests deployed API safeguards. Writes its session ID to `verification.json`.
- `scripts/complete-test-checkout.mjs`: completes that test Checkout through the fixture-style Stripe test endpoints used by the official Stripe CLI. This is test tooling only; the store uses public hosted Checkout APIs.
- `scripts/verify-fulfillment.mjs`: verifies automatic webhook fulfillment, asset status, receipt privacy, and replay behavior.
- Run those scripts with `node --env-file=.env.local <script>` while `STORE_URL` points to the deployed site.
- `scripts/configure-deployment.mjs` was a one-time setup utility. Do not rerun casually: it creates a webhook endpoint.

No manual browser UI/accessibility pass or physical sample review was performed. The optional, feature-detected WebMCP bag-staging tool was implemented but no supported WebMCP validation context was available.

## Before taking real orders

1. Claim the temporary Stripe sandbox before expiry; set up and activate a merchant-owned live Stripe account separately. Add a business name, support contact, domain, and required business details.
2. Order physical samples and approve front print scale/color, garment fit, and current shipping estimates. The previews are mockups, not photographs of manufactured samples.
3. Configure a live Prodigi account, its API key, and billing. Review quote pricing and margins for every offered size/destination.
4. Implement an explicit live mode: update `requireTestMode`, the sandbox-only Prodigi base URL, test-key/session guards, receipt token validation, banners/policies, and indexing. Merely replacing a key will intentionally fail closed. Never send a Stripe test payment to live Prodigi.
5. Add live Stripe keys and register a live webhook with its own signing secret. Enable and configure appropriate sales tax handling; this release does not calculate tax. Verify the live total checks if taxes or shipping pricing change.
6. Publish customer service contact details, delivery estimates, terms, cancellation/return/defect policies, and an operational privacy process. The current policy clearly identifies this as a test store.
7. Add fulfillment failure alerts/reconciliation, refund/cancellation handling, transactional emails, and durable rate limiting/bot protection before public sales. Stripe retries are useful but do not replace operator monitoring. This store has no dedicated admin dashboard; use Stripe and Prodigi dashboards.
8. Perform mobile/desktop/keyboard checkout checks and one approved real sample purchase, then reconcile payment, fulfillment, and shipment.

## References & assets

- [Prodigi API documentation](https://www.prodigi.com/print-api/docs/reference/)
- [Gildan 64000 product and size specifications](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-64000/)
- [Stripe fulfillment guidance](https://docs.stripe.com/checkout/fulfillment)
- [Stripe test cards](https://docs.stripe.com/testing)
- [Official Stripe CLI checkout completion fixture](https://github.com/stripe/stripe-cli/blob/master/pkg/fixtures/triggers/checkout.session.completed.json)
- Blank shirt mockup is from Prodigi's official mockup generator; [Prodigi permits online store use](https://support.prodigi.com/hc/en-us/articles/13155448132508-Do-you-have-a-product-mockup-service). Exact provenance is in `public/asset-source.txt`.
- Original Night Shift typography and orbital/lunar diagrams are in `scripts/artwork.mjs`; there are no third-party character or franchise graphics.
