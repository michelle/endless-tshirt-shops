# Personal Orbit

A personalized DTG t-shirt store. A customer's place, date, dedication, and color spectrum generate a deterministic multicolor orbit. The live preview and 300-DPI print PNG use the same geometry and outlined, bundled font. Black Gildan 64000, S–2XL, 1–5 copies of a design, US delivery. $38 per shirt plus $6 shipping per order.

## Deployed run

https://benchmark-20260907-prompt-v3-high-codex-gpt-6-astra.vercel.app

Vercel project: `benchmark-20260907-prompt-v3-high-codex-gpt-6-astra`.

**Current blocker:** The supplied `BENCHMARK_STRIPE_CONFIG` is an empty file, and no Stripe API credentials were available. The storefront and Prodigi sandbox configuration are deployed, but checkout deliberately returns a clear 503 setup message until a Stripe test account and webhook secret are connected. No fake payment completion or unpaid fulfillment route exists. A real Stripe-to-Prodigi end-to-end payment has therefore NOT been exercised.

## Connect Stripe test payments

Use the existing workspace with Node 22 and Vercel CLI logged into the project owner account.

1. Authenticate Stripe into the supplied run-specific configuration:

   ```sh
   stripe login --config "$BENCHMARK_STRIPE_CONFIG"
   ```

   Alternatively, securely provide a Stripe **test** secret key as `STRIPE_SECRET_KEY` in ignored `.env.local`. Never commit keys. The key needs Checkout Sessions read/write, PaymentIntents/Charges read, and Webhook Endpoints read/write. If a restricted CLI key lacks an operation, use an appropriately scoped account test secret key.

2. Connect the deployed webhook and Vercel secrets:

   ```sh
   npm run connect:stripe
   ```

   This uses only the linked run project, creates an endpoint for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, saves its secret to ignored `.env.local`, and configures both Stripe secrets on Vercel. It does not print credentials. If an endpoint already exists but its secret is missing, recover the secret from Stripe Workbench and rerun; the script will not delete the endpoint.

3. Validate and deploy:

   ```sh
   npm test
   npm run build
   vercel --prod --yes
   ```

4. In Stripe Workbench, verify the endpoint is enabled and points to the deployed `/api/webhooks/stripe`. The public endpoint must be reachable without Vercel Deployment Protection.

## Test as a customer

- Open the deployed store. Change the place, date, and words. Change spectrum, size, and quantity; switch between shirt and artwork views. The design should update, and the total should remain $38 × quantity + $6.
- Start checkout. After the Stripe connection above, it redirects to real Stripe-hosted Checkout in test mode.
- Use Stripe's test card `4242 4242 4242 4242`, any future expiry, any three-digit CVC, a test email, and a complete US shipping address. No real money is collected. [Stripe testing documentation](https://docs.stripe.com/testing).
- The return page should show payment confirmed and a Prodigi `ord_…` reference. Save this private URL for status/tracking. Confirm the same reference in your Prodigi sandbox dashboard.
- Refresh repeatedly and resend the successful event in Stripe Workbench. There must be exactly one Prodigi order, with `merchantReference` equal to the Stripe Checkout Session ID.
- Cancel checkout, or use Stripe's decline test card `4000 0000 0000 0002`. No new Prodigi order should appear.
- Complete another payment and close the tab before returning. The webhook must still create the order. Webhook delivery failures must return non-2xx so Stripe retries.
- Inspect the Prodigi order's front asset URL. It must download a personalized, transparent 4677 × 5881 PNG at 300 DPI, with your exact text, colors, and geometry.
- Check each spectrum and size, long allowed text, mobile width, keyboard-only operation, and the size-guide dialog before launch.

Sandbox orders are not manufactured or shipped. [Prodigi sandbox documentation](https://www.prodigi.com/print-api/docs/reference/).

## Architecture and payment safety

- Next.js App Router on Vercel Node functions. The Sites scaffold was adapted to Next.js for the explicitly requested Vercel hosting; no parallel Sites deployment was created.
- `POST /api/checkout`: same-origin check, strict server-side validation, fixed server prices, US-only delivery, Prodigi availability quote, Stripe Checkout creation with an idempotency key. Prices, SKU, and asset URLs are never accepted from the browser. Missing credentials/webhook configuration fail closed.
- `POST /api/webhooks/stripe`: verifies Stripe's signature against the raw body. Only relevant paid events from this store are considered; fulfillment retrieves the session and expanded PaymentIntent/Charge directly from Stripe again.
- `lib/fulfillment.ts`: checks paid + complete status, successful PaymentIntent, payment mode, currency, subtotal, shipping, tax, received amount, refund/dispute state, design, size, quantity, and complete US shipping address before the first print submission.
- The completed Checkout Session is the durable order ledger. Its server-created metadata stores the design snapshot, variant, quantity, private status token, and returned Prodigi order ID. No serverless local disk or browser storage is used as an order database.
- Prodigi's permanent, deterministic per-session idempotency key prevents duplicate manufacturing across simultaneous webhook/return requests and retries after a crash. A failure after Prodigi accepts an order but before Stripe records it is recoverable with the same key. [Prodigi idempotency and order outcomes](https://www.prodigi.com/print-api/docs/reference/).
- `GET /api/preview`: validates design inputs and returns outlined SVG. `GET /api/art`: accepts only HMAC-signed artwork tokens generated by the paid fulfillment path and returns the high-resolution transparent PNG. Keep the signing key stable for existing orders and preserve the version-1 renderer when extending the design system.
- `/order`: a private bearer-token link. The API requires the matching token stored on the Stripe session; it doesn't expose shipping addresses or email. Status responses aren't cached. `POST` safely retries paid fulfillment; `GET` is read-only. Refreshing does not charge the customer again.
- Test keys cannot create live Prodigi orders. Live keys cannot be used while the payment mode is test. Live payments require live fulfillment and use Stripe Automatic Tax.

## Recovery and operations

Stripe retries failed webhook delivery. Monitor Stripe webhook failures and Vercel logs. `createdWithIssues` orders are recorded as `needs_attention` in Stripe metadata and need review in Prodigi; they are not duplicated. Production needs active alerting for these conditions.

For a manual sweep of paid, unsubmitted orders from the last seven days:

```sh
# Use the deployed environment's credentials and public APP_URL in your shell.
npm run reconcile
```

The recovery script reuses exactly the same payment checks and idempotency logic. It only submits already-paid orders. Do not use localhost as `APP_URL` during recovery; the printer needs a public artwork URL. For an older order, resend its signed Stripe event through Workbench or use its private order page.

Refunds, disputes after print submission, cancellations, and reprints are manual operations in Stripe and Prodigi. Refunding a payment does not automatically cancel an already-submitted print order.

## Validation completed

- Live Prodigi sandbox product lookup confirmed `GLOBAL-TEE-GIL-64000`, black and supported sizes, front-print availability and print dimensions.
- Live Prodigi sandbox quote confirmed US delivery for black/M: $12.19 manufacturing + $4.74 standard shipping, excluding possible sales tax at the time tested. This is supplier cost, not a guarantee or retail price. Quote responses are also checked when checkout begins.
- 11 automated tests cover validation, input changes, signed-art tampering, actual PNG dimensions/transparency/DPI, unpaid/underpaid/refunded/disputed payments, missing addresses, concurrent fulfillment, crash recovery, webhook signatures, and mismatched environments. Provider orchestration in these tests is mocked; it is not evidence of a completed real Stripe test payment.
- Production compilation and TypeScript validation run before deployment. Deployment smoke results are in `VALIDATION.md`.
- Browser interaction/visual testing and browser WebMCP validation were not performed. The optional, feature-detected `configure_personal_orbit` tool stages the same visible design without creating an order.

## Bring it to production

1. Activate a merchant Stripe account, add its live secret key, and create a separate live webhook at the deployed endpoint; use its live signing secret. Complete tax registrations/settings and enable Stripe Tax as appropriate for your business. Checkout enables Automatic Tax in live mode.
2. Add a live Prodigi key, billing method, and confirmed supplier configuration. Set `PRODIGI_ENV=live` and `PAYMENTS_MODE=live` together, then redeploy. Sample every print spectrum and offered size before launch; confirm actual print scale/placement, fabric, color reproduction, fulfillment routing, delivery times, and landed margins. The generated shirt photo is an illustration, not a photograph of a manufactured sample.
3. Set `SUPPORT_EMAIL`, publish your legal business/contact details, and review/finalize the shipping, personalized-product return, and privacy policies for your business. Configure Stripe customer receipts and a recognizable statement descriptor.
4. Configure a custom domain and update `APP_URL`, webhook URLs, and the deployment. Keep old signed artwork URLs reachable for outstanding orders and retain the signing key. Never use request Host headers to construct trusted URLs.
5. Add durable operational alerts/reconciliation scheduling, customer support processes, and transaction/fulfillment emails. There is no administrative dashboard, customer account system, self-service cancellation, or custom email delivery in this version; Stripe and Prodigi dashboards are the operational interfaces.
6. Add shared rate limiting/bot protection before public marketing traffic. Current validation limits payloads, variants, and quantities, but there is no distributed per-client rate limiter. Preview generation is publicly accessible and may incur compute costs.
7. Finish the end-to-end sandbox tests above and mobile/browser QA, then perform a controlled paid live order, shipment, and refund/cancellation exercise. No real live payment or physical sample was possible in this run.

## Local development

```sh
npm ci
# Copy .env.example to .env.local and populate the server-only values.
npm run dev -- --port 3001
npm test
npm run build
```

For local Stripe testing, use the Stripe CLI listener and copy its signing secret into the local environment only:

```sh
stripe listen --config "$BENCHMARK_STRIPE_CONFIG" --forward-to localhost:3001/api/webhooks/stripe
```

Local fulfillment still needs a public `APP_URL` for artwork retrieval. Prefer the deployed sandbox for the complete print flow.

## Sources and assets

- [Stripe fulfillment guidance](https://docs.stripe.com/checkout/fulfillment): server verification, webhooks, idempotent fulfillment and return-page recovery.
- [Prodigi API reference](https://www.prodigi.com/print-api/docs/reference/): product, quote, order, print-area and idempotency contracts.
- [Gildan 64000 product](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-64000/).
- Original blank-shirt image generated for this run. Orbit geometry is original deterministic code; artwork is never taken from a stock catalog.
- Space Grotesk is bundled under the SIL Open Font License in `public/fonts/LICENSE.txt`.
