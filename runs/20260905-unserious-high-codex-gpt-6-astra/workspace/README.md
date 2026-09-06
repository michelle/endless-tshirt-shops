# datetime.store

An intentionally unserious store selling a black cotton T-shirt printed with the Unix timestamp captured when checkout begins. Rebuilt from [Michelle's original experiment](https://github.com/michelle/datetime.store), with Stripe Checkout and Prodigi replacing Scalable Press.

## Deployment

- Store: https://benchmark-20260905-unserious-high-codex-gpt-6-astra.vercel.app
- Vercel project: `benchmark-20260905-unserious-high-codex-gpt-6-astra`
- Runtime: Next.js App Router / Node.js on Vercel.
- Commerce: Stripe **test** mode + Prodigi **sandbox**. No real charges or physical fulfillment.

## Try it

1. Pick Unisex or Fitted and a size from S–XL. Open the size guide if needed.
2. Watch the live timestamp. The pause control only pauses the preview; checkout captures a fresh server timestamp.
3. Click **Make this moment a shirt**. Confirm the timestamp, fit and size on Stripe's hosted checkout.
4. Enter a test email and a valid US shipping address. Use card **4242 4242 4242 4242**, any future expiry, and any three-digit CVC. Submit the test payment.
5. The confirmation page shows the timestamp, payment state, Prodigi order reference and print state. Download the print artwork or refresh status. Refreshing does not order another shirt.
6. Test declines with **4000 0000 0000 0002**. Use the Stripe back link to cancel; no payment is taken and the store restores the selected fit and size.

## Stripe sandbox ownership

A new claimable sandbox was provisioned with the placeholder email `datetime-test@example.com`. It expires **September 13, 2026** unless claimed. The private, untracked `SANDBOX_CLAIM.txt` file contains the ownership claim link. Open it and claim the sandbox using your own Stripe account. Neither that link nor any API key is included in the deployment or repository.

The test webhook is registered at `/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Its signing secret is configured in Vercel. Claiming the account and replacing temporary keys may require updating the Vercel secrets and redeploying.

## How the order works

1. `/api/moment` validates the selected fit and size and creates a signed token containing the server timestamp and artwork version.
2. `/api/checkout` verifies the token (30-minute creation window), checks the selected product/size supports US delivery through Prodigi (cached for one hour), and creates a Stripe Checkout Session with a server-controlled $22.50 price. The same request ID and token return the same Checkout Session on retries.
3. The Stripe webhook verifies the raw-body signature, retrieves the session directly from Stripe, and verifies payment, store ownership, mode, amount, currency, and signed design metadata before fulfillment.
4. Shipping comes from Stripe's collected shipping details. For legacy/CLI fixture sessions it can come from the corresponding Stripe PaymentIntent.
5. A paid session creates one Prodigi order with an account-scoped idempotency key derived from the store and session. Prodigi retains these keys indefinitely. Even a crash between order creation and the Stripe metadata update cannot create a duplicate order on retry.
6. The Prodigi order ID is saved to Stripe session metadata. Stripe is the durable payment/order record; there is no ephemeral filesystem order database.
7. The confirmation page calls the same idempotent fulfillment function as recovery if the webhook is delayed, then retrieves live Prodigi status. It exposes no shipping address or email. Its unguessable Checkout Session URL is a bearer link; keep it private.
8. Failed submissions return a non-2xx webhook response so Stripe retries. Paid orders with printer issues are clearly labeled for operator review. These require attention in the Prodigi dashboard; automatic refunds or customer notification are not implemented.

## Products and artwork

| Store fit | Prodigi SKU | Color | Sizes |
| --- | --- | --- | --- |
| Unisex / classic | `GLOBAL-TEE-GIL-5000` | `black` | `s`, `m`, `l`, `xl` |
| Fitted / tailored | `GLOBAL-TEE-BC-3001` | `black` | `s`, `m`, `l`, `xl` |

Both fits are unisex. Products, supported attributes, US destinations, and front-print areas were checked against the live Prodigi sandbox product endpoint. Prodigi quote calculations were checked during setup. Retail price and shipping are fixed, so Checkout uses the faster product-availability endpoint instead of depending on a fresh quote; fitted-shirt quote calculations could take several minutes in the sandbox. Size guidance is based on the corresponding Prodigi product pages.

Artwork is generated as **4677 × 5881 px transparent PNG at 300 DPI**, with white IBM Plex Mono outlines across the chest. The font is bundled and converted to vector outlines before rasterization, making output independent of server fonts. Signed artwork URLs are stable and publicly fetchable by Prodigi, with no address or customer information. Keep `ARTWORK_SIGNING_SECRET` stable after orders are placed; rotating it invalidates previous asset URLs.

The product photograph is an AI-generated illustrative mockup, not a photographed print sample. Font licenses are included in `public/fonts`. Product references:
- https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-5000/
- https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/
- https://www.prodigi.com/print-api/docs/reference/
- https://docs.stripe.com/checkout/fulfillment

## Local development

```sh
npm ci
# Populate .env.local from .env.example, using your own test credentials.
npm run dev
npm test
npm run typecheck
npm run build
```

Use `APP_URL=http://localhost:3001` for local checkout redirects. Run `stripe listen --forward-to localhost:3001/api/webhooks/stripe` and use the listener's webhook secret locally. Keep the deployed APP_URL and webhook secret unchanged in Vercel. Local artwork URLs cannot be downloaded by Prodigi; fulfillment integration tests need the public deployment.

Production Vercel environment variables:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PRODIGI_API_KEY`
- `ARTWORK_SIGNING_SECRET`
- `APP_URL`
- `COMMERCE_MODE=test`

All API keys and signing secrets are server-only sensitive Vercel variables. `STRIPE_WEBHOOK_ID` is recorded locally for CLI operations and is not required by the application.

## Verification

`npm test` checks signature forgery/malformed tokens, paid-session validation, incorrect amount/currency/environment/store rejection, design tampering, product mapping, and deterministic transparent 300-DPI artwork. The production build and TypeScript checks pass. `npm audit` reported zero vulnerabilities at delivery.

`node --env-file=.env.local scripts/integration-test.mjs` exercises the deployed capture and checkout endpoints, verifies duplicate checkout requests, and creates a real Stripe test payment using Stripe CLI's official payment-page fixture flow. Since that fixture skips the hosted address UI, it creates a corresponding session with an explicit test shipping address on the PaymentIntent. This is test-only tooling and is excluded from deployment.

A paid Stripe test session produced Prodigi sandbox order `ord_1170586`. The Stripe event was resent successfully with no pending webhook deliveries. Further checks verify unsigned webhook rejection, signed public artwork delivery, and concurrent recovery after removing the saved Prodigi order ID from the test session. The returned order remains the same. Fitted XL and unisex S checkout both passed after removing the slow quote dependency; adaptive currency conversion is disabled to keep the server-controlled USD price consistent. No API secrets were found in the client bundles. API tests do not constitute browser or physical print QA. No browser surface was available in this environment. Prodigi sandbox orders are validated but not processed, so the accepted test order remains InProgress with asset-download/production steps NotStarted; actual print processing must be checked with a live sample. See https://www.prodigi.com/faq/print-api/.

## Before real sales

The deployed version deliberately blocks live checkout. To launch real orders:

1. Claim the Stripe sandbox before its deadline and establish the real Stripe business account. The claimable sandbox key cannot edit account-wide branding; configure the Stripe checkout business name/branding after claiming. Add live Stripe and Prodigi keys and a live Stripe webhook endpoint.
2. Finalize the store owner's support contact, privacy notice, returns policy and shipping commitments, and replace the test-specific policy copy in `app/store.tsx`.
3. Review tax collection and actual fulfillment costs/margins. The test price preserves the original $22.50 with free US shipping; Stripe Tax is not enabled.
4. Order physical samples of both fits to verify chest placement, print scale and sizing before accepting customers.
5. Add customer receipt/shipping notifications and an operational process for failed fulfillment, refunds and reconciliation. Stripe/Prodigi dashboards currently serve as the operator consoles; there is no custom admin panel or email integration.
6. Remove the explicit live-launch guard in `app/api/checkout/route.ts`, set `COMMERCE_MODE=live`, and redeploy after the above is ready. The mode guard still prevents mismatched Stripe test/live keys. No live fulfillment was attempted during this build.
7. Configure the desired custom domain, update `APP_URL`, and create a matching webhook. Changing APP_URL also changes the store identity used for fulfillment validation; preserve the previous deployment for existing orders or migrate the store ID logic before changing a domain after sales begin.
8. Configure Vercel firewall rate limits/monitoring for public commerce endpoints and review a real hosted Checkout purchase on desktop and mobile.

## Deploy updates

```sh
npm test
npm run build
vercel deploy --prod --yes
# Vercel automatically used a shortened default domain for this long project name.
# Point the full-name alias above at the newly returned deployment URL after each deploy:
vercel alias set <new-deployment-url> benchmark-20260905-unserious-high-codex-gpt-6-astra.vercel.app
```

The original site reference is credited in the footer. No Scalable Press code, authentication, or endpoint remains.
