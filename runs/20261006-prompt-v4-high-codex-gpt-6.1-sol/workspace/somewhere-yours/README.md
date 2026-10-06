# Somewhere Yours

Public store: https://somewhere-yours-studio.hazelcough.chatgpt.site

Original personalized coordinate-inspired field prints. Customers choose a place, coordinates, date, caption, palette, shirt color and size. The procedural landscape is original artwork, **not a real geographic map**. Each approved design is rendered as a 4677 × 5881 RGBA transparent PNG with 300 DPI metadata. Shirt previews use the same drawing function as the print export. The server verifies PNG dimensions, color type, chunk integrity and design inputs. Front artwork uses generous margins, with maximum occupied width approximately 76% of the full print area. Prodigi's `fitPrintArea` prevents cropping and distortion. A physical sample remains necessary to confirm placement and color.

## Current deployment

- Public Cloudflare Worker hosted through Sites.
- Cloudflare D1 stores orders, payment sessions, fulfillment state and leases.
- Cloudflare R2 holds immutable print files at random unlisted URLs.
- Prodigi **sandbox** key is configured as a secret. Product and US quote requests were verified against the real sandbox API.
- Stripe Checkout integration is implemented, but **Stripe credentials were not provided**. Checkout deliberately returns 503 until both the test secret key and webhook signing secret are configured. No real Stripe payment or end-to-end paid sandbox fulfillment has been verified yet.
- US-only, one shirt per checkout. $36 shirt + $5 shipping, before tax.

## Connect Stripe and test payments

1. Create/use your Stripe merchant account and enable its test environment. Store the test secret key securely as `STRIPE_SECRET_KEY` in Sites runtime environment variables. Never put it in source or `.openai/hosting.json`.
2. In Stripe's test webhook settings, add the endpoint:
   `https://somewhere-yours-studio.hazelcough.chatgpt.site/api/stripe/webhook`
3. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Set its signing secret as `STRIPE_WEBHOOK_SECRET` in Sites runtime secrets. The store currently accepts cards only; the async handler is included for future extensions.
4. Deploy the current saved version again to apply the new environment revision. Leave `PRODIGI_ENV=sandbox`, the sandbox Prodigi key, and `STRIPE_AUTOMATIC_TAX=false` for this first test.
5. Open the store, personalize a shirt, approve the design, and click Continue to checkout. Use Stripe's `4242 4242 4242 4242` test card, a future expiry, any three-digit CVC, and a US test shipping address. Never use a real card in test mode.
6. The return page should show `sandbox_submitted` and a Prodigi order reference. Verify the Stripe test payment and the order in your Prodigi sandbox dashboard. No money is charged or shirt produced.
7. Repeat using Stripe's declined test card `4000 0000 0000 0002`, cancel a checkout, and replay a successful webhook in Stripe. Unpaid/canceled orders must not reach Prodigi; replay must not create a second print order. Keep the full order-page URL to revisit the order.

Stripe references: https://docs.stripe.com/checkout/fulfillment and https://docs.stripe.com/testing
Prodigi reference: https://www.prodigi.com/print-api/docs/reference/

## Payment and fulfillment guarantees

The browser cannot set the price or declare an order paid. Approved PNGs are stored before a server-priced Checkout Session is created. Webhook signatures use HMAC-SHA256 and a five-minute timestamp window. Both webhook and return-page reconciliation retrieve the Checkout Session from Stripe and require `payment_status=paid`, `status=complete`, matching order metadata, expected subtotal/shipping/currency, and matching test/live environments before submitting to Prodigi.

D1 atomically claims a two-minute fulfillment lease. Prodigi receives a stable UUID idempotency key for each order; transient failures retain the paid order and can be retried by Stripe webhook delivery or the order-page refresh button. Completed submissions short-circuit replays. The return page is a backup; fulfillment does not depend on the customer visiting it.

Print URLs are random but publicly fetchable, as required for Prodigi asset download. Order status requires a separate random token. Responses include no payment card information; status responses do not return the recipient's address or email. Cross-origin checkout writes are rejected. Checkout attempts are limited to ten per IP per hour. API errors and worker logs do not print keys or raw provider/customer payloads.

## Before live sales

- Run the full Stripe test-to-Prodigi sandbox order workflow; this could not be done without Stripe credentials.
- Order and inspect a real sample. Confirm size guide, print size, colors, shirt availability and shipping times for the US market.
- Add a real business identity and customer support email. Replace sandbox store terms, privacy, fulfillment and returns copy with your final policies. Include applicable customer rights.
- Configure taxes and tax registrations with your advisers. Enable Stripe Tax in your account and set `STRIPE_AUTOMATIC_TAX=true` after validating it. The sandbox build does not collect sales tax.
- Configure live `STRIPE_SECRET_KEY` and a **live** webhook signing secret. Use a separate live Prodigi API key and `PRODIGI_ENV=live`; update all mode-specific copy before deployment. The server rejects mismatched live payment/sandbox fulfillment environments. Sandbox historical orders cannot be fulfilled after switching to live.
- Prefer a separate production Site/database to keep sandbox data isolated. Set `STORE_ORIGIN` to the production/custom domain and update the webhook URL; redeploy.
- Enable Stripe receipt emails and add merchant order-confirmation/dispatch emails, admin order review, cancellation/refund workflows, and monitoring/alerts for failed submissions. None of these has an automated merchant UI in this build. Refunds can be made in Stripe; print cancellation must be handled in Prodigi before production progresses.
- Add an authenticated scheduled reconciliation process for abandoned return pages and expired Stripe retries, plus alerts for paid orders stuck in fulfillment. Webhook retries and manual order-page reconciliation are implemented; there is no durable background queue/cron yet.
- Define retention/deletion rules for unpaid artwork, completed artwork, addresses and hashed rate-limit buckets. The current version retains them; automated cleanup is not implemented.
- Review margin using **live** quotes, including supplier tax and payment fees. Sandbox quote for black M / US was $11.90 item + $4.63 shipping, excluding possible sales tax; this is not a guaranteed live cost.
- Connect a custom domain and assess abuse controls and operational requirements for your traffic. Current rate limiting is basic IP-based protection.

## Source and local verification

Runtime has no third-party JS dependencies. Node 20+ and Python 3 are used for local tests; Python supplies a real temporary SQLite database for the D1-compatible test harness.

```sh
npm run build
npm test
npm run validate
npm run preview
```

Preview is http://127.0.0.1:8794. It is a storefront-only preview with checkout unconfigured; hosted D1 and R2 are provisioned by Sites using `.openai/hosting.json`. SQL migrations are in `drizzle/`. The Sites packager includes them in `.openai/drizzle` so publication applies them before serving the Worker.

Edit `ui/index.html`, `ui/app.js`, and `worker/server.js`. `scripts/assemble.mjs` embeds them in the single ESM entrypoint `worker/index.js`; `npm run build` generates `dist/server/index.js`. Commit and push the exact source through the Sites source workflow before saving and deploying its archive. Do not publish runtime secrets in Git.

Tests cover verified paid/unpaid flows, forged/replayed/expired webhooks, underpayment/currency/metadata/environment tampering, concurrent duplicate notifications, retry idempotency, US-address validation, server-priced checkout, PNG corruption/dimensions, missing credentials and cross-origin writes. Provider network responses in these automated tests are mocked. Browser QA covered desktop and mobile layout, preset changes, custom text/colors/sizes, PNG download and the blocked-checkout notice. A generated PNG was decoded and checked as RGBA, 4677 × 5881, transparent background, 300 DPI.
