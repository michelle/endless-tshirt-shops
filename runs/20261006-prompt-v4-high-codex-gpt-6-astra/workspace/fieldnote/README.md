# Fieldnote

Public URL: https://fieldnote-personal-tees.hazelcough.chatgpt.site

A personalized DTG store for meaningful places. Original deterministic landscape artwork changes with coordinates and date; the customer also chooses their title, dedication, palette, shirt color, and size. The preview is an illustrative mockup, not a promise of exact lab placement.

## Current delivery status

- Public storefront, interactive design studio, persistent browser drafts, and print-resolution downloads.
- Sites-hosted Cloudflare Worker, D1 order database, and R2 immutable artwork storage.
- Prodigi sandbox key configured privately in hosting. Product lookup and quote tested against the real sandbox.
- Stripe Checkout and signature-verified webhook implementation complete; Stripe account credentials were NOT available. Checkout therefore fails closed and the UI explicitly says it is not open. No end-to-end Stripe payment or Prodigi order submission has been performed.
- Sandbox only. No money collected and no shirts ordered. Automated fulfillment tests mock the external services; they are not evidence of a real payment.

## Run and test

Use Node 24 (or a compatible Node version >=22.13).

```sh
npm run install:ci
npm run db:generate # only after modifying schema
node tests/run.mjs
npx tsc --noEmit
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_overjoyed_calypso.sql
npm run start
```

The migration command is for a fresh local database only. Hosted migrations are applied by Sites. Do not replay an already-applied migration. Site publishing uses the installed Sites skill and source-workflow helper; reuse `.openai/hosting.json` project ID.

## Enable Stripe sandbox testing

1. Use your own Stripe test account. Configure `STRIPE_SECRET_KEY=sk_test_…` as a secret in Sites. Never put it in source or browser code.
2. Create a Stripe webhook destination for `https://fieldnote-personal-tees.hazelcough.chatgpt.site/api/stripe/webhook`, listening to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
3. Store that endpoint's `STRIPE_WEBHOOK_SECRET=whsec_…` in Sites. Configure a random `ADMIN_TOKEN` secret for controlled manual fulfillment retries.
4. Keep `STORE_MODE=sandbox` and `PRODIGI_ENV=sandbox`. `PUBLIC_ORIGIN` and the sandbox `PRODIGI_API_KEY` are already configured. Deploy the saved Site version again after environment changes so the new revision takes effect.
5. Customize a tee, approve the design, and continue to test checkout. Use only fictitious customer/address details and Stripe test card `4242 4242 4242 4242`, a future expiration date, and any three-digit CVC.
6. Check that the signed webhook returns 200, the private order page shows a Prodigi ID, and the sandbox dashboard shows the same order. Prodigi sandbox does not print or ship.
7. Repeat with decline card `4000 0000 0000 0002`: no Prodigi order may appear. Cancel a checkout: no Prodigi order may appear. Redeliver the same paid event: the same Prodigi order must remain.
8. Test a temporary Prodigi outage. The webhook should return 500 for Stripe retry, and D1 should preserve `fulfillment_pending`. Once resolved, redeliver the webhook or POST `/api/admin/retry` with `Authorization: Bearer <ADMIN_TOKEN>`. Never manually edit an order to paid.

Stripe documents fulfillment at https://docs.stripe.com/checkout/fulfillment and test cards at https://docs.stripe.com/testing .

## Payment and fulfillment guarantees

The server sets the price ($36 + $6 shipping, USD), restricts shipping to the US, checks the Prodigi quote before creating Checkout, stores artwork in R2, and stores the immutable order in D1. No card details enter our app. Stripe collects the address and email.

The webhook verifies HMAC over the raw body with a five-minute timestamp tolerance. It retrieves the Checkout Session from Stripe and checks `paid`, `complete`, order/session identity, currency, exact total, and test/live mode. Only this path calls Prodigi. The browser return page is read-only. A paid payload is frozen in D1 and uses a permanent per-order Prodigi idempotency key. Duplicate/concurrent webhook deliveries cannot create distinct fulfillment orders when Prodigi honors its documented idempotency contract. Errors return non-2xx so Stripe retries. The administrative retry route also re-verifies Stripe before submitting.

Order status requires a high-entropy bearer link; no email or address is returned. Artwork URLs are high-entropy public URLs required for Prodigi to fetch, and contain the customer's chosen printed content. Customers should avoid printing sensitive coordinates or text. There is no catalog of artwork URLs.

The download and fulfillment image is a transparent 4677 × 5881 PNG. Text uses SIL-OFL Barlow Condensed Bold glyph paths, so no font substitution occurs. Artwork occupies a centered area inside the transparent canvas; `fitPrintArea` preserves the entire layout. Subtle contours are decorative; bold shapes and lettering carry the design. Color/position accuracy and hand feel still require a physical sample.

## Production launch work

- Finish Stripe merchant onboarding and provide live Stripe keys, live webhook signing secret, a LIVE Prodigi key, and `STORE_MODE=live` / `PRODIGI_ENV=live` together. Test keys must never be used to trigger real production.
- Run real Stripe sandbox end-to-end tests first. Order and inspect physical samples in every offered shirt color, checking artwork size, placement, transparency, legibility, washing, and color shifts.
- Confirm final retail prices, US shipping economics, carrier times, size/color availability, and fulfillment routing. The observed sandbox quote was $16.53 before applicable tax for black/M to the US; this is not a guaranteed production cost.
- Add the appropriate sales-tax calculation and registrations before taking live sales. Current checkout fixes the total at $42; it does not calculate sales tax. If enabling Stripe Tax, update the stored expected total and paid-session reconciliation together.
- Publish the legal merchant identity, customer-support contact, final privacy/retention policy, returns/defects process, and terms. Current information is explicitly marked as prelaunch.
- Enable Stripe payment receipts; build customer support, refunds/cancellations and refund-to-fulfillment reconciliation. No customer account, multi-item cart, automated email/tracking notifications, or refund admin UI is included. This store sells one custom shirt per checkout.
- Add an operational queue/scheduled reconciliation for pending paid orders beyond Stripe's retry window, monitoring/alerts, backups, artwork and personal-data retention cleanup, and deletion request tooling. The protected retry endpoint currently supports manual recovery.
- Strengthen public-endpoint abuse controls (IP rate limits exist for checkout); add CAPTCHA/bot controls if needed. Clean old rate-limit and abandoned-order rows. Set a custom domain if desired.

## Sources and licenses

- Gildan product specs and size chart: https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-64000/
- Prodigi API: https://www.prodigi.com/print-api/docs/reference/
- Font: Barlow Condensed (Google Fonts), license at `public/fonts/OFL.txt`. Glyph data is derived from the bundled font. Original artwork and mockup geometry live in `lib/design.ts` and `app/page.tsx`.
