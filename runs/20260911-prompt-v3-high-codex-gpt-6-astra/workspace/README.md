# AFTER HOURS

An original personalized tour-tee store: the customer chooses a headline, place, date, three memories, a full-color palette and a wave variation. The wave is deterministic from all those details. The shirt is black Bella+Canvas 3001 (Prodigi GLOBAL-TEE-BC-3001); sizes S–3XL; quantity 1–5 of the same design/size. US shipping only. USD $42 each plus $6 shipping per order.

## Current deployment

https://benchmark-20260911-prompt-v3-high-c.vercel.app

The run-specific Vercel project is deployed with a real **Stripe claimable sandbox** and the supplied **Prodigi sandbox**. Checkout accepts Stripe test cards; no real money moves and no physical shirts ship. The deployed checkout, payment verification, signed print files, and Prodigi order submission have been exercised against the real sandbox services.

The Stripe sandbox expires **September 18, 2026** unless claimed. Use the private claim link in the final handoff, or run `stripe --project-name "$BENCHMARK_VERCEL_PROJECT" sandbox claim`. The CLI profile is named for this run’s Vercel project. Treat `.stripe-provision.log` as a credential file: it is local, ignored and excluded from deployment. Do not commit or share it.

## Test the store

1. Open the deployed store. Personalize the headline, location, date, three memories and ink palette. Remix the wave, choose a size, then approve the exact design.
2. Click **Make it mine**. Stripe collects email, billing and US shipping address. Use test card **4242 4242 4242 4242**, a future expiration and any three-digit CVC. Example US test destination: 510 Townsend St, San Francisco, CA 94103, US.
3. The confirmation page should show payment confirmed and a Prodigi order ID. Match that ID in your Prodigi sandbox dashboard and inspect the artwork. Keep the private confirmation link to follow progress.
4. Cancel before payment: no Prodigi order should exist. Test a decline with **4000 0000 0000 0002**. Do not use real cards in the sandbox.
5. Resend the successful event from Stripe or refresh the confirmation page repeatedly: the Prodigi order ID must stay the same. The print order uses permanent idempotency keyed by the Stripe Checkout Session ID.
6. Refund/cancel/reprint operations are currently manual. A refund after submission does not automatically stop physical production; cancel in Prodigi if still possible.

Stripe webhook: `/api/webhooks/stripe`, subscribed to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. For another Stripe sandbox, securely set `STRIPE_SECRET_KEY` and `APP_URL` in your shell and run `node scripts/connect-stripe.mjs`, then redeploy. This helper refuses live keys and duplicate webhook URLs.

Sources: [Stripe test cards](https://docs.stripe.com/testing), [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [Prodigi API](https://www.prodigi.com/print-api/docs/reference/), [shirt and size guide](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/).

## Architecture and safety

- Next.js App Router on Vercel, React and existing Shadcn/Base UI primitives. Scaffold was adapted from Sites to native Next.js to satisfy the explicit Vercel hosting requirement.
- The server validates strict order data, sets prices itself and creates a Stripe-hosted Checkout Session. No card details touch this app. US-only address collection prevents unsupported destinations.
- Immutable checkout metadata stores the design, size, quantity, approval and random request ID. Stripe is the durable order ledger for this initial store. Local storage holds only an editable browser draft; it is never trusted for fulfillment.
- The webhook retrieves the Checkout Session and PaymentIntent from Stripe, verifies completed/paid/succeeded, USD amounts, shipping, discount, environment, and charge refund/dispute status before submitting anything to Prodigi.
- Paid return-page polling is a recovery path, using exactly the same verification. The random signed access token must match the one stored on that session. Unpaid return URLs cannot cause print submission.
- Prodigi `idempotencyKey` equals the unique Stripe session ID. This remains identical across webhook retries, timeouts, cron retries and return-page calls, including concurrent requests. Success is saved as `prodigiOrderId` on the Checkout Session. Failed submissions are marked `retry_required`; the webhook returns 500 for Stripe to retry.
- Daily protected `/api/reconcile` Vercel cron retries paid, unsubmitted store sessions from the last seven days. Current scan is capped to the newest 100 sessions; response `more: true` indicates the need for an operator/backfill. High-volume launch requires a paginated queue/database worker.
- Signed print URLs contain the frozen design but no customer address. They generate transparent 4680×5882 PNGs at 300 DPI from outlined text and the deterministic SVG, using bundled OFL fonts. Assets are accessible to the print partner without login and cannot be altered without invalidating the signature. Keep `ORDER_SIGNING_SECRET` stable so old asset links continue to work. Add a new versioned renderer for future design changes; keep v1 until all old orders have completed.
- Live fulfillment refuses test payment keys; live payment keys refuse sandbox printing. Live mode also requires `ENABLE_LIVE_FULFILLMENT=true`, `SUPPORT_EMAIL`, and `STRIPE_AUTOMATIC_TAX=true`.

## Validation performed

- `npm test`: strict validation, invalid dates, malicious input, token tampering, deterministic art, outlined fonts, PNG alpha/dimensions/DPI, exact payment totals, environment mismatch, US shipping mapping, unpaid/refunded gating, paid submission, duplicate replay, timeout recovery and webhook signatures.
- Unit tests use explicit provider mocks. Separately, the deployed store created real Stripe sandbox checkout sessions, completed actual test payments using the official Stripe CLI checkout fixture flow, and submitted paid orders to the real Prodigi sandbox. No mocked provider is exposed as a customer payment method. A real automatic Stripe webhook created Prodigi sandbox order `ord_1171654`; resending event `evt_1UEX7f7UduPfUvKnBO2nyWMT` retained the same order. The asset returned HTTP 200 as a transparent 4680×5882 PNG with 300-DPI metadata. See `scripts/e2e-evidence.json` for provider IDs and checks.
- Authenticated real Prodigi product and quote requests confirmed black S–3XL variants ship to the US. The checked M quote was $12.18 printing + $4.73 shipping before possible sales tax; this is a sandbox quote, not a production margin guarantee. Results saved in `scripts/catalog-validation.json`.
- Production build and 12 tests passed; dependency audit reports zero vulnerabilities. Deployed checks confirmed forged webhook rejection (400), unauthenticated cron rejection (401), and tampered artwork rejection (400). The downloaded print artwork was visually inspected. Browser interaction/visual QA was not performed. Optional WebMCP preview customization is feature-detected but no supported WebMCP validation context was available.

## Bring it to production

1. Claim the Stripe sandbox before September 18, 2026, and repeat the test above in your browser. Inspect a real sample for color, size and placement. The product photograph is an AI-generated mockup and placement is approximate.
2. Activate a Stripe business account. Add live `STRIPE_SECRET_KEY`, create a live webhook for the deployed endpoint, set its live `STRIPE_WEBHOOK_SECRET`, and configure Stripe Tax registrations/settings. Set `STRIPE_AUTOMATIC_TAX=true`. Check actual applicable taxes and your obligations before accepting live orders.
3. Activate/fund Prodigi production billing; replace `PRODIGI_API_KEY` with the live key and set `PRODIGI_ENV=live`, `ENABLE_LIVE_FULFILLMENT=true`. Recheck catalog availability, print area and live shipping quotes. Fulfillment charges are billed separately to the merchant, not deducted automatically from Stripe receipts.
4. Set a monitored `SUPPORT_EMAIL`. Review and finalize store policies, business identity, privacy/retention processes and customer service workflow. The current policies are basic starter copy. Refunds, reprints and cancellations are manual in Stripe/Prodigi.
5. Add the store's domain and update `APP_URL` before creating new checkouts. Keep the deployed origin of outstanding print URLs reachable. Redeploy after configuration changes.
6. Add alerting for failed webhooks and `retry_required`, confirm cron availability, and add a durable paginated order queue/admin dashboard for higher volume. Daily reconciliation is a backup, not immediate alerting. Stripe webhook retries and return-page polling handle normal recovery.
7. Enable Stripe email receipts and add transactional shipping/support email if desired. The app currently provides live order status through the saved confirmation link; it does not send its own emails. Configure production rate limits/bot controls at Vercel, monitor costs and logs, and establish a backup/retention strategy.
8. Run one controlled live order and check actual printing/shipping before opening general sales.

Known scope: one shirt style, black garment only, US delivery, one design/size per checkout, max five copies, no cart of mixed designs, no customer accounts, no automated refund/cancellation interface. Customers can customize every printed word; Latin characters are supported, emoji and unsupported scripts are rejected deliberately.

## Local development

Node 22.13+; `npm ci`; copy `.env.example` to `.env.local` and securely populate values. `npm run dev`, `npm run build`, `npm test`. `APP_URL` is a configured trusted HTTPS deployment origin; checkout cross-origin requests are rejected. For local checkout integration, use an HTTPS tunnel as APP_URL and Stripe CLI webhook forwarding with that listener's signing secret.

## Asset provenance

`public/shirt.webp` derives from one built-in ImageGen request for a photorealistic plain black tee on a neutral gray background. Final prompt: “Square ecommerce product photograph, 1024x1024. Exactly one plain black unisex crewneck cotton short-sleeve t-shirt lying flat, front facing, photographed directly overhead. Seamless pale neutral grey background approximately #e9e9e6. Symmetrical and centered, entire shirt visible, sleeves spread gently. Neck approximately 15% of image height, hem approximately 87%; torso x30%–70%. Empty flat chest for overlay artwork x35%–65%, y33%–69%. Photorealistic high-end ecommerce studio photography, realistic cotton details, soft lighting and gentle natural shadows. Deep black cotton, subtle wrinkles around edges and sleeves, central chest flat and clear. No text, logos, design, printed labels, visible neck branding, watermark, props, or people.” Actual output was 1254×1254. The personalized printed artwork is original deterministic geometry generated by this application. Fonts Barlow Condensed Bold and Space Mono Regular are bundled with OFL licenses.
