# Running and verifying datetime.store

## Existing sandbox

Public URL: https://benchmark-20260904-harness7-high-co-amber.vercel.app
Vercel project: benchmark-20260904-harness7-high-codex-astra

1. Choose a fit and size, then **Capture this moment**.
2. Check the frozen number and $36 USD total ($30 tee + $6 shipping).
3. Continue to Stripe. Use a fictional email and US shipping address.
4. Pay with `4242 4242 4242 4242`, any future expiry, and any 3-digit CVC.
5. The return page should show Payment confirmed and Sent to the printer. Copy its private URL if you want to revisit it.
6. Inspect Stripe's checkout.session.completed delivery and the matching Prodigi sandbox order. Exact evidence from the completed test is in verification.json.

Stripe sandbox claim information is in stripe-sandbox.json. It expires **September 12, 2026** unless claimed. Claim it promptly, set your actual identity/contact details, and replace the temporary test keys when appropriate. The placeholder signup email was datetime-sandbox@example.com; it is not a support inbox.

## Local development

Requires Node 20.18+ or Node 22/24 and npm. Secrets are already in ignored `.env.local` in this workspace. For another checkout, copy `.env.example` to `.env.local` and fill its secret values privately.

```sh
npm ci
npm run dev
npm test
npm run build
```

For local checkout set `APP_URL=http://localhost:3000`. Keep the public deployment as the artwork host when exercising Prodigi, since the printer cannot fetch localhost. The simplest complete integration test is against the deployed sandbox.

To test webhooks locally, use your Stripe sandbox profile:

```sh
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Set STRIPE_WEBHOOK_SECRET to the listener's secret locally. The hosted endpoint must keep its own separate webhook secret. Restart the dev server after changing environment variables.

Browser checks use an isolated Chromium installation:

```sh
npx playwright install chromium
node --env-file=.env.local scripts/browser-verify.mjs
node --env-file=.env.local scripts/complete-test-checkout.mjs
node --env-file=.env.local scripts/mobile-verify.mjs
```

The first browser script creates a real Stripe test Checkout Session. The second completes that saved test session. Both are sandbox-only verification procedures. Do not run the payment script against a live shop. Screenshots and private order links are stored under ignored `artifacts/`.

## Deploying updates

The workspace is linked only to the new run-specific Vercel project. The checked-in vercel.json explicitly selects Next.js. Vercel's public alias is shorter than the project name.

```sh
npm test
npm run build
vercel --yes --name "$BENCHMARK_VERCEL_PROJECT" --prod
```

Use the deployment's returned public alias as APP_URL. If it changes, update APP_URL in Vercel, update the Stripe webhook URL, and redeploy so redirect URLs and artwork URLs agree. Keep older artwork URLs reachable for already submitted print orders.

## Monitoring and recovery

- `/api/health` exposes configuration-presence booleans, never keys.
- Stripe Checkout Session metadata records timestamp, fit, size, SKU, shop mode, fulfillment_status, and prodigi_order_id.
- Webhook processing verifies Stripe's signature, retrieves the actual session, checks paid/complete status, amount, currency, SKU, environment, and US shipping.
- A Prodigi failure sets retry_needed and returns HTTP 500 to Stripe so Stripe retries. Once retried successfully the metadata records submitted and the print-order ID.
- The order page polls the printer through the server and offers a print-submission check if the payment is complete but no printer reference exists. The session URL is a bearer capability; do not share it publicly.
- The session-derived Prodigi idempotency key survives failed metadata writes and concurrent webhook deliveries. Inspect provider errors before reprinting. A reprint intentionally needs a new idempotency key and should be an operator action.
- If an order needs refund/cancellation, use Stripe and Prodigi dashboards separately. A refund does not automatically cancel manufacturing. Reconcile both systems before intervening.
- Add alerting on webhook failures and Prodigi issues before accepting live purchases. Build an operator queue and scheduled reconciliation before scaling beyond this small shop.

## Required before real customers

1. **Finish Stripe Projects authentication.** The CLI's init call was blocked by BROWSER_AUTH_REQUIRED. Authenticate with your actual Stripe account, then run `stripe projects init benchmark-20260904-harness7-high-codex-astra --mode manual --json --yes`. Do not create another Vercel shop as a side effect. Provision/link any additional services only as needed. The earlier device code may have expired; start a fresh login if necessary.
2. **Claim/replace the Stripe sandbox before September 12.** Then activate a real Stripe business account, configure checkout branding, receipt email, statement descriptor and support details. Configure a separate live webhook for checkout.session.completed and checkout.session.async_payment_succeeded.
3. **Activate Prodigi live credentials and billing.** Confirm both exact black SKUs, all S–XL sizes, shipping destinations, costs, and apparel material details. Purchase physical samples and approve the font, 8-inch intended print width, position, wash durability and sizing. Mockup fit and placement are approximate.
4. **Finalize commercial policies and assets.** Publish your business identity, real support contact, privacy/data-retention policy, delivery estimates, returns/cancellation terms and tax setup. Replace the sandbox-specific /policies page and support FAQ. Confirm permissions for reference-derived elements and the supplier photo; replace them if necessary.
5. **Decide tax and margins.** The sandbox has no tax collection. Configure applicable registrations and Stripe Tax before enabling STRIPE_AUTOMATIC_TAX=true; review with your tax adviser. Recheck the $30/$6 retail pricing against actual live costs and fees.
6. **Set live configuration deliberately.** Configure live STRIPE_SECRET_KEY, live STRIPE_WEBHOOK_SECRET, live PRODIGI_API_KEY, SHOP_MODE=live and ENABLE_LIVE_ORDERS=true together. Do not merely swap one credential. Redeploy and complete a controlled live sample order, then confirm that its payment, printer record and shipment all reconcile.
7. **Add operational safeguards.** Configure a custom domain, transactional order emails, alerts/reconciliation, backups or exports of order records, checkout abuse/rate limiting in Vercel, and access-controlled support tooling. For higher volume, migrate fulfillment state into a durable database/queue with explicit refund/cancel/reprint workflows.

## Known limits

- US addresses, one tee per checkout, black only, S–XL, two fits; no cart, coupons, custom historical timestamps or accounts.
- Server retains the captured instant submitted by the browser with a one-hour age limit. The clock is the shopper's device clock, not a guaranteed authoritative time source.
- The root page polls the timestamp every 47 ms for performance; clicking captures Date.now() precisely at the click.
- Sandbox quotes/acceptance do not prove real stock, delivery, manufacturing quality or final taxes. Prodigi may leave sandbox processing stages pending.
- No automatic refund-to-print cancellation, operator dashboard, transactional app email or scheduled reconciliation. Stripe webhook retries and the order-page retry cover submission failures.
- Stripe Projects provisioning was not completed because account authorization was unavailable.
